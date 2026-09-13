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

function makeHitBox(width, height, depth, color) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshBasicMaterial({
            color,
            wireframe: true,
            transparent: true,
            opacity: 0.95,
            depthTest: false
        })
    );
    mesh.renderOrder = 20;
    return mesh;
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

function skinMaterial(color) {
    return new THREE.MeshPhongMaterial({
        color,
        shininess: 28,
        specular: 0x333333,
        flatShading: false
    });
}

function roundedBoxGeometry(width, height, depth, radius) {
    const r = Math.min(radius, width * 0.2, height * 0.2, depth * 0.2);
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const inner = Math.max(0.03, depth - r * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: inner,
        bevelEnabled: true,
        bevelThickness: r,
        bevelSize: r,
        bevelSegments: 4,
        curveSegments: 8
    });
    geo.translate(0, 0, -inner / 2 - r);
    geo.computeVertexNormals();
    return geo;
}

function makeSoftBox(width, height, depth, color, radius = 0.05) {
    const mesh = new THREE.Mesh(roundedBoxGeometry(width, height, depth, radius), skinMaterial(color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function makeBlockLimb(width, height, depth, color, tipColor, tipHeight, tipDepth) {
    const pivot = new THREE.Group();
    const mesh = makeSoftBox(width, height, depth, color);
    mesh.position.y = -height / 2;
    const tip = makeSoftBox(width * 1.12, tipHeight, tipDepth, tipColor);
    tip.position.y = -height - tipHeight / 2 + 0.04;
    pivot.add(mesh, tip);
    return pivot;
}

function makePlayer() {
    const body = new THREE.Group();
    const skin = 0xfbfbfb;
    const black = 0x0a0a0a;
    const hair = 0x1a2b8a;
    const gold = 0xd89a2a;
    const lens = 0x2b1a3d;

    const torso = makeSoftBox(0.96, 1.0, 0.42, black, 0.04);
    torso.position.y = 1.4;
    const zipper = makeSoftBox(0.03, 0.84, 0.03, 0x3a3a3a, 0.01);
    zipper.position.set(0, 1.4, -0.23);
    const zipPull = makeSoftBox(0.07, 0.05, 0.05, 0x4a4a4a, 0.01);
    zipPull.position.set(0, 1.78, -0.25);

    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 36, 36), skinMaterial(skin));
    skull.scale.set(1, 0.94, 0.96);
    skull.castShadow = true;

    const hairMat = skinMaterial(hair);
    const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.46),
        hairMat
    );
    hairCap.scale.set(1.1, 0.92, 1.12);
    hairCap.position.set(0, 0.1, 0.05);
    const hairFront = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), hairMat);
    hairFront.scale.set(1.9, 0.42, 0.6);
    hairFront.position.set(-0.04, 0.3, -0.28);
    const flick = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), hairMat);
    flick.scale.set(1.3, 0.5, 0.75);
    flick.rotation.set(0.05, -0.35, 0.75);
    flick.position.set(-0.26, 0.32, -0.02);
    const spike = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), hairMat);
    spike.scale.set(1.1, 0.36, 0.48);
    spike.rotation.set(0.06, 0.2, -0.9);
    spike.position.set(0.18, 0.34, -0.02);
    const hairSide = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), hairMat);
    hairSide.scale.set(0.7, 0.65, 0.95);
    hairSide.position.set(-0.34, 0.12, 0.04);
    const hairSideR = hairSide.clone();
    hairSideR.position.set(0.32, 0.12, 0.04);
    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), hairMat);
    hairBack.scale.set(1.4, 1.05, 1);
    hairBack.position.set(0, 0.04, 0.22);

    const glasses = new THREE.Group();
    const lensGeo = new THREE.SphereGeometry(0.15, 16, 12);
    const lensL = new THREE.Mesh(lensGeo, skinMaterial(lens));
    lensL.scale.set(1.2, 0.56, 0.22);
    lensL.position.set(-0.17, 0.06, -0.43);
    const lensR = lensL.clone();
    lensR.position.x = 0.17;
    const bridge = makeSoftBox(0.09, 0.025, 0.03, gold, 0.01);
    bridge.position.set(0, 0.06, -0.44);
    const rimL = makeSoftBox(0.28, 0.025, 0.03, gold, 0.01);
    rimL.position.set(-0.17, 0.13, -0.44);
    const rimR = rimL.clone();
    rimR.position.x = 0.17;
    const armL = makeSoftBox(0.03, 0.022, 0.18, gold, 0.01);
    armL.position.set(-0.31, 0.06, -0.34);
    const armR = armL.clone();
    armR.position.x = 0.31;
    glasses.add(lensL, lensR, bridge, rimL, rimR, armL, armR);

    const smile = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.018, 10, 18, Math.PI),
        skinMaterial(0x333333)
    );
    smile.rotation.set(Math.PI, 0, 0);
    smile.position.set(0, -0.16, -0.42);

    head.add(skull, hairCap, hairFront, flick, spike, hairSide, hairSideR, hairBack, glasses, smile);
    head.position.y = 2.14;

    const leftArm = makeBlockLimb(0.26, 0.9, 0.26, black, skin, 0.22, 0.26);
    leftArm.position.set(-0.63, 1.84, 0);
    const rightArm = makeBlockLimb(0.26, 0.9, 0.26, black, skin, 0.22, 0.26);
    rightArm.position.set(0.63, 1.84, 0);

    const leftLeg = makeBlockLimb(0.3, 0.72, 0.3, black, skin, 0.2, 0.52);
    leftLeg.position.set(-0.2, 0.88, 0);
    const rightLeg = makeBlockLimb(0.3, 0.72, 0.3, black, skin, 0.2, 0.52);
    rightLeg.position.set(0.2, 0.88, 0);

    body.add(torso, zipper, zipPull, head, leftArm, rightArm, leftLeg, rightLeg);
    body.position.set(0, 0, 16);
    body.userData = { head, leftArm, rightArm, leftLeg, rightLeg, walk: 0 };
    return body;
}

function makeViewHands() {
    const hands = new THREE.Group();
    const skin = 0xfbfbfb;
    const black = 0x0a0a0a;

    function makeHand(side) {
        const group = new THREE.Group();
        const sleeve = makeSoftBox(0.26, 0.06, 0.07, black, 0.015);
        sleeve.position.set(side * 0.04, 0, 0);
        const palm = makeSoftBox(0.08, 0.065, 0.08, skin, 0.018);
        palm.position.set(side * -0.1, 0.004, -0.015);
        group.add(sleeve, palm);
        group.position.set(side * 0.42, -0.32, -0.5);
        group.rotation.x = 0.18;
        group.rotation.y = side * 0.06;
        group.rotation.z = side * 0.04;
        return group;
    }

    const left = makeHand(-1);
    const right = makeHand(1);
    const chest = makeSoftBox(0.36, 0.24, 0.16, black, 0.03);
    chest.position.set(0, -0.3, -0.5);
    chest.rotation.x = 0.45;
    const zipper = makeSoftBox(0.012, 0.18, 0.02, 0x3a3a3a, 0.004);
    zipper.position.set(0, -0.3, -0.59);
    zipper.rotation.x = 0.45;
    hands.add(left, right, chest, zipper);
    hands.userData = { left, right };
    return hands;
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
    const hit = makeHitBox(5.1, 4.2, 5.1, color);
    hit.position.y = 2.1;
    group.add(left, right, top, glow, hit);
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
    const hit = makeHitBox(2.28, 2.28, 2.28, 0xffee00);
    star.add(hit);
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
    const hit = makeHitBox(2.2, 3.4, 2.2, 0x66ff66);
    hit.position.y = 1.7;
    tree.add(trunk, leaves, hit);
    tree.position.set(x, 0, z);
    return tree;
}

if (typeof THREE === 'undefined') {
    hintEl.textContent = 'Could not load the 3D world. Check the internet.';
} else {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 28, 70);

    const camera = new THREE.PerspectiveCamera(60, ARENA_WIDTH / ARENA_HEIGHT, 0.08, 120);
    scene.add(camera);
    const viewHands = makeViewHands();
    camera.add(viewHands);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ARENA_WIDTH, ARENA_HEIGHT);
    renderer.shadowMap.enabled = true;
    viewEl.appendChild(renderer.domElement);

    const sun = new THREE.DirectionalLight(0xfff4d2, 1.1);
    sun.position.set(12, 22, 8);
    sun.castShadow = true;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xbcdcff, 0x4a7a32, 0.85));
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-8, 10, 12);
    scene.add(fill);

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
    const playerHit = makeHitBox(1.3, 2.2, 0.7, 0x00ff88);
    scene.add(playerHit);
    const viewHit = makeHitBox(1.3, 0.45, 0.35, 0xff66ff);
    viewHit.position.set(0, -0.26, -0.5);
    viewHands.add(viewHit);
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
        const first = viewMode === 'first';
        player.visible = !first;
        viewHands.visible = first;
        player.userData.head.visible = !first;
        player.userData.leftArm.visible = true;
        player.userData.rightArm.visible = true;
        if (first) {
            const walk = player.userData.walk;
            viewHands.position.set(Math.cos(walk) * 0.012, Math.sin(walk) * 0.018, 0);
            viewHands.rotation.set(0, 0, 0);
            viewHands.userData.left.rotation.x = 0.28 + Math.sin(walk) * 0.1;
            viewHands.userData.right.rotation.x = 0.28 + Math.sin(walk + Math.PI) * 0.1;
            const eyeY = player.position.y + 2.14;
            const pitch = lookPitch - 0.18;
            const lookX = Math.sin(rot) * Math.cos(pitch);
            const lookY = Math.sin(pitch);
            const lookZ = -Math.cos(rot) * Math.cos(pitch);
            camera.position.set(
                player.position.x + lookX * 0.04,
                eyeY,
                player.position.z + lookZ * 0.04
            );
            camera.lookAt(
                player.position.x + lookX,
                eyeY + lookY,
                player.position.z + lookZ
            );
            return;
        }
        const back = 7.4 * Math.cos(lookPitch * 0.7);
        camera.position.set(
            player.position.x - Math.sin(rot) * back,
            player.position.y + 3.6 - lookPitch * 3.2,
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
        playerHit.position.set(player.position.x, player.position.y + 1.1, player.position.z);
        playerHit.rotation.y = player.rotation.y;
        playerHit.visible = true;
        viewHit.visible = viewMode === 'first';
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
