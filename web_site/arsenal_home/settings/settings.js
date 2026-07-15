// ══════════════════════════════════════════════
// Settings Tool — settings.js
// ══════════════════════════════════════════════

(function () {

  const GOOGLE_CLIENT_ID = '971416834152-nqnns94gg7dn2gdu04cqh9oups0d2gs7.apps.googleusercontent.com';

  // ── مزامنة CSS variables من الـ parent ──────
  function syncCSSVars() {
    try {
      const parentStyle = getComputedStyle(parent.document.documentElement);
      const vars = ['--bg','--bg2','--sf','--sf2','--sfh','--bd','--c1','--c2','--c3','--acc','--acc2','--acc3'];
      const root = document.documentElement;
      vars.forEach(v => {
        const val = parentStyle.getPropertyValue(v).trim();
        if (val) root.style.setProperty(v, val);
      });
      if (parent.document.body.classList.contains('light')) {
        document.body.classList.add('light');
      } else {
        document.body.classList.remove('light');
      }
    } catch(e) {}
  }

  // ── sync الثيم ──────────────────────────────
  function syncThemeUI() {
    syncCSSVars();
    const dark = !parent.document.body.classList.contains('light');
    const sw   = document.getElementById('theme-toggle-sw');
    const lbl  = document.getElementById('theme-lbl-s');
    const ico  = document.getElementById('theme-icon-s');
    if (sw)  sw.classList.toggle('on', !dark);
    if (lbl) lbl.textContent = dark
      ? (window.t ? t('theme_light') : 'الوضع الفاتح')
      : (window.t ? t('theme_dark')  : 'الوضع الداكن');
    if (ico) ico.innerHTML = dark
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }

  window.doToggleTheme = function() {
    if (parent.toggleTheme) {
      parent.toggleTheme();
      // ننتظر الـ class يتغير على الـ parent ثم نزامن
      requestAnimationFrame(() => requestAnimationFrame(syncThemeUI));
    }
  };

  // ── sync الصوت ──────────────────────────────
  function syncSoundUI() {
    const enabled = localStorage.getItem('asl_sound') !== 'off';
    const sw  = document.getElementById('sound-toggle-sw');
    const lbl = document.getElementById('sound-lbl-s');
    if (sw)  sw.classList.toggle('on', enabled);
    if (lbl) lbl.textContent = enabled
      ? (window.t ? t('settings_sound_on')  : 'مفعّل')
      : (window.t ? t('settings_sound_off') : 'مكتوم');
  }

  window.toggleSoundSettings = function () {
    const enabled = localStorage.getItem('asl_sound') !== 'off';
    localStorage.setItem('asl_sound', enabled ? 'off' : 'on');
    if (parent.toggleSound) parent.toggleSound();
    syncSoundUI();
  };

  // ── Google OAuth ────────────────────────────
  function initGoogle() {
    if (!window.google) return;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleLogin,
      auto_select: false,
    });
  }

  function handleGoogleLogin(response) {
    const payload = parseJwt(response.credential);
    const user = { name: payload.name, email: payload.email, picture: payload.picture };
    const userId = payload.sub; // Google unique ID
localStorage.setItem('arsenal_user_id', userId);

    // نحاول نحول الصورة لـ base64 ونخزنها محلياً لتجنب مشاكل الـ sandbox
    if (payload.picture) {
      fetchAsBase64(payload.picture).then(b64 => {
        user.pictureBase64 = b64;
        localStorage.setItem('asl_user', JSON.stringify(user));
        if (parent.updateUserUI) parent.updateUserUI(user);
        updateLocalUserUI(user);
      }).catch(() => {
        localStorage.setItem('asl_user', JSON.stringify(user));
        if (parent.updateUserUI) parent.updateUserUI(user);
        updateLocalUserUI(user);
      });
    } else {
      localStorage.setItem('asl_user', JSON.stringify(user));
      if (parent.updateUserUI) parent.updateUserUI(user);
      updateLocalUserUI(user);
    }
  }

  function fetchAsBase64(url) {
    return fetch(url)
      .then(r => r.blob())
      .then(blob => new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      }));
  }

  function parseJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')));
  }

  window.arsenalLogout = function () {
    localStorage.removeItem('asl_user');
    if (window.google) google.accounts.id.disableAutoSelect();
    if (parent.updateUserUI) parent.updateUserUI(null);
    updateLocalUserUI(null);
  };

  function updateLocalUserUI(user) {
    const cardLogin  = document.getElementById('scard-login');
    const cardUser   = document.getElementById('scard-user');
    const settName   = document.getElementById('settings-name');
    const settEmail  = document.getElementById('settings-email');
    const settAvatar = document.getElementById('settings-avatar');

    if (user) {
      if (cardLogin)  cardLogin.style.display  = 'none';
      if (cardUser)   cardUser.style.display   = '';
      if (settName)   settName.textContent     = user.name;
      if (settEmail)  settEmail.textContent    = user.email;
      if (settAvatar) {
        settAvatar.innerHTML = '';
        const picSrc = user.pictureBase64 || user.picture;
        if (picSrc) {
          const img = document.createElement('img');
          img.alt = user.name;
          img.onerror = () => { settAvatar.innerHTML = ''; settAvatar.textContent = user.name.charAt(0).toUpperCase(); };
          img.src = picSrc;
          settAvatar.appendChild(img);
        } else {
          settAvatar.textContent = user.name.charAt(0).toUpperCase();
        }
      }
    } else {
      if (cardLogin)  cardLogin.style.display  = '';
      if (cardUser)   cardUser.style.display   = 'none';
    }
  }

  // ── تحميل Google GSI ────────────────────────
  function loadGoogleScript(cb) {
    if (window.google) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = cb;
    document.head.appendChild(s);
  }

  // ══════════════════════════════════════════════
  // FEEDBACK — Firebase Firestore
  // ══════════════════════════════════════════════
  const FB_CONFIG = {
    apiKey:            "AIzaSyA9rZva181tyLdHLdVjjMqCNnU5cccli9o",
    authDomain:        "arsenal-feedback.firebaseapp.com",
    projectId:         "arsenal-feedback",
    storageBucket:     "arsenal-feedback.firebasestorage.app",
    messagingSenderId: "533502478119",
    appId:             "1:533502478119:web:605c5006943cd023a9cb02"
  };

  const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/feedback`;

  let fbRating   = 0;
  let fbType     = 'suggestion';
  let fbFirebase = null;

  // تحميل Firebase SDK عند الحاجة
  function loadFirebaseSDK(cb) {
    if (fbFirebase) { cb(fbFirebase); return; }
    const s = document.createElement('script');
    s.type = 'module';
    s.textContent = `
      import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
      import { getFirestore, collection, addDoc, serverTimestamp }
        from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
      const app = initializeApp(${JSON.stringify(FB_CONFIG)}, 'arsenal-feedback');
      const db  = getFirestore(app);
      window.__arsenalFirestore   = db;
      window.__arsenalAddDoc      = addDoc;
      window.__arsenalCollection  = collection;
      window.__arsenalTimestamp   = serverTimestamp;
      window.dispatchEvent(new Event('arsenal-firebase-ready'));
    `;
    window.addEventListener('arsenal-firebase-ready', () => {
      fbFirebase = {
        db:          window.__arsenalFirestore,
        addDoc:      window.__arsenalAddDoc,
        collection:  window.__arsenalCollection,
        timestamp:   window.__arsenalTimestamp
      };
      cb(fbFirebase);
    }, { once: true });
    document.head.appendChild(s);
  }

  // فتح صفحة الفيدباك مع التحقق من تسجيل الدخول
  window.openFeedbackPage = function() {
    const user = localStorage.getItem('asl_user');
    showInternalPage('feedback');
    const locked  = document.getElementById('fb-locked');
    const formWrap = document.getElementById('fb-form-wrap');
    if (!user) {
      if (locked)   locked.style.display   = '';
      if (formWrap) formWrap.style.display  = 'none';
    } else {
      if (locked)   locked.style.display   = 'none';
      if (formWrap) formWrap.style.display  = '';
    }
  };

  // اختيار نوع الفيدباك
  window.selectFbType = function(btn) {
    document.querySelectorAll('.fb-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fbType = btn.getAttribute('data-type');
  };

  // تحديد التقييم بالنجوم
  window.setRating = function(val) {
    fbRating = val;
    document.querySelectorAll('.fb-star').forEach(s => {
      s.classList.toggle('active', parseInt(s.getAttribute('data-v')) <= val);
    });
  };

  // إرسال الفيدباك
  window.submitFeedback = function() {
    const user = JSON.parse(localStorage.getItem('asl_user') || 'null');
    if (!user) return;

    const msg = (document.getElementById('fb-msg')?.value || '').trim();
    if (!msg) {
      const ta = document.getElementById('fb-msg');
      if (ta) { ta.style.borderColor = '#ff4b4b'; setTimeout(() => ta.style.borderColor = '', 1500); }
      return;
    }
    if (fbRating === 0) {
      const stars = document.getElementById('fb-stars');
      if (stars) { stars.style.animation = 'none'; stars.style.color = '#ff4b4b'; setTimeout(() => stars.style.color = '', 1500); }
      return;
    }

    const btn = document.getElementById('fb-submit');
    if (btn) { btn.disabled = true; btn.innerHTML = `<span>${window.t ? t('fb_sending') : 'جاري الإرسال...'}</span>`; }

    loadFirebaseSDK(({ db, addDoc, collection, timestamp }) => {
      addDoc(collection(db, 'feedback'), {
        name:      user.name  || '',
        email:     user.email || '',
        type:      fbType,
        rating:    fbRating,
        message:   msg,
        lang:      localStorage.getItem('arsenal_lang') || 'ar',
        createdAt: timestamp()
      }).then(() => {
        document.getElementById('fb-form-wrap').style.display = 'none';
        document.getElementById('fb-success').style.display   = '';
      }).catch(err => {
        console.error('Feedback error:', err);
        if (btn) { btn.disabled = false; btn.innerHTML = `<span>${window.t ? t('fb_submit') : 'إرسال الفيدباك'}</span>`; }
        alert('حدث خطأ أثناء الإرسال، حاول مجدداً.');
      });
    });
  };

  // إعادة تعيين الفورم لإرسال رأي آخر
  window.resetFeedback = function() {
    fbRating = 0;
    fbType   = 'suggestion';
    const msg = document.getElementById('fb-msg');
    if (msg) msg.value = '';
    document.querySelectorAll('.fb-star').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.fb-type-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    const btn = document.getElementById('fb-submit');
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>${window.t ? t('fb_submit') : 'إرسال الفيدباك'}</span>`; }
    document.getElementById('fb-success').style.display   = 'none';
    document.getElementById('fb-form-wrap').style.display = '';
    const charEl = document.getElementById('fb-char');
    if (charEl) charEl.textContent = '0';
  };

  // عداد الحروف
  document.addEventListener('input', e => {
    if (e.target.id === 'fb-msg') {
      const charEl = document.getElementById('fb-char');
      if (charEl) charEl.textContent = e.target.value.length;
    }
  });

  // ── التنقل بين الصفحات الداخلية ────────────
  window.showInternalPage = function(pageId) {
    // إخفاء صفحة الإعدادات الرئيسية
    const mainPage = document.querySelector('.settings-page');
    if (mainPage) mainPage.style.display = pageId ? 'none' : '';

    // إخفاء جميع الصفحات الداخلية
    document.querySelectorAll('[id^="internal-page-"]').forEach(p => {
      p.style.display = 'none';
    });

    // إظهار الصفحة المطلوبة إن وُجدت
    if (pageId) {
      const target = document.getElementById('internal-page-' + pageId);
      if (target) {
        target.style.display = '';
        window.scrollTo(0, 0);
      }
    }
  };

  // ── نسخ عنوان المحفظة ───────────────────────
  window.copyWallet = function() {
    const addr = '0xB6E6250f8A737e140031028D5e7caB3e37029Bb8';
    navigator.clipboard.writeText(addr).then(() => {
      const btn = document.getElementById('copy-btn');
      if (!btn) return;
      const orig = btn.innerHTML;
      btn.innerHTML = window.t ? t('wallet_copied') : '✓ تم النسخ';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }).catch(err => console.error('فشل نسخ العنوان:', err));
  };

  // ── التمرير لقسم الدفع ──────────────────────
  window.scrollToPay = function() {
    const paySection = document.getElementById('pay-section');
    if (paySection) paySection.scrollIntoView({ behavior: 'smooth' });
  };

  // ══════════════════════════════════════════════
  // OFFLINE CACHE — تحميل كل الملفات للاستخدام offline
  // ══════════════════════════════════════════════

  const OFFLINE_FILES = [
    // ── الأساسيات ──
    '/', '/index.html',
    '/arsenal_home/arsenal.html', '/arsenal_home/arsenal.css', '/arsenal_home/arsenal.js',
    '/arsenal_home/settings/settings.html', '/arsenal_home/settings/settings.css', '/arsenal_home/settings/settings.js',
    '/core/toolLoader.js',
    '/core/style_and_sound/arsenal-dropdown.css', '/core/style_and_sound/arsenal-dropdown.js',
    '/core/style_and_sound/arsenal.png', '/core/style_and_sound/click.wav',
    '/core/icons/icon-192.png', '/core/icons/icon-512.png',
    '/core/lang/ar.js', '/core/lang/en.js', '/core/lang/ru.js', '/core/lang/zh.js',
    '/core/core_app/lang.js', '/manifest.json',
    // ── FFmpeg (ثقيل) ──
    '/core/core_app/core_ffmpeg/814.ffmpeg.js',
    '/core/core_app/core_ffmpeg/ffmpeg.js',
    '/core/core_app/core_ffmpeg/ffmpeg-core.js',
    'https://raw.githubusercontent.com/craftultra000-png/Arsenal-ATL/refs/heads/cdn/ffmpeg-core.wasm',
    '/core/core_app/core_ffmpeg/ffmpeg-core.worker.js',
    // ── مكتبات أخرى ──
    '/core/core_app/argon2.js', '/core/core_app/argon2.wasm',
    '/core/core_app/lame.min.js', '/core/core_app/Tone.js',
    '/core/core_app/jspdf.umd.min.js', '/core/core_app/pdf-lib.min.js',
    '/core/core_app/pdf.min.js', '/core/core_app/pdf.worker.min.js',
    '/core/core_app/jszip.min.js', '/core/core_app/html2canvas.min.js',
    '/core/core_app/html5-qrcode.min.js', '/core/core_app/easy.qrcode.min.js',
    '/core/core_app/ort.min.js',
    '/core/core_app/ort-wasm-simd-threaded.mjs', '/core/core_app/ort-wasm-simd-threaded.wasm',
    'https://raw.githubusercontent.com/craftultra000-png/Arsenal-ATL/refs/heads/cdn/isnet-general-use-q8.onnx',
    // ── أدوات الفيديو ──
    '/video/video_compressor/video_compressor.html', '/video/video_compressor/video_compressor.css', '/video/video_compressor/video_compressor.js',
    '/video/video_editor/video_editor.html', '/video/video_editor/video_editor.css', '/video/video_editor/video_editor.js',
    '/video/video_converter_f_voice/video_converter_f_voice.html', '/video/video_converter_f_voice/video_converter_f_voice.css', '/video/video_converter_f_voice/video_converter_f_voice.js',
    // ── أدوات الصوت ──
    '/audio/audio_rate/audio_rate.html', '/audio/audio_rate/audio_rate.css', '/audio/audio_rate/audio_rate.js',
    '/audio/audio_cut/audio_cut.html', '/audio/audio_cut/audio_cut.css', '/audio/audio_cut/audio_cut.js',
    '/audio/audio_adapter/audio_adapter.html', '/audio/audio_adapter/audio_adapter.css', '/audio/audio_adapter/audio_adapter.js',
    // ── أدوات الصورة ──
    '/image/image_compressor/image_compressor.html', '/image/image_compressor/image_compressor.css', '/image/image_compressor/image_compressor.js',
    '/image/image_editor/image_editor.html', '/image/image_editor/image_editor.css', '/image/image_editor/image_editor.js',
    '/image/image_remover/image_remover.html', '/image/image_remover/image_remover.css', '/image/image_remover/image_remover.js', '/image/image_remover/image_remover_worker.js',
    // ── أدوات PDF ──
    '/pdf/pdf_compressor/pdf_compressor.html', '/pdf/pdf_compressor/pdf_compressor.css', '/pdf/pdf_compressor/pdf_compressor.js',
    '/pdf/pdf_create/pdf_create.html', '/pdf/pdf_create/pdf_create.css', '/pdf/pdf_create/pdf_create.js',
    '/pdf/pdf_editor/pdf_editor.html', '/pdf/pdf_editor/pdf_editor.css', '/pdf/pdf_editor/pdf_editor.js',
    // ── أدوات النص ──
    '/text/encrypted_texts/encrypted_texts.html', '/text/encrypted_texts/encrypted_texts.css', '/text/encrypted_texts/encrypted_texts.js',
    '/text/text_comparison/text_comparison.html', '/text/text_comparison/text_comparison.css', '/text/text_comparison/text_comparison.js',
    '/text/text_filter/text_filter.html', '/text/text_filter/text_filter.css', '/text/text_filter/text_filter.js',
    // ── أدوات متعددة ──
    '/multi_tools_library/archive/arsenal_archive.html', '/multi_tools_library/archive/arsenal_archive.css', '/multi_tools_library/archive/arsenal_archive.js',
    '/multi_tools_library/archive/portable_extractor.html',
    '/multi_tools_library/arsenal_share/arsenal_share.html', '/multi_tools_library/arsenal_share/arsenal_share.css', '/multi_tools_library/arsenal_share/arsenal_share.js',
    '/multi_tools_library/qr_generator/qr_generator.html', '/multi_tools_library/qr_generator/qr_generator.css', '/multi_tools_library/qr_generator/qr_generator.js',
  ];

  window.startOfflineCache = async function () {
    const btn      = document.getElementById('offline-download-btn');
    const wrap     = document.getElementById('offline-progress-wrap');
    const bar      = document.getElementById('offline-progress-bar');
    const pct      = document.getElementById('offline-progress-pct');
    const fileEl   = document.getElementById('offline-progress-file');
    const success  = document.getElementById('offline-success');
    const desc     = document.getElementById('offline-status-desc');

    if (!btn || !wrap) return;

    // منع الضغط المزدوج
    btn.disabled = true;
    btn.style.opacity = '0.5';
    wrap.style.display = '';
    if (success) success.style.display = 'none';

    let done = 0;
    const total = OFFLINE_FILES.length;

    try {
      const cache = await caches.open('arsenal-v1-tools');

      for (const path of OFFLINE_FILES) {
        if (fileEl) fileEl.textContent = path.split('/').pop();
        try {
          const res = await fetch(path, { cache: 'no-cache' });
          if (res.ok) await cache.put(path, res);
        } catch (_) {
          // تجاهل الملف لو فشل ولا نوقف العملية
        }
        done++;
        const p = Math.round((done / total) * 100);
        if (bar) bar.style.width = p + '%';
        if (pct) pct.textContent = p + '%';
      }

      // نجاح
      wrap.style.display = 'none';
      if (success) { success.style.display = 'flex'; }
      if (desc) desc.setAttribute('data-lang', 'settings_offline_ready_desc');
      if (desc) desc.textContent = window.t ? t('settings_offline_ready_desc') : 'جميع الملفات محفوظة محلياً';
      btn.style.display = 'none';

    } catch (err) {
      console.error('[Offline Cache] خطأ:', err);
      if (pct) pct.textContent = 'خطأ';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  };

  // ── NowPayments Integration ──────────────────────────────────────────
const PAYMENTS_WORKER = 'https://arsenal-payment.craftultra000.workers.dev';
let selectedPlan = 'monthly';

window.selectPlan = function(plan) {
  selectedPlan = plan;
  document.getElementById('plan-monthly-btn')?.classList.toggle('active', plan === 'monthly');
  document.getElementById('plan-yearly-btn')?.classList.toggle('active', plan === 'yearly');
};

window.initiatePayment = async function() {
  const userId = localStorage.getItem('arsenal_user_id');
  if (!userId) {
    alert(t('pay_login_required') || 'يجب تسجيل الدخول أولاً');
    return;
  }
  document.getElementById('payment-loading').style.display = 'block';
  document.getElementById('payment-info').style.display = 'none';
  document.getElementById('payment-error').style.display = 'none';
  document.getElementById('pay-now-btn').disabled = true;
  try {
    const res = await fetch(`${PAYMENTS_WORKER}/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan, userId })
    });
    const data = await res.json();
    if (data.pay_address) {
      document.getElementById('payment-address').textContent = data.pay_address;
      document.getElementById('payment-amount').textContent = data.pay_amount;
      document.getElementById('payment-info').style.display = 'block';
    } else {
      throw new Error(data.message || 'فشل إنشاء طلب الدفع');
    }
  } catch (err) {
    document.getElementById('payment-error').style.display = 'block';
    document.getElementById('payment-error').textContent = err.message;
  } finally {
    document.getElementById('payment-loading').style.display = 'none';
    document.getElementById('pay-now-btn').disabled = false;
  }
};

window.copyPaymentAddress = function() {
  const addr = document.getElementById('payment-address')?.textContent;
  if (addr) navigator.clipboard.writeText(addr);
};

async function checkSubscription(userId) {
  try {
    const res = await fetch(`${PAYMENTS_WORKER}/check-subscription?userId=${userId}`);
    const data = await res.json();
    if (data.active) {
      localStorage.setItem('arsenal_sub_active', 'true');
      localStorage.setItem('arsenal_sub_plan', data.plan);
      localStorage.setItem('arsenal_sub_expiry', data.expiryDate);
    } else {
      localStorage.removeItem('arsenal_sub_active');
    }
    return data;
  } catch (err) {
    return { active: false };
  }
}

  // ── Init ────────────────────────────────────
  window.addEventListener('load', () => {
    syncCSSVars();

    const saved = localStorage.getItem('asl_user');
    updateLocalUserUI(saved ? JSON.parse(saved) : null);
    const savedUserId = localStorage.getItem('arsenal_user_id');
if (savedUserId) checkSubscription(savedUserId);

    syncThemeUI();
    syncSoundUI();

    document.getElementById('google-login-btn')?.addEventListener('click', () => {
      loadGoogleScript(() => {
        initGoogle();
        google.accounts.id.prompt();
      });
    });

    // مراقبة تغيير الثيم من الـ parent
    try {
      const observer = new MutationObserver(() => syncThemeUI());
      observer.observe(parent.document.body, { attributes: true, attributeFilter: ['class'] });
    } catch(e) {}
  });

})();
