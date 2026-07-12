// ── SVG Icons System ────────────────────────────────
function getIcon(name, color = "currentColor") {
    const icons = {
      home: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
     "chevron-down": `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
      video: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
      audio: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
      image: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
      file: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      text: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
      qr: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`,
      zap: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      crown: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
      lock: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      settings: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      grid: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      x: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
      copy: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
      alert: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      sun: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
      moon: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 3.5-2 3.5s2.24-.5 3.5-2"></path><path d="M22 2s-5.5 2.5-8 7-3.5 4.5-3.5 4.5A11.72 11.72 0 0 0 11 11.5c.5-1 1-2 1.5-3"></path><path d="M7 11c.5-1 1-2 1.5-3-1.25-1.25-3.5-1.5-5 0C3 9.5 3 12 3 12s2.5 0 4-1Z"></path><path d="M11 11.5c-1 .5-2 1-3 1.5 1.25 1.25 1.5 3.5 0 5C6.5 21 4 21 4 21s0-2.5 1-4c1-.5 2-1 3-1.5"></path></svg>`
    };
    return icons[name] || '';
  }
  
  function injectIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconName = el.getAttribute('data-icon');
      el.innerHTML = getIcon(iconName);
    });
  }
  
  // ── CSS Orbs — تستغني عن Canvas بالكامل ──────────────────────
  
  // ── Theme & Navigation ────────────────────────────────────────────────────────
  // قراءة الثيم من localStorage (يُحفظ من صفحة الـ onboarding)
  let dark = localStorage.getItem('asl_theme') !== 'light';
  if (!dark) document.body.classList.add('light');

  function toggleTheme() {
    dark = !dark;
    document.body.classList.toggle('light', !dark);
    
    const iconEl = document.getElementById('theme-icon');
    const lbl = document.getElementById('theme-lbl');
    
    lbl.textContent = dark ? t('theme_light') : t('theme_dark');
    localStorage.setItem('asl_theme', dark ? 'dark' : 'light');
    syncThemeToggle();
    iconEl.innerHTML = getIcon(dark ? 'sun' : 'moon');
  }
  
  // ── صوت التنقل ─────────────────────────────────────────────────
  const clickSound = new Audio('../core/style_and_sound/click.wav');
  clickSound.volume = 0.5;
  let soundEnabled = localStorage.getItem('asl_sound') !== 'off';

  window.playClick = function() {
    if (!soundEnabled) return;
    try { clickSound.currentTime = 0; clickSound.play(); } catch(e) {}
  }

  window.toggleSound = function() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('asl_sound', soundEnabled ? 'on' : 'off');
    updateSoundUI();
  }

  function updateSoundUI() {
    const sw  = document.getElementById('sound-toggle-sw');
    const lbl = document.getElementById('sound-lbl');
    if (sw)  sw.classList.toggle('on', soundEnabled);
    if (lbl) lbl.textContent = soundEnabled ? t('settings_sound_on') || 'مفعّل' : t('settings_sound_off') || 'مكتوم';
  }

  // ── Google OAuth ────────────────────────────────────────────────
  const GOOGLE_CLIENT_ID = '971416834152-nqnns94gg7dn2gdu04cqh9oups0d2gs7.apps.googleusercontent.com';

  window.addEventListener('load', () => {
    // init Google
    if (window.google) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin,
        auto_select: false,
      });
    }

    // استعادة المستخدم المحفوظ
    const saved = localStorage.getItem('asl_user');
    if (saved) updateUserUI(JSON.parse(saved));

    // sync UI
    updateSoundUI();
    syncThemeToggle();

    // زر Google
    document.getElementById('google-login-btn')?.addEventListener('click', () => {
      if (window.google) {
        google.accounts.id.prompt();
      } else {
        alert('Google Sign-In غير متاح — تأكد من الاتصال بالإنترنت');
      }
    });
  });

  function handleGoogleLogin(response) {
    const payload = parseJwt(response.credential);
    const user = { name: payload.name, email: payload.email, picture: payload.picture };
    localStorage.setItem('asl_user', JSON.stringify(user));
    updateUserUI(user);
  }

  function parseJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')));
  }

  window.arsenalLogout = function() {
    localStorage.removeItem('asl_user');
    if (window.google) google.accounts.id.disableAutoSelect();
    updateUserUI(null);
  }

  function updateUserUI(user) {
    const cardLogin  = document.getElementById('scard-login');
    const cardUser   = document.getElementById('scard-user');
    const navMini    = document.getElementById('nav-user-mini');
    const settName   = document.getElementById('settings-name');
    const settEmail  = document.getElementById('settings-email');
    const settAvatar = document.getElementById('settings-avatar');
    const navAvatar  = document.getElementById('nav-user-avatar');
    const navName    = document.getElementById('nav-user-name');
    const navEmail   = document.getElementById('nav-user-email');

    if (user) {
      if (cardLogin)  cardLogin.style.display = 'none';
      if (cardUser)   cardUser.style.display  = '';
      if (navMini)    navMini.style.display    = '';
      if (settName)   settName.textContent     = user.name;
      if (settEmail)  settEmail.textContent    = user.email;
      if (navName)    navName.textContent      = user.name;
      if (navEmail)   navEmail.textContent     = user.email;
      const avatarHTML = user.picture
        ? `<img src="${user.picture}" alt="${user.name}">`
        : user.name.charAt(0).toUpperCase();
      if (settAvatar) settAvatar.innerHTML = avatarHTML;
      if (navAvatar)  navAvatar.innerHTML  = avatarHTML;
    } else {
      if (cardLogin)  cardLogin.style.display = '';
      if (cardUser)   cardUser.style.display  = 'none';
      if (navMini)    navMini.style.display    = 'none';
    }
  }

  function syncThemeToggle() {
    const sw = document.getElementById('theme-toggle-sw');
    if (sw) sw.classList.toggle('on', !dark);
  }

  function openNav() {
    playClick();
    document.getElementById('sidenav').classList.add('open');
    document.getElementById('overlay').classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  
  function closeNav() {
    document.getElementById('sidenav').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
    document.body.style.overflow = '';
  }
  
  function showPage(id) {
    playClick();
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('page-' + id).style.display = '';
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById('nav-' + id);
    if(navEl) navEl.classList.add('active');
    
    window.scrollTo(0, 0);
  }

  function scrollToPay(planId) {
    const paySection = document.getElementById('pay-section');
    if (paySection) {
      paySection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function copyWallet() {
    const addr = "0xB6E6250f8A737e140031028D5e7caB3e37029Bb8";
    navigator.clipboard.writeText(addr).then(() => {
      const btn = document.getElementById('copy-btn');
      const orig = btn.innerHTML;
      btn.innerHTML = t('wallet_copied');
      setTimeout(() => { btn.innerHTML = orig; injectIcons(); }, 2000);
    }).catch(err => {
      console.error('فشل نسخ العنوان: ', err);
    });
  }

// دالة فتح وإغلاق القوائم المنسدلة في الشريط الجانبي
function toggleNavGroup(element) {
  const currentGroup = element.parentElement;
  const isActive = currentGroup.classList.contains('active');
  const body = currentGroup.querySelector('.nav-group-body');

  // إغلاق جميع القوائم الأخرى أولاً (اختياري، يجعله أكثر ترتيباً)
  document.querySelectorAll('.nav-group').forEach(group => {
    group.classList.remove('active');
    const groupBody = group.querySelector('.nav-group-body');
    if (groupBody) groupBody.style.maxHeight = null;
  });

  // إذا لم تكن القائمة التي ضغطنا عليها مفتوحة، نفتحها
  if (!isActive && body) {
    currentGroup.classList.add('active');
    body.style.maxHeight = body.scrollHeight + "px";
  }
}
/* ── تسجيل الدخول عبر جوجل (واجهة أولية فقط — سيتم ربطها بالتسجيل الفعلي لاحقاً) ── */
function handleGoogleSignIn() {
  console.log('🔵 زر تسجيل الدخول عبر جوجل تم الضغط عليه — لم يتم ربط التسجيل الفعلي بعد.');
  // TODO: ربط هذه الدالة بخدمة المصادقة الفعلية (Google OAuth) عند جهوزية الـ backend
}

window.onclick = function(event) {
    if (!event.target.closest('.lang-dropdown')) {
        document.querySelectorAll('.lang-menu-content').forEach(menu => {
            menu.classList.remove('show');
        });
    }
}

window.onload = () => {
  injectIcons();
  // مزامنة نص زر الثيم مع اللغة الحالية — ننتظر القاموس أولاً
  const syncThemeLabel = () => {
    const lbl = document.getElementById('theme-lbl');
    const iconEl = document.getElementById('theme-icon');
    if (lbl) lbl.textContent = dark ? t('theme_light') : t('theme_dark');
    if (iconEl) iconEl.innerHTML = getIcon(dark ? 'sun' : 'moon');
  };
  // نحاول فوراً، ولو القاموس ما حُمّل بعد ننتظر 300ms
  if (window.arsenalTranslations) {
    syncThemeLabel();
  } else {
    setTimeout(syncThemeLabel, 300);
  }
};
