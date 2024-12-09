window.addEventListener('load', () => {
    hideAllScreens();
    showScreen('main-menu');
    initializeMobileControls();
    adjustGameLayout();
});

const mAndM = document.getElementById('m-and-m');
let obstacles = [];
let isJumping = false;
let obstacleSpeed = 3;
let score = 0;
let highScore = 0;
let gameActive = false;
let backgroundPosition = 0;
const INITIAL_SPEED = 4;
let doubleJumpsRemaining = 10;
let canDoubleJump = false;
let consecutiveJumps = 0;
let yesterdayTopScore = 0;
let currentScreen = 'main-menu';

// Add touch handling variables
let lastTouchTime = 0;
const TOUCH_COOLDOWN = 300; // Minimum time between jumps in milliseconds

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && gameActive) {
        if (!isJumping) {
            jump();
        } else if (canDoubleJump && doubleJumpsRemaining > 0) {
            doubleJump();
        }
    }
});

document.getElementById('start-game-btn').addEventListener('click', () => {
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
    startGame();
});

document.getElementById('menu-button').addEventListener('click', () => {
    hideAllScreens();
    showScreen('main-menu');
});

document.addEventListener('touchstart', handleTouch, { passive: false });
document.addEventListener('touchend', handleTouch, { passive: false });

function handleTouch(event) {
    if (!event.target.closest('#game-container')) return;
    
    event.preventDefault();
    
    if (event.target.classList.contains('menu-button')) {
        event.target.click();
        return;
    }
    
    if (gameActive && event.type === 'touchstart') {
        if (!isJumping) {
            jump();
        } else if (canDoubleJump && doubleJumpsRemaining > 0) {
            doubleJump();
        }
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
    const screens = ['main-menu', 'instructions-screen', 'game-over-screen'];
    screens.forEach(screenId => {
        document.getElementById(screenId).style.display = 'none';
    });
}

function showScreen(screenId) {
    currentScreen = screenId;
    document.getElementById(screenId).style.display = 'block';
}

function jump() {
    if (!isJumping) {
        isJumping = true;
        canDoubleJump = true;
        let position = 20;
        let jumpVelocity = 7;

        const jumpInterval = setInterval(() => {
            if (position >= 180) {
                clearInterval(jumpInterval);
                fall();
            } else {
                position += jumpVelocity;
                mAndM.style.bottom = position + 'px';
            }
        }, 16);
    }
}

function doubleJump() {
    canDoubleJump = false;
    doubleJumpsRemaining--;
    updateDoubleJumpCounter();
    
    if (window.fallInterval) {
        clearInterval(window.fallInterval);
    }
    
    let position = parseInt(mAndM.style.bottom);
    let jumpVelocity = 7;
    let maxHeight = position + 120;
    
    const doubleJumpInterval = setInterval(() => {
        if (position >= maxHeight) {
            clearInterval(doubleJumpInterval);
            fall();
        } else {
            position += jumpVelocity;
            mAndM.style.bottom = position + 'px';
        }
    }, 16);
}

function fall() {
    let position = parseInt(mAndM.style.bottom);
    let fallVelocity = 3.5;
    
    window.fallInterval = setInterval(() => {
        if (position <= 20) {
            clearInterval(window.fallInterval);
            mAndM.style.bottom = '20px';
            isJumping = false;
        } else {
            position -= fallVelocity;
            mAndM.style.bottom = position + 'px';
        }
    }, 16);
}

function moveBackgroundAndObstacles() {
    if (!gameActive) return;

    backgroundPosition -= obstacleSpeed;
    if (backgroundPosition <= -1200) {
        backgroundPosition = 0;
    }
    document.getElementById('game-container').style.backgroundPosition = `${backgroundPosition}px 0`;

    obstacles.forEach(obstacle => {
        let obstaclePosition = parseInt(obstacle.style.left) - obstacleSpeed;
        obstacle.style.left = `${obstaclePosition}px`;

        if (checkCollision(mAndM, obstacle)) {
            consecutiveJumps = 0;
            gameOver(obstacle);
            return;
        }

        if (obstaclePosition < -20) {
            obstacle.style.left = `${1200 + Math.random() * 400}px`;
            consecutiveJumps++;
            score += 10 * consecutiveJumps;
            obstacleSpeed += 0.2;
            updateScore();
        }
    });

    window.gameLoop = requestAnimationFrame(moveBackgroundAndObstacles);
}

function checkCollision(player, obstacle) {
    const playerRect = player.getBoundingClientRect();
    const obstacleRect = obstacle.getBoundingClientRect();

    if (!(playerRect.top > obstacleRect.bottom ||
        playerRect.bottom < obstacleRect.top ||
        playerRect.right < obstacleRect.left ||
        playerRect.left > obstacleRect.right)) {
        
        window.collisionPoint = {
            x: playerRect.right,
            y: playerRect.top + (playerRect.height / 2)
        };
        return true;
    }
    return false;
}

function updateScore() {
    document.getElementById('current-score-display').textContent = `Score: ${score}`;
    document.getElementById('high-score-display').textContent = `High Score: ${highScore}`;
}

function startGame() {
    hideAllScreens();
    obstacles.forEach(obstacle => obstacle.remove());
    obstacles = [];
    
    gameActive = true;
    obstacleSpeed = INITIAL_SPEED;
    score = 0;
    backgroundPosition = 0;
    isJumping = false;
    doubleJumpsRemaining = 10;
    canDoubleJump = false;
    updateDoubleJumpCounter();
    consecutiveJumps = 0;
    
    // Ensure player starts at correct position
    const mAndM = document.getElementById('m-and-m');
    mAndM.style.bottom = '20px';
    mAndM.style.left = '220px';
    
    document.getElementById('current-score-display').textContent = `Score: ${score}`;
    
    if (window.gameLoop) {
        cancelAnimationFrame(window.gameLoop);
    }
    
    initializeObstacles();
    moveBackgroundAndObstacles();
}

function initializeObstacles() {
    const obstacleConfigs = [
        { color: '#8B4513', width: 40, height: 40 },
        { color: '#FFA500', width: 40, height: 40 },
        { color: '#0000FF', width: 40, height: 40 }
    ];

    obstacleConfigs.forEach((config, index) => {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        obstacle.style.backgroundColor = config.color;
        obstacle.style.width = `${config.width}px`;
        obstacle.style.height = `${config.height}px`;
        obstacle.style.position = 'absolute';
        obstacle.style.bottom = '20px';
        obstacle.style.left = `${1200 + index * 400}px`;
        obstacle.style.borderRadius = '50%';
        obstacle.style.display = 'flex';
        obstacle.style.justifyContent = 'center';
        obstacle.style.alignItems = 'center';
        obstacle.style.fontFamily = 'Arial, sans-serif';
        obstacle.style.fontWeight = 'bold';
        obstacle.style.color = 'white';
        obstacle.style.fontSize = '20px';
        obstacle.textContent = 'm';
        
        document.getElementById('game-container').appendChild(obstacle);
        obstacles.push(obstacle);
    });
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

function gameOver(collidedObstacle) {
    gameActive = false;
    
    const mAndM = document.getElementById('m-and-m');
    mAndM.classList.add('impact');
    
    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    
    const relativeX = window.collisionPoint.x - containerRect.left;
    const relativeY = window.collisionPoint.y - containerRect.top;
    
    createExplosion(relativeX, relativeY);
    
    const gameContainer = document.getElementById('game-container').classList.add('game-over-flash');
    
    document.getElementById('final-score').textContent = score;
    
    setTimeout(() => {
        mAndM.classList.remove('impact');
        document.getElementById('game-container').classList.remove('game-over-flash');
        
        checkAndUpdateHighScore();
        updateScore();
        showScreen('game-over-screen');
    }, 500);
}

function checkAndUpdateHighScore() {
    let storedScore = localStorage.getItem('highScore');
    let storedTimestamp = localStorage.getItem('highScoreTimestamp');
    let currentTime = new Date().getTime();

    if (!storedTimestamp || currentTime - storedTimestamp > 24 * 60 * 60 * 1000) {
        yesterdayTopScore = highScore;
        localStorage.setItem('yesterdayTopScore', yesterdayTopScore);
        
        highScore = 0;
        localStorage.setItem('highScoreTimestamp', currentTime);
    } else {
        highScore = storedScore ? parseInt(storedScore) : 0;
        yesterdayTopScore = localStorage.getItem('yesterdayTopScore') ? parseInt(localStorage.getItem('yesterdayTopScore')) : 0;
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }

    document.getElementById('high-score-display').textContent = `High Score: ${highScore}`;
    document.getElementById('yesterday-score-display').textContent = `Yesterday's Top Score: ${yesterdayTopScore}`;
}

function initializeScores() {
    checkAndUpdateHighScore();
    document.getElementById('current-score-display').textContent = `Score: ${score}`;
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
    document.addEventListener('touchstart', (event) => {
        event.preventDefault();
        if (gameActive) {
            if (!isJumping) {
                jump();
            } else if (canDoubleJump && doubleJumpsRemaining > 0) {
                doubleJump();
            }
        }
    }, { passive: false });

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
    const gameContainer = document.getElementById('game-container');
    const scoreBar = document.getElementById('score-bar');
    const yesterdayScoreBar = document.getElementById('yesterday-score-bar');

    if (isLandscape) {
        gameContainer.style.width = '100vw';
        gameContainer.style.height = '100vh';
        scoreBar.style.width = '100vw';
        yesterdayScoreBar.style.width = '100vw';
        
        scoreBar.style.position = 'absolute';
        scoreBar.style.zIndex = '1000';
        yesterdayScoreBar.style.display = 'none';
    } else {
        gameContainer.style.width = '1200px';
        gameContainer.style.height = '500px';
        scoreBar.style.width = '1200px';
        yesterdayScoreBar.style.width = '1200px';
        
        scoreBar.style.position = 'relative';
        yesterdayScoreBar.style.display = 'flex';
    }
}

const meta = document.createElement('meta');
meta.name = 'viewport';
meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
document.head.appendChild(meta);

initializeScores();