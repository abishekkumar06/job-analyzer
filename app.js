/* ============================================
   JobAnalyzer — app.js
   Handles: mobile menu, auth modal, resume upload,
   password toggles, pricing toggle, counters,
   typewriter effect, toasts, newsletter/forgot forms.
   ============================================ */

/* ---------- Mobile menu ---------- */
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}
function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}

/* ---------- Auth modal ---------- */
function openAuthModal(tab) {
  document.getElementById('authModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchAuthTab(tab || 'login');
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
  document.body.style.overflow = '';
}
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').style.display = isLogin ? 'flex' : 'none';
  document.getElementById('signupForm').style.display = isLogin ? 'none' : 'flex';
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('authTitle').textContent = isLogin ? 'Welcome Back! 👋' : 'Create Your Account 🚀';
  document.getElementById('authSubtitle').textContent = isLogin
    ? 'Sign in to your account to continue'
    : 'Start your free career analysis today';
}

function togglePassword(btn) {
  const input = btn.parentElement.querySelector('input');
  const icon = btn.querySelector('i');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  icon.classList.toggle('fa-eye', show);
  icon.classList.toggle('fa-eye-slash', !show);
}

async function handleLogin(event) {
  event.preventDefault();
  const btn = document.getElementById('loginSubmitBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  setBtnLoading(btn, true);
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setBtnLoading(btn, false);

    if (!res.ok || data.error) {
      showToast(data.error || 'Login failed. Please try again.', true);
      return;
    }

    saveSession(data.access_token, data.user);
    showToast(`Welcome back, ${data.user.name || data.user.email}!`);
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  } catch (err) {
    setBtnLoading(btn, false);
    showToast('Could not reach the server. Please try again.', true);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirmPassword').value;

  if (password !== confirm) {
    showToast('Passwords do not match.', true);
    return;
  }

  const btn = document.getElementById('signupSubmitBtn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();
    setBtnLoading(btn, false);

    if (!res.ok || data.error) {
      showToast(data.error || 'Signup failed. Please try again.', true);
      return;
    }

    closeAuthModal();
    showToast('Account created! Please check your email to confirm, then log in.');
    switchAuthTab('login');
  } catch (err) {
    setBtnLoading(btn, false);
    showToast('Could not reach the server. Please try again.', true);
  }
}

/* ---------- Session helpers ---------- */
function saveSession(token, user) {
  localStorage.setItem('jobanalyzer_token', token || '');
  localStorage.setItem('jobanalyzer_user', JSON.stringify(user || {}));
}
function getSession() {
  const token = localStorage.getItem('jobanalyzer_token');
  const userRaw = localStorage.getItem('jobanalyzer_user');
  if (!token || !userRaw) return null;
  try { return { token, user: JSON.parse(userRaw) }; } catch { return null; }
}
function clearSession() {
  localStorage.removeItem('jobanalyzer_token');
  localStorage.removeItem('jobanalyzer_user');
}
function refreshAuthUI() {
  const session = getSession();
  const loginBtn = document.getElementById('navLoginBtn');
  if (loginBtn && session) {
    loginBtn.textContent = session.user.name || session.user.email;
    loginBtn.onclick = () => { clearSession(); refreshAuthUI(); showToast('Logged out.'); };
  }
}

function setBtnLoading(btn, loading) {
  btn.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
  btn.querySelector('.btn-loader').style.display = loading ? 'inline' : 'none';
  btn.disabled = loading;
}

function handleSocialLogin(provider) {
  showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login is not connected yet.`);
}

/* Password strength meter */
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'signupPassword') {
    const val = e.target.value;
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    const pct = [0, 25, 50, 75, 100][score];
    const labels = ['Password strength', 'Weak', 'Fair', 'Good', 'Strong'];
    if (fill && text) {
      fill.style.width = pct + '%';
      text.textContent = labels[score];
    }
  }
});

/* ---------- Forgot password modal ---------- */
function showForgotPassword(event) {
  if (event) event.preventDefault();
  closeAuthModal();
  document.getElementById('forgotModal').classList.add('open');
}
function closeForgotModal() {
  document.getElementById('forgotModal').classList.remove('open');
}
function handleForgotPassword(event) {
  event.preventDefault();
  closeForgotModal();
  showToast('Reset link sent — check your inbox.');
}

/* ---------- Resume upload modal ---------- */
function openResumeUpload() {
  document.getElementById('resumeModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('uploadZone').style.display = 'flex';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadResult').style.display = 'none';
}
function closeResumeModal() {
  document.getElementById('resumeModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function handleResumeUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('uploadZone').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'block';

  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  let pct = 0;
  const tick = setInterval(() => {
    pct = Math.min(pct + 12, 90);
    progressFill.style.width = pct + '%';
    progressText.textContent = `Uploading... ${pct}%`;
  }, 150);

  try {
    const formData = new FormData();
    formData.append('resume', file);

    const session = getSession();
    const headers = {};
    if (session && session.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const res = await fetch('/api/analyze-resume', { method: 'POST', headers, body: formData });
    const data = await res.json();

    clearInterval(tick);
    progressFill.style.width = '100%';
    progressText.textContent = 'Uploading... 100%';

    setTimeout(() => {
      document.getElementById('uploadProgress').style.display = 'none';

      if (!res.ok || data.error) {
        showToast(data.error || 'Analysis failed. Please try another file.', true);
        document.getElementById('uploadZone').style.display = 'flex';
        return;
      }

      document.getElementById('uploadResult').style.display = 'block';
      const score = data.ats_score || 0;
      document.getElementById('scoreValue').textContent = score;
      const circle = document.getElementById('scoreCircle');
      const circumference = 339.29;
      const offset = circumference - (score / 100) * circumference;
      circle.style.strokeDashoffset = offset;

      if (data.saved) {
        showToast('Resume analysis saved to your account.');
      }
    }, 300);

  } catch (err) {
    clearInterval(tick);
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadZone').style.display = 'flex';
    showToast('Could not reach the server. Please try again.', true);
  }
}

/* ---------- Pricing toggle ---------- */
function togglePricing() {
  const yearly = document.getElementById('pricingToggle').checked;
  document.getElementById('monthlyLabel').classList.toggle('active', !yearly);
  document.getElementById('yearlyLabel').classList.toggle('active', yearly);
  document.querySelectorAll('.price[data-monthly]').forEach(el => {
    el.textContent = '₹' + el.dataset[yearly ? 'yearly' : 'monthly'];
  });
}

/* ---------- Newsletter ---------- */
function handleNewsletter(event) {
  event.preventDefault();
  const input = document.getElementById('newsletterEmail');
  showToast(`Subscribed ${input.value} to updates.`);
  input.value = '';
}

/* ---------- Toasts ---------- */
function showToast(message, isError) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ---------- Stat counters (animate on scroll into view) ---------- */
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10) || 0;
      const duration = 1200;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = Math.floor(progress * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

/* ---------- Typewriter effect ---------- */
function startTypewriter() {
  const el = document.getElementById('typewriterText');
  if (!el) return;
  const words = ['python', 'sql', 'aws', 'react', 'ml'];
  let wordIndex = 0, charIndex = 0, deleting = false;

  function tick() {
    const word = words[wordIndex];
    if (!deleting) {
      charIndex++;
      el.textContent = word.slice(0, charIndex);
      if (charIndex === word.length) {
        deleting = true;
        setTimeout(tick, 1200);
        return;
      }
    } else {
      charIndex--;
      el.textContent = word.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
      }
    }
    setTimeout(tick, deleting ? 60 : 110);
  }
  tick();
}

/* ---------- Navbar shadow on scroll ---------- */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  nav.style.boxShadow = window.scrollY > 10 ? '0 1px 0 rgba(17,17,17,0.15)' : 'none';
});

/* ---------- Close modals on overlay click ---------- */
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  animateCounters();
  startTypewriter();
  refreshAuthUI();
});
