window.addEventListener('load', () => {
    hideAllScreens();
    showScreen('main-menu');
    initializeMobileControls();
    adjustGameLayout();
    placePlayerOnScreen();
    loadPlayerLook();
    if (!localStorage.getItem('mscape-reset-play')) {
        localStorage.setItem('mscape-reset-play', '1');
        localStorage.setItem(UNLOCKED_LEVEL_KEY, '1');
    }
    loadUnlockedLevels();
    updateInstructions();
    fetchHighScores();
});

const mAndM = document.getElementById('m-and-m');
let obstacles = [];
let isJumping = false;
let obstacleSpeed = 3;
let score = 0;
let highScore = 0;
let gameActive = false;
let isPaused = false;
let backgroundPosition = 0;
const INITIAL_SPEED = 4;
let doubleJumpsRemaining = 10;
let canDoubleJump = false;
let consecutiveJumps = 0;
let yesterdayTopScore = 0;
let currentScreen = 'main-menu';
const JUMPS_PER_CHUNK = 6;
const JUMP_SPACING = 200;
const CHUNK_SIZE = 1200;
const MAP_CHUNKS = 20;
const MAP_LENGTH = CHUNK_SIZE * MAP_CHUNKS + 200;
const MAX_LEVEL = 3;
let currentLevel = 1;
let checkpointLevel = 1;
let checkpointScore = 0;
let distanceTraveled = 0;
const PLAYER_SIZE = 40;
const PLAYER_SPAWN_X = 240;
const MOBILE_SPAWN_X = 200;
const GIANT_SIZE = 260;
const GIANT_START_X = -200 + 40 * 3;
const BIRD_SIZE = 40;
const BIRD_DOWN = BIRD_SIZE * 3;
const BIRD_FORWARD = BIRD_SIZE * 10;
const BIRD_PATROL = BIRD_SIZE * 3;
const BIRD_SPEED = 4;
const BIRD_SPACING = 2200;
const BIRD_COLORS = {
    pink: 310,
    yellow: 0,
    green: 90,
    blue: 190,
    red: 345
};
const BIRD_SPAWN_ORDER = ['green', 'pink', 'blue', 'green', 'red', 'blue', 'yellow', 'pink', 'green'];
const BIRD_COUNT = BIRD_SPAWN_ORDER.length;
let birds = [];
let giantWorldX = GIANT_START_X;
const SKITTLE_SPAWN_DELAY_MS = 3000;
let noSkittleUntil = 0;
const HUNGRY_STOP_CHUNK = 5;
let hungryStopped = false;
const THROW_START_CHUNK = 5;
const THROW_EVERY_FRAMES = 80;
const THROWN_SKITTLE_SIZE = 40;
const THROWN_SPEED = 8;
const THROWN_GRAVITY = 0.22;
const HUNGRY_FOLLOW_SPEED = 5.5;
let thrownSkittles = [];
let throwCooldown = 0;
const BARRIER_WIDTH = 22;
const BARRIER_SAFE_HITS = 10;
const MAX_HEARTS = 3;
let hearts = MAX_HEARTS;
let playerIsSplit = false;
let playerIsQuarter = false;
let hurtUntil = 0;
let smashPlaying = false;
let gameOverTimer = null;
let soundOn = true;
let showHitboxes = true;
let flyOn = false;
const PLAYER_LOOK_KEY = 'mscape-player-look';
const UNLOCKED_LEVEL_KEY = 'mscape-unlocked-level';
let unlockedLevel = 1;
const PLAYER_COLORS = ['#FF0000', '#FF8A00', '#FFE600', '#2ECC40', '#0074D9', '#B44AFF', '#FF69B4', '#6B3A2A'];
let playerColor = '#FF0000';
let playerNickname = '';
let settingsReturnScreen = 'main-menu';
let settingsPausedGame = false;
let barrierHits = 0;
let barrierTouching = false;

// Mobile touch handling
let touchStartY = 0;
const TOUCH_SENSITIVITY = 10;

// Add these constants at the top with other constants
const BASE_JUMP_HEIGHT = 150;
const BASE_JUMP_DURATION = 500; // in milliseconds
const BASE_FALL_DURATION = 400; // in milliseconds
const MAX_OBSTACLE_SPEED = window.innerWidth <= 768 ? 6 : 8;

// Constants for physics
const MOBILE_SETTINGS = {
    jumpVelocity: 5,
    fallVelocity: 3,
    interval: 16,
    initialSpeed: 3,
    maxSpeed: 6,
    speedIncrement: 0.03
};

const DESKTOP_SETTINGS = {
    jumpVelocity: 7,
    fallVelocity: 3.5,
    interval: 16,
    initialSpeed: 4,
    maxSpeed: 8,
    speedIncrement: 0.1
};

const smashSound = new Audio('sounds/smash.mp3');
const eatSound = new Audio('sounds/eat.mp3');
smashSound.preload = 'auto';
eatSound.preload = 'auto';

function unlockGameSounds() {
    [smashSound, eatSound].forEach((sound) => {
        sound.muted = true;
        const playPromise = sound.play();
        if (playPromise) {
            playPromise.then(() => {
                sound.pause();
                sound.currentTime = 0;
                sound.muted = false;
            }).catch(() => {
                sound.muted = false;
            });
        }
    });
}

function playSoundNow(sound) {
    if (!soundOn) return;
    const clip = sound.cloneNode();
    clip.muted = false;
    clip.play().catch(() => {
        sound.muted = false;
        sound.currentTime = 0;
        sound.play().catch(() => {});
    });
}

function playSmashSound() {
    playSoundNow(smashSound);
}

function playEatSound() {
    playSoundNow(eatSound);
}

function playSkittleHitSound(el) {
    if (isGiantSkittle(el)) {
        playSmashSound();
        return;
    }
    if (isSkittleEater(el)) {
        playEatSound();
    }
}

function getSettings() {
    return window.innerWidth <= 768 ? MOBILE_SETTINGS : DESKTOP_SETTINGS;
}

let motionId = 0;

function stopMotion() {
    motionId += 1;
    if (window.jumpInterval) {
        clearInterval(window.jumpInterval);
        window.jumpInterval = null;
    }
    if (window.fallInterval) {
        clearInterval(window.fallInterval);
        window.fallInterval = null;
    }
    return motionId;
}

const heldKeys = new Set();
const PLAYER_MOVE_SPEED = 4;
const GROUND_BOTTOM = 20;
const FLY_UP_SPEED = 6;
const FLY_DOWN_SPEED = 4;
let flyTouchHeld = false;
const MOVE_PRESSES_BEFORE_COOLDOWN = 3;
const MOVE_COOLDOWN_MS = 1500;
let forwardPresses = 0;
let backPresses = 0;
let forwardCooldownUntil = 0;
let backCooldownUntil = 0;
let pendingForwardCooldown = false;
let pendingBackCooldown = false;

function isJumpKey(event) {
    return event.code === 'Space' || event.code === 'KeyW' || event.code === 'ArrowUp';
}

function isLeftKey(code) {
    return code === 'KeyA' || code === 'ArrowLeft';
}

function isRightKey(code) {
    return code === 'KeyD' || code === 'ArrowRight';
}

document.addEventListener('keydown', (event) => {
    if (event.target.closest('input')) return;
    if (event.code === 'KeyP' || event.code === 'Escape') {
        event.preventDefault();
        if (event.repeat) return;
        if (isPaused) {
            resumeGame();
        } else if (gameActive) {
            pauseGame();
        }
        return;
    }
    if (event.code === 'KeyR') {
        event.preventDefault();
        if (event.repeat) return;
        startGame();
        return;
    }
    if (!gameActive || isPaused) return;
    if (isJumpKey(event)) {
        event.preventDefault();
        if (flyOn && hearts > 1) {
            heldKeys.add(event.code);
        } else if (!flyOn) {
            tryJump();
        }
        return;
    }
    if (isLeftKey(event.code) || isRightKey(event.code)) {
        event.preventDefault();
        if (event.repeat) return;
        registerMovePress(event.code);
    }
});

document.addEventListener('keyup', (event) => {
    heldKeys.delete(event.code);
    if (pendingBackCooldown && isLeftKey(event.code)) {
        pendingBackCooldown = false;
        backCooldownUntil = Date.now() + MOVE_COOLDOWN_MS;
    }
    if (pendingForwardCooldown && isRightKey(event.code)) {
        pendingForwardCooldown = false;
        forwardCooldownUntil = Date.now() + MOVE_COOLDOWN_MS;
    }
});

document.getElementById('start-game-btn').addEventListener('click', () => {
    unlockGameSounds();
    hideAllScreens();
    startGame();
});

document.getElementById('instructions-btn').addEventListener('click', () => {
    hideAllScreens();
    showScreen('instructions-screen');
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
    hideAllScreens();
    showScreen('main-menu');
});

document.getElementById('restart-button').addEventListener('click', () => {
    hideAllScreens();
    playAgainFromCheckpoint();
});

document.getElementById('menu-button').addEventListener('click', () => {
    hideAllScreens();
    showScreen('main-menu');
});

document.getElementById('win-restart-button').addEventListener('click', () => {
    hideAllScreens();
    startGame();
});

document.getElementById('win-menu-button').addEventListener('click', () => {
    hideAllScreens();
    showScreen('main-menu');
});

document.getElementById('resume-button').addEventListener('click', () => {
    resumeGame();
});

document.getElementById('pause-restart-button').addEventListener('click', () => {
    startGame();
});

document.getElementById('hud-restart-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('settings-btn').addEventListener('click', () => {
    openSettings();
});

document.getElementById('sound-toggle-btn').addEventListener('click', () => {
    soundOn = !soundOn;
    updateSettingsButtons();
});

document.getElementById('hitbox-toggle-btn').addEventListener('click', () => {
    showHitboxes = !showHitboxes;
    updateSettingsButtons();
    drawHitboxes();
});

document.getElementById('fly-toggle-btn').addEventListener('click', () => {
    flyOn = !flyOn;
    updateSettingsButtons();
    updateInstructions();
});

document.getElementById('close-settings-btn').addEventListener('click', () => {
    closeSettings();
});

document.getElementById('customize-btn').addEventListener('click', () => {
    openCustomize();
});

document.getElementById('maps-btn').addEventListener('click', () => {
    openMaps();
});

document.getElementById('reset-progress-btn').addEventListener('click', () => {
    resetPlayProgress();
});

document.getElementById('back-maps-btn').addEventListener('click', () => {
    closeMaps();
});

document.getElementById('map-level-1-btn').addEventListener('click', () => {
    startAtLevel(1);
});

document.getElementById('map-level-2-btn').addEventListener('click', () => {
    if (unlockedLevel >= 2) startAtLevel(2);
});

document.getElementById('map-level-3-btn').addEventListener('click', () => {
    if (unlockedLevel >= 3) startAtLevel(3);
});

document.getElementById('back-customize-btn').addEventListener('click', () => {
    closeCustomize();
});

document.getElementById('nickname-input').addEventListener('input', (event) => {
    playerNickname = event.target.value.trimStart().slice(0, 12);
    event.target.value = playerNickname;
    savePlayerLook();
    applyPlayerLook();
});

document.addEventListener('touchstart', handleTouch, { passive: false });
document.addEventListener('touchend', handleTouch, { passive: false });
document.addEventListener('touchcancel', handleTouch, { passive: false });

function handleTouch(event) {
    if (!gameActive && !isPaused) return;
    if (event.target.closest('.menu-screen')) return;

    event.preventDefault();
    
    // Handle menu buttons
    if (event.target.classList.contains('menu-button')) {
        event.target.click();
        return;
    }
    if (isPaused) return;
    
    if (event.target.closest('button') || event.target.closest('input')) return;
    if (event.type === 'touchstart') {
        if (flyOn && hearts > 1) {
            flyTouchHeld = true;
        } else if (!flyOn) {
            tryJump();
        }
    } else if (event.type === 'touchend' || event.type === 'touchcancel') {
        flyTouchHeld = event.touches && event.touches.length > 0;
    }
}

const buttons = document.querySelectorAll('.menu-button');
buttons.forEach(button => {
    button.addEventListener('touchstart', () => {
        button.style.opacity = '0.7';
    });
    
    button.addEventListener('touchend', () => {
        button.style.opacity = '1';
        button.click();
    });
});

function hideAllScreens() {
    const screens = ['main-menu', 'instructions-screen', 'game-over-screen', 'you-win-screen', 'pause-screen', 'settings-screen', 'customize-screen', 'maps-screen'];
    screens.forEach(screenId => {
        document.getElementById(screenId).style.display = 'none';
    });
}

function showScreen(screenId) {
    currentScreen = screenId;
    document.getElementById(screenId).style.display = 'block';
}

function updateSettingsButtons() {
    const soundBtn = document.getElementById('sound-toggle-btn');
    const hitboxBtn = document.getElementById('hitbox-toggle-btn');
    const flyBtn = document.getElementById('fly-toggle-btn');
    if (soundBtn) soundBtn.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
    if (hitboxBtn) hitboxBtn.textContent = showHitboxes ? 'Hitboxes: On' : 'Hitboxes: Off';
    if (flyBtn) flyBtn.textContent = flyOn ? 'Flying: On' : 'Flying: Off';
}

function isSettingsMenu(screenId) {
    return screenId === 'settings-screen' || screenId === 'maps-screen' || screenId === 'customize-screen';
}

function openSettings() {
    if (!isSettingsMenu(currentScreen)) {
        settingsReturnScreen = currentScreen || 'main-menu';
    } else if (isSettingsMenu(settingsReturnScreen)) {
        settingsReturnScreen = 'main-menu';
    }
    if (gameActive && !isPaused) {
        settingsPausedGame = true;
        isPaused = true;
        stopMotion();
        heldKeys.clear();
        flyTouchHeld = false;
        mAndM.classList.remove('flying');
    } else {
        settingsPausedGame = false;
    }
    hideAllScreens();
    updateSettingsButtons();
    showScreen('settings-screen');
}

function loadPlayerLook() {
    try {
        const saved = JSON.parse(localStorage.getItem(PLAYER_LOOK_KEY) || '{}');
        if (PLAYER_COLORS.includes(saved.color)) playerColor = saved.color;
        playerNickname = String(saved.nickname || '').slice(0, 12);
    } catch (error) {
        playerColor = '#FF0000';
        playerNickname = '';
    }
    applyPlayerLook();
}

function savePlayerLook() {
    localStorage.setItem(PLAYER_LOOK_KEY, JSON.stringify({
        color: playerColor,
        nickname: playerNickname
    }));
}

function applyPlayerLook() {
    const container = document.getElementById('game-container');
    if (container) container.style.setProperty('--player-color', playerColor);
    mAndM.style.setProperty('--player-color', playerColor);
    const preview = document.getElementById('customize-preview');
    if (preview) preview.style.backgroundColor = playerColor;
    document.querySelectorAll('#color-choices .color-choice').forEach((dot) => {
        dot.classList.toggle('selected', dot.dataset.color === playerColor);
    });
    const nameInput = document.getElementById('nickname-input');
    if (nameInput && document.activeElement !== nameInput) {
        nameInput.value = playerNickname;
    }
    updatePlayerNameTag();
}

function buildColorChoices() {
    const row = document.getElementById('color-choices');
    if (!row || row.childElementCount) return;
    PLAYER_COLORS.forEach((color) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'color-choice';
        dot.dataset.color = color;
        dot.style.backgroundColor = color;
        dot.addEventListener('click', () => {
            playerColor = color;
            savePlayerLook();
            applyPlayerLook();
        });
        row.appendChild(dot);
    });
}

function updatePlayerNameTag() {
    const tag = document.getElementById('player-name');
    if (!tag) return;
    if (!playerNickname) {
        tag.style.display = 'none';
        return;
    }
    tag.textContent = playerNickname;
    tag.style.display = 'block';
    tag.style.left = `${getPlayerScreenX() + PLAYER_SIZE / 2}px`;
    tag.style.bottom = `${(parseInt(mAndM.style.bottom, 10) || 20) + PLAYER_SIZE + 6}px`;
}

function openCustomize() {
    hideAllScreens();
    buildColorChoices();
    applyPlayerLook();
    showScreen('customize-screen');
}

function closeCustomize() {
    hideAllScreens();
    updateSettingsButtons();
    showScreen('settings-screen');
}

function loadUnlockedLevels() {
    const saved = Number(localStorage.getItem(UNLOCKED_LEVEL_KEY));
    unlockedLevel = Number.isFinite(saved) ? Math.min(MAX_LEVEL, Math.max(1, saved)) : 1;
    updateMapsLock();
}

function saveUnlockedLevels() {
    localStorage.setItem(UNLOCKED_LEVEL_KEY, String(unlockedLevel));
}

function resetPlayProgress() {
    unlockedLevel = 1;
    saveUnlockedLevels();
    checkpointLevel = 1;
    checkpointScore = 0;
    score = 0;
    hearts = MAX_HEARTS;
    playerIsSplit = false;
    playerIsQuarter = false;
    gameActive = false;
    isPaused = false;
    settingsPausedGame = false;
    updateMapsLock();
    updateHearts();
    hideAllScreens();
    showScreen('main-menu');
}

function unlockLevel(levelNumber) {
    const level = Math.min(MAX_LEVEL, Math.max(1, levelNumber));
    if (level > unlockedLevel) {
        unlockedLevel = level;
        saveUnlockedLevels();
    }
    updateMapsLock();
}

function updateMapsLock() {
    [
        ['map-level-1-btn', 1],
        ['map-level-2-btn', 2],
        ['map-level-3-btn', 3]
    ].forEach(([id, level]) => {
        const card = document.getElementById(id);
        if (!card) return;
        const locked = level > unlockedLevel;
        card.classList.toggle('locked', locked);
        card.disabled = locked;
    });
}

function openMaps() {
    hideAllScreens();
    updateMapsLock();
    showScreen('maps-screen');
}

function closeMaps() {
    hideAllScreens();
    updateSettingsButtons();
    showScreen('settings-screen');
}

function closeSettings() {
    hideAllScreens();
    if (settingsPausedGame) {
        settingsPausedGame = false;
        resumeGame();
        return;
    }
    const backTo = settingsReturnScreen && !isSettingsMenu(settingsReturnScreen)
        ? settingsReturnScreen
        : 'main-menu';
    showScreen(backTo);
}

function pauseGame() {
    if (!gameActive || isPaused) return;
    isPaused = true;
    stopMotion();
    heldKeys.clear();
    flyTouchHeld = false;
    mAndM.classList.remove('flying');
    showScreen('pause-screen');
}

function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    hideAllScreens();
    if (window.gameLoop) {
        cancelAnimationFrame(window.gameLoop);
    }
    moveBackgroundAndObstacles();
}

function tryJump() {
    if (!gameActive || isPaused) return;
    if (isJumping) {
        if (hearts <= 2) return;
        doubleJump();
        return;
    }
    jump();
}

function jump() {
    if (isJumping) return;

    isJumping = true;
    canDoubleJump = true;
    const thisMotion = stopMotion();
    let position = parseInt(mAndM.style.bottom, 10) || 20;

    if (window.innerWidth <= 768) {
        function jumpStep() {
            if (thisMotion !== motionId) return;
            if (position >= 170) {
                fall();
                return;
            }
            position += 5;
            mAndM.style.bottom = position + 'px';
            setTimeout(jumpStep, 16);
        }
        jumpStep();
    } else {
        window.jumpInterval = setInterval(() => {
            if (thisMotion !== motionId) {
                clearInterval(window.jumpInterval);
                return;
            }
            if (position >= 170) {
                clearInterval(window.jumpInterval);
                window.jumpInterval = null;
                fall();
            } else {
                position += 7;
                mAndM.style.bottom = position + 'px';
            }
        }, 16);
    }
}

function doubleJump() {
    if (hearts <= 2) return;
    if (!canDoubleJump || doubleJumpsRemaining <= 0) return;

    canDoubleJump = false;
    doubleJumpsRemaining--;
    updateDoubleJumpCounter();

    const thisMotion = stopMotion();
    let position = parseInt(mAndM.style.bottom, 10) || 20;
    const maxHeight = position + 120;

    if (window.innerWidth <= 768) {
        function doubleJumpStep() {
            if (thisMotion !== motionId) return;
            if (position >= maxHeight) {
                fall();
                return;
            }
            position += 5;
            mAndM.style.bottom = position + 'px';
            setTimeout(doubleJumpStep, 16);
        }
        doubleJumpStep();
    } else {
        window.jumpInterval = setInterval(() => {
            if (thisMotion !== motionId) {
                clearInterval(window.jumpInterval);
                return;
            }
            if (position >= maxHeight) {
                clearInterval(window.jumpInterval);
                window.jumpInterval = null;
                fall();
            } else {
                position += 7;
                mAndM.style.bottom = position + 'px';
            }
        }, 16);
    }
}

function fall() {
    const thisMotion = stopMotion();
    let position = parseInt(mAndM.style.bottom, 10) || 20;

    if (window.innerWidth <= 768) {
        function fallStep() {
            if (thisMotion !== motionId) return;
            if (position <= 20) {
                mAndM.style.bottom = '20px';
                isJumping = false;
                return;
            }
            position -= 3;
            if (position < 20) position = 20;
            mAndM.style.bottom = position + 'px';
            if (position > 20) {
                setTimeout(fallStep, 16);
            } else {
                isJumping = false;
            }
        }
        fallStep();
    } else {
        window.fallInterval = setInterval(() => {
            if (thisMotion !== motionId) {
                clearInterval(window.fallInterval);
                return;
            }
            if (position <= 20) {
                clearInterval(window.fallInterval);
                window.fallInterval = null;
                mAndM.style.bottom = '20px';
                isJumping = false;
            } else {
                position -= 3.5;
                mAndM.style.bottom = position + 'px';
            }
        }, 16);
    }
}

function getPlayerScreenX() {
    return parseInt(mAndM.style.left, 10) || PLAYER_SPAWN_X;
}

function currentChunk() {
    return Math.min(MAP_CHUNKS, Math.max(1, Math.floor(distanceTraveled / CHUNK_SIZE) + 1));
}

function updateWorldPositions() {
    obstacles.forEach(obstacle => {
        obstacle.style.left = `${Number(obstacle.dataset.worldX) - distanceTraveled}px`;
    });
    const finishLine = document.getElementById('finish-line');
    finishLine.style.left = `${MAP_LENGTH - distanceTraveled}px`;
    finishLine.textContent = currentLevel < MAX_LEVEL ? `LEVEL ${currentLevel + 1}` : 'FINISH';
    const checkpointFlag = document.getElementById('checkpoint-flag');
    if (checkpointFlag) {
        checkpointFlag.style.left = `${MAP_LENGTH - 70 - distanceTraveled}px`;
        checkpointFlag.style.display = currentLevel < MAX_LEVEL ? 'flex' : 'none';
    }
    const giant = document.getElementById('giant-skittle');
    giant.style.left = `${giantWorldX - distanceTraveled}px`;
    if (!smashPlaying) {
        giant.style.transform = `rotate(${(giantWorldX / (GIANT_SIZE * Math.PI)) * 360}deg)`;
    }
    document.querySelectorAll('.left-behind-half, .left-behind-quarter').forEach((piece) => {
        piece.style.left = `${Number(piece.dataset.worldX) - distanceTraveled}px`;
    });
    updateBirds();
}

function getBirdFlyBottom() {
    return 20 + GIANT_SIZE + PLAYER_SIZE - BIRD_DOWN;
}

function createBirds() {
    birds.forEach(bird => bird.el.remove());
    birds = [];
    const startX = GIANT_START_X + GIANT_SIZE / 2 - BIRD_SIZE / 2 + BIRD_FORWARD;
    const gameContainer = document.getElementById('game-container');
    for (let i = 0; i < BIRD_COUNT; i++) {
        const colorName = BIRD_SPAWN_ORDER[i];
        const el = document.createElement('div');
        el.className = 'chase-bird';
        el.innerHTML = '<span class="bird-face">🐦</span>';
        el.style.filter = `sepia(1) saturate(7) hue-rotate(${BIRD_COLORS[colorName]}deg)`;
        gameContainer.appendChild(el);
        birds.push({
            el,
            color: colorName,
            pathWorldX: startX + i * BIRD_SPACING,
            patrolOffset: (i * 30) % Math.max(BIRD_PATROL, 1),
            patrolDir: i % 2 === 0 ? 1 : -1
        });
    }
}

function updateBirds() {
    const container = document.getElementById('game-container');
    const flyBottom = getBirdFlyBottom();
    const maxBirdBottom = Math.max(20, container.clientHeight - BIRD_SIZE - 10);
    const pinkBottom = Math.min(maxBirdBottom, 20 + BIRD_SIZE * 5);
    const blueBottom = Math.min(maxBirdBottom, 20 + BIRD_SIZE * 4);
    const redBottom = Math.min(maxBirdBottom, 20 + BIRD_SIZE * 6);
    const yellowBottom = Math.min(maxBirdBottom, 20 + BIRD_SIZE * 4.6);
    const greenBottom = Math.min(maxBirdBottom, 20 + BIRD_SIZE * 6.7);
    birds.forEach(bird => {
        if (bird.el.classList.contains('being-eaten-by-giant')) return;
        bird.patrolOffset += BIRD_SPEED * bird.patrolDir;
        if (bird.patrolOffset >= BIRD_PATROL) {
            bird.patrolOffset = BIRD_PATROL;
            bird.patrolDir = -1;
        } else if (bird.patrolOffset <= 0) {
            bird.patrolOffset = 0;
            bird.patrolDir = 1;
        }
        bird.el.classList.toggle('facing-right', bird.patrolDir > 0);
        bird.el.style.left = `${bird.pathWorldX + bird.patrolOffset - distanceTraveled}px`;
        let birdBottom = flyBottom;
        if (bird.color === 'pink') birdBottom = pinkBottom;
        if (bird.color === 'blue') birdBottom = blueBottom;
        if (bird.color === 'red') birdBottom = redBottom;
        if (bird.color === 'yellow') birdBottom = yellowBottom;
        if (bird.color === 'green') birdBottom = greenBottom;
        bird.el.style.bottom = `${birdBottom}px`;

        const screenX = bird.pathWorldX + bird.patrolOffset - distanceTraveled;
        if (screenX + BIRD_SIZE < 0) {
            bird.pathWorldX = distanceTraveled + container.clientWidth + 80 + Math.random() * 500;
            bird.patrolOffset = 0;
            bird.patrolDir = 1;
            bird.el.style.left = `${bird.pathWorldX - distanceTraveled}px`;
        }
    });
}

function updatePlayerRoll() {
    const rollDegrees = ((getPlayerScreenX() + distanceTraveled) / (40 * Math.PI)) * 360;
    mAndM.style.transform = `rotate(${rollDegrees}deg)`;
}

function isMoveCooling(until) {
    return Date.now() < until;
}

function registerMovePress(code) {
    if (hearts <= 1) return;
    if (isLeftKey(code)) {
        if (isMoveCooling(backCooldownUntil)) return;
        backPresses += 1;
        heldKeys.add(code);
        if (backPresses >= MOVE_PRESSES_BEFORE_COOLDOWN) {
            backPresses = 0;
            pendingBackCooldown = true;
        }
        return;
    }
    if (isRightKey(code)) {
        if (isMoveCooling(forwardCooldownUntil)) return;
        forwardPresses += 1;
        heldKeys.add(code);
        if (forwardPresses >= MOVE_PRESSES_BEFORE_COOLDOWN) {
            forwardPresses = 0;
            pendingForwardCooldown = true;
        }
    }
}

function isHoldingLeft() {
    if (hearts <= 1) return false;
    if (isMoveCooling(backCooldownUntil)) return false;
    return [...heldKeys].some(isLeftKey);
}

function isHoldingRight() {
    if (hearts <= 1) return false;
    if (isMoveCooling(forwardCooldownUntil)) return false;
    return [...heldKeys].some(isRightKey);
}

function isHoldingJump() {
    if (!flyOn || hearts <= 1) return false;
    if (flyTouchHeld) return true;
    return [...heldKeys].some((code) => code === 'Space' || code === 'KeyW' || code === 'ArrowUp');
}

function getMaxFlyBottom() {
    const container = document.getElementById('game-container');
    const height = container ? container.clientHeight : 500;
    return Math.max(GROUND_BOTTOM, height - PLAYER_SIZE);
}

function playerHitCeiling() {
    const position = parseInt(mAndM.style.bottom, 10) || GROUND_BOTTOM;
    return position >= getMaxFlyBottom();
}

const PLANE_WIDTH = 120;
const PLANE_HEIGHT = 36;
const PLANE_SPEED = 14;
let killerPlane = null;

function clearKillerPlane() {
    if (killerPlane && killerPlane.el) {
        killerPlane.el.remove();
    }
    document.querySelectorAll('.killer-plane').forEach(el => el.remove());
    killerPlane = null;
}

function spawnKillerPlane() {
    if (killerPlane) return;
    const container = document.getElementById('game-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'killer-plane';
    el.id = 'killer-plane';
    el.innerHTML = `
        <span class="plane-trail"></span>
        <span class="plane-body">
            <span class="plane-nose"></span>
            <span class="plane-window"></span>
            <span class="plane-windows"></span>
            <span class="plane-wing"></span>
            <span class="plane-engine"></span>
            <span class="plane-tail"></span>
            <span class="plane-fin"></span>
        </span>
    `;
    container.appendChild(el);
    const player = getCandyCircle(mAndM);
    killerPlane = {
        el,
        x: -PLANE_WIDTH - 24,
        y: Math.max(8, player.y - PLANE_HEIGHT / 2),
        angle: 0,
        spent: false,
        vx: PLANE_SPEED,
        vy: 0
    };
    drawPlane();
}

function planeNose() {
    return {
        x: killerPlane.x + PLANE_WIDTH - 18,
        y: killerPlane.y + PLANE_HEIGHT / 2
    };
}

function drawPlane() {
    killerPlane.el.style.left = `${killerPlane.x}px`;
    killerPlane.el.style.top = `${killerPlane.y}px`;
    killerPlane.el.style.transform = `rotate(${killerPlane.angle}deg)`;
}

function sendPlaneOffScreen(angleRad) {
    killerPlane.spent = true;
    killerPlane.vx = Math.cos(angleRad) * PLANE_SPEED;
    killerPlane.vy = Math.sin(angleRad) * PLANE_SPEED;
    killerPlane.angle = angleRad * 180 / Math.PI;
}

function updateKillerPlane() {
    if (!killerPlane) return;

    if (killerPlane.spent) {
        killerPlane.x += killerPlane.vx;
        killerPlane.y += killerPlane.vy;
        drawPlane();
        const box = document.getElementById('game-container');
        if (!box || killerPlane.x > box.clientWidth + 160 || killerPlane.x < -200 ||
            killerPlane.y < -120 || killerPlane.y > box.clientHeight + 120) {
            clearKillerPlane();
        }
        return;
    }

    if (!gameActive) return;
    const target = getCandyCircle(mAndM);
    const nose = planeNose();
    const dx = target.x - nose.x;
    const dy = target.y - nose.y;
    const dist = Math.hypot(dx, dy) || 1;
    const angleRad = Math.atan2(dy, dx);
    killerPlane.x += (dx / dist) * PLANE_SPEED;
    killerPlane.y += (dy / dist) * PLANE_SPEED;
    killerPlane.angle = angleRad * 180 / Math.PI;
    drawPlane();

    const hitRange = target.r + 16;
    if (dx * dx + dy * dy < hitRange * hitRange) {
        const containerRect = document.getElementById('game-container').getBoundingClientRect();
        window.collisionPoint = {
            x: containerRect.left + target.x,
            y: containerRect.top + target.y
        };
        sendPlaneOffScreen(angleRad);
        consecutiveJumps = 0;
        gameOver(killerPlane.el);
    }
}

function updatePlayerFly() {
    if (!flyOn) {
        mAndM.classList.remove('flying');
        return;
    }
    let position = parseInt(mAndM.style.bottom, 10);
    if (Number.isNaN(position)) position = GROUND_BOTTOM;

    if (isHoldingJump()) {
        position += FLY_UP_SPEED;
        isJumping = true;
        mAndM.classList.add('flying');
    } else if (position > GROUND_BOTTOM) {
        position -= FLY_DOWN_SPEED;
        isJumping = true;
        mAndM.classList.remove('flying');
    } else {
        isJumping = false;
        mAndM.classList.remove('flying');
    }

    const maxBottom = getMaxFlyBottom();
    if (position > maxBottom) position = maxBottom;
    if (position < GROUND_BOTTOM) position = GROUND_BOTTOM;
    mAndM.style.bottom = `${position}px`;
}

function movePlayer() {
    let walk = 0;
    if (isHoldingRight()) walk += PLAYER_MOVE_SPEED;
    if (isHoldingLeft()) walk -= PLAYER_MOVE_SPEED;
    if (walk === 0) return;

    const gameContainer = document.getElementById('game-container');
    const minX = getGiantScreenLeft() - PLAYER_SIZE - 8;
    const maxX = Math.max(20, getBarrierLeft() - PLAYER_SIZE);
    let newX = getPlayerScreenX() + walk;

    if (newX < minX) {
        distanceTraveled = Math.max(0, distanceTraveled - (minX - newX));
        newX = minX;
        barrierTouching = false;
    } else if (newX > maxX) {
        newX = maxX;
        registerBarrierHit();
    } else {
        barrierTouching = false;
    }

    mAndM.style.left = `${newX}px`;
}

function getGiantScreenLeft() {
    return giantWorldX - distanceTraveled;
}

function playerIsBehindGiant() {
    return getPlayerScreenX() + PLAYER_SIZE <= getGiantScreenLeft() + 28;
}

function wentBehindGiant(el) {
    return Boolean(el && el.id === 'behind-giant');
}

function getBarrierLeft() {
    return document.getElementById('game-container').clientWidth - BARRIER_WIDTH;
}

function updateBarrierLook() {
    const barrier = document.getElementById('screen-barrier');
    const label = document.getElementById('barrier-hits');
    if (barrierHits > BARRIER_SAFE_HITS) {
        barrier.classList.add('kill-wall');
    } else {
        barrier.classList.remove('kill-wall');
    }
    if (label) {
        label.textContent = barrierHits > BARRIER_SAFE_HITS ? 'KILL' : `${barrierHits}/${BARRIER_SAFE_HITS}`;
    }
}

function registerBarrierHit() {
    if (barrierTouching) return;
    barrierTouching = true;
    barrierHits += 1;
    updateBarrierLook();
    if (barrierHits > BARRIER_SAFE_HITS) {
        const barrier = document.getElementById('screen-barrier');
        const containerRect = document.getElementById('game-container').getBoundingClientRect();
        window.collisionPoint = {
            x: containerRect.left + getBarrierLeft(),
            y: containerRect.top + getCandyCircle(mAndM).y
        };
        consecutiveJumps = 0;
        gameOver(barrier);
    }
}

function moveBackgroundAndObstacles() {
    if (isPaused) return;
    if (!gameActive) {
        updateKillerPlane();
        if (killerPlane && killerPlane.spent) {
            window.gameLoop = requestAnimationFrame(moveBackgroundAndObstacles);
        }
        return;
    }

    distanceTraveled += obstacleSpeed;
    giantWorldX = distanceTraveled + GIANT_START_X;
    movePlayer();
    updatePlayerFly();
    if (gameActive && playerHitCeiling()) {
        spawnKillerPlane();
    }
    backgroundPosition = -(distanceTraveled % 1200);
    document.getElementById('game-container').style.backgroundPosition = `${backgroundPosition}px 0`;
    updateWorldPositions();
    updatePlayerRoll();
    updatePlayerNameTag();
    updateKillerPlane();
    if (!gameActive) {
        if (killerPlane && killerPlane.spent) {
            window.gameLoop = requestAnimationFrame(moveBackgroundAndObstacles);
        }
        return;
    }
    drawHitboxes();
    updateScore();

    const playerWorldX = getPlayerScreenX() + distanceTraveled;

    obstacles.forEach(obstacle => {
        if (obstacle.classList.contains('being-eaten-by-giant')) return;
        if (checkCircleCollision(mAndM, obstacle)) {
            consecutiveJumps = 0;
            playSkittleHitSound(obstacle);
            gameOver(obstacle);
            return;
        }

        if (!obstacle.dataset.scored && Number(obstacle.dataset.worldX) + 40 < playerWorldX) {
            obstacle.dataset.scored = 'true';
            consecutiveJumps++;
            score += 10 * consecutiveJumps;

            if (window.innerWidth <= 768) {
                if (obstacleSpeed < 6) {
                    obstacleSpeed += 0.03;
                }
            } else {
                if (obstacleSpeed < 8) {
                    obstacleSpeed += 0.1;
                }
            }

            updateScore();
        }
    });

    const giant = document.getElementById('giant-skittle');
    if (gameActive && !smashPlaying && playerIsBehindGiant()) {
        consecutiveJumps = 0;
        gameOver({ id: 'behind-giant' });
        if (!gameActive) return;
    }
    if (gameActive && !smashPlaying && checkCircleCollision(mAndM, giant)) {
        consecutiveJumps = 0;
        playSkittleHitSound(giant);
        gameOver(giant);
        if (!gameActive) return;
    }
    for (const bird of birds) {
        if (bird.el.classList.contains('being-eaten-by-giant')) continue;
        if (gameActive && Date.now() >= hurtUntil && checkCircleCollision(mAndM, bird.el)) {
            consecutiveJumps = 0;
            gameOver(bird.el);
            if (gameActive) {
                bounceBirdAway(bird);
                shovePlayerAwayFrom(bird.el);
            } else {
                return;
            }
            break;
        }
    }
    keepGiantCloseForThrows();
    updateThrownSkittles();
    if (currentLevel === 2 && currentChunk() >= HUNGRY_STOP_CHUNK) {
        stopHungrySkittles();
    } else {
        maybeThrowHungrySkittle();
    }
    giantEatsPrey();
    for (const thrown of thrownSkittles) {
        if (thrown.el.classList.contains('being-eaten-by-giant') || thrown.busy) continue;
        if (gameActive && Date.now() >= hurtUntil && checkCircleCollision(mAndM, thrown.el)) {
            consecutiveJumps = 0;
            playSkittleHitSound(thrown.el);
            gameOver(thrown.el);
            if (!gameActive) return;
            break;
        }
    }

    if (gameActive && playerWorldX >= MAP_LENGTH) {
        if (currentLevel < MAX_LEVEL) {
            startNextLevel();
            return;
        }
        youWin();
        return;
    }

    window.gameLoop = requestAnimationFrame(moveBackgroundAndObstacles);
}

function getCandyCircle(el) {
    return {
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
        r: el.offsetWidth / 2
    };
}

function drawHitboxes() {
    const canvas = document.getElementById('hitbox-layer');
    const container = document.getElementById('game-container');
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!showHitboxes) return;
    ctx.lineWidth = 2;

    function drawCircle(el, color) {
        const circle = getCandyCircle(el);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
        ctx.stroke();
    }

    obstacles.forEach(obstacle => drawCircle(obstacle, '#FFE600'));

    const giant = document.getElementById('giant-skittle');
    if (giant) {
        drawCircle(giant, '#FF4DFF');
    }

    birds.forEach(bird => drawCircle(bird.el, '#00C8FF'));
    thrownSkittles.forEach(thrown => drawCircle(thrown.el, '#FF8A00'));
    if (killerPlane) {
        const nose = planeNose();
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(nose.x, nose.y, 16, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawCircle(mAndM, '#00FF66');
}

function checkCircleCollision(player, obstacle) {
    const playerCircle = getCandyCircle(player);
    const obstacleCircle = getCandyCircle(obstacle);
    const dx = playerCircle.x - obstacleCircle.x;
    const dy = playerCircle.y - obstacleCircle.y;
    const minDistance = playerCircle.r + obstacleCircle.r;

    if (dx * dx + dy * dy < minDistance * minDistance) {
        const containerRect = document.getElementById('game-container').getBoundingClientRect();
        window.collisionPoint = {
            x: containerRect.left + (playerCircle.x + obstacleCircle.x) / 2,
            y: containerRect.top + (playerCircle.y + obstacleCircle.y) / 2
        };
        return true;
    }
    return false;
}

function updateScore() {
    const backStatus = isMoveCooling(backCooldownUntil) ? 'Back wait' : `Back ${backPresses}/${MOVE_PRESSES_BEFORE_COOLDOWN}`;
    const forwardStatus = isMoveCooling(forwardCooldownUntil) ? 'Fwd wait' : `Fwd ${forwardPresses}/${MOVE_PRESSES_BEFORE_COOLDOWN}`;
    document.getElementById('current-score-display').textContent = `Level ${currentLevel}  ·  Score: ${score}  ·  Chunk: ${currentChunk()}/${MAP_CHUNKS}  ·  ${backStatus}  ${forwardStatus}`;
    document.getElementById('high-score-display').textContent = `High Score: ${highScore}`;
}

async function fetchHighScores() {
    try {
        const response = await fetch('/api/highscore');
        const data = await response.json();
        highScore = data.highScore;
        yesterdayTopScore = data.yesterdayHighScore;
        updateScore();
    } catch (error) {
        console.error('Error fetching high scores:', error);
    }
}

async function updateHighScore(newScore) {
    try {
        const response = await fetch('/api/highscore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score: newScore })
        });
        const data = await response.json();
        highScore = data.highScore;
        yesterdayTopScore = data.yesterdayHighScore;
        updateScore();
    } catch (error) {
        console.error('Error updating high score:', error);
    }
}

function checkAndUpdateHighScore() {
    if (score > highScore) {
        updateHighScore(score);
    }
    document.getElementById('high-score-display').textContent = `High Score: ${highScore}`;
    document.getElementById('yesterday-score-display').textContent = `Yesterday's Top Score: ${yesterdayTopScore}`;
}

function startGame() {
    startAtLevel(1);
}

function startAtLevel(levelNumber) {
    const level = Math.min(MAX_LEVEL, Math.max(1, levelNumber));
    if (level > unlockedLevel) return;
    unlockLevel(level);
    unlockGameSounds();
    hideAllScreens();
    const continueRun = gameActive && hearts > 0;
    currentLevel = level;
    checkpointLevel = currentLevel;
    if (!continueRun) {
        checkpointScore = 0;
        score = 0;
    }
    settingsPausedGame = false;
    setupLevel(!continueRun);
    const player = getCandyCircle(mAndM);
    teleportPop(player.x, player.y);
    showLevelBanner(`LEVEL ${currentLevel}`);
    fetchHighScores();
    if (window.gameLoop) {
        cancelAnimationFrame(window.gameLoop);
    }
    moveBackgroundAndObstacles();
}

function teleportToLevelEnd() {
    const lead = 280;
    distanceTraveled = Math.max(0, MAP_LENGTH - getPlayerScreenX() - lead);
    backgroundPosition = -(distanceTraveled % 1200);
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.style.backgroundPosition = `${backgroundPosition}px 0`;
    }
    giantWorldX = distanceTraveled + GIANT_START_X;
    updateWorldPositions();
    updatePlayerNameTag();
}

function startNextLevel() {
    currentLevel += 1;
    unlockLevel(currentLevel);
    checkpointLevel = currentLevel;
    checkpointScore = score;
    setupLevel(false);
    showLevelBanner(`CHECKPOINT · LEVEL ${currentLevel}`);
    if (window.gameLoop) {
        cancelAnimationFrame(window.gameLoop);
    }
    moveBackgroundAndObstacles();
}

function playAgainFromCheckpoint() {
    unlockGameSounds();
    hideAllScreens();
    if (checkpointLevel > 1) {
        currentLevel = checkpointLevel;
        score = checkpointScore;
        setupLevel(true);
        showLevelBanner('CHECKPOINT');
        if (window.gameLoop) {
            cancelAnimationFrame(window.gameLoop);
        }
        moveBackgroundAndObstacles();
        return;
    }
    startGame();
}

function showLevelBanner(text) {
    const banner = document.getElementById('level-banner');
    if (!banner) return;
    banner.textContent = text;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 1600);
}

function setupLevel(isNewGame) {
    obstacles.forEach(obstacle => obstacle.remove());
    obstacles = [];

    gameActive = true;
    isPaused = false;
    const baseSpeed = window.innerWidth <= 768 ? 3 : INITIAL_SPEED;
    if (currentLevel >= 3) {
        obstacleSpeed = baseSpeed + 2.5;
    } else if (currentLevel >= 2) {
        obstacleSpeed = baseSpeed + 1.5;
    } else {
        obstacleSpeed = baseSpeed;
    }
    distanceTraveled = 0;
    backgroundPosition = 0;
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.classList.toggle('dungeon', currentLevel === 2);
        gameContainer.classList.toggle('night', currentLevel >= 3);
        gameContainer.style.backgroundPosition = '0 0';
    }
    stopMotion();
    isJumping = false;
    if (isNewGame) {
        doubleJumpsRemaining = 10;
        canDoubleJump = false;
        updateDoubleJumpCounter();
        consecutiveJumps = 0;
        hearts = MAX_HEARTS;
        playerIsSplit = false;
        playerIsQuarter = false;
        hurtUntil = 0;
        smashPlaying = false;
        if (gameOverTimer) {
            clearTimeout(gameOverTimer);
            gameOverTimer = null;
        }
        barrierHits = 0;
        barrierTouching = false;
        updateBarrierLook();
    }
    heldKeys.clear();
    flyTouchHeld = false;
    forwardPresses = 0;
    backPresses = 0;
    forwardCooldownUntil = 0;
    backCooldownUntil = 0;
    pendingForwardCooldown = false;
    pendingBackCooldown = false;
    giantWorldX = GIANT_START_X;
    noSkittleUntil = Date.now() + SKITTLE_SPAWN_DELAY_MS;
    hungryStopped = false;
    hideHungryByeMessage();
    clearThrownSkittles();
    clearKillerPlane();
    createBirds();

    const mAndM = document.getElementById('m-and-m');
    mAndM.style.bottom = '20px';
    mAndM.style.transform = 'rotate(0deg)';
    mAndM.classList.remove('being-eaten', 'being-smashed', 'under-giant', 'trying-to-escape', 'teleporting', 'destroyed', 'impact', 'flying', 'split');
    if (!playerIsSplit) {
        mAndM.classList.remove('one-half');
    }
    if (!playerIsQuarter) {
        mAndM.classList.remove('one-quarter');
    }
    document.querySelectorAll('.player-bit, #eat-bits-layer, .teleport-pop, .left-behind-half, .left-behind-quarter').forEach(el => el.remove());
    mAndM.style.removeProperty('--eat-x');
    mAndM.style.removeProperty('--eat-y');
    updateHearts();
    const giant = document.getElementById('giant-skittle');
    if (giant) {
        giant.classList.remove('eating', 'smashing', 'smashing-down', 'jumping-up', 'trapping');
        giant.style.bottom = '20px';
        giant.style.transform = 'rotate(0deg)';
    }

    updateScore();
    adjustGameLayout();
    applyPlayerLook();
    placePlayerOnScreen();
    initializeObstacles();
}

function placePlayerOnScreen() {
    const container = document.getElementById('game-container');
    const width = container ? container.clientWidth : 800;
    const preferred = width <= 768 ? MOBILE_SPAWN_X : PLAYER_SPAWN_X;
    const maxX = Math.max(20, width - PLAYER_SIZE - BARRIER_WIDTH - 20);
    mAndM.style.left = `${Math.min(preferred, maxX)}px`;
    mAndM.style.bottom = '20px';
    updatePlayerNameTag();
}

const SKITTLE_COLORS = ['#ED1C24', '#F26522', '#FFF200', '#8DC63F', '#662D91'];

function skittleFaceHtml() {
    return `
        <span class="skittle-letter">S</span>
        <div class="skittle-face">
            <span class="skittle-mouth"></span>
        </div>
    `;
}

function clearThrownSkittles() {
    thrownSkittles.forEach(thrown => thrown.el.remove());
    thrownSkittles = [];
    throwCooldown = 0;
    document.querySelectorAll('.hungry-skittle').forEach(el => el.remove());
}

function stopHungrySkittles() {
    if (hungryStopped) return;
    hungryStopped = true;
    clearThrownSkittles();
    showHungryByeMessage();
}

function showHungryByeMessage() {
    const el = document.getElementById('hungry-bye');
    if (!el) return;
    el.textContent = 'i will come back...';
    el.classList.add('show');
}

function hideHungryByeMessage() {
    const el = document.getElementById('hungry-bye');
    if (el) {
        el.classList.remove('show');
    }
}

function maybeThrowHungrySkittle() {
    if (hungryStopped) return;
    if (currentLevel === 2 && currentChunk() >= HUNGRY_STOP_CHUNK) return;
    if (Date.now() < noSkittleUntil) return;
    if (currentChunk() < (currentLevel >= 2 ? 2 : THROW_START_CHUNK)) return;
    if (thrownSkittles.length >= 6) return;
    throwCooldown -= 1;
    if (throwCooldown > 0) return;
    const someoneNearLeft = thrownSkittles.some((thrown) => {
        const screenX = thrown.worldX - distanceTraveled;
        return screenX < 140;
    });
    if (someoneNearLeft) return;
    throwHungrySkittle();
    throwCooldown = currentLevel >= 3 ? 50 : currentLevel >= 2 ? 70 : THROW_EVERY_FRAMES;
}

function keepGiantCloseForThrows() {
    giantWorldX = distanceTraveled + GIANT_START_X;
}

function throwHungrySkittle() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'obstacle skittle hungry-skittle';
    el.style.backgroundColor = SKITTLE_COLORS[Math.floor(Math.random() * SKITTLE_COLORS.length)];
    el.innerHTML = skittleFaceHtml();
    container.appendChild(el);

    const startScreenX = -THROWN_SKITTLE_SIZE - 16;
    const maxBottom = Math.max(60, container.clientHeight - THROWN_SKITTLE_SIZE - 16);
    const lanes = [20, 90, 160, 230, 300, 370].filter((lane) => lane <= maxBottom);
    const usedLanes = thrownSkittles.map((thrown) => thrown.bottom);
    const freeLanes = lanes.filter((lane) => usedLanes.every((used) => Math.abs(used - lane) > 50));
    const startBottom = (freeLanes.length ? freeLanes : lanes)[Math.floor(Math.random() * (freeLanes.length || lanes.length))];

    thrownSkittles.push({
        el,
        worldX: startScreenX + distanceTraveled,
        bottom: startBottom,
        vx: 0,
        vy: 0,
        busy: false
    });
}

function eatThingByHungry(eater, prey, onGone) {
    if (eater.busy) return;
    eater.busy = true;
    playEatSound();
    eater.el.classList.add('eating');
    const preyCircle = getCandyCircle(prey);
    const mouthCircle = getCandyCircle(eater.el);
    prey.style.setProperty('--eat-x', `${mouthCircle.x - preyCircle.x}px`);
    prey.style.setProperty('--eat-y', `${mouthCircle.y - preyCircle.y}px`);
    prey.classList.add('being-eaten-by-giant');
    setTimeout(() => {
        eater.el.classList.remove('eating');
        onGone();
    }, 280);
}

function hungryEatsNearby(thrown) {
    if (thrown.busy || thrown.el.classList.contains('being-eaten-by-giant')) return false;

    for (const obstacle of obstacles.slice()) {
        if (obstacle.classList.contains('being-eaten-by-giant')) continue;
        if (!checkCircleCollision(thrown.el, obstacle)) continue;
        eatThingByHungry(thrown, obstacle, () => {
            obstacle.remove();
            obstacles = obstacles.filter(item => item !== obstacle);
            thrown.el.remove();
            thrownSkittles = thrownSkittles.filter(item => item !== thrown);
        });
        return true;
    }

    for (const bird of birds) {
        if (bird.el.classList.contains('being-eaten-by-giant')) continue;
        if (!checkCircleCollision(thrown.el, bird.el)) continue;
        eatThingByHungry(thrown, bird.el, () => {
            const container = document.getElementById('game-container');
            bird.el.classList.remove('being-eaten-by-giant');
            bird.el.style.removeProperty('--eat-x');
            bird.el.style.removeProperty('--eat-y');
            bird.pathWorldX = distanceTraveled + (container ? container.clientWidth : 800) + 80 + Math.random() * 500;
            bird.patrolOffset = 0;
            bird.patrolDir = 1;
            thrown.el.remove();
            thrownSkittles = thrownSkittles.filter(item => item !== thrown);
        });
        return true;
    }

    return false;
}

function updateThrownSkittles() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const maxBottom = Math.max(20, container.clientHeight - THROWN_SKITTLE_SIZE - 8);
    const targetX = getPlayerScreenX();
    const targetBottom = parseInt(mAndM.style.bottom, 10) || 20;

    thrownSkittles = thrownSkittles.filter(thrown => {
        if (!thrown.el.isConnected) return false;
        if (thrown.busy || thrown.el.classList.contains('being-eaten-by-giant')) {
            const holdX = thrown.worldX - distanceTraveled;
            thrown.el.style.left = `${holdX}px`;
            thrown.el.style.bottom = `${thrown.bottom}px`;
            return true;
        }

        let screenX = thrown.worldX - distanceTraveled;
        const dx = targetX - screenX;
        const dy = targetBottom - thrown.bottom;
        const dist = Math.hypot(dx, dy) || 1;
        screenX += (dx / dist) * HUNGRY_FOLLOW_SPEED;
        thrown.bottom += (dy / dist) * HUNGRY_FOLLOW_SPEED;
        if (thrown.bottom < 20) thrown.bottom = 20;
        if (thrown.bottom > maxBottom) thrown.bottom = maxBottom;
        thrown.worldX = screenX + distanceTraveled;
        thrown.el.style.left = `${screenX}px`;
        thrown.el.style.bottom = `${thrown.bottom}px`;

        hungryEatsNearby(thrown);
        return true;
    });
}

function isSkittleEater(el) {
    return Boolean(el && el.classList && el.classList.contains('skittle'));
}

function isGiantSkittle(el) {
    return Boolean(el && el.id === 'giant-skittle');
}

function eatThingByGiant(giant, prey, onGone) {
    playEatSound();
    giant.classList.add('eating');
    const preyCircle = getCandyCircle(prey);
    const mouthCircle = getCandyCircle(giant);
    prey.style.setProperty('--eat-x', `${mouthCircle.x - preyCircle.x}px`);
    prey.style.setProperty('--eat-y', `${mouthCircle.y - preyCircle.y}px`);
    prey.classList.add('being-eaten-by-giant');
    setTimeout(() => {
        giant.classList.remove('eating');
        onGone();
    }, 280);
}

function giantEatsPrey() {
    const giant = document.getElementById('giant-skittle');
    if (!giant || !gameActive) return;

    obstacles.slice().forEach(obstacle => {
        if (obstacle.classList.contains('being-eaten-by-giant')) return;
        if (!checkCircleCollision(giant, obstacle)) return;
        eatThingByGiant(giant, obstacle, () => {
            obstacle.remove();
            obstacles = obstacles.filter(item => item !== obstacle);
        });
    });

    birds.forEach(bird => {
        if (bird.el.classList.contains('being-eaten-by-giant')) return;
        if (!checkCircleCollision(giant, bird.el)) return;
        eatThingByGiant(giant, bird.el, () => {
            const container = document.getElementById('game-container');
            bird.el.classList.remove('being-eaten-by-giant');
            bird.el.style.removeProperty('--eat-x');
            bird.el.style.removeProperty('--eat-y');
            bird.pathWorldX = distanceTraveled + (container ? container.clientWidth : 800) + 80 + Math.random() * 500;
            bird.patrolOffset = 0;
            bird.patrolDir = 1;
        });
    });

    thrownSkittles.slice().forEach(thrown => {
        const overlapping = checkCircleCollision(giant, thrown.el);
        if (!overlapping) {
            thrown.leftGiant = true;
            return;
        }
        if (!thrown.leftGiant || thrown.el.classList.contains('being-eaten-by-giant')) return;
        eatThingByGiant(giant, thrown.el, () => {
            thrown.el.remove();
            thrownSkittles = thrownSkittles.filter(item => item !== thrown);
        });
    });
}

function destroyPlayer(atX, atY) {
    mAndM.classList.add('destroyed');
    const gameContainer = document.getElementById('game-container');
    const oldLayer = document.getElementById('eat-bits-layer');
    if (oldLayer) {
        oldLayer.remove();
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'eat-bits-layer';
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
    gameContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const colors = ['#FF0000', '#CC0000', '#E00000', '#FF4D4D', '#FF6666', '#FFFFFF', '#FFD6D6'];
    const count = 50;
    const bits = new Array(count);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 140;
        bits[i] = {
            x: atX,
            y: atY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 4 + Math.random() * 6,
            color: colors[i % colors.length]
        };
    }

    const start = performance.now();
    const duration = 700;
    function frame(now) {
        if (!document.getElementById('eat-bits-layer')) {
            return;
        }
        const t = Math.min(1, (now - start) / duration);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1 - t;
        for (let i = 0; i < count; i++) {
            const bit = bits[i];
            ctx.fillStyle = bit.color;
            ctx.fillRect(bit.x + bit.vx * t, bit.y + bit.vy * t + 90 * t * t, bit.size, bit.size);
        }
        ctx.globalAlpha = 1;
        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            canvas.remove();
        }
    }
    requestAnimationFrame(frame);
}

function eatPlayer(skittle, afterEat) {
    const playerCircle = getCandyCircle(mAndM);
    const mouthCircle = getCandyCircle(skittle);
    mAndM.style.setProperty('--eat-x', `${mouthCircle.x - playerCircle.x}px`);
    mAndM.style.setProperty('--eat-y', `${mouthCircle.y - playerCircle.y}px`);
    if (skittle && skittle.classList) {
        skittle.classList.add('eating');
    }
    mAndM.classList.add('being-eaten');
    setTimeout(() => {
        destroyPlayer(mouthCircle.x, mouthCircle.y);
        if (skittle && skittle.classList) {
            skittle.classList.remove('eating');
        }
        if (afterEat) {
            afterEat();
        }
    }, 280);
}

function restorePlayerAfterEat() {
    mAndM.classList.remove('being-eaten', 'destroyed', 'impact');
    mAndM.style.removeProperty('--eat-x');
    mAndM.style.removeProperty('--eat-y');
    mAndM.style.transform = 'rotate(0deg)';
    document.querySelectorAll('.player-bit, #eat-bits-layer').forEach((el) => el.remove());
    placePlayerOnScreen();
}

function teleportPop(x, y) {
    const pop = document.createElement('div');
    pop.className = 'teleport-pop';
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    document.getElementById('game-container').appendChild(pop);
    setTimeout(() => pop.remove(), 350);
}

function smashPlayer(giant) {
    if (smashPlaying) return;
    smashPlaying = true;
    giant.classList.remove('eating', 'smashing', 'smashing-down');
    giant.style.removeProperty('transform');
    giant.classList.add('trapping', 'jumping-up');
    const from = getCandyCircle(mAndM);
    const underX = getCandyCircle(giant).x - PLAYER_SIZE / 2;

    setTimeout(() => {
        teleportPop(from.x, from.y);
        mAndM.classList.add('teleporting');
        setTimeout(() => {
            mAndM.style.bottom = '20px';
            mAndM.style.left = `${underX}px`;
            mAndM.style.transform = 'rotate(0deg)';
            mAndM.classList.remove('teleporting');
            mAndM.classList.add('under-giant');
            const to = getCandyCircle(mAndM);
            teleportPop(to.x, to.y);
            setTimeout(() => {
                mAndM.classList.add('trying-to-escape');
            }, 200);
        }, 80);
    }, 400);

    setTimeout(() => {
        mAndM.classList.remove('trying-to-escape');
        mAndM.classList.add('being-smashed');
        giant.classList.remove('jumping-up');
        giant.classList.add('smashing-down');
    }, 1500);

    setTimeout(() => {
        const playerCircle = getCandyCircle(mAndM);
        destroyPlayer(playerCircle.x, playerCircle.y);
        document.getElementById('game-container').classList.add('smash-shake');
    }, 1860);
}

function initializeObstacles() {
    const safeRange = PLAYER_SIZE * 6;
    const startSpeed = window.innerWidth <= 768 ? 3 : INITIAL_SPEED;
    const delayDistance = startSpeed * (SKITTLE_SPAWN_DELAY_MS / 16);
    const startX = PLAYER_SPAWN_X + Math.max(safeRange, delayDistance);
    const endX = CHUNK_SIZE * MAP_CHUNKS;
    const skittleCount = currentLevel >= 3 ? 150 : currentLevel >= 2 ? 120 : 90;
    const minGap = currentLevel >= 3 ? PLAYER_SIZE * 3.2 : currentLevel >= 2 ? PLAYER_SIZE * 4 : safeRange;
    const maxGap = minGap + (currentLevel >= 3 ? 90 : currentLevel >= 2 ? 120 : 200);
    let worldX = startX + Math.random() * 80;
    let skittleNumber = 0;

    while (worldX < endX && skittleNumber < skittleCount) {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle skittle';
        obstacle.style.backgroundColor = SKITTLE_COLORS[skittleNumber % SKITTLE_COLORS.length];
        obstacle.style.bottom = '20px';
        obstacle.dataset.worldX = String(Math.round(worldX));
        obstacle.innerHTML = skittleFaceHtml();
        document.getElementById('game-container').appendChild(obstacle);
        obstacles.push(obstacle);
        skittleNumber++;
        worldX += minGap + Math.random() * (maxGap - minGap);
    }
    updateWorldPositions();
}

function youWin() {
    gameActive = false;
    isPaused = false;
    heldKeys.clear();
    flyTouchHeld = false;
    mAndM.classList.remove('flying');
    stopMotion();
    isJumping = false;
    document.getElementById('win-score').textContent = score;
    const winBlurb = document.getElementById('win-blurb');
    if (winBlurb) {
        winBlurb.textContent = 'You finished Level 3!';
    }
    checkAndUpdateHighScore();
    updateScore();
    showScreen('you-win-screen');
}

function createExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.left = x + 'px';
    explosion.style.top = y + 'px';
    document.getElementById('game-container').appendChild(explosion);
    
    setTimeout(() => {
        explosion.remove();
    }, 500);
}

function updateHearts() {
    const icons = document.querySelectorAll('#hearts-bar .heart');
    icons.forEach((heart, index) => {
        heart.classList.toggle('lost', index >= hearts);
    });
    mAndM.classList.remove('split');
    mAndM.classList.toggle('one-half', playerIsSplit && !playerIsQuarter);
    mAndM.classList.toggle('one-quarter', playerIsQuarter);
    if (playerIsSplit || playerIsQuarter || hearts <= 2) {
        canDoubleJump = false;
        doubleJumpsRemaining = 0;
        updateDoubleJumpCounter();
    }
}

function dropPlayerPiece(className, offsetX) {
    const leftover = document.createElement('div');
    leftover.className = className;
    leftover.dataset.worldX = String(getPlayerScreenX() + offsetX + distanceTraveled);
    leftover.style.left = `${getPlayerScreenX() + offsetX}px`;
    leftover.style.bottom = mAndM.style.bottom || '20px';
    leftover.innerHTML = '<span class="half-letter">m</span>';
    document.getElementById('game-container').appendChild(leftover);
}

function removeHungryIfNeeded(hitBy) {
    if (hitBy && hitBy.classList && hitBy.classList.contains('hungry-skittle')) {
        hitBy.remove();
        thrownSkittles = thrownSkittles.filter((thrown) => thrown.el !== hitBy);
    }
}

function leaveHalfBehind(hitBy) {
    playerIsSplit = true;
    mAndM.classList.remove('one-quarter');
    mAndM.classList.add('one-half');
    dropPlayerPiece('left-behind-half', 0);
    removeHungryIfNeeded(hitBy);
}

function leaveQuarterBehind(hitBy) {
    playerIsQuarter = true;
    mAndM.classList.remove('one-half');
    mAndM.classList.add('one-quarter');
    dropPlayerPiece('left-behind-quarter', 20);
    removeHungryIfNeeded(hitBy);
}

function shovePlayerAwayFrom(el) {
    if (!el) return;
    const circle = getCandyCircle(el);
    const safeX = Math.min(getBarrierLeft() - PLAYER_SIZE, circle.x + circle.r + 16);
    mAndM.style.left = `${Math.max(20, safeX)}px`;
    mAndM.style.bottom = '20px';
}

function bounceBirdAway(bird) {
    const container = document.getElementById('game-container');
    bird.pathWorldX = distanceTraveled + (container ? container.clientWidth : 800) + 220;
    bird.patrolOffset = 0;
    bird.patrolDir = 1;
    bird.el.style.left = `${bird.pathWorldX - distanceTraveled}px`;
}

function collisionSpot() {
    const container = document.getElementById('game-container');
    const containerRect = container.getBoundingClientRect();
    if (window.collisionPoint) {
        return {
            x: window.collisionPoint.x - containerRect.left,
            y: window.collisionPoint.y - containerRect.top
        };
    }
    const player = getCandyCircle(mAndM);
    return { x: player.x, y: player.y };
}

function loseHeart(collidedObstacle) {
    const stillWhole = !playerIsSplit;
    hearts = Math.max(0, hearts - 1);
    updateHearts();
    hurtUntil = Date.now() + 1800;
    if (stillWhole) {
        leaveHalfBehind(collidedObstacle);
    } else if (!playerIsQuarter) {
        leaveQuarterBehind(collidedObstacle);
    } else {
        mAndM.classList.add('impact');
        setTimeout(() => mAndM.classList.remove('impact'), 350);
        removeHungryIfNeeded(collidedObstacle);
    }
    if (isGiantSkittle(collidedObstacle)) {
        shovePlayerAwayFrom(collidedObstacle);
    }
    if (collidedObstacle && collidedObstacle.classList && collidedObstacle.classList.contains('chase-bird')) {
        const bird = birds.find((item) => item.el === collidedObstacle);
        if (bird) bounceBirdAway(bird);
        shovePlayerAwayFrom(collidedObstacle);
    }
}

function gameOver(collidedObstacle) {
    const caughtByGiant = isGiantSkittle(collidedObstacle);
    const sneakyBehind = wentBehindGiant(collidedObstacle);
    if (!caughtByGiant && !sneakyBehind) {
        if (Date.now() < hurtUntil) return;
        if (hearts > 1) {
            loseHeart(collidedObstacle);
            return;
        }
    }
    hearts = 0;
    updateHearts();
    gameActive = false;
    isPaused = false;
    heldKeys.clear();
    flyTouchHeld = false;
    stopMotion();
    isJumping = false;
    
    const mAndM = document.getElementById('m-and-m');
    mAndM.classList.remove('flying');
    const smashedByGiant = isGiantSkittle(collidedObstacle);
    const eatenBySkittle = isSkittleEater(collidedObstacle);
    let endDelay = 500;

    if (smashedByGiant) {
        smashPlayer(collidedObstacle);
        endDelay = 2600;
    } else if (eatenBySkittle) {
        eatPlayer(collidedObstacle);
        endDelay = 900;
    } else {
        mAndM.classList.add('impact');
        const spot = collisionSpot();
        createExplosion(spot.x, spot.y);
        document.getElementById('game-container').classList.add('game-over-flash');
    }
    
    const title = document.getElementById('game-over-title');
    if (title) {
        if (sneakyBehind) {
            title.textContent = "where do you think you're going?";
        } else if (collidedObstacle && collidedObstacle.classList && collidedObstacle.classList.contains('chase-bird')) {
            title.textContent = 'you were pecked to death lol';
        } else if (collidedObstacle && (collidedObstacle.id === 'ceiling' || (collidedObstacle.classList && collidedObstacle.classList.contains('killer-plane')))) {
            title.textContent = 'i beleve i can fly.';
        } else if (smashedByGiant) {
            title.textContent = 'you got smashed';
        } else if (eatenBySkittle) {
            title.textContent = 'you got eaten';
        } else {
            title.textContent = 'woop-woop';
        }
    }

    document.getElementById('final-score').textContent = score;
    const playAgainBtn = document.getElementById('restart-button');
    if (playAgainBtn) {
        playAgainBtn.textContent = checkpointLevel > 1 ? 'Checkpoint' : 'Play Again';
    }
    
    if (gameOverTimer) clearTimeout(gameOverTimer);
    gameOverTimer = setTimeout(() => {
        gameOverTimer = null;
        mAndM.classList.remove('impact');
        document.getElementById('game-container').classList.remove('game-over-flash', 'smash-shake');
        checkAndUpdateHighScore();
        updateScore();
        showScreen('game-over-screen');
    }, endDelay);
}

function initializeScores() {
    checkAndUpdateHighScore();
    updateScore();
}

function updateDoubleJumpCounter() {
    const counterDisplay = document.getElementById('double-jump-counter');
    if (!counterDisplay) {
        const scoreBar = document.getElementById('score-bar');
        const counter = document.createElement('span');
        counter.id = 'double-jump-counter';
        counter.style.position = 'absolute';
        counter.style.left = '50%';
        counter.style.transform = 'translateX(-50%)';
        scoreBar.appendChild(counter);
    }
    document.getElementById('double-jump-counter').textContent = `Double Jumps: ${doubleJumpsRemaining}`;
}

function initializeMobileControls() {
    // Remove the old touch listener since we're using handleTouch
    document.addEventListener('touchstart', handleTouch, { passive: false });
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('deviceorientation', handleDeviceOrientation);
}

function handleOrientationChange() {
    adjustGameLayout();
}

let lastOrientationCheck = 0;
const ORIENTATION_CHECK_DELAY = 100;

function handleDeviceOrientation(event) {
    const now = Date.now();
    if (now - lastOrientationCheck < ORIENTATION_CHECK_DELAY) return;
    lastOrientationCheck = now;

    if (Math.abs(event.gamma) > 60) {
        adjustGameLayout(true);
    } else {
        adjustGameLayout(false);
    }
}

function adjustGameLayout(isLandscape = window.innerWidth > window.innerHeight) {
    const wrapper = document.querySelector('.game-wrapper');
    const gameContainer = document.getElementById('game-container');
    const scoreBar = document.getElementById('score-bar');
    const yesterdayScoreBar = document.getElementById('yesterday-score-bar');

    // Calculate the game size based on viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (isLandscape) {
        // In landscape, base size on height
        const gameHeight = viewportHeight - 80; // Account for score bars
        const gameWidth = gameHeight * 4/3;
        
        wrapper.style.width = `${gameWidth}px`;
        wrapper.style.height = `${viewportHeight}px`;
        gameContainer.style.height = `${gameHeight}px`;
    } else {
        // In portrait, base size on width
        const gameWidth = Math.min(viewportWidth, 500); // Max width of 500px
        const gameHeight = gameWidth * 3/4;
        
        wrapper.style.width = `${gameWidth}px`;
        wrapper.style.height = `${gameHeight + 80}px`; // Add height for score bars
        gameContainer.style.height = `${gameHeight}px`;
    }

    // Score bars match wrapper width
    scoreBar.style.width = '100%';
    yesterdayScoreBar.style.width = '100%';
}

function adjustGameScale() {
    // Remove this function as we're handling everything in adjustGameLayout
    adjustGameLayout();
}

// Event listeners for mobile
document.addEventListener('touchstart', handleTouch, { passive: false });
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
window.addEventListener('resize', adjustGameScale);
window.addEventListener('orientationchange', () => setTimeout(adjustGameScale, 100));
window.addEventListener('load', adjustGameScale);

initializeScores();
updateHearts();

// Update the instructions for mobile
function updateInstructions() {
    const instructionsText = document.querySelector('#instructions-screen');
    if (window.innerWidth <= 768) {
        instructionsText.innerHTML = `
            <h2>How to Play</h2>
            <p>${flyOn ? 'Hold the screen to fly. Let go to fall' : 'Tap the screen to jump'}</p>
            <p>Don't fly into the top of the screen. A plane will fly in and hit you</p>
            <p>Don't let a Skittle eat you</p>
            <p>If the giant Skittle catches you, it jumps up. You teleport under it and try to escape. Then it smashes you</p>
            <p>Hungry Skittles come from the left, one at a time, and chase you until they eat you, a bird, or another Skittle</p>
            <p>Don't touch the birds</p>
            <p>The giant Skittle eats birds and other Skittles</p>
            <p>Score increases with each successful jump</p>
            <p>Finish a level to start the next one. There's a checkpoint at the end of level 1 and level 2</p>
            <p>If you die, press Checkpoint to start at your last checkpoint</p>
            <p>Don't bump the right wall more than 10 times</p>
            <p>Press P to pause</p>
            <p>Consecutive jumps give bonus points!</p>
            <button id="back-to-menu-btn" class="menu-button">Back to Menu</button>
        `;
    } else {
        instructionsText.innerHTML = `
            <h2>How to Play</h2>
            <p>${flyOn ? 'Hold W, SPACE, or UP to fly. Let go to fall' : 'Press W, SPACE, or UP to jump'}</p>
            <p>Don't fly into the top of the screen. A plane will fly in and hit you</p>
            <p>Press A or LEFT to go back, D or RIGHT to go forward</p>
            <p>After 3 left or 3 right presses, those keys rest for a bit</p>
            <p>Don't let a Skittle eat you</p>
            <p>If the giant Skittle catches you, it jumps up. You teleport under it and try to escape. Then it smashes you</p>
            <p>Hungry Skittles come from the left, one at a time, and chase you until they eat you, a bird, or another Skittle</p>
            <p>Don't touch the birds</p>
            <p>The giant Skittle eats birds and other Skittles</p>
            <p>Score increases with each successful jump</p>
            <p>Finish a level to start the next one. There's a checkpoint at the end of level 1 and level 2</p>
            <p>If you die, press Checkpoint to start at your last checkpoint</p>
            <p>Don't bump the right wall more than 10 times</p>
            <p>Press P to pause</p>
            <p>Consecutive jumps give bonus points!</p>
            <button id="back-to-menu-btn" class="menu-button">Back to Menu</button>
        `;
    }
    // Reattach the event listener for the back button
    document.getElementById('back-to-menu-btn').addEventListener('click', () => {
        hideAllScreens();
        showScreen('main-menu');
    });
}

// Call updateInstructions on load and resize
window.addEventListener('load', updateInstructions);
window.addEventListener('resize', updateInstructions);