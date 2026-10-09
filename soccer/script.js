const WIDTH = 1000;
const HEIGHT = 560;
const GOAL_W = 28;
const GOAL_H = 150;
const WIN_SCORE = 3;
const PLAYER_R = 22;
const BALL_R = 12;

const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');
const scoreYouEl = document.getElementById('score-you');
const scoreThemEl = document.getElementById('score-them');
const clockEl = document.getElementById('clock');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const winScreen = document.getElementById('win-screen');
const winTitle = document.getElementById('win-title');
const winBlurb = document.getElementById('win-blurb');

const keys = {};
let playing = false;
let paused = false;
let ended = false;
let youScore = 0;
let cpuScore = 0;
let lockTimer = 0;

const you = { x: 220, y: 280, vx: 0, vy: 0 };
const cpu = { x: 780, y: 280, vx: 0, vy: 0 };
const ball = { x: 500, y: 280, vx: 0, vy: 0 };

function fitGame() {
    const wrap = document.querySelector('.game-wrap');
    const scale = Math.min(
        (window.innerWidth - 24) / WIDTH,
        (window.innerHeight - 24) / HEIGHT,
        1
    );
    wrap.style.transform = `scale(${scale})`;
}

function resetKickoff(toward) {
    you.x = 220;
    you.y = 280;
    you.vx = 0;
    you.vy = 0;
    cpu.x = 780;
    cpu.y = 280;
    cpu.vx = 0;
    cpu.vy = 0;
    ball.x = 500;
    ball.y = 280;
    ball.vx = toward * 2.2;
    ball.vy = (Math.random() - 0.5) * 1.4;
    lockTimer = 700;
}

function startMatch() {
    youScore = 0;
    cpuScore = 0;
    ended = false;
    paused = false;
    playing = true;
    startScreen.hidden = true;
    pauseScreen.hidden = true;
    winScreen.hidden = true;
    updateScore();
    resetKickoff(0);
    ball.vx = 0;
    ball.vy = 0;
}

function updateScore() {
    scoreYouEl.textContent = `You: ${youScore}`;
    scoreThemEl.textContent = `CPU: ${cpuScore}`;
    clockEl.textContent = `First to ${WIN_SCORE}`;
}

function endMatch(youWon) {
    ended = true;
    playing = false;
    winTitle.textContent = youWon ? 'You win!' : 'CPU wins!';
    winBlurb.textContent = youWon ? 'What a goal.' : 'Try one more match.';
    winScreen.hidden = false;
}

function setPaused(next) {
    if (!playing || ended) {
        return;
    }
    paused = next;
    pauseScreen.hidden = !paused;
}

function movePlayer(player, ax, ay, speed) {
    const length = Math.hypot(ax, ay);
    if (length > 0) {
        player.vx = (ax / length) * speed;
        player.vy = (ay / length) * speed;
    } else {
        player.vx *= 0.8;
        player.vy *= 0.8;
    }
    player.x += player.vx;
    player.y += player.vy;
    player.x = Math.max(60, Math.min(WIDTH - 60, player.x));
    player.y = Math.max(50, Math.min(HEIGHT - 50, player.y));
}

function bump(player) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const min = PLAYER_R + BALL_R;
    if (dist < min) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = player.x + nx * min;
        ball.y = player.y + ny * min;
        ball.vx += nx * 1.1 + player.vx * 0.35;
        ball.vy += ny * 1.1 + player.vy * 0.35;
    }
}

function kick(player) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    if (Math.hypot(dx, dy) > PLAYER_R + BALL_R + 16) {
        return;
    }
    const aimX = ball.x - player.x || 1;
    const aimY = ball.y - player.y;
    const length = Math.hypot(aimX, aimY) || 1;
    ball.vx = (aimX / length) * 9.5;
    ball.vy = (aimY / length) * 9.5;
}

function thinkCpu() {
    const toBallX = ball.x - cpu.x;
    const toBallY = ball.y - cpu.y;
    let ax = toBallX;
    let ay = toBallY;
    if (ball.x < 420) {
        ax = 720 - cpu.x;
        ay = ball.y - cpu.y;
    }
    movePlayer(cpu, ax, ay, 3.2);
    if (Math.hypot(toBallX, toBallY) < 48 && ball.x < cpu.x + 10) {
        ball.vx = -8.4;
        ball.vy = (you.y - ball.y) * 0.04;
    }
}

function moveBall() {
    ball.vx *= 0.985;
    ball.vy *= 0.985;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y < 28 + BALL_R || ball.y > HEIGHT - 28 - BALL_R) {
        ball.y = Math.max(28 + BALL_R, Math.min(HEIGHT - 28 - BALL_R, ball.y));
        ball.vy *= -0.82;
    }

    const inGoalY = ball.y > (HEIGHT - GOAL_H) / 2 && ball.y < (HEIGHT + GOAL_H) / 2;
    if (ball.x <= 36 + BALL_R && inGoalY) {
        cpuScore += 1;
        updateScore();
        if (cpuScore >= WIN_SCORE) {
            endMatch(false);
            return;
        }
        resetKickoff(1);
        return;
    }
    if (ball.x >= WIDTH - 36 - BALL_R && inGoalY) {
        youScore += 1;
        updateScore();
        if (youScore >= WIN_SCORE) {
            endMatch(true);
            return;
        }
        resetKickoff(-1);
        return;
    }

    if (ball.x < 36 + BALL_R) {
        ball.x = 36 + BALL_R;
        ball.vx *= -0.8;
    }
    if (ball.x > WIDTH - 36 - BALL_R) {
        ball.x = WIDTH - 36 - BALL_R;
        ball.vx *= -0.8;
    }
}

function drawField() {
    ctx.fillStyle = '#2f8a44';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#27753a';
    for (let i = 0; i < 10; i += 1) {
        if (i % 2 === 0) {
            ctx.fillRect(i * 100, 0, 100, HEIGHT);
        }
    }

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 28, WIDTH - 72, HEIGHT - 56);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 28);
    ctx.lineTo(WIDTH / 2, HEIGHT - 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT / 2, 70, 0, Math.PI * 2);
    ctx.stroke();

    const goalTop = (HEIGHT - GOAL_H) / 2;
    ctx.fillStyle = '#d9e8ff';
    ctx.fillRect(8, goalTop, GOAL_W, GOAL_H);
    ctx.fillRect(WIDTH - 8 - GOAL_W, goalTop, GOAL_W, GOAL_H);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(8, goalTop, GOAL_W, GOAL_H);
    ctx.strokeRect(WIDTH - 8 - GOAL_W, goalTop, GOAL_W, GOAL_H);
}

function drawPlayer(player, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(player.x - 6, player.y - 4, 3, 0, Math.PI * 2);
    ctx.arc(player.x + 6, player.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawBall() {
    ctx.beginPath();
    ctx.fillStyle = '#f4f4f4';
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function tick(now) {
    if (playing && !paused && !ended) {
        let ax = 0;
        let ay = 0;
        if (keys.KeyA || keys.ArrowLeft) {
            ax -= 1;
        }
        if (keys.KeyD || keys.ArrowRight) {
            ax += 1;
        }
        if (keys.KeyW || keys.ArrowUp) {
            ay -= 1;
        }
        if (keys.KeyS || keys.ArrowDown) {
            ay += 1;
        }
        movePlayer(you, ax, ay, 3.8);
        thinkCpu();
        if (lockTimer > 0) {
            lockTimer -= 16;
        } else {
            bump(you);
            bump(cpu);
            moveBall();
        }
    }

    drawField();
    drawPlayer(you, '#1f6feb');
    drawPlayer(cpu, '#e23d3d');
    drawBall();
    requestAnimationFrame(tick);
}

document.getElementById('play-btn').addEventListener('click', startMatch);
document.getElementById('again-btn').addEventListener('click', startMatch);
document.getElementById('resume-btn').addEventListener('click', () => setPaused(false));

window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
    if (event.code === 'KeyP' && !event.repeat) {
        setPaused(!paused);
    }
    if (playing && !paused && !ended && event.code === 'Space' && !event.repeat) {
        kick(you);
    }
});
window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

fitGame();
window.addEventListener('resize', fitGame);
requestAnimationFrame(tick);
