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
    body.position.set(0, 0, 6);
    body.userData = { head, leftArm, rightArm, leftLeg, rightLeg, walk: 0 };
    return body;
}

function makeViewHands() {
    const hands = new THREE.Group();
    const skin = 0xfbfbfb;
    const black = 0x0a0a0a;

    function makeHand(side) {
        const group = new THREE.Group();
        const sleeve = makeSoftBox(0.16, 0.58, 0.14, black, 0.03);
        sleeve.position.set(side * 0.02, 0.06, 0);
        const palm = makeSoftBox(0.06, 0.05, 0.08, skin, 0.016);
        palm.position.set(side * -0.04, -0.24, -0.08);
        palm.rotation.x = 0.6;
        palm.rotation.y = side * 0.4;
        palm.rotation.z = side * 0.25;
        group.add(sleeve, palm);
        group.position.set(side * 0.4, -0.04, -0.38);
        return group;
    }

    const left = makeHand(-1);
    const right = makeHand(1);
    hands.add(left, right);
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

const CITY_BLOCK = 28;
const CITY_VIEW = 3;
const BUILDING_COLORS = [0x4a5568, 0x6b7280, 0x3d4f6f, 0x5c6b7a, 0x2d3748, 0x7c5c4a, 0x4b5563];
let windowMat;
let roadMat;
let lineMat;
let walkMat;

function cityMaterials() {
    if (windowMat) {
        return;
    }
    windowMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
    roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
    lineMat = new THREE.MeshLambertMaterial({ color: 0xf5d76e });
    walkMat = new THREE.MeshLambertMaterial({ color: 0x8b9098 });
}

function cityHash(cx, cz) {
    return Math.abs((cx * 73856093) ^ (cz * 19349663) ^ (cx * cz * 83492791));
}

function addCityBuilding(chunk, originX, originZ, lx, lz, width, height, depth, color, hasLadder, faceX, faceZ) {
    const building = new THREE.Group();
    const wall = makeBox(width, height, depth, color);
    wall.position.y = height / 2;
    building.add(wall);
    addWindows(building, width, height, depth, Math.abs(Math.round(originX + lx * 17 + lz * 31)));
    building.position.set(lx, 0, lz);
    chunk.add(building);
    chunk.userData.buildings.push({
        x: originX + lx,
        z: originZ + lz,
        w: width,
        d: depth,
        h: height
    });

    if (!hasLadder) {
        return;
    }

    const gap = 0.58;
    const ladderX = lx + faceX * (width / 2 + gap);
    const ladderZ = lz + faceZ * (depth / 2 + gap);
    const ladder = makeLadder(height);
    ladder.position.set(ladderX, 0, ladderZ);
    if (faceX !== 0) {
        ladder.rotation.y = Math.PI / 2;
    }
    chunk.add(ladder);
    chunk.userData.ladders.push({
        x: originX + ladderX,
        z: originZ + ladderZ,
        top: height,
        inX: -faceX,
        inZ: -faceZ
    });
}

function addWindows(building, width, height, depth, seed) {
    const rows = Math.min(5, Math.max(1, Math.floor(height / 3)));
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < 2; col += 1) {
            if ((seed + row * 3 + col) % 5 === 0) {
                continue;
            }
            const window = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.08), windowMat);
            window.position.set(-width * 0.22 + col * width * 0.44, 1.4 + row * 2.1, depth / 2 + 0.05);
            building.add(window);
        }
    }
}

function makeLadder(height) {
    const ladder = new THREE.Group();
    const railL = makeBox(0.1, height, 0.1, 0x6b3d1f);
    railL.position.set(-0.32, height / 2, 0);
    const railR = makeBox(0.1, height, 0.1, 0x6b3d1f);
    railR.position.set(0.32, height / 2, 0);
    ladder.add(railL, railR);
    const rungs = Math.max(3, Math.floor(height / 0.5));
    for (let i = 0; i < rungs; i += 1) {
        const rung = makeBox(0.74, 0.08, 0.1, 0xd2a05a);
        rung.position.y = 0.28 + i * 0.5;
        ladder.add(rung);
    }
    return ladder;
}

function makeLamp(x, z) {
    const lamp = new THREE.Group();
    const pole = makeBox(0.12, 3.4, 0.12, 0x222222);
    pole.position.y = 1.7;
    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0 })
    );
    bulb.position.y = 3.5;
    lamp.add(pole, bulb);
    lamp.position.set(x, 0, z);
    return lamp;
}

function makeCityChunk(cx, cz) {
    cityMaterials();
    const chunk = new THREE.Group();
    const originX = cx * CITY_BLOCK;
    const originZ = cz * CITY_BLOCK;
    chunk.position.set(originX, 0, originZ);
    chunk.userData.buildings = [];
    chunk.userData.ladders = [];

    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY_BLOCK, CITY_BLOCK), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    chunk.add(road);

    const stripeA = new THREE.Mesh(new THREE.PlaneGeometry(0.18, CITY_BLOCK * 0.7), lineMat);
    stripeA.rotation.x = -Math.PI / 2;
    stripeA.position.y = 0.03;
    const stripeB = new THREE.Mesh(new THREE.PlaneGeometry(CITY_BLOCK * 0.7, 0.18), lineMat);
    stripeB.rotation.x = -Math.PI / 2;
    stripeB.position.y = 0.03;
    chunk.add(stripeA, stripeB);

    const plaza = cx === 0 && cz === 0;
    if (plaza) {
        const square = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), walkMat);
        square.rotation.x = -Math.PI / 2;
        square.position.y = 0.04;
        chunk.add(square);
        chunk.add(makeLamp(-4, -4), makeLamp(4, -4), makeLamp(-4, 4), makeLamp(4, 4));
        addCityBuilding(chunk, originX, originZ, 0, -10, 6, 7, 6, 0x4a5568, 1, 0, 1);
        return chunk;
    }

    const seed = cityHash(cx, cz);
    const lots = [
        [-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]
    ];
    lots.forEach(([lx, lz], index) => {
        const height = 5 + (seed + index * 19) % 16;
        const width = 6 + (seed + index * 5) % 3;
        const depth = 6 + (seed + index * 11) % 3;
        const color = BUILDING_COLORS[(seed + index) % BUILDING_COLORS.length];
        const towardX = lx > 0 ? -1 : 1;
        const towardZ = lz > 0 ? -1 : 1;
        const faceZ = Math.abs(lz) >= Math.abs(lx);
        const hasLadder = index === 0 || (seed + index) % 3 === 0;
        addCityBuilding(
            chunk,
            originX,
            originZ,
            lx,
            lz,
            width,
            height,
            depth,
            color,
            hasLadder ? 1 : 0,
            faceZ ? 0 : towardX,
            faceZ ? towardZ : 0
        );
    });

    if (seed % 2 === 0) {
        chunk.add(makeLamp(0, -3));
    } else {
        chunk.add(makeLamp(3, 0));
    }
    return chunk;
}

if (typeof THREE === 'undefined') {
    hintEl.textContent = 'Could not load the 3D world. Check the internet.';
} else {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6f8eaa);
    scene.fog = new THREE.Fog(0x6f8eaa, 40, 95);

    const camera = new THREE.PerspectiveCamera(60, ARENA_WIDTH / ARENA_HEIGHT, 0.08, 160);
    scene.add(camera);
    const viewHands = makeViewHands();
    camera.add(viewHands);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ARENA_WIDTH, ARENA_HEIGHT);
    renderer.shadowMap.enabled = true;
    viewEl.appendChild(renderer.domElement);

    const sun = new THREE.DirectionalLight(0xfff1d0, 1.05);
    sun.position.set(18, 30, 10);
    sun.castShadow = true;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xb8c8d8, 0x3a3f46, 0.8));
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-10, 12, 8);
    scene.add(fill);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(220, 220),
        new THREE.MeshLambertMaterial({ color: 0x2f3338 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const player = makePlayer();
    scene.add(player);
    const playerState = { vy: 0, onGround: true, onLadder: false, spaceClimb: false };

    const doors = [
        makeDoor(-8, 8, 0xc8102e, 'The Great Mscape', '/'),
        makeDoor(8, 8, 0x5b3d8f, 'Hershey Super Power', '/food-fight')
    ];
    doors.forEach((door) => scene.add(door));

    const stars = [
        makeStar(0, 8),
        makeStar(8, 0),
        makeStar(-8, 0),
        makeStar(0, -8),
        makeStar(20, 4),
        makeStar(-20, 4),
        makeStar(4, 22),
        makeStar(-4, -20)
    ];
    stars.forEach((star) => scene.add(star));

    const cityChunks = new Map();

    function chunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    function updateCity() {
        ground.position.x = player.position.x;
        ground.position.z = player.position.z;
        const cx = Math.round(player.position.x / CITY_BLOCK);
        const cz = Math.round(player.position.z / CITY_BLOCK);
        const needed = new Set();
        for (let x = cx - CITY_VIEW; x <= cx + CITY_VIEW; x += 1) {
            for (let z = cz - CITY_VIEW; z <= cz + CITY_VIEW; z += 1) {
                const key = chunkKey(x, z);
                needed.add(key);
                if (!cityChunks.has(key)) {
                    const chunk = makeCityChunk(x, z);
                    scene.add(chunk);
                    cityChunks.set(key, chunk);
                }
            }
        }
        cityChunks.forEach((chunk, key) => {
            if (!needed.has(key)) {
                scene.remove(chunk);
                cityChunks.delete(key);
            }
        });
    }

    function nearestLadder() {
        let best = null;
        let bestDist = 1.15;
        cityChunks.forEach((chunk) => {
            chunk.userData.ladders.forEach((ladder) => {
                const dist = Math.hypot(player.position.x - ladder.x, player.position.z - ladder.z);
                if (dist < bestDist) {
                    best = ladder;
                    bestDist = dist;
                }
            });
        });
        return best;
    }

    function roofUnderPlayer() {
        let roof = 0;
        cityChunks.forEach((chunk) => {
            chunk.userData.buildings.forEach((building) => {
                const hx = building.w / 2 - 0.2;
                const hz = building.d / 2 - 0.2;
                if (
                    Math.abs(player.position.x - building.x) < hx &&
                    Math.abs(player.position.z - building.z) < hz &&
                    building.h > roof
                ) {
                    roof = building.h;
                }
            });
        });
        return roof;
    }

    function bumpOutOfBuildings() {
        if (playerState.onLadder) {
            return;
        }
        const radius = 0.55;
        cityChunks.forEach((chunk) => {
            chunk.userData.buildings.forEach((building) => {
                if (player.position.y >= building.h - 0.3) {
                    return;
                }
                const hx = building.w / 2 + radius;
                const hz = building.d / 2 + radius;
                const dx = player.position.x - building.x;
                const dz = player.position.z - building.z;
                if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
                    if (hx - Math.abs(dx) < hz - Math.abs(dz)) {
                        player.position.x = building.x + Math.sign(dx || 1) * hx;
                    } else {
                        player.position.z = building.z + Math.sign(dz || 1) * hz;
                    }
                }
            });
        });
    }

    updateCity();

    function updatePlayer() {
        const rot = player.rotation.y;
        const forwardX = Math.sin(rot);
        const forwardZ = -Math.cos(rot);
        const rightX = Math.cos(rot);
        const rightZ = Math.sin(rot);
        const near = nearestLadder();
        const wantUp = keys.Space || keys.KeyW || keys.ArrowUp;
        const wantDown = keys.KeyS || keys.ArrowDown;
        const midClimb = !!(
            near &&
            player.position.y > 0.12 &&
            player.position.y < near.top - 0.1 &&
            Math.hypot(player.position.x - near.x, player.position.z - near.z) < 1.35
        );
        const atRoof = !!(near && player.position.y >= near.top - 0.15);

        if (near && (wantUp || wantDown || midClimb) && (!atRoof || wantDown) && player.position.y <= near.top + 0.12) {
            playerState.onLadder = true;
            if (keys.Space) {
                playerState.spaceClimb = true;
            }
            playerState.vy = 0;
            player.position.x = near.x;
            player.position.z = near.z;
            if (wantUp && !atRoof) {
                player.position.y += 0.09;
            }
            if (wantDown) {
                player.position.y -= 0.09;
            }
            if (player.position.y < 0) {
                player.position.y = 0;
            }
            if (player.position.y >= near.top - 0.08 && !wantDown) {
                player.position.y = near.top;
                player.position.x = near.x + near.inX * 1.2;
                player.position.z = near.z + near.inZ * 1.2;
                playerState.onLadder = false;
                playerState.onGround = true;
            } else {
                playerState.onGround = player.position.y <= 0.02;
            }
            player.userData.walk += wantUp || wantDown ? 0.18 : 0;
            const climbSwing = Math.sin(player.userData.walk) * 0.45;
            player.userData.leftArm.rotation.x = climbSwing;
            player.userData.rightArm.rotation.x = -climbSwing;
            player.userData.leftLeg.rotation.x = -climbSwing;
            player.userData.rightLeg.rotation.x = climbSwing;
            updateCity();
            return;
        }

        playerState.onLadder = false;

        let moveX = 0;
        let moveZ = 0;
        if (keys.KeyA || keys.ArrowLeft) {
            moveX -= rightX;
            moveZ -= rightZ;
        }
        if (keys.KeyD || keys.ArrowRight) {
            moveX += rightX;
            moveZ += rightZ;
        }
        if (keys.KeyW || keys.ArrowUp) {
            moveX += forwardX;
            moveZ += forwardZ;
        }
        if (keys.KeyS || keys.ArrowDown) {
            moveX -= forwardX;
            moveZ -= forwardZ;
        }

        const moving = moveX !== 0 || moveZ !== 0;
        if (moving) {
            const length = Math.hypot(moveX, moveZ) || 1;
            player.position.x += (moveX / length) * MOVE_SPEED;
            player.position.z += (moveZ / length) * MOVE_SPEED;
            player.userData.walk += 0.22;
        } else {
            player.userData.walk *= 0.85;
        }
        const swing = Math.sin(player.userData.walk) * (moving ? 0.7 : 0.08);
        player.userData.leftArm.rotation.x = swing;
        player.userData.rightArm.rotation.x = -swing;
        player.userData.leftLeg.rotation.x = -swing;
        player.userData.rightLeg.rotation.x = swing;

        if (!keys.Space) {
            playerState.spaceClimb = false;
        }
        if (keys.Space && playerState.onGround && !playerState.spaceClimb) {
            playerState.vy = JUMP_POWER;
            playerState.onGround = false;
        }

        const floorY = roofUnderPlayer();
        playerState.vy -= GRAVITY;
        player.position.y += playerState.vy;
        if (player.position.y <= floorY) {
            player.position.y = floorY;
            playerState.vy = 0;
            playerState.onGround = true;
        } else {
            playerState.onGround = false;
        }

        bumpOutOfBuildings();
        updateCity();
    }

    function updateHint() {
        if (starsGot === STAR_COUNT) {
            hintEl.textContent = 'You got every star!';
            return;
        }
        hintEl.textContent = viewMode === 'first'
            ? 'A left, D right, W forward. Walk to a ladder and press Space to climb. Press 2 for second person.'
            : 'A left, D right, W forward. Walk to a ladder and press Space to climb. Press 1 for first person.';
    }

    function updateCamera() {
        const rot = player.rotation.y;
        const first = viewMode === 'first';
        const head = player.userData.head;
        head.rotation.x = -lookPitch;
        player.visible = !first;
        viewHands.visible = first;
        head.visible = !first;
        player.userData.leftArm.visible = true;
        player.userData.rightArm.visible = true;
        const headY = player.position.y + 2.14;
        if (first) {
            const walk = player.userData.walk;
            viewHands.position.set(Math.cos(walk) * 0.012, Math.sin(walk) * 0.018, 0);
            viewHands.rotation.set(0, 0, 0);
            viewHands.userData.left.rotation.set(0, 0, 0);
            viewHands.userData.right.rotation.set(0, 0, 0);
            const pitch = lookPitch - 0.18;
            const lookX = Math.sin(rot) * Math.cos(pitch);
            const lookY = Math.sin(pitch);
            const lookZ = -Math.cos(rot) * Math.cos(pitch);
            camera.position.set(
                player.position.x + lookX * 0.08,
                headY,
                player.position.z + lookZ * 0.08
            );
            camera.lookAt(
                player.position.x + lookX,
                headY + lookY,
                player.position.z + lookZ
            );
            return;
        }
        const pitch = lookPitch * 0.7;
        const back = 7.4 * Math.max(0.55, Math.cos(pitch));
        const camY = Math.max(headY + 0.85, player.position.y + 3.4 - lookPitch * 2.4);
        camera.position.set(
            player.position.x - Math.sin(rot) * back,
            camY,
            player.position.z + Math.cos(rot) * back
        );
        camera.lookAt(player.position.x, headY, player.position.z);
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
