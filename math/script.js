const BEST_KEY = 'math-rush-best';
const startScreen = document.getElementById('start');
const playScreen = document.getElementById('play');
const overScreen = document.getElementById('over');
const heartsEl = document.getElementById('hearts');
const playScore = document.getElementById('play-score');
const questionEl = document.getElementById('question');
const answersEl = document.getElementById('answers');
const playNote = document.getElementById('play-note');
const timerBar = document.getElementById('timer-bar');

const KINDS = ['plus', 'minus', 'times'];
const START_TIME = 8000;

let score = 0;
let hearts = 3;
let answer = 0;
let locked = false;
let timer = null;
let timeLeft = START_TIME;
let questionTime = START_TIME;
let lastTick = 0;

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function getBest() {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
}

function saveBest() {
    if (score > getBest()) {
        localStorage.setItem(BEST_KEY, String(score));
    }
}

function showBest() {
    document.getElementById('start-best').textContent = `Best: ${getBest()}`;
    document.getElementById('over-best').textContent = `Best: ${getBest()}`;
}

function makeProblem() {
    const kind = KINDS[rand(0, KINDS.length - 1)];
    if (kind === 'plus') {
        const a = rand(1, 20);
        const b = rand(1, 20);
        return { text: `${a} + ${b} = ?`, answer: a + b };
    }
    if (kind === 'minus') {
        const a = rand(5, 20);
        const b = rand(1, a);
        return { text: `${a} − ${b} = ?`, answer: a - b };
    }
    const a = rand(1, 10);
    const b = rand(1, 10);
    return { text: `${a} × ${b} = ?`, answer: a * b };
}

function uniqueChoices(correct) {
    const choices = [correct];
    while (choices.length < 4) {
        const extra = correct + rand(-8, 8);
        if (extra >= 0 && !choices.includes(extra)) choices.push(extra);
    }
    return choices.sort(() => Math.random() - 0.5);
}

function drawHearts() {
    heartsEl.textContent = '♥ '.repeat(hearts).trim() || '—';
}

function stopTimer() {
    if (timer) {
        cancelAnimationFrame(timer);
        timer = null;
    }
}

function tickTimer(now) {
    if (!lastTick) lastTick = now;
    timeLeft -= now - lastTick;
    lastTick = now;
    const left = Math.max(0, timeLeft);
    timerBar.style.width = `${(left / questionTime) * 100}%`;
    if (left <= 0) {
        miss('Too slow!');
        return;
    }
    timer = requestAnimationFrame(tickTimer);
}

function startTimer() {
    stopTimer();
    questionTime = Math.max(4500, START_TIME - score * 120);
    timeLeft = questionTime;
    lastTick = 0;
    timerBar.style.width = '100%';
    timer = requestAnimationFrame(tickTimer);
}

function showQuestion() {
    locked = false;
    const problem = makeProblem();
    answer = problem.answer;
    questionEl.textContent = problem.text;
    playScore.textContent = `Score: ${score}`;
    playNote.textContent = '';
    drawHearts();
    answersEl.innerHTML = '';
    uniqueChoices(answer).forEach((choice) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = String(choice);
        btn.addEventListener('click', () => pickAnswer(btn, choice));
        answersEl.appendChild(btn);
    });
    startTimer();
}

function endButtons() {
    [...answersEl.querySelectorAll('button')].forEach((item) => {
        item.disabled = true;
        if (Number(item.textContent) === answer) item.classList.add('right');
    });
}

function miss(note) {
    if (locked) return;
    locked = true;
    stopTimer();
    endButtons();
    hearts -= 1;
    drawHearts();
    playNote.textContent = note;
    if (hearts <= 0) {
        window.setTimeout(endGame, 700);
        return;
    }
    window.setTimeout(showQuestion, 800);
}

function pickAnswer(btn, choice) {
    if (locked) return;
    locked = true;
    stopTimer();
    endButtons();
    if (choice === answer) {
        score += 1;
        playNote.textContent = 'Yes!';
        playScore.textContent = `Score: ${score}`;
        window.setTimeout(showQuestion, 650);
        return;
    }
    btn.classList.add('wrong');
    hearts -= 1;
    drawHearts();
    playNote.textContent = `The answer is ${answer}`;
    if (hearts <= 0) {
        window.setTimeout(endGame, 800);
        return;
    }
    window.setTimeout(showQuestion, 800);
}

function startGame() {
    score = 0;
    hearts = 3;
    startScreen.hidden = true;
    overScreen.hidden = true;
    playScreen.hidden = false;
    showQuestion();
}

function endGame() {
    stopTimer();
    saveBest();
    showBest();
    playScreen.hidden = true;
    overScreen.hidden = false;
    document.getElementById('over-score').textContent = `Score: ${score}`;
}

document.getElementById('play-btn').addEventListener('click', startGame);
document.getElementById('again-btn').addEventListener('click', startGame);
showBest();
