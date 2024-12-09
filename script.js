window.addEventListener('load', () => {
    hideAllScreens();
    showScreen('main-menu');
    initializeMobileControls();
    adjustGameLayout();
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
let backgroundPosition = 0;
const INITIAL_SPEED = 4;
let doubleJumpsRemaining = 10;
let canDoubleJump = false;
let consecutiveJumps = 0;
let yesterdayTopScore = 0;
let currentScreen = 'main-menu';

// Mobile touch handling
let touchStartY = 0;
const TOUCH_SENSITIVITY = 10;

// Add these constants at the top with other constants
const BASE_JUMP_HEIGHT = 160;
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

function getSettings() {
    return window.innerWidth <= 768 ? MOBILE_SETTINGS : DESKTOP_SETTINGS;
}

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
    if (!gameActive) return;
    
    event.preventDefault();
    
    // Handle menu buttons
    if (event.target.classList.contains('menu-button')) {
        event.target.click();
        return;
    }
    
    // Handle game touches - only on touchstart
    if (event.type === 'touchstart') {
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

        if (window.innerWidth <= 768) {
            // Mobile version - using setTimeout for more consistent timing
            function jumpStep() {
                if (position >= 180) {
                    fall();
                    return;
                }
                position += 5;  // Fixed velocity for mobile
                mAndM.style.bottom = position + 'px';
                if (isJumping) {
                    setTimeout(jumpStep, 16);
                }
            }
            jumpStep();
        } else {
            // Desktop version - unchanged
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
}

function doubleJump() {
    if (!canDoubleJump || doubleJumpsRemaining <= 0) return;
    
    canDoubleJump = false;
    doubleJumpsRemaining--;
    updateDoubleJumpCounter();
    
    if (window.fallInterval) {
        clearInterval(window.fallInterval);
    }
    
    let position = parseInt(mAndM.style.bottom);
    let maxHeight = position + 120;

    if (window.innerWidth <= 768) {
        // Mobile version
        function doubleJumpStep() {
            if (position >= maxHeight) {
                fall();
                return;
            }
            position += 5;  // Fixed velocity for mobile
            mAndM.style.bottom = position + 'px';
            if (!isJumping) return;
            setTimeout(doubleJumpStep, 16);
        }
        doubleJumpStep();
    } else {
        // Desktop version - unchanged
        let jumpVelocity = 7;
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
}

function fall() {
    let position = parseInt(mAndM.style.bottom);

    if (window.innerWidth <= 768) {
        // Mobile version
        function fallStep() {
            if (position <= 20) {
                mAndM.style.bottom = '20px';
                isJumping = false;
                return;
            }
            position -= 3;  // Fixed fall velocity for mobile
            if (position < 20) position = 20;
            mAndM.style.bottom = position + 'px';
            if (position > 20) {
                setTimeout(fallStep, 16);
            }
        }
        fallStep();
    } else {
        // Desktop version - unchanged
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
            
            // Speed increase based on device type
            if (window.innerWidth <= 768) {
                if (obstacleSpeed < 6) {  // Mobile max speed
                    obstacleSpeed += 0.03;  // Very small increment for mobile
                }
            } else {
                if (obstacleSpeed < 8) {  // Desktop max speed
                    obstacleSpeed += 0.1;  // Original desktop increment
                }
            }
            
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
    hideAllScreens();
    obstacles.forEach(obstacle => obstacle.remove());
    obstacles = [];
    
    gameActive = true;
    obstacleSpeed = window.innerWidth <= 768 ? 3 : INITIAL_SPEED;
    score = 0;
    backgroundPosition = 0;
    isJumping = false;
    doubleJumpsRemaining = 10;
    canDoubleJump = false;
    updateDoubleJumpCounter();
    consecutiveJumps = 0;
    
    fetchHighScores();
    
    // Adjust player starting position
    const mAndM = document.getElementById('m-and-m');
    mAndM.style.bottom = '20px';
    
    // Set position based on screen size
    if (window.innerWidth <= 768) {
        mAndM.style.left = '20px'; // Move closer to left edge on mobile
    } else {
        mAndM.style.left = '220px'; // Original position on desktop
    }
    
    document.getElementById('current-score-display').textContent = `Score: ${score}`;
    
    if (window.gameLoop) {
        cancelAnimationFrame(window.gameLoop);
    }
    
    adjustGameLayout();
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
        const spawnOffset = window.mobileSpawnOffset || 1200;
        obstacle.style.left = `${spawnOffset + index * 400}px`;
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

// Update the instructions for mobile
function updateInstructions() {
    const instructionsText = document.querySelector('#instructions-screen');
    if (window.innerWidth <= 768) {
        instructionsText.innerHTML = `
            <h2>How to Play</h2>
            <p>Tap screen to jump</p>
            <p>Tap again while jumping to double jump</p>
            <p>Avoid colliding with other M&Ms</p>
            <p>Score increases with each successful jump</p>
            <p>Consecutive jumps give bonus points!</p>
            <button id="back-to-menu-btn" class="menu-button">Back to Menu</button>
        `;
    } else {
        instructionsText.innerHTML = `
            <h2>How to Play</h2>
            <p>Press SPACE to jump</p>
            <p>Press SPACE while jumping to double jump</p>
            <p>Avoid colliding with other M&Ms</p>
            <p>Score increases with each successful jump</p>
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