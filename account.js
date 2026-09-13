const ACCOUNT_STORE = 'webgames-accounts-v1';
const ACCOUNT_SESSION = 'webgames-session-v1';

function cleanNick(value) {
    return String(value || '')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .slice(0, 12);
}

function cleanPass(value) {
    return String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4);
}

function hidePass(pass) {
    let hash = 7;
    for (let i = 0; i < pass.length; i += 1) {
        hash = (hash * 31 + pass.charCodeAt(i)) % 1000003;
    }
    return String(hash);
}

function loadAccounts() {
    try {
        return JSON.parse(localStorage.getItem(ACCOUNT_STORE) || '{}');
    } catch (err) {
        return {};
    }
}

function saveAccounts(all) {
    localStorage.setItem(ACCOUNT_STORE, JSON.stringify(all));
}

function saveSession(name) {
    localStorage.setItem(ACCOUNT_SESSION, JSON.stringify({ name }));
}

window.GameAccount = {
    current() {
        try {
            const session = JSON.parse(localStorage.getItem(ACCOUNT_SESSION) || 'null');
            return session && session.name ? session : null;
        } catch (err) {
            return null;
        }
    },
    signUp(nick, pass) {
        const name = cleanNick(nick);
        const code = cleanPass(pass);
        if (name.length < 2) {
            return { ok: false, error: 'Type a nickname with at least 2 letters.' };
        }
        if (code.length !== 4) {
            return { ok: false, error: 'Make a 4-letter passcode.' };
        }
        const all = loadAccounts();
        const key = name.toLowerCase();
        if (all[key]) {
            return { ok: false, error: 'That nickname is already used on this computer. Sign in instead.' };
        }
        all[key] = { name, pass: hidePass(code) };
        saveAccounts(all);
        saveSession(name);
        return { ok: true, name };
    },
    signIn(nick, pass) {
        const name = cleanNick(nick);
        const code = cleanPass(pass);
        const all = loadAccounts();
        const saved = all[name.toLowerCase()];
        if (!saved || saved.pass !== hidePass(code)) {
            return { ok: false, error: 'Wrong nickname or passcode.' };
        }
        saveSession(saved.name);
        return { ok: true, name: saved.name };
    },
    signOut() {
        localStorage.removeItem(ACCOUNT_SESSION);
    }
};
