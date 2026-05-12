
// ── Nav scroll ──────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// ── Nav active link ─────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-links a');
function updateActive() {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 140) cur = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}
window.addEventListener('scroll', updateActive);

// ── Hamburger ───────────────────────────────
const hamburger  = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  navLinksEl.classList.toggle('open');
  const open  = navLinksEl.classList.contains('open');
  const spans = hamburger.querySelectorAll('span');
  spans[0].style.transform = open ? 'rotate(45deg) translateY(7px)' : '';
  spans[1].style.opacity   = open ? '0' : '1';
  spans[2].style.transform = open ? 'rotate(-45deg) translateY(-7px)' : '';
});
navLinksEl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinksEl.classList.remove('open')));

// ── Fade-up observer ────────────────────────
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
document.querySelectorAll('#home .fade-up').forEach((el, i) => {
  setTimeout(() => el.classList.add('visible'), i * 120 + 80);
});

// ── FAQ accordion ───────────────────────────
function toggleFaq(btn) {
  const item   = btn.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ── Contact form ────────────────────────────
function handleFormSubmit(btn) {
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .8s linear infinite"></i> Sending…';
  setTimeout(() => {
    btn.innerHTML = '<i class="ti ti-check"></i> Message Sent!';
    btn.style.background = 'linear-gradient(135deg,#15803D,#16A34A)';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-send"></i> Send Message';
      btn.style.background = '';
    }, 3000);
  }, 1400);
}

// ── Spin keyframe ───────────────────────────
const s = document.createElement('style');
s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(s);

// ── Hero counter animation ──────────────────
function animateCount(el, target, suffix) {
  let n = 0; const step = target / 60;
  const t = setInterval(() => {
    n += step;
    if (n >= target) { clearInterval(t); el.textContent = target + suffix; return; }
    el.textContent = Math.floor(n) + suffix;
  }, 16);
}
const statsEl = document.querySelector('.hero-stats');
const sIo = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  sIo.disconnect();
  const nums = document.querySelectorAll('.hero-stat-num');
  animateCount(nums[0], 98, '%');
  animateCount(nums[2], 1500, '+');
  animateCount(nums[3], 40, '');
}, { threshold: 0.5 });
if (statsEl) sIo.observe(statsEl);
