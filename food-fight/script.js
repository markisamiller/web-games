// Hershey Super Power
// Open index.html in your browser to play.
//
// Want to add a new food later?
// 1. Add it in FOODS.
// 2. Add a match in MATCHES.
// 3. Add a look in styles.css (soda or bar, or make a new kind).

const ARENA_WIDTH = 1000;
const FLOOR_HEIGHT = 78;
const GRAVITY = 0.7;
const JUMP_POWER = 15;
const WALK_SPEED = 5;
const PUNCH_DAMAGE = 10;
const ENEMY_DAMAGE = 5;
const PUNCH_TIME = 22;
const PUNCH_HIT_START = 6;
const PUNCH_HIT_END = 14;
const PUNCH_COOLDOWN = 18;
const HIT_STUN = 14;
const KNOCKBACK = 8;
const MAX_HEALTH = 100;

const FOODS = {
    coke: {
        id: 'coke',
        name: 'Coke',
        kind: 'soda',
        width: 74,
        height: 118
    },
    pepsi: {
        id: 'pepsi',
        name: 'Pepsi',
        kind: 'soda',
        width: 74,
        height: 118
    },
    hershey: {
        id: 'hershey',
        name: 'Hershey',
        kind: 'bar',
        width: 108,
        height: 58
    },
    mars: {
        id: 'mars',
        name: 'Mars',
        kind: 'bar',
        width: 108,
        height: 58
    }
};

const CONTROL_SETS = [
    { left: 'KeyA', right: 'KeyD', jump: 'KeyW', punch: 'KeyF', hint: 'A D move, W jump, F punch' },
    { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', punch: 'KeyK', hint: 'arrows move, up jump, K punch' },
    { left: 'KeyJ', right: 'KeyL', jump: 'KeyI', punch: 'KeyU', hint: 'J L move, I jump, U punch' },
    { left: 'Digit1', right: 'Digit3', jump: 'Digit2', punch: 'Digit4', hint: '1 3 move, 2 jump, 4 punch' }
];

const MATCHES = [
    {
        id: 'squad',
        title: 'Snack Squad',
        subtitle: 'You vs Pepsi, Hershey, and Mars',
        foods: ['coke', 'pepsi', 'hershey', 'mars'],
        vsAi: true,
        playerId: 'coke'
    },
    {
        id: 'soda',
        title: 'Soda Showdown',
        subtitle: 'Coke vs Pepsi',
        foods: ['coke', 'pepsi']
    },
    {
        id: 'chocolate',
        title: 'Chocolate Clash',
        subtitle: 'Hershey vs Mars',
        foods: ['hershey', 'mars']
    },
    {
        id: 'party',
        title: '4 Player Battle',
        subtitle: 'Kids control every snack',
        foods: ['coke', 'pepsi', 'hershey', 'mars']
    }
];

const AI_STYLES = {
    pepsi: {
        speed: 5.6,
        punchRange: 82,
        jumpChance: 0.008,
        punchDelay: 16,
        attackGap: 60,
        startThink: 8
    },
    hershey: {
        speed: 5.1,
        punchRange: 96,
        jumpChance: 0.02,
        punchDelay: 22,
        attackGap: 54,
        startThink: 14
    },
    mars: {
        speed: 4.7,
        punchRange: 90,
        jumpChance: 0.01,
        punchDelay: 28,
        attackGap: 68,
        startThink: 22
    }
};

const AI_SLOT = {
    pepsi: 0,
    hershey: 1,
    mars: 2
};

let aiParkMode = 'split';
let aiAttackerId = '';
let aiAttackerUntil = 0;

const ONLINE_FOODS = ['coke', 'pepsi', 'hershey', 'mars'];
const EMPTY_INPUT = { left: false, right: false, jump: false, punch: false };
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const keys = {};
const arena = document.getElementById('arena');
const sparkEl = document.getElementById('hit-spark');
const bannerEl = document.getElementById('round-banner');

let currentMatch = MATCHES[0];
let fighters = [];
let gameActive = false;
let isPaused = false;
let winner = null;
let sparkTimer = 0;
let bannerTimer = 0;
let fightEnding = false;
let lastStateAt = 0;
let lastKeysAt = 0;

let net = {
    role: 'offline',
    code: '',
    peer: null,
    conns: [],
    hostConn: null,
    players: [],
    inputs: {},
    myIndex: 0,
    started: false
};

function showScreen(id) {
    document.querySelectorAll('.menu-screen').forEach((screen) => {
        screen.hidden = screen.id !== id;
    });
}

function hideMenus() {
    document.querySelectorAll('.menu-screen').forEach((screen) => {
        screen.hidden = true;
    });
}

function groundY(fighter) {
    return arena.clientHeight - FLOOR_HEIGHT - fighter.height;
}

function startX(index, total, width, match) {
    if (match && match.vsAi) {
        if (index === 0) {
            return 80;
        }
        const enemyIndex = index - 1;
        const enemyCount = Math.max(1, total - 1);
        const left = 420;
        const right = ARENA_WIDTH - 80 - width;
        if (enemyCount === 1) {
            return right;
        }
        return left + ((right - left) * enemyIndex) / (enemyCount - 1);
    }

    const left = 70;
    const right = ARENA_WIDTH - 70 - width;
    if (total === 1) {
        return (ARENA_WIDTH - width) / 2;
    }
    return left + ((right - left) * index) / (total - 1);
}

function makeFighter(foodId, index, total, match) {
    const food = FOODS[foodId];
    const controls = CONTROL_SETS[index];
    const isAi = !!(match && match.vsAi && foodId !== match.playerId);
    const style = AI_STYLES[foodId] || AI_STYLES.pepsi;

    return {
        id: food.id,
        name: food.name,
        kind: food.kind,
        width: food.width,
        height: food.height,
        x: startX(index, total, food.width, match),
        y: arena.clientHeight - FLOOR_HEIGHT - food.height,
        vx: 0,
        vy: 0,
        facing: index < total / 2 ? 1 : -1,
        health: MAX_HEALTH,
        punchTimer: 0,
        cooldown: 0,
        stun: 0,
        hitIds: [],
        down: false,
        isAi,
        team: (match && match.vsAi) ? (isAi ? 'enemy' : 'player') : food.id,
        ai: {
            timer: style.startThink,
            style
        },
        controls,
        el: null,
        fillEl: null,
        numsEl: null
    };
}

function paintFighter(el, fighter) {
    el.className = `fighter ${fighter.kind} ${fighter.id}`;
    el.style.width = `${fighter.width}px`;
    el.style.height = `${fighter.height}px`;
    el.innerHTML = `
        <div class="body">
            <div class="face">
                <div class="eye left"></div>
                <div class="eye right"></div>
                <div class="mouth"></div>
            </div>
            <div class="fist"></div>
        </div>
        <div class="name-tag">${fighter.name}</div>
    `;
}

function buildHud() {
    const hud = document.getElementById('hud');
    hud.innerHTML = '';

    fighters.forEach((fighter, index) => {
        const card = document.createElement('div');
        card.className = 'health-card';
        card.innerHTML = `
            <div class="fighter-name">${fighter.name}</div>
            <div class="health-bar">
                <div class="health-fill ${fighter.id}"></div>
            </div>
            <div class="health-nums">100</div>
        `;
        fighter.fillEl = card.querySelector('.health-fill');
        fighter.numsEl = card.querySelector('.health-nums');
        hud.appendChild(card);

        if (index === 0 && fighters.length === 2) {
            const vs = document.createElement('div');
            vs.className = 'vs-badge';
            vs.textContent = 'VS';
            hud.appendChild(vs);
        }
    });
}

function buildHints() {
    const hint = document.getElementById('controls-hint');
    if (currentMatch.vsAi) {
        hint.innerHTML = '<span>You are Coke: A D move, W jump, F punch</span><span>Enemies hit for 5</span><span>P pause</span>';
        return;
    }
    if (net.role !== 'offline' && fighters[net.myIndex]) {
        const mine = fighters[net.myIndex];
        hint.innerHTML = `<span>You are ${mine.name}: A D move, W jump, F punch</span><span>P pause</span>`;
        return;
    }
    hint.innerHTML = fighters
        .map((fighter) => `<span>${fighter.name}: ${fighter.controls.hint}</span>`)
        .join('') + '<span>P pause</span>';
}

function buildArenaFighters() {
    const box = document.getElementById('fighters');
    box.innerHTML = '';
    fighters.forEach((fighter) => {
        const el = document.createElement('div');
        paintFighter(el, fighter);
        fighter.el = el;
        box.appendChild(el);
    });
}

function clearKeys() {
    Object.keys(keys).forEach((code) => {
        keys[code] = false;
    });
}

function startMatch(match) {
    clearKeys();
    currentMatch = match;
    fightEnding = false;
    fighters = match.foods.map((foodId, index) => makeFighter(foodId, index, match.foods.length, match));
    aiParkMode = 'split';
    aiAttackerId = '';
    aiAttackerUntil = 0;
    buildArenaFighters();
    buildHud();
    buildHints();

    document.getElementById('hud').hidden = false;
    document.getElementById('controls-hint').hidden = false;

    gameActive = true;
    isPaused = false;
    winner = null;
    sparkTimer = 0;
    updateHealthBars();
    hideMenus();
    const banner = match.vsAi
        ? 'They all want Coke!'
        : (match.foods.length > 2 ? 'Free-for-all!' : `${fighters[0].name} vs ${fighters[1].name}!`);
    showBanner(banner, 90);
    drawFighters();
}

function showBanner(text, frames) {
    bannerEl.textContent = text;
    bannerEl.classList.add('show');
    bannerTimer = frames;
}

function updateHealthBars() {
    fighters.forEach((fighter) => {
        const pct = Math.max(0, (fighter.health / MAX_HEALTH) * 100);
        fighter.fillEl.style.width = `${pct}%`;
        fighter.numsEl.textContent = Math.max(0, fighter.health);
    });
}

function onGround(fighter) {
    return fighter.y >= groundY(fighter);
}

function punchBox(fighter) {
    const width = 48;
    const height = 34;
    const x = fighter.facing === 1
        ? fighter.x + fighter.width
        : fighter.x - width;
    const y = fighter.y + fighter.height * 0.35;
    return { x, y, width, height };
}

function bodyBox(fighter) {
    return {
        x: fighter.x,
        y: fighter.y,
        width: fighter.width,
        height: fighter.height
    };
}

function boxesHit(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}

function livingFighters() {
    return fighters.filter((fighter) => !fighter.down);
}

function tryPunch(fighter) {
    if (fighter.down || fighter.stun > 0 || fighter.punchTimer > 0 || fighter.cooldown > 0) {
        return;
    }
    fighter.punchTimer = PUNCH_TIME;
    fighter.hitIds = [];
}

function sameTeam(a, b) {
    return a.team && b.team && a.team === b.team;
}

function getPlayer() {
    return fighters.find((fighter) => !fighter.isAi && !fighter.down) ||
        fighters.find((fighter) => !fighter.isAi);
}

function landHit(attacker, defender) {
    if (sameTeam(attacker, defender)) {
        return;
    }
    const damage = attacker.isAi ? ENEMY_DAMAGE : PUNCH_DAMAGE;
    defender.health -= damage;
    defender.stun = HIT_STUN;
    defender.punchTimer = 0;
    defender.vx = attacker.facing * KNOCKBACK;
    defender.vy = -4;
    attacker.hitIds.push(defender.id);
    sparkTimer = 8;
    sparkEl.style.left = `${defender.x + defender.width / 2}px`;
    sparkEl.style.top = `${defender.y + defender.height / 2}px`;
    sparkEl.classList.add('show');
    updateHealthBars();

    if (defender.health <= 0) {
        defender.health = 0;
        defender.down = true;
        checkWinner();
    }
}

function checkWinner() {
    if (fightEnding) {
        return;
    }

    if (currentMatch.vsAi) {
        const player = fighters.find((fighter) => !fighter.isAi);
        const enemiesAlive = fighters.some((fighter) => fighter.isAi && !fighter.down);
        if (player && player.down) {
            endFight(fighters.find((fighter) => fighter.isAi && !fighter.down) || player);
            return;
        }
        if (player && !enemiesAlive) {
            endFight(player);
        }
        return;
    }

    const alive = livingFighters();
    if (alive.length !== 1) {
        return;
    }
    endFight(alive[0]);
}

function endFight(champ) {
    fightEnding = true;
    gameActive = false;
    winner = champ;
    updateHealthBars();
    if (currentMatch.vsAi && champ.isAi) {
        document.getElementById('win-title').textContent = 'Snack Squad wins!';
        document.getElementById('win-blurb').textContent = 'Pepsi, Hershey, and Mars took you down.';
    } else if (currentMatch.vsAi) {
        document.getElementById('win-title').textContent = 'You win!';
        document.getElementById('win-blurb').textContent = 'You beat Pepsi, Hershey, and Mars!';
    } else {
        document.getElementById('win-title').textContent = `${champ.name} wins!`;
        document.getElementById('win-blurb').textContent = `${champ.name} takes the snack crown.`;
    }
    document.getElementById('rematch-btn').hidden = net.role === 'guest';
    if (net.role === 'host') {
        sendNetState(true);
    }
    setTimeout(() => {
        showScreen('win-screen');
    }, 700);
}

function readOnlineButtons() {
    return {
        left: !!(keys.KeyA || keys.ArrowLeft),
        right: !!(keys.KeyD || keys.ArrowRight),
        jump: !!(keys.KeyW || keys.ArrowUp || keys.Space),
        punch: !!(keys.KeyF || keys.KeyK)
    };
}

function livingEnemies() {
    return fighters.filter((fighter) => fighter.isAi && !fighter.down);
}

function enemyDist(fighter, player) {
    return Math.abs((fighter.x + fighter.width / 2) - (player.x + player.width / 2));
}

function updateAiAttacker(player) {
    const enemies = livingEnemies();
    if (!enemies.length) {
        aiAttackerId = '';
        return;
    }

    const now = Date.now();
    const current = enemies.find((fighter) => fighter.id === aiAttackerId);
    if (current && now < aiAttackerUntil) {
        const closer = enemies.find((fighter) => (
            fighter !== current &&
            enemyDist(fighter, player) < 80 &&
            enemyDist(current, player) > 200
        ));
        if (!closer) {
            return;
        }
    }

    enemies.sort((a, b) => enemyDist(a, player) - enemyDist(b, player));
    aiAttackerId = enemies[0].id;
    aiAttackerUntil = now + 1500;
}

function currentAttacker() {
    return livingEnemies().find((fighter) => fighter.id === aiAttackerId) || null;
}

function updateAiParkMode(player) {
    const center = player.x + player.width / 2;
    if (aiParkMode === 'left-pack') {
        if (center >= 360) {
            aiParkMode = center > 740 ? 'right-pack' : 'split';
        }
        return;
    }
    if (aiParkMode === 'right-pack') {
        if (center <= 640) {
            aiParkMode = center < 260 ? 'left-pack' : 'split';
        }
        return;
    }
    if (center < 240) {
        aiParkMode = 'left-pack';
        return;
    }
    if (center > 760) {
        aiParkMode = 'right-pack';
    }
}

function enemyTargetX(fighter, player, isAttacker) {
    const center = player.x + player.width / 2;
    const slot = AI_SLOT[fighter.id] || 0;
    let offsets = [-200, 210, 380];
    if (aiParkMode === 'left-pack') {
        offsets = [200, 360, 520];
    } else if (aiParkMode === 'right-pack') {
        offsets = [-200, -360, -520];
    }

    const offset = offsets[slot];

    return Math.max(
        20,
        Math.min(ARENA_WIDTH - fighter.width - 20, center + offset - fighter.width / 2)
    );
}

function controlAi(fighter) {
    const player = getPlayer();
    fighter.vx = 0;
    if (!player || player.down) {
        return;
    }

    const style = fighter.ai.style;
    fighter.ai.timer -= 1;

    const myCenter = fighter.x + fighter.width / 2;
    const theirCenter = player.x + player.width / 2 + player.vx * 10;
    const dist = Math.abs(theirCenter - myCenter);
    const toward = Math.sign(theirCenter - myCenter) || 1;
    fighter.facing = toward;

    const isAttacker = currentAttacker() === fighter;
    if (isAttacker) {
        if (dist > style.attackGap + 8) {
            fighter.vx = toward * style.speed;
        } else if (dist < style.attackGap - 16) {
            fighter.vx = -toward * style.speed * 0.45;
        }

        const playerHigh = player.y + player.height < fighter.y + fighter.height - 10;
        const duckPunch = player.punchTimer > 0 && player.facing === toward && dist < 120;
        if (onGround(fighter) && (playerHigh || duckPunch || Math.random() < style.jumpChance)) {
            fighter.vy = -JUMP_POWER;
        }

        if (player.stun === 0 && dist < style.punchRange && fighter.cooldown === 0 && fighter.ai.timer <= 0) {
            tryPunch(fighter);
            fighter.ai.timer = style.punchDelay;
        }
        return;
    }

    const targetX = enemyTargetX(fighter, player, false);
    if (Math.abs(targetX - fighter.x) > 14) {
        fighter.vx = Math.sign(targetX - fighter.x) * style.speed;
    }

    const playerComingIn = player.vx && Math.sign(player.vx) === toward * -1 && dist < style.punchRange;
    if (playerComingIn && player.stun === 0 && fighter.cooldown === 0 && fighter.ai.timer <= 0) {
        tryPunch(fighter);
        fighter.ai.timer = style.punchDelay + 18;
    }
}

function controlFighter(fighter) {
    if (fighter.down || fighter.stun > 0 || fighter.punchTimer > 0) {
        return;
    }

    fighter.vx = 0;

    if (fighter.isAi && net.role === 'offline') {
        controlAi(fighter);
        return;
    }

    if (net.role === 'host') {
        const input = fighter.onlineInput || EMPTY_INPUT;
        if (input.left) {
            fighter.vx = -WALK_SPEED;
        }
        if (input.right) {
            fighter.vx = WALK_SPEED;
        }
        if (input.jump && onGround(fighter)) {
            fighter.vy = -JUMP_POWER;
        }
        if (input.punch) {
            tryPunch(fighter);
        }
        return;
    }

    const map = fighter.controls;
    if (keys[map.left]) {
        fighter.vx = -WALK_SPEED;
    }
    if (keys[map.right]) {
        fighter.vx = WALK_SPEED;
    }
    if (keys[map.jump] && onGround(fighter)) {
        fighter.vy = -JUMP_POWER;
    }
    if (keys[map.punch]) {
        tryPunch(fighter);
    }
}

function applyOnlineInputs() {
    fighters.forEach((fighter, index) => {
        if (index === net.myIndex) {
            fighter.onlineInput = readOnlineButtons();
            return;
        }
        const player = net.players[index];
        fighter.onlineInput = (player && net.inputs[player.peerId]) || EMPTY_INPUT;
    });
}

function moveFighter(fighter) {
    if (fighter.down) {
        fighter.y = groundY(fighter);
        fighter.vy = 0;
        return;
    }

    fighter.x += fighter.vx;
    fighter.vy += GRAVITY;
    fighter.y += fighter.vy;

    const floor = groundY(fighter);
    if (fighter.y > floor) {
        fighter.y = floor;
        fighter.vy = 0;
    }

    if (fighter.x < 20) {
        fighter.x = 20;
    }
    if (fighter.x > ARENA_WIDTH - fighter.width - 20) {
        fighter.x = ARENA_WIDTH - fighter.width - 20;
    }
}

function keepApart() {
    const alive = livingFighters();
    for (let i = 0; i < alive.length; i += 1) {
        for (let j = i + 1; j < alive.length; j += 1) {
            const first = alive[i];
            const second = alive[j];
            if (!boxesHit(bodyBox(first), bodyBox(second))) {
                continue;
            }

            const overlap = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
            if (overlap <= 0) {
                continue;
            }

            if (first.x < second.x) {
                first.x -= overlap / 2;
                second.x += overlap / 2;
            } else {
                first.x += overlap / 2;
                second.x -= overlap / 2;
            }
        }
    }
}

function updateCombat(attacker) {
    if (attacker.punchTimer > 0) {
        const punchFrame = PUNCH_TIME - attacker.punchTimer;
        if (punchFrame >= PUNCH_HIT_START && punchFrame <= PUNCH_HIT_END) {
            fighters.forEach((defender) => {
                if (defender === attacker || defender.down || attacker.hitIds.includes(defender.id) || sameTeam(attacker, defender)) {
                    return;
                }
                if (boxesHit(punchBox(attacker), bodyBox(defender))) {
                    landHit(attacker, defender);
                }
            });
        }
        attacker.punchTimer -= 1;
        if (attacker.punchTimer === 0) {
            attacker.cooldown = PUNCH_COOLDOWN;
        }
    } else if (attacker.cooldown > 0) {
        attacker.cooldown -= 1;
    }

    if (attacker.stun > 0) {
        attacker.stun -= 1;
    }
}

function faceNearest(fighter) {
    if (fighter.vx < 0) {
        fighter.facing = -1;
        return;
    }
    if (fighter.vx > 0) {
        fighter.facing = 1;
        return;
    }

    let nearest = null;
    let best = Infinity;
    fighters.forEach((other) => {
        if (other === fighter || other.down || sameTeam(fighter, other)) {
            return;
        }
        const dist = Math.abs((other.x + other.width / 2) - (fighter.x + fighter.width / 2));
        if (dist < best) {
            best = dist;
            nearest = other;
        }
    });

    if (nearest) {
        fighter.facing = nearest.x + nearest.width / 2 >= fighter.x + fighter.width / 2 ? 1 : -1;
    }
}

function drawFighter(fighter) {
    const el = fighter.el;
    el.style.left = `${fighter.x}px`;
    el.style.top = `${fighter.y}px`;
    el.classList.toggle('face-right', fighter.facing === 1);
    el.classList.toggle('face-left', fighter.facing === -1);
    el.classList.toggle('punching', fighter.punchTimer > 0);
    el.classList.toggle('hurt', fighter.stun > 0);
    el.classList.toggle('down', fighter.down);
}

function drawFighters() {
    fighters.forEach(drawFighter);
}

function tick() {
    if (net.role === 'guest') {
        sendNetKeys();
        requestAnimationFrame(tick);
        return;
    }

    if (gameActive && !isPaused) {
        if (net.role === 'host') {
            applyOnlineInputs();
        }
        if (currentMatch.vsAi) {
            const player = getPlayer();
            if (player) {
                updateAiParkMode(player);
                updateAiAttacker(player);
            }
        }
        fighters.forEach(controlFighter);
        fighters.forEach(moveFighter);
        keepApart();
        fighters.forEach(faceNearest);
        fighters.forEach(updateCombat);
        drawFighters();

        if (sparkTimer > 0) {
            sparkTimer -= 1;
            if (sparkTimer === 0) {
                sparkEl.classList.remove('show');
            }
        }

        if (bannerTimer > 0) {
            bannerTimer -= 1;
            if (bannerTimer === 0) {
                bannerEl.classList.remove('show');
            }
        }

        if (net.role === 'host') {
            sendNetState(false);
        }
    }

    requestAnimationFrame(tick);
}

function makeRoomCode() {
    let code = '';
    for (let i = 0; i < 4; i += 1) {
        code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
    }
    return code;
}

function roomPeerId(code) {
    return `foodfight-${code}`;
}

function setOnlineError(text) {
    document.getElementById('online-error').textContent = text;
}

function resetNet() {
    net = {
        role: 'offline',
        code: '',
        peer: null,
        conns: [],
        hostConn: null,
        players: [],
        inputs: {},
        myIndex: 0,
        started: false
    };
}

function closeNet() {
    net.conns.forEach((conn) => {
        try {
            conn.close();
        } catch (err) {
            // ignore
        }
    });
    if (net.hostConn) {
        try {
            net.hostConn.close();
        } catch (err) {
            // ignore
        }
    }
    if (net.peer) {
        try {
            net.peer.destroy();
        } catch (err) {
            // ignore
        }
    }
    resetNet();
}

function sendTo(conn, payload) {
    if (conn && conn.open) {
        conn.send(payload);
    }
}

function broadcast(payload) {
    net.conns.forEach((conn) => sendTo(conn, payload));
}

function renderLobby() {
    document.getElementById('room-code').textContent = net.code;
    const list = document.getElementById('lobby-players');
    list.innerHTML = net.players.map((player, index) => {
        const food = FOODS[ONLINE_FOODS[index]];
        const you = index === net.myIndex ? ' (you)' : '';
        return `<li>${food.name}${you}</li>`;
    }).join('');

    const startBtn = document.getElementById('lobby-start-btn');
    startBtn.hidden = net.role !== 'host';
    startBtn.disabled = net.players.length < 2;
    document.getElementById('lobby-status').textContent = net.role === 'host'
        ? (net.players.length < 2 ? 'Waiting for friends...' : 'Ready! Press Start Fight.')
        : 'Waiting for the host to start...';
}

function sendRoster() {
    net.players.forEach((player, index) => {
        const conn = net.conns.find((item) => item.peer === player.peerId);
        if (!conn) {
            return;
        }
        sendTo(conn, {
            type: 'roster',
            code: net.code,
            myIndex: index,
            names: net.players.map((item, foodIndex) => FOODS[ONLINE_FOODS[foodIndex]].name)
        });
    });
}

function addHostPlayer(peerId) {
    if (net.started || net.players.length >= 4) {
        return false;
    }
    net.players.push({ peerId });
    net.inputs[peerId] = { ...EMPTY_INPUT };
    renderLobby();
    sendRoster();
    return true;
}

function dropHostPlayer(peerId) {
    net.conns = net.conns.filter((conn) => conn.peer !== peerId);
    if (net.started) {
        net.inputs[peerId] = { ...EMPTY_INPUT };
        return;
    }
    net.players = net.players.filter((player) => player.peerId !== peerId);
    delete net.inputs[peerId];
    renderLobby();
    sendRoster();
}

function startOnlineFight() {
    if (net.role !== 'host' || net.players.length < 2) {
        return;
    }
    net.started = true;
    const foods = net.players.map((_, index) => ONLINE_FOODS[index]);
    broadcast({ type: 'start', foods, myIndexes: net.players.map((_, index) => index) });
    startMatch({
        id: 'online',
        title: 'Online Battle',
        foods
    });
}

function sendNetState(force) {
    const now = Date.now();
    if (!force && now - lastStateAt < 40) {
        return;
    }
    lastStateAt = now;
    broadcast({
        type: 'state',
        fighters: fighters.map((fighter) => ({
            id: fighter.id,
            x: fighter.x,
            y: fighter.y,
            facing: fighter.facing,
            health: fighter.health,
            punchTimer: fighter.punchTimer,
            stun: fighter.stun,
            down: fighter.down
        })),
        spark: {
            x: sparkEl.style.left,
            y: sparkEl.style.top,
            show: sparkTimer > 0
        },
        banner: {
            text: bannerEl.textContent,
            show: bannerTimer > 0
        },
        paused: isPaused,
        winnerName: winner ? winner.name : ''
    });
}

function sendNetKeys() {
    if (!net.hostConn) {
        return;
    }
    const now = Date.now();
    if (now - lastKeysAt < 40) {
        return;
    }
    lastKeysAt = now;
    sendTo(net.hostConn, { type: 'keys', buttons: readOnlineButtons() });
}

function applyNetState(data) {
    if (!fighters.length) {
        return;
    }
    data.fighters.forEach((snap, index) => {
        const fighter = fighters[index];
        if (!fighter) {
            return;
        }
        fighter.x = snap.x;
        fighter.y = snap.y;
        fighter.facing = snap.facing;
        fighter.health = snap.health;
        fighter.punchTimer = snap.punchTimer;
        fighter.stun = snap.stun;
        fighter.down = snap.down;
    });
    updateHealthBars();
    drawFighters();

    sparkEl.style.left = data.spark.x;
    sparkEl.style.top = data.spark.y;
    sparkEl.classList.toggle('show', data.spark.show);
    bannerEl.textContent = data.banner.text;
    bannerEl.classList.toggle('show', data.banner.show);

    if (data.paused && !isPaused && gameActive) {
        isPaused = true;
        showScreen('pause-screen');
    }
    if (!data.paused && isPaused && gameActive) {
        isPaused = false;
        hideMenus();
    }

    if (data.winnerName && !fightEnding) {
        const champ = fighters.find((fighter) => fighter.name === data.winnerName);
        if (champ) {
            endFight(champ);
        }
    }
}

function setupHostConnection(conn) {
    conn.on('open', () => {
        if (net.started || net.players.length >= 4) {
            sendTo(conn, { type: 'full' });
            conn.close();
            return;
        }
        net.conns.push(conn);
        addHostPlayer(conn.peer);
    });
    conn.on('data', (data) => {
        if (!data || !data.type) {
            return;
        }
        if (data.type === 'keys') {
            net.inputs[conn.peer] = data.buttons || EMPTY_INPUT;
        }
    });
    conn.on('close', () => {
        dropHostPlayer(conn.peer);
    });
}

function handleGuestData(data) {
    if (!data || !data.type) {
        return;
    }
    if (data.type === 'roster') {
        net.code = data.code;
        net.myIndex = data.myIndex;
        net.players = data.names.map((name) => ({ name }));
        renderLobby();
        showScreen('lobby-screen');
    }
    if (data.type === 'start') {
        startMatch({
            id: 'online',
            title: 'Online Battle',
            foods: data.foods
        });
    }
    if (data.type === 'state') {
        applyNetState(data);
    }
    if (data.type === 'full') {
        setOnlineError('That room is full.');
        closeNet();
        showScreen('online-screen');
    }
    if (data.type === 'host-left') {
        alert('The host left the room.');
        goToMenu();
    }
}

function createRoom() {
    if (typeof Peer === 'undefined') {
        setOnlineError('Could not load online play. Check the internet.');
        return;
    }
    setOnlineError('Making a room...');
    closeNet();
    const code = makeRoomCode();
    const peer = new Peer(roomPeerId(code));
    net.role = 'host';
    net.code = code;
    net.peer = peer;
    net.players = [{ peerId: 'host' }];
    net.myIndex = 0;
    peer.on('open', () => {
        setOnlineError('');
        renderLobby();
        showScreen('lobby-screen');
    });
    peer.on('connection', setupHostConnection);
    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            createRoom();
            return;
        }
        setOnlineError('Could not create a room. Try again.');
        closeNet();
    });
}

function joinRoom() {
    if (typeof Peer === 'undefined') {
        setOnlineError('Could not load online play. Check the internet.');
        return;
    }
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length !== 4) {
        setOnlineError('Type the 4-letter room code.');
        return;
    }
    setOnlineError('Looking for that room...');
    closeNet();
    const peer = new Peer();
    net.role = 'guest';
    net.code = code;
    net.peer = peer;
    peer.on('open', () => {
        const conn = peer.connect(roomPeerId(code), { reliable: true });
        net.hostConn = conn;
        conn.on('open', () => {
            setOnlineError('');
        });
        conn.on('data', handleGuestData);
        conn.on('close', () => {
            if (net.role === 'guest') {
                alert('Lost the host.');
                goToMenu();
            }
        });
    });
    peer.on('error', () => {
        setOnlineError('Could not find that room.');
        closeNet();
    });
    setTimeout(() => {
        if (net.role === 'guest' && !net.started && document.getElementById('lobby-screen').hidden) {
            if (!net.hostConn || !net.hostConn.open) {
                setOnlineError('Could not find that room.');
            }
        }
    }, 8000);
}

function fitGame() {
    const wrap = document.querySelector('.game-wrapper');
    const scale = Math.min(
        (window.innerWidth - 24) / ARENA_WIDTH,
        (window.innerHeight - 24) / 560,
        1
    );
    wrap.style.transform = `scale(${scale})`;
}

function goToMenu() {
    closeNet();
    clearKeys();
    gameActive = false;
    isPaused = false;
    document.getElementById('hud').hidden = true;
    document.getElementById('controls-hint').hidden = true;
    document.getElementById('rematch-btn').hidden = false;
    bannerEl.classList.remove('show');
    sparkEl.classList.remove('show');
    showScreen('main-menu');
}

function buildMatchButtons() {
    const list = document.getElementById('match-list');
    list.innerHTML = '';
    MATCHES.forEach((match) => {
        const button = document.createElement('button');
        button.className = 'match-button';
        button.innerHTML = `${match.title}<small>${match.subtitle}</small>`;
        button.addEventListener('click', () => startMatch(match));
        list.appendChild(button);
    });
}

window.addEventListener('keydown', (event) => {
    keys[event.code] = true;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === 'KeyP' && gameActive && net.role !== 'guest') {
        isPaused = !isPaused;
        if (isPaused) {
            showScreen('pause-screen');
        } else {
            hideMenus();
        }
        if (net.role === 'host') {
            sendNetState(true);
        }
    }
});

window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

document.getElementById('how-btn').addEventListener('click', () => showScreen('how-screen'));
document.getElementById('how-back-btn').addEventListener('click', () => showScreen('main-menu'));
document.getElementById('online-btn').addEventListener('click', () => {
    setOnlineError('');
    showScreen('online-screen');
});
document.getElementById('online-back-btn').addEventListener('click', goToMenu);
document.getElementById('create-room-btn').addEventListener('click', createRoom);
document.getElementById('join-room-btn').addEventListener('click', joinRoom);
document.getElementById('join-code').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        joinRoom();
    }
});
document.getElementById('lobby-start-btn').addEventListener('click', startOnlineFight);
document.getElementById('lobby-leave-btn').addEventListener('click', goToMenu);
document.getElementById('resume-btn').addEventListener('click', () => {
    if (net.role === 'guest') {
        return;
    }
    isPaused = false;
    hideMenus();
    if (net.role === 'host') {
        sendNetState(true);
    }
});
document.getElementById('pause-menu-btn').addEventListener('click', goToMenu);
document.getElementById('rematch-btn').addEventListener('click', () => {
    if (net.role === 'guest') {
        return;
    }
    if (net.role === 'host') {
        startOnlineFight();
        return;
    }
    startMatch(currentMatch);
});
document.getElementById('win-menu-btn').addEventListener('click', goToMenu);

window.addEventListener('resize', fitGame);
buildMatchButtons();
fitGame();
showScreen('main-menu');
tick();
