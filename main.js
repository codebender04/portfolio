const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── SFX: tiny chiptune synth, no audio files ── */
const SFX = (() => {
    let ctx, master;
    let enabled = true;
    try { enabled = localStorage.getItem('sfx') !== 'off'; } catch (e) {}

    // Browsers only allow audio after a user gesture, so the context starts on the first click/key.
    function unlock() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.15;
            master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
    }

    function tone({ type = 'square', f = 440, f2, dur = 0.08, vol = 1, delay = 0 }) {
        if (!enabled || !ctx || ctx.state !== 'running') return;
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t);
        if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    let lastHover = 0;
    const sounds = {
        hover() {
            const now = performance.now();
            if (now - lastHover < 50) return;
            lastHover = now;
            tone({ f: 1320, dur: 0.035, vol: 0.18 });
        },
        click: () => tone({ f: 440, f2: 880, dur: 0.07, vol: 0.45 }),
        select: () => { tone({ f: 660, dur: 0.05, vol: 0.4 }); tone({ f: 990, dur: 0.08, vol: 0.4, delay: 0.05 }); },
        boing: () => tone({ type: 'triangle', f: 180, f2: 720, dur: 0.2, vol: 0.8 }),
        coin: () => { tone({ f: 988, dur: 0.06, vol: 0.4 }); tone({ f: 1319, dur: 0.22, vol: 0.4, delay: 0.06 }); },
        rewind: () => tone({ type: 'sawtooth', f: 1400, f2: 120, dur: 0.35, vol: 0.25 }),
        levelup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.12, vol: 0.4, delay: i * 0.08 })),
    };

    return {
        unlock,
        play: name => sounds[name] && sounds[name](),
        get enabled() { return enabled; },
        set enabled(v) {
            enabled = v;
            try { localStorage.setItem('sfx', v ? 'on' : 'off'); } catch (e) {}
        },
    };
})();

['pointerdown', 'keydown'].forEach(evt => document.addEventListener(evt, SFX.unlock, { once: false, passive: true }));

const sfxToggle = document.getElementById('sfxToggle');
function syncSfxToggle() { sfxToggle.setAttribute('aria-pressed', String(SFX.enabled)); }
syncSfxToggle();
sfxToggle.addEventListener('click', () => {
    SFX.enabled = !SFX.enabled;
    syncSfxToggle();
    SFX.play('select');
});

// Hover blips + click sounds for everything interactive
const INTERACTIVE = 'a, button, .proj-card, .filter-btn, input[type=range]';
let hovered = null;
document.addEventListener('mouseover', e => {
    const el = e.target.closest(INTERACTIVE);
    if (el && el !== hovered) SFX.play('hover');
    hovered = el;
});
document.addEventListener('click', e => {
    const el = e.target.closest('a, button');
    if (!el || el.matches('.track-play, #spriteBtn, #sfxToggle, .filter-btn, #replayBtn')) return;
    SFX.play('click');
});

/* ── Particles: pixel bursts on click ── */
const fx = document.getElementById('fx');
const fxCtx = fx.getContext('2d');
const COLORS = ['#ff5a3d', '#ffc83d', '#35d6a0', '#5bc0ff', '#ff86c2', '#8b6cff'];
let particles = [];
let fxRunning = false;

function sizeFx() {
    const dpr = window.devicePixelRatio || 1;
    fx.width = innerWidth * dpr;
    fx.height = innerHeight * dpr;
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeFx();
window.addEventListener('resize', sizeFx);

function burst(x, y, count = 12, colors = COLORS) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 3 + Math.floor(Math.random() * 3) * 2,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            color: colors[i % colors.length],
        });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(tickFx); }
}

function tickFx() {
    fxCtx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.vy += 0.25;
        p.vx *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        fxCtx.globalAlpha = Math.max(p.life, 0);
        fxCtx.fillStyle = p.color;
        fxCtx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    });
    fxCtx.globalAlpha = 1;
    if (particles.length) requestAnimationFrame(tickFx);
    else fxRunning = false;
}

document.addEventListener('pointerdown', e => {
    if (e.target.closest('input[type=range]')) return;
    burst(e.clientX, e.clientY, e.target.closest('a, button') ? 14 : 7);
});

function floatText(text, x, y, color) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (color) el.style.color = color;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

function shake() {
    if (reducedMotion) return;
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
}

/* ── Player sprite: crisp scaling + poke reactions ── */
const sprite = document.querySelector('.sprite');
const ART_PX = 32;          // the self-portrait is a 32×32 drawing
const TARGET_SCALE = 5;     // ~5 CSS px per art pixel

// A pixel-art image only looks clean when each art pixel covers a whole number of
// *screen* pixels. On 125%/150% Windows scaling, 5 CSS px is 6.25/7.5 screen px,
// so round in screen pixels and convert back.
function fitSprite() {
    const dpr = window.devicePixelRatio || 1;
    const artPx = Math.max(1, Math.round(TARGET_SCALE * dpr)) / dpr;
    sprite.style.width = sprite.style.height = ART_PX * artPx + 'px';
    document.documentElement.style.setProperty('--art-px', artPx + 'px');
}
fitSprite();
window.addEventListener('resize', fitSprite);

// {n} is replaced with the click count
const LINES = [
    "Hi! I'm Khoa's avatar. The real one is busy fixing a bug.",
    "Psst. Keep clicking. I've heard there's a reward if you click enough.",
    'The games are below. They are good, I promise.',
    'Yes, I drew myself. Yes, I made myself better looking.',
    'Stop poking me. I have i-frames.',
    "That's {n} clicks. Is this a clicker game now?",
    'Try the Konami code. I dare you.',
    'Hire me. I want a hat.',
    'Fun fact: I really like incremental games. Clicking me counts.',
    '{n} clicks and still no achievement. Keep going.',
    "I'm out of lines. Looping back. Like a roguelike.",
];
const MILESTONES = {
    25: 'ACHIEVEMENT UNLOCKED: Poked 25 times. Reward: this sentence.',
    50: '50 clicks. You know the projects are the actual content, right?',
    100: "100 clicks. OK, you win. I'm telling Khoa.",
};
const speech = document.getElementById('speech');
let lineIndex = 0;
let pokes = 0;
document.getElementById('spriteBtn').addEventListener('click', e => {
    pokes++;
    if (MILESTONES[pokes]) {
        speech.textContent = MILESTONES[pokes];
        SFX.play('levelup');
        showToast(`Achievement: ${pokes} pokes`);
    } else {
        speech.textContent = LINES[lineIndex].replace('{n}', pokes);
        lineIndex = (lineIndex + 1) % LINES.length;
    }
    [sprite, speech].forEach(el => {
        el.classList.remove(el === sprite ? 'poke' : 'pop');
        void el.offsetWidth;
        el.classList.add(el === sprite ? 'poke' : 'pop');
    });
    SFX.play('boing');
    floatText('+1 ♥', e.clientX - 16, e.clientY - 30, '#ff86c2');
});
sprite.addEventListener('animationend', () => sprite.classList.remove('poke'));

/* ── Hero name hop ── */
const heroName = document.getElementById('heroName');
function hopName() {
    heroName.classList.remove('hop');
    void heroName.offsetWidth;
    heroName.classList.add('hop');
}
setTimeout(hopName, 900);

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 80);
            revealObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
revealEls.forEach(el => revealObs.observe(el));

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            navLinks.forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
            });
        }
    });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => sectionObs.observe(s));

/* ── XP bar: scroll progress, level up at the bottom ── */
const xpFill = document.getElementById('xpFill');
let leveledUp = false;
function updateXp() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? Math.min(1, scrollY / max) : 0;
    xpFill.style.width = pct * 100 + '%';
    if (pct > 0.985 && !leveledUp) {
        leveledUp = true;
        showToast('LEVEL UP! You read the whole portfolio');
        SFX.play('levelup');
        burst(innerWidth / 2, innerHeight - 80, 40);
    }
}
window.addEventListener('scroll', updateXp, { passive: true });
updateXp();

/* ── Project filter ── */
const filterBtns = document.querySelectorAll('.filter-btn');
const projCards = document.querySelectorAll('.proj-card');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SFX.play('select');
        const filter = btn.dataset.filter;

        let shown = 0;
        projCards.forEach(card => {
            const tags = card.dataset.tags || '';
            const show = filter === 'all' || tags.includes(filter);
            card.classList.toggle('hidden', !show);
            card.classList.remove('pop-in');
            if (show) {
                void card.offsetWidth;
                card.style.animationDelay = shown++ * 60 + 'ms';
                card.classList.add('pop-in');
            }
        });
    });
});
projCards.forEach(card => card.addEventListener('animationend', e => {
    if (e.animationName === 'popIn') card.classList.remove('pop-in');
}));

/* ── Project cards: 3D tilt + glare following the mouse ── */
if (!reducedMotion && window.matchMedia('(hover: hover)').matches) {
    projCards.forEach(card => {
        card.addEventListener('pointermove', e => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.style.setProperty('--ry', (px - 0.5) * 10 + 'deg');
            card.style.setProperty('--rx', (0.5 - py) * 8 + 'deg');
            card.style.setProperty('--mx', px * 100 + '%');
            card.style.setProperty('--my', py * 100 + '%');
        });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
        });
    });
}

/* ── Sound test player ── */
const tracks = document.querySelectorAll('.track');
const allAudio = [...tracks].map(t => t.querySelector('audio'));
const fmt = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

tracks.forEach(track => {
    const audio = track.querySelector('audio');
    const btn = track.querySelector('.track-play');
    const seek = track.querySelector('.track-seek');
    const time = track.querySelector('.track-time');
    const title = btn.getAttribute('aria-label').replace(/^Play /, '');

    const showTime = () => { time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`; };

    btn.addEventListener('click', () => {
        SFX.play('coin');
        if (audio.paused) {
            allAudio.forEach(a => { if (a !== audio) a.pause(); });
            audio.play();
        } else {
            audio.pause();
        }
    });
    audio.addEventListener('play', () => {
        track.classList.add('playing');
        btn.textContent = '❚❚';
        btn.setAttribute('aria-label', 'Pause ' + title);
    });
    audio.addEventListener('pause', () => {
        track.classList.remove('playing');
        btn.textContent = '▶';
        btn.setAttribute('aria-label', 'Play ' + title);
    });
    audio.addEventListener('loadedmetadata', showTime);
    audio.addEventListener('timeupdate', () => {
        if (audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
        showTime();
    });
    audio.addEventListener('ended', () => { audio.currentTime = 0; });
    seek.addEventListener('input', () => {
        if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
    });
});

/* ── Replay: rewind to the title screen ── */
document.getElementById('replayBtn').addEventListener('click', e => {
    e.preventDefault();
    SFX.play('rewind');
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    setTimeout(hopName, 700);
});

/* ── Toast ── */
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Konami code: party mode ── */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiPos = 0;

function confetti() {
    if (reducedMotion) return;
    for (let i = 0; i < 90; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = COLORS[i % COLORS.length];
        c.style.animationDuration = 1.8 + Math.random() * 2 + 's';
        c.style.animationDelay = Math.random() * 0.6 + 's';
        document.body.appendChild(c);
        c.addEventListener('animationend', () => c.remove());
    }
}

document.addEventListener('keydown', e => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiPos]) konamiPos++;
    else if (!(key === 'ArrowUp' && konamiPos === 2)) konamiPos = key === KONAMI[0] ? 1 : 0;
    if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        const on = document.body.classList.toggle('party');
        if (on) { confetti(); shake(); SFX.play('levelup'); }
        else SFX.play('rewind');
        showToast(on ? 'CHEAT ACTIVATED: +30 lives' : 'Cheat off. Back to work.');
    }
});
