const ARENA_WIDTH = 1000;
const ARENA_HEIGHT = 560;
const BALL_R = 0.46;
const TRACK_W = 2.2;
const FLOOR_THICK = 0.16;
const SKITTLE_RED = '#ED1C24';
const TRACK_COLORS = [0xed1c24, 0xf26522, 0xfff200, 0x8dc63f, 0x662d91];
const GROUND_Y = 0;
const GRAVITY = 0.018;
const FLOOR_LIMIT = 100;
const RIDE_SPACING = 46;
const RIDE_COLS = 4;

const keys = {};
const viewEl = document.getElementById('view');
const startScreen = document.getElementById('start-screen');
const winScreen = document.getElementById('win-screen');
const againBtn = document.getElementById('again-btn');
const pickBtn = document.getElementById('pick-btn');
const floorBtn = document.getElementById('floor-btn');
const trackPicks = document.getElementById('track-picks');
const hudTitle = document.getElementById('hud-title');
const hudHint = document.getElementById('hud-hint');
const ridesBtn = document.getElementById('rides-btn');
const keepBtn = document.getElementById('keep-btn');

let playing = false;
let picking = false;
let finished = false;
let onTrack = true;
let progress = 0.012;
let lateral = 0;
let speed = 0.08;
let chosenTrack = 0;
const vel = new THREE.Vector3();
const lastPos = new THREE.Vector3();
const camPos = new THREE.Vector3(0, 30, 22);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87cceb);
scene.fog = new THREE.Fog(0x87cceb, 70, 200);

const camera = new THREE.PerspectiveCamera(68, ARENA_WIDTH / ARENA_HEIGHT, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(ARENA_WIDTH, ARENA_HEIGHT);
renderer.shadowMap.enabled = true;
viewEl.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xfff1d6, 0x4a7a3a, 0.95));
const sun = new THREE.DirectionalLight(0xfff4d2, 0.95);
sun.position.set(18, 40, 12);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
    new THREE.CircleGeometry(140, 56),
    new THREE.MeshLambertMaterial({ color: 0x5aa862 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
ground.receiveShadow = true;
scene.add(ground);

function pt(x, y, z) {
    return new THREE.Vector3(x, y, z);
}

function spiral(cx, cz, y0, y1, radius, turns, count, angle0) {
    const pts = [];
    for (let i = 0; i <= count; i += 1) {
        const t = i / count;
        const a = angle0 + t * turns * Math.PI * 2;
        pts.push(pt(
            cx + Math.cos(a) * radius,
            y0 + (y1 - y0) * t,
            cz + Math.sin(a) * radius
        ));
    }
    return pts;
}

const TRACKS = [
    {
        name: 'Candy Spiral',
        look: 'The first twisty track',
        points: () => [
            pt(0, 26.4, 18), pt(0, 26, 13), pt(0, 25.6, 9),
            ...spiral(0, 0, 25.2, 12.2, 7.2, 2.35, 36, Math.PI / 2),
            pt(8.5, 11.4, -2), pt(15, 9.8, -8), pt(16.5, 8.4, -16),
            pt(10, 7.2, -23), pt(2, 6.4, -24),
            ...spiral(-2, -24, 6.1, 2.4, 5.2, 1.55, 22, Math.PI),
            pt(-8, 2.1, -16), pt(-5, 1.6, -9), pt(0, 1.25, -4), pt(3.5, 1.05, 1)
        ]
    },
    {
        name: 'Zigzag Slide',
        look: 'Left, right, left, right',
        points: () => {
            const pts = [pt(0, 22, 18)];
            for (let i = 0; i < 11; i += 1) {
                pts.push(pt(i % 2 === 0 ? -11 : 11, 20.5 - i * 1.7, 14 - i * 3.1));
            }
            pts.push(pt(2, 1.2, -18));
            return pts;
        }
    },
    {
        name: 'Giant Circle',
        look: 'One huge round slide',
        points: () => [
            pt(12, 24, 0),
            ...spiral(0, 0, 23.5, 1.3, 12, 3.1, 42, 0)
        ]
    },
    {
        name: 'Sneaky Snake',
        look: 'A wiggly candy path',
        points: () => {
            const pts = [];
            for (let i = 0; i <= 26; i += 1) {
                const t = i / 26;
                pts.push(pt(Math.sin(t * Math.PI * 5) * 9, 22 - t * 20.6, 18 - t * 38));
            }
            return pts;
        }
    },
    {
        name: 'Twin Twirl',
        look: 'Two spins in a row',
        points: () => [
            pt(-8, 24.2, 14),
            ...spiral(-8, 6, 23.6, 12, 5.4, 1.8, 24, Math.PI / 2),
            pt(0, 11.2, 2),
            pt(8, 10.4, -4),
            ...spiral(8, -12, 10, 1.5, 5.2, 1.7, 24, 0),
            pt(8, 1.2, -20)
        ]
    },
    {
        name: 'Rainbow Hills',
        look: 'Up and down bumps',
        points: () => {
            const pts = [];
            for (let i = 0; i <= 22; i += 1) {
                const t = i / 22;
                pts.push(pt(
                    Math.sin(t * Math.PI * 2) * 6,
                    21 - t * 19.6 + Math.sin(t * Math.PI * 6) * 2.2,
                    16 - t * 34
                ));
            }
            return pts;
        }
    },
    {
        name: 'Tight Coil',
        look: 'A small fast corkscrew',
        points: () => [
            pt(4, 26, 4),
            ...spiral(0, 0, 25.4, 1.3, 4.1, 4.2, 52, 0)
        ]
    },
    {
        name: 'Wave Run',
        look: 'Big side-to-side waves',
        points: () => {
            const pts = [];
            for (let i = 0; i <= 24; i += 1) {
                const t = i / 24;
                pts.push(pt(Math.sin(t * Math.PI * 3) * 16, 21 - t * 19.7, 14 - t * 30));
            }
            return pts;
        }
    },
    {
        name: 'Box Turns',
        look: 'Sharp square corners',
        points: () => [
            pt(0, 22, 16), pt(12, 20, 16), pt(12, 17, 4), pt(-12, 14, 4),
            pt(-12, 11, -8), pt(12, 8, -8), pt(12, 5, -20), pt(-8, 3, -20),
            pt(-8, 1.5, -8), pt(4, 1.15, -2)
        ]
    },
    {
        name: 'Figure Eight',
        look: 'Two loops like an 8',
        points: () => {
            const pts = [];
            for (let i = 0; i <= 48; i += 1) {
                const t = i / 48;
                const a = t * Math.PI * 4;
                pts.push(pt(Math.sin(a) * 10, 22 - t * 20.6, Math.sin(a) * Math.cos(a) * 10));
            }
            return pts;
        }
    },
    {
        name: 'Sky Drop',
        look: 'A tall steep chute',
        points: () => [
            pt(0, 32, 16), pt(0, 28, 10), pt(0, 18, 2), pt(0, 8, -4),
            pt(4, 4, -10), pt(10, 2.2, -16), pt(8, 1.4, -22), pt(2, 1.1, -26)
        ]
    },
    {
        name: 'Gem Vault',
        look: 'Unlock with 5 gems from Home World',
        locked: true,
        gemCost: 5,
        points: () => [
            pt(0, 30, 16),
            ...spiral(0, 2, 29, 14, 6.4, 2.1, 32, Math.PI / 2),
            pt(10, 12.5, -4),
            pt(16, 9, -12),
            ...spiral(4, -16, 8.4, 1.4, 6, 2, 28, 0),
            pt(-2, 1.2, -8)
        ]
    }
];

const GEM_KEY = 'home-world-gems';

function getGems() {
    const n = Number(localStorage.getItem(GEM_KEY) || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function isRideOpen(track) {
    return !track.locked || getGems() >= (track.gemCost || 5);
}

const trackGroup = new THREE.Group();
scene.add(trackGroup);

const TRACK_SLOTS = TRACKS.map((_, index) => {
    const col = index % RIDE_COLS;
    const row = Math.floor(index / RIDE_COLS);
    return new THREE.Vector3((col - 1.5) * RIDE_SPACING, 0, (row - 1) * RIDE_SPACING);
});
const ridePaths = [];
const pathLengths = [];
const bowls = [];
const TRACK_HIT_TOP = 0.55;

function currentPath() {
    return ridePaths[chosenTrack];
}

function currentPathLength() {
    return pathLengths[chosenTrack];
}

function trackFrame(t, index = chosenTrack) {
    const path = ridePaths[index];
    const clamped = Math.max(0, Math.min(0.999, t));
    const tangent = path.getTangentAt(clamped).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(worldUp, tangent);
    if (binormal.lengthSq() < 0.0001) {
        binormal.set(1, 0, 0);
    } else {
        binormal.normalize();
    }
    const normal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();
    return {
        point: path.getPointAt(clamped),
        tangent,
        binormal,
        normal
    };
}

function orientOnTrack(mesh, frame) {
    const matrix = new THREE.Matrix4();
    matrix.lookAt(new THREE.Vector3(), frame.tangent, frame.normal);
    mesh.quaternion.setFromRotationMatrix(matrix);
}

function bounceOffHitBoxes(pos) {
    const near = nearestTrack(pos);
    const halfW = TRACK_W / 2 + BALL_R;
    const inside = Math.abs(near.lateral) <= halfW
        && near.height > -0.15
        && near.height < TRACK_HIT_TOP + BALL_R;
    if (!inside) return pos;
    const side = THREE.MathUtils.clamp(near.lateral, -(TRACK_W / 2 - 0.12), TRACK_W / 2 - 0.12);
    return sitOnTrack(near.t, side, near.index);
}

function makeRideSign(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(20, 10, 40, 0.75)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#FFD100';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 68);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true
    }));
    sprite.scale.set(10, 2.5, 1);
    sprite.position.set(0, 10, 0);
    return sprite;
}

function buildOneRide(index) {
    const path = new THREE.CatmullRomCurve3(TRACKS[index].points(), false, 'centripetal');
    ridePaths[index] = path;
    pathLengths[index] = path.getLength();
    const group = new THREE.Group();
    group.position.copy(TRACK_SLOTS[index]);

    const pieces = 70;
    for (let i = 0; i < pieces; i += 1) {
        const t = i / pieces;
        const t2 = Math.min(1, (i + 1) / pieces);
        const midT = (t + t2) / 2;
        const a = trackFrame(t, index);
        const b = trackFrame(t2, index);
        const midFrame = trackFrame(midT, index);
        const mid = a.point.clone().add(b.point).multiplyScalar(0.5);
        const span = Math.max(0.12, a.point.distanceTo(b.point) + 0.02);
        const color = TRACK_COLORS[Math.floor(t * 10) % TRACK_COLORS.length];

        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(TRACK_W, FLOOR_THICK, span),
            new THREE.MeshLambertMaterial({ color })
        );
        orientOnTrack(floor, midFrame);
        floor.position.copy(mid);
        group.add(floor);

        [-1, 1].forEach((side) => {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.4, span),
                new THREE.MeshLambertMaterial({ color: 0xfff7e0 })
            );
            orientOnTrack(rail, midFrame);
            rail.position.copy(mid)
                .addScaledVector(midFrame.binormal, side * (TRACK_W / 2))
                .addScaledVector(midFrame.normal, 0.2);
            group.add(rail);
        });
    }

    for (let i = 0; i < 8; i += 1) {
        const t = (i + 0.5) / 8;
        const spot = path.getPointAt(t);
        if (spot.y < 1.6) continue;
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.18, spot.y, 8),
            new THREE.MeshLambertMaterial({ color: 0xd4a017 })
        );
        post.position.set(spot.x, spot.y / 2, spot.z);
        group.add(post);
    }

    const start = TRACKS[index].points()[0];
    const startPad = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.22, 4.2),
        new THREE.MeshLambertMaterial({ color: 0xffd100 })
    );
    startPad.position.copy(start);
    startPad.position.y -= 0.12;
    group.add(startPad);

    const finish = trackFrame(0.985, index);
    const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.4, 0.7, 24, 1, true),
        new THREE.MeshLambertMaterial({ color: 0xed1c24, side: THREE.DoubleSide })
    );
    bowl.position.copy(finish.point);
    bowl.position.y -= 0.1;
    group.add(bowl);
    bowls[index] = bowl;
    const bowlFloor = new THREE.Mesh(
        new THREE.CircleGeometry(2.3, 24),
        new THREE.MeshLambertMaterial({ color: 0xffd100 })
    );
    bowlFloor.rotation.x = -Math.PI / 2;
    bowlFloor.position.copy(finish.point);
    bowlFloor.position.y -= 0.42;
    group.add(bowlFloor);
    group.add(makeRideSign(TRACKS[index].name));
    trackGroup.add(group);
}

function buildAllRides() {
    while (trackGroup.children.length) {
        trackGroup.remove(trackGroup.children[0]);
    }
    TRACKS.forEach((_, index) => buildOneRide(index));
    hudTitle.textContent = TRACKS[chosenTrack].name;
}

function addTree(x, z) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.7, 7),
        new THREE.MeshLambertMaterial({ color: 0x6b3f1d })
    );
    trunk.position.set(x, GROUND_Y + 0.35, z);
    const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0x2e7d32 })
    );
    leaves.position.set(x, GROUND_Y + 0.95, z);
    scene.add(trunk, leaves);
}

[
    [-22, 10], [-16, 20], [18, 14], [24, 4],
    [-26, -8], [22, -18], [-12, -28], [8, 24],
    [28, -8], [-30, 4], [14, -26], [-8, 26],
    [60, 20], [-60, 20], [60, -40], [-60, -40],
    [20, 60], [-20, 60], [80, 0], [-80, 0]
].forEach(([x, z]) => addTree(x, z));

function makeSkittleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = SKITTLE_RED;
    ctx.fillRect(0, 0, 256, 256);
    const glow = ctx.createRadialGradient(108, 88, 12, 128, 128, 150);
    glow.addColorStop(0, '#ff5a5a');
    glow.addColorStop(0.5, SKITTLE_RED);
    glow.addColorStop(1, '#9b1016');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 150px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.strokeText('S', 128, 132);
    ctx.fillText('S', 128, 132);
    return new THREE.CanvasTexture(canvas);
}

const skittle = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 24, 18),
    new THREE.MeshPhongMaterial({
        color: 0xed1c24,
        map: makeSkittleTexture(),
        emissive: 0x5a0000,
        shininess: 70,
        specular: 0xffcccc
    })
);
skittle.castShadow = true;
scene.add(skittle);

function sitOnTrack(t, side, index = chosenTrack) {
    const frame = trackFrame(t, index);
    return frame.point.clone()
        .addScaledVector(frame.binormal, side)
        .addScaledVector(frame.normal, FLOOR_THICK / 2 + BALL_R - 0.01)
        .add(TRACK_SLOTS[index]);
}

function nearestTrack(pos) {
    let bestT = 0;
    let bestIndex = chosenTrack;
    let bestDist = Infinity;
    const steps = 40;
    TRACKS.forEach((_, index) => {
        const local = pos.clone().sub(TRACK_SLOTS[index]);
        for (let i = 0; i <= steps; i += 1) {
            const t = i / steps * 0.999;
            const dist = local.distanceToSquared(ridePaths[index].getPointAt(t));
            if (dist < bestDist) {
                bestDist = dist;
                bestT = t;
                bestIndex = index;
            }
        }
    });
    const frame = trackFrame(bestT, bestIndex);
    const offset = pos.clone().sub(TRACK_SLOTS[bestIndex]).sub(frame.point);
    return {
        t: bestT,
        index: bestIndex,
        frame,
        lateral: offset.dot(frame.binormal),
        height: offset.dot(frame.normal)
    };
}

function resetRun() {
    playing = true;
    finished = false;
    onTrack = true;
    progress = 0.012;
    lateral = 0;
    speed = 0.1;
    vel.set(0, 0, 0);
    skittle.rotation.set(0, 0, 0);
    skittle.position.copy(sitOnTrack(progress, 0));
    lastPos.copy(skittle.position);
    picking = false;
    winScreen.hidden = true;
    startScreen.hidden = true;
    keepBtn.hidden = true;
}

function updatePlaceHint() {
    if (!playing) {
        hudHint.textContent = 'All 12 rides · Tap one';
        return;
    }
    hudHint.textContent = onTrack ? 'On the track · Tap Rides' : 'On the floor · See every ride';
}

function showPicks() {
    picking = true;
    keepBtn.hidden = !playing && !finished;
    winScreen.hidden = true;
    startScreen.hidden = false;
    refreshRideLocks();
}

function hidePicks() {
    picking = false;
    startScreen.hidden = true;
    keepBtn.hidden = true;
}

function startTrack(index) {
    const track = TRACKS[index];
    if (!isRideOpen(track)) {
        return;
    }
    chosenTrack = index;
    hudTitle.textContent = TRACKS[index].name;
    resetRun();
}

function paintRideButton(btn, track, index) {
    const gems = getGems();
    const open = isRideOpen(track);
    btn.disabled = !open;
    btn.classList.toggle('locked', !open);
    if (!track.locked) {
        btn.innerHTML = `${index + 1}. ${track.name}<small>${track.look}</small>`;
        return;
    }
    btn.innerHTML = open
        ? `${index + 1}. ${track.name}<small>Unlocked with Home World gems!</small>`
        : `${index + 1}. ${track.name}<small>Need ${track.gemCost} gems · you have ${gems}</small>`;
}

TRACKS.forEach((track, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'track-pick';
    paintRideButton(btn, track, index);
    btn.addEventListener('click', () => startTrack(index));
    trackPicks.appendChild(btn);
});

function refreshRideLocks() {
    [...trackPicks.children].forEach((btn, index) => {
        paintRideButton(btn, TRACKS[index], index);
    });
}

buildAllRides();
skittle.position.copy(sitOnTrack(progress, 0));
lastPos.copy(skittle.position);

function fitGame() {
    const wrap = document.querySelector('.game-wrap');
    const scale = Math.min(
        (window.innerWidth - 24) / ARENA_WIDTH,
        (window.innerHeight - 24) / ARENA_HEIGHT,
        1
    );
    wrap.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitGame);
fitGame();

window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
    }
});
window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

againBtn.addEventListener('click', () => startTrack(chosenTrack));
pickBtn.addEventListener('click', showPicks);
ridesBtn.addEventListener('click', showPicks);
keepBtn.addEventListener('click', hidePicks);
floorBtn.addEventListener('click', () => {
    finished = false;
    onTrack = false;
    playing = true;
    picking = false;
    winScreen.hidden = true;
    startScreen.hidden = true;
    keepBtn.hidden = true;
    vel.set(0, 0, 0);
    skittle.position.y = GROUND_Y + BALL_R;
    lastPos.copy(skittle.position);
});

function dropToFloor(frame, extraSide) {
    onTrack = false;
    vel.copy(frame.tangent).multiplyScalar(speed);
    vel.addScaledVector(frame.binormal, extraSide);
    vel.y -= 0.04;
}

function tick() {
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    look.y = 0;
    if (look.lengthSq() < 0.0001) look.set(0, 0, -1);
    look.normalize();
    const right = new THREE.Vector3().crossVectors(look, new THREE.Vector3(0, 1, 0)).normalize();

    updatePlaceHint();

    if (picking) {
        // menu is open on the track or the floor
    } else if (playing && !finished && onTrack) {
        const frame = trackFrame(progress);
        if (keys.KeyS || keys.ArrowDown) speed *= 0.96;
        const ahead = currentPath().getPointAt(Math.min(0.999, progress + 0.012));
        const want = THREE.MathUtils.clamp(0.08 + Math.max(0, frame.point.y - ahead.y) * 1.4, 0.08, 0.28);
        if (keys.KeyW || keys.ArrowUp) speed += 0.002;
        speed += (want - speed) * 0.06;
        speed = THREE.MathUtils.clamp(speed, 0.06, 0.32);

        if (keys.KeyA || keys.ArrowLeft) lateral -= 0.03;
        if (keys.KeyD || keys.ArrowRight) lateral += 0.03;
        lateral *= 0.92;
        const maxL = TRACK_W / 2 - 0.12;
        if (Math.abs(lateral) > maxL) {
            dropToFloor(frame, Math.sign(lateral) * 0.12);
            skittle.position.copy(sitOnTrack(progress, Math.sign(lateral) * maxL));
        } else {
            progress += speed / currentPathLength();
            if (progress >= 0.986) {
                progress = 0.986;
                finished = true;
                winScreen.hidden = false;
            }
            skittle.position.copy(sitOnTrack(progress, lateral));
        }
    } else if (playing && !finished) {
        if (keys.KeyW || keys.ArrowUp) vel.addScaledVector(look, 0.012);
        if (keys.KeyS || keys.ArrowDown) vel.addScaledVector(look, -0.012);
        if (keys.KeyA || keys.ArrowLeft) vel.addScaledVector(right, -0.012);
        if (keys.KeyD || keys.ArrowRight) vel.addScaledVector(right, 0.012);
        vel.y -= GRAVITY;
        vel.x *= 0.985;
        vel.z *= 0.985;
        skittle.position.add(vel);
        const beforeHit = skittle.position.clone();
        skittle.position.copy(bounceOffHitBoxes(skittle.position));
        if (skittle.position.distanceTo(beforeHit) > 0.0001) {
            vel.multiplyScalar(0.55);
        }

        const floorTop = GROUND_Y + BALL_R;
        if (skittle.position.y <= floorTop) {
            skittle.position.y = floorTop;
            if (vel.y < 0) vel.y *= -0.18;
        }

        skittle.position.x = Math.max(-FLOOR_LIMIT, Math.min(FLOOR_LIMIT, skittle.position.x));
        skittle.position.z = Math.max(-FLOOR_LIMIT, Math.min(FLOOR_LIMIT, skittle.position.z));

        const near = nearestTrack(skittle.position);
        const onLowTrack = near.height > 0.05 && near.height < BALL_R * 2.1
            && Math.abs(near.lateral) < TRACK_W / 2 - 0.1
            && vel.y <= 0.08;
        if (onLowTrack && near.frame.point.y < skittle.position.y + 1.2 && isRideOpen(TRACKS[near.index])) {
            onTrack = true;
            chosenTrack = near.index;
            hudTitle.textContent = TRACKS[chosenTrack].name;
            progress = near.t;
            lateral = near.lateral;
            speed = Math.max(0.08, Math.hypot(vel.x, vel.z));
            vel.set(0, 0, 0);
            skittle.position.copy(sitOnTrack(progress, lateral, chosenTrack));
        }

        const bowlPos = new THREE.Vector3();
        bowls[chosenTrack].getWorldPosition(bowlPos);
        if (skittle.position.distanceTo(bowlPos) < 2.2) {
            finished = true;
            winScreen.hidden = false;
        }
    } else if (!playing && !picking) {
        skittle.position.copy(sitOnTrack(progress, 0));
    }

    const moved = skittle.position.clone().sub(lastPos);
    const rollAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), moved);
    if (rollAxis.lengthSq() > 0.0000001) {
        skittle.rotateOnWorldAxis(rollAxis.normalize(), moved.length() / BALL_R);
    }
    lastPos.copy(skittle.position);

    const follow = onTrack ? trackFrame(progress).tangent.clone() : look;
    const desired = skittle.position.clone()
        .addScaledVector(follow, onTrack ? -5 : -8)
        .add(new THREE.Vector3(0, onTrack ? 3.2 : 6.5, 0));
    camPos.lerp(desired, playing ? 0.06 : 0.03);
    camera.position.copy(camPos);
    camera.lookAt(skittle.position.x, skittle.position.y + 0.4, skittle.position.z);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

tick();
