const ARENA_WIDTH = 1000;
const ARENA_HEIGHT = 560;
const MOVE_SPEED = 0.18;
const TURN_SPEED = 0.045;
const JUMP_POWER = 0.28;
const GRAVITY = 0.012;
const STAR_COUNT = 8;

const keys = {};
const scoreEl = document.getElementById('score');
const hintEl = document.getElementById('hint');
const doorLabel = document.getElementById('door-label');
const startScreen = document.getElementById('start-screen');
const playBtn = document.getElementById('play-btn');
const viewEl = document.getElementById('view');

let playing = false;
let viewMode = 'second';
let starsGot = 0;
let nearDoor = null;
let doorTimer = 0;
let rightHeld = false;
let lookPitch = 0;

function fitGame() {
    const wrap = document.querySelector('.game-wrap');
    const scale = Math.min(
        (window.innerWidth - 24) / ARENA_WIDTH,
        (window.innerHeight - 24) / ARENA_HEIGHT,
        1
    );
    wrap.style.transform = `scale(${scale})`;
}

function makeBox(width, height, depth, color) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshLambertMaterial({ color })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function makeRoundMesh(geometry, color) {
    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshLambertMaterial({ color })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function makeSmoothLimb(radius, height, color, tipColor, tipSize) {
    const pivot = new THREE.Group();
    const mid = Math.max(0.08, height - radius * 2);
    const mesh = makeRoundMesh(new THREE.CapsuleGeometry(radius, mid, 6, 14), color);
    mesh.position.y = -height / 2;
    const tip = makeRoundMesh(new THREE.SphereGeometry(tipSize, 14, 12), tipColor);
    tip.position.y = -height + tipSize * 0.25;
    pivot.add(mesh, tip);
    return pivot;
}

function makePlayer() {
    const body = new THREE.Group();
    const skin = 0xf4f4f4;
    const black = 0x111111;
    const hair = 0x1a237e;
    const gold = 0xd4a017;
    const lens = 0x2b1a3a;

    const torso = makeRoundMesh(new THREE.CapsuleGeometry(0.34, 0.42, 6, 16), black);
    torso.scale.set(1.55, 1, 0.95);
    torso.position.y = 1.42;
    const zipper = makeRoundMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), 0x3a3a3a);
    zipper.position.set(0, 1.42, 0.34);

    const head = new THREE.Group();
    const skull = makeRoundMesh(new THREE.SphereGeometry(0.5, 20, 20), skin);

    const hairCap = makeRoundMesh(new THREE.SphereGeometry(0.46, 16, 12), hair);
    hairCap.scale.set(1.08, 0.55, 1.08);
    hairCap.position.set(0, 0.32, 0.02);
    const hairFront = makeRoundMesh(new THREE.SphereGeometry(0.24, 12, 12), hair);
    hairFront.scale.set(1.35, 0.7, 0.9);
    hairFront.position.set(0, 0.38, -0.26);
    const hairLeft = makeRoundMesh(new THREE.SphereGeometry(0.18, 10, 10), hair);
    hairLeft.position.set(-0.32, 0.24, 0.02);
    const hairRight = hairLeft.clone();
    hairRight.position.x = 0.32;

    const glasses = new THREE.Group();
    const frameBar = makeBox(0.72, 0.05, 0.05, gold);
    frameBar.position.set(0, 0.08, -0.46);
    const lensL = makeRoundMesh(new THREE.SphereGeometry(0.13, 12, 10), lens);
    lensL.scale.set(1.2, 0.7, 0.35);
    lensL.position.set(-0.18, 0.08, -0.48);
    const lensR = lensL.clone();
    lensR.position.x = 0.18;
    const rimL = makeBox(0.24, 0.04, 0.04, gold);
    rimL.position.set(-0.18, 0.17, -0.48);
    const rimR = rimL.clone();
    rimR.position.x = 0.18;
    glasses.add(frameBar, lensL, lensR, rimL, rimR);

    const smile = makeRoundMesh(new THREE.TorusGeometry(0.12, 0.02, 8, 12, Math.PI), 0x333333);
    smile.rotation.set(Math.PI, 0, 0);
    smile.position.set(0, -0.16, -0.45);

    head.add(skull, hairCap, hairFront, hairLeft, hairRight, glasses, smile);
    head.position.y = 2.22;

    const leftArm = makeSmoothLimb(0.16, 0.95, black, skin, 0.17);
    leftArm.position.set(-0.58, 1.82, 0);
    const rightArm = makeSmoothLimb(0.16, 0.95, black, skin, 0.17);
    rightArm.position.set(0.58, 1.82, 0);

    const leftLeg = makeSmoothLimb(0.17, 0.82, black, skin, 0.2);
    leftLeg.position.set(-0.22, 0.92, 0);
    const rightLeg = makeSmoothLimb(0.17, 0.82, black, skin, 0.2);
    rightLeg.position.set(0.22, 0.92, 0);

    body.add(torso, zipper, head, leftArm, rightArm, leftLeg, rightLeg);
    body.position.set(0, 0, 16);
    body.userData = { head, leftArm, rightArm, leftLeg, rightLeg, walk: 0 };
    return body;
}

function makeDoor(x, z, color, name, href) {
    const group = new THREE.Group();
    const left = makeBox(0.5, 4.2, 0.5, color);
    left.position.set(-1.4, 2.1, 0);
    const right = makeBox(0.5, 4.2, 0.5, color);
    right.position.set(1.4, 2.1, 0);
    const top = makeBox(3.4, 0.5, 0.5, color);
    top.position.set(0, 4.2, 0);
    const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 3.6),
        new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        })
    );
    glow.position.set(0, 2, 0.05);
    group.add(left, right, top, glow);
    group.position.set(x, 0, z);
    group.userData = { name, href };
    return group;
}

function makeStar(x, z) {
    const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38),
        new THREE.MeshLambertMaterial({ color: 0xffd100, emissive: 0x665200 })
    );
    star.position.set(x, 1.2, z);
    star.userData.spin = 0.04 + Math.random() * 0.03;
    star.userData.baseY = 1.2;
    return star;
}

function makeTree(x, z) {
    const tree = new THREE.Group();
    const trunk = makeBox(0.35, 1.4, 0.35, 0x6b3410);
    trunk.position.y = 0.7;
    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 2.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x2f8f3a })
    );
    leaves.position.y = 2.3;
    leaves.castShadow = true;
    tree.add(trunk, leaves);
    tree.position.set(x, 0, z);
    return tree;
}

if (typeof THREE === 'undefined') {
    hintEl.textContent = 'Could not load the 3D world. Check the internet.';
} else {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 28, 70);

    const camera = new THREE.PerspectiveCamera(60, ARENA_WIDTH / ARENA_HEIGHT, 0.1, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ARENA_WIDTH, ARENA_HEIGHT);
    renderer.shadowMap.enabled = true;
    viewEl.appendChild(renderer.domElement);

    const sun = new THREE.DirectionalLight(0xfff4d2, 1.1);
    sun.position.set(12, 22, 8);
    sun.castShadow = true;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xbcdcff, 0x4a7a32, 0.7));

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshLambertMaterial({ color: 0x6db24a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const path = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 36),
        new THREE.MeshLambertMaterial({ color: 0xd7b36a })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.02;
    scene.add(path);

    const player = makePlayer();
    scene.add(player);
    const playerState = { vy: 0, onGround: true };

    const doors = [
        makeDoor(-16, -10, 0xc8102e, 'The Great Mscape', '/'),
        makeDoor(16, -10, 0x5b3d8f, 'Hershey Super Power', '/food-fight')
    ];
    doors.forEach((door) => scene.add(door));

    const stars = [
        makeStar(-6, 2),
        makeStar(6, 3),
        makeStar(-10, -4),
        makeStar(11, -6),
        makeStar(0, -14),
        makeStar(-4, 12),
        makeStar(5, 14),
        makeStar(0, 0)
    ];
    stars.forEach((star) => scene.add(star));

    [
        [-18, 10], [18, 12], [-22, -2], [22, -4],
        [-8, 18], [9, 19], [-28, -12], [28, -12]
    ].forEach(([x, z]) => scene.add(makeTree(x, z)));

    function updatePlayer() {
        if (keys.KeyA || keys.ArrowLeft) {
            player.rotation.y += TURN_SPEED;
        }
        if (keys.KeyD || keys.ArrowRight) {
            player.rotation.y -= TURN_SPEED;
        }

        let move = 0;
        if (keys.KeyW || keys.ArrowUp) {
            move += 1;
        }
        if (keys.KeyS || keys.ArrowDown) {
            move -= 1;
        }
        if (move !== 0) {
            player.position.x += Math.sin(player.rotation.y) * MOVE_SPEED * move;
            player.position.z -= Math.cos(player.rotation.y) * MOVE_SPEED * move;
            player.userData.walk += 0.22;
        } else {
            player.userData.walk *= 0.85;
        }
        const swing = Math.sin(player.userData.walk) * (move !== 0 ? 0.7 : 0.08);
        player.userData.leftArm.rotation.x = swing;
        player.userData.rightArm.rotation.x = -swing;
        player.userData.leftLeg.rotation.x = -swing;
        player.userData.rightLeg.rotation.x = swing;

        if (keys.Space && playerState.onGround) {
            playerState.vy = JUMP_POWER;
            playerState.onGround = false;
        }

        playerState.vy -= GRAVITY;
        player.position.y += playerState.vy;
        if (player.position.y <= 0) {
            player.position.y = 0;
            playerState.vy = 0;
            playerState.onGround = true;
        }

        player.position.x = Math.max(-34, Math.min(34, player.position.x));
        player.position.z = Math.max(-34, Math.min(34, player.position.z));
    }

    function updateHint() {
        if (starsGot === STAR_COUNT) {
            hintEl.textContent = 'You got every star!';
            return;
        }
        hintEl.textContent = viewMode === 'first'
            ? 'Hold right click to look. Press 2 for second person.'
            : 'Hold right click to look. Press 1 for first person.';
    }

    function updateCamera() {
        const rot = player.rotation.y;
        player.visible = true;
        player.userData.head.visible = viewMode !== 'first';
        if (viewMode === 'first') {
            const eyeY = player.position.y + 2.22;
            const lookX = Math.sin(rot) * Math.cos(lookPitch);
            const lookY = Math.sin(lookPitch);
            const lookZ = -Math.cos(rot) * Math.cos(lookPitch);
            camera.position.set(
                player.position.x + lookX * 0.18,
                eyeY,
                player.position.z + lookZ * 0.18
            );
            camera.lookAt(
                player.position.x + lookX,
                eyeY + lookY,
                player.position.z + lookZ
            );
            return;
        }
        const back = 9 * Math.cos(lookPitch * 0.7);
        camera.position.set(
            player.position.x - Math.sin(rot) * back,
            player.position.y + 5.2 - lookPitch * 4,
            player.position.z + Math.cos(rot) * back
        );
        camera.lookAt(player.position.x, player.position.y + 1.4, player.position.z);
    }

    function grabStars() {
        stars.forEach((star) => {
            if (!star.visible) {
                return;
            }
            star.rotation.y += star.userData.spin;
            star.position.y = star.userData.baseY + Math.sin(Date.now() / 280 + star.position.x) * 0.18;
            const dx = star.position.x - player.position.x;
            const dz = star.position.z - player.position.z;
            if (dx * dx + dz * dz < 1.3) {
                star.visible = false;
                starsGot += 1;
                scoreEl.textContent = `Stars: ${starsGot} / ${STAR_COUNT}`;
                if (starsGot === STAR_COUNT) {
                    hintEl.textContent = 'You got every star!';
                }
            }
        });
    }

    function checkDoors(dt) {
        nearDoor = null;
        doors.forEach((door) => {
            const dx = door.position.x - player.position.x;
            const dz = door.position.z - player.position.z;
            if (dx * dx + dz * dz < 6.5) {
                nearDoor = door;
            }
        });

        if (!nearDoor) {
            doorTimer = 0;
            doorLabel.hidden = true;
            return;
        }

        doorTimer += dt;
        doorLabel.hidden = false;
        doorLabel.textContent = `Go to ${nearDoor.userData.name}...`;
        if (doorTimer > 1600) {
            window.location.href = nearDoor.userData.href;
        }
    }

    let last = 0;
    function tick(now) {
        const dt = last ? Math.min(40, now - last) : 16;
        last = now;
        if (playing) {
            updatePlayer();
            grabStars();
            checkDoors(dt);
        }
        updateCamera();
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }

    playBtn.addEventListener('click', () => {
        playing = true;
        startScreen.hidden = true;
        viewEl.querySelector('canvas').focus();
    });

    window.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
            event.preventDefault();
        }
        if (playing && !event.repeat && (event.code === 'Digit1' || event.code === 'Numpad1')) {
            viewMode = 'first';
            updateHint();
        }
        if (playing && !event.repeat && (event.code === 'Digit2' || event.code === 'Numpad2')) {
            viewMode = 'second';
            updateHint();
        }
    });
    window.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    document.getElementById('game').addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
    window.addEventListener('mousedown', (event) => {
        if (!playing || event.button !== 2) {
            return;
        }
        rightHeld = true;
        event.preventDefault();
    });
    window.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            rightHeld = false;
        }
    });
    window.addEventListener('mousemove', (event) => {
        if (!playing || !rightHeld) {
            return;
        }
        player.rotation.y -= event.movementX * 0.006;
        lookPitch -= event.movementY * 0.005;
        lookPitch = Math.max(-1.1, Math.min(1.1, lookPitch));
    });

    fitGame();
    window.addEventListener('resize', fitGame);
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

fitGame();
window.addEventListener('resize', fitGame);
