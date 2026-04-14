/* ── Custom cursor ── */
const dot = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let ringX = 0, ringY = 0, dotX = 0, dotY = 0;

document.addEventListener('mousemove', e => {
    dotX = e.clientX; dotY = e.clientY;
});

function animateCursor() {
    ringX += (dotX - ringX) * 0.12;
    ringY += (dotY - ringY) * 0.12;
    dot.style.left = dotX + 'px';
    dot.style.top = dotY + 'px';
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(animateCursor);
}
animateCursor();

document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

/* ── Animated background canvas (floating particles + subtle grid) ── */
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const PARTICLE_COUNT = 60;
const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.4 + 0.1,
}));

let mouseX = -9999, mouseY = -9999;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

function drawBg() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
            p.vx -= (dx / dist) * 0.015;
            p.vy -= (dy / dist) * 0.015;
        }
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.alpha})`;
        ctx.fill();
    });

    particles.forEach((a, i) => {
        for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(167, 139, 250, ${0.08 * (1 - dist / 100)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    });

    requestAnimationFrame(drawBg);
}
drawBg();

/* ── Scroll: navbar opacity ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
});

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 60);
            revealObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
revealEls.forEach(el => revealObs.observe(el));

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id], header.hero');
const navLinks = document.querySelectorAll('.nav-links a');
const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id || 'hero';
            navLinks.forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === '#' + id);
            });
        }
    });
}, { threshold: 0.4 });
sections.forEach(s => sectionObs.observe(s));

/* ── Typing effect on hero name ── */
const name = 'Nguyen Dang Khoa!';
const nameEl = document.getElementById('typedName');
let charIndex = 0;
function type() {
    if (charIndex < name.length) {
        nameEl.textContent += name[charIndex++];
        setTimeout(type, charIndex === 1 ? 600 : 60 + Math.random() * 40);
    }
}
setTimeout(type, 800);

/* ── Project filter ── */
const filterBtns = document.querySelectorAll('.filter-btn');
const projCards = document.querySelectorAll('.proj-card');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;

        projCards.forEach(card => {
            const tags = card.dataset.tags || '';
            const show = filter === 'all' || tags.includes(filter);
            card.classList.toggle('hidden', !show);
        });
    });
});
