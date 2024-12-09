let globalHighScore = 0;
let yesterdayHighScore = 0;
let lastResetTime = Date.now();

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export default function handler(req, res) {
    // Reset high score if it's been more than a day
    if (Date.now() - lastResetTime > DAY_IN_MS) {
        yesterdayHighScore = globalHighScore;
        globalHighScore = 0;
        lastResetTime = Date.now();
    }

    if (req.method === 'GET') {
        res.status(200).json({ 
            highScore: globalHighScore, 
            yesterdayHighScore: yesterdayHighScore 
        });
    } 
    else if (req.method === 'POST') {
        const { score } = req.body;
        if (score > globalHighScore) {
            globalHighScore = score;
        }
        res.status(200).json({ 
            highScore: globalHighScore, 
            yesterdayHighScore: yesterdayHighScore 
        });
    }
} 