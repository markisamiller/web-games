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
let starsGot = 0;
let nearDoor = null;
let doorTimer = 0;

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

function makePlayer() {
    const body = new THREE.Group();
    const torso = makeBox(0.9, 1.2, 0.7, 0xc8102e);
    torso.position.y = 0.9;
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0xffd100 })
    );
    head.position.y = 1.75;
    const eyeL = makeBox(0.1, 0.1, 0.1, 0x1a0f08);
    eyeL.position.set(-0.12, 1.82, -0.32);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;
    body.add(torso, head, eyeL, eyeR);
    body.position.set(0, 0, 16);
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
        }

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

    function updateCamera() {
        const rot = player.rotation.y;
        camera.position.set(
            player.position.x - Math.sin(rot) * 9,
            player.position.y + 5.2,
            player.position.z + Math.cos(rot) * 9
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
    });
    window.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    fitGame();
    window.addEventListener('resize', fitGame);
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

fitGame();
window.addEventListener('resize', fitGame);
