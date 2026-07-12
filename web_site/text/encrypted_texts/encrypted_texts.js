// ==========================================
// محرك ترسانة التشفير — Argon2id + AES-256-GCM
// ==========================================

const resultArea  = document.getElementById('globalResultArea');
const resultTitle = document.getElementById('globalResultTitle');
const resultText  = document.getElementById('globalResultText');

// ─────────────────────────────────────────
// 1. التبديل بين التبويبات
// ─────────────────────────────────────────
function switchCryptoTab(panelId, button) {
    document.querySelectorAll('.encrypted-texts-container .panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.encrypted-texts-container .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    button.classList.add('active');
    resultArea.style.display = "none";
}

// ─────────────────────────────────────────
// 2. توليد مفتاح عشوائي
// ─────────────────────────────────────────
function generateRandomKey(fieldId) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    document.getElementById(fieldId).value =
        Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────
// 3. نسخ حقل
// ─────────────────────────────────────────
async function copyFieldText(fieldId, btnElement) {
    const field = document.getElementById(fieldId);
    if (!field.value) { showBtnFeedback(btnElement, t('enc_fb_empty'), "#ff4b4b"); return; }
    try {
        await navigator.clipboard.writeText(field.value);
        showBtnFeedback(btnElement, t('enc_fb_copied'), "var(--acc2)");
    } catch {
        showBtnFeedback(btnElement, t('enc_fb_copy_fail'), "#ff4b4b");
    }
}

// ─────────────────────────────────────────
// 4. تحميل Argon2 WASM بشكل صحيح
//
// المشكلة: Emscripten يقرأ self.Module في أول سطر منه:
//   var Module = self.Module !== undefined ? self.Module : {};
// لذا يجب ضبط self.Module قبل تحميل السكريبت
// ─────────────────────────────────────────
let _argon2Mod = null;

function loadArgon2() {
    if (_argon2Mod) return Promise.resolve(_argon2Mod);

    // إذا كان toolLoader حمّله بالفعل وهو جاهز
    if (typeof Module !== 'undefined' && Module._argon2_hash) {
        _argon2Mod = Module;
        return Promise.resolve(_argon2Mod);
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() =>
            reject(new Error('Argon2: انتهى وقت الانتظار')), 20000);

        // ── الخطوة الأولى: ضبط self.Module قبل تحميل الـ script ──
        // Emscripten يلتقط هذا الـ object ويضيف عليه كل الـ API
        self.Module = {
            onRuntimeInitialized() {
                clearTimeout(timeout);
                _argon2Mod = self.Module;
                resolve(_argon2Mod);
            }
        };

        // ── الخطوة الثانية: تحميل argon2.js ──
        // argon2.wasm يُجلب تلقائياً من نفس المسار (scriptDirectory)
        const script = document.createElement('script');

        // اكتشاف المسار من scripts الموجودة في الـ iframe
        const ref = Array.from(document.querySelectorAll('script[src]'))
            .find(s => s.src.includes('core') || s.src.includes('arsenal'));
        const base = ref
            ? ref.src.replace(/\/[^\/]+\/[^\/]+\/[^\/]*$/, '/')
            : '/';

        script.src = base + 'core/core_app/argon2.js';
        script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('فشل تحميل argon2.js — تحقق من المسار: ' + script.src));
        };
        document.head.appendChild(script);
    });
}

// ─────────────────────────────────────────
// 5. تشغيل Argon2id عبر C API المباشر
//    (لأن الملف Emscripten raw وليس argon2-browser)
//
//  الدالة C:
//    int argon2_hash(t_cost, m_cost, parallelism,
//                   pwd, pwdlen, salt, saltlen,
//                   hash, hashlen, encoded, encodedlen, type)
//    type: 0=d  1=i  2=id
// ─────────────────────────────────────────
async function argon2RawHash(password, saltBytes) {
    const mod = await loadArgon2();

    const enc      = new TextEncoder();
    const pwdBytes = enc.encode(password);
    const hashLen  = 32;        // 256-bit
    const ARGON2ID = 2;

    // تخصيص ذاكرة في WASM heap
    const pwdPtr  = mod._malloc(pwdBytes.length);
    const saltPtr = mod._malloc(saltBytes.length);
    const hashPtr = mod._malloc(hashLen);

    try {
        // نسخ البيانات إلى ذاكرة WASM
        mod.HEAPU8.set(pwdBytes,  pwdPtr);
        mod.HEAPU8.set(saltBytes, saltPtr);

        // استدعاء دالة C مباشرة
        const ret = mod._argon2_hash(
            3,          // t_cost  — 3 جولات
            65536,      // m_cost  — 64 MB (بـ KiB)
            2,          // parallelism
            pwdPtr,  pwdBytes.length,
            saltPtr, saltBytes.length,
            hashPtr, hashLen,
            0, 0,       // لا نريد encoded string
            ARGON2ID
        );

        if (ret !== 0) throw new Error(`Argon2 error code: ${ret}`);

        // قراءة الناتج من WASM heap (slice لأخذ نسخة مستقلة)
        return new Uint8Array(mod.HEAPU8.buffer, hashPtr, hashLen).slice();

    } finally {
        // تحرير الذاكرة دائماً حتى لو صار خطأ
        mod._free(pwdPtr);
        mod._free(saltPtr);
        mod._free(hashPtr);
    }
}

// ─────────────────────────────────────────
// 6. اشتقاق مفتاح AES من Argon2id
// ─────────────────────────────────────────
async function deriveKey(password, salt) {
    const hashBytes = await argon2RawHash(password, salt);
    return window.crypto.subtle.importKey(
        'raw',
        hashBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

// ─────────────────────────────────────────
// مساعدات Buffer ↔ Base64
// ─────────────────────────────────────────
function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

// ─────────────────────────────────────────
// 7. التشفير
//    payload = [ salt(32) | iv(12) | ciphertext ]
// ─────────────────────────────────────────
async function handleEncrypt() {
    const text     = document.getElementById('encInputText').value.trim();
    const password = document.getElementById('encKey').value.trim();
    const btn      = document.getElementById('btn-do-encrypt');

    if (!text || !password) {
        showBtnFeedback(btn, t('enc_fb_fill_fields'), "#ff4b4b");
        return;
    }

    const btnSpan = btn.querySelector('span');
    const oldText = btnSpan.innerText;
    btnSpan.innerText = t('enc_btn_encrypting');
    btn.disabled = true;

    try {
        const salt = window.crypto.getRandomValues(new Uint8Array(32)); // 32B لـ Argon2id
        const iv   = window.crypto.getRandomValues(new Uint8Array(12)); // 12B لـ AES-GCM

        const key = await deriveKey(password, salt);

        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            new TextEncoder().encode(text)
        );

        const encBytes = new Uint8Array(encryptedContent);
        const payload  = new Uint8Array(salt.length + iv.length + encBytes.length);
        payload.set(salt,     0);
        payload.set(iv,       salt.length);
        payload.set(encBytes, salt.length + iv.length);

        resultTitle.innerText = t('enc_result_encrypted');
        resultTitle.style.color = "var(--acc)";
        resultText.innerText = bufferToBase64(payload);
        resultArea.style.display = "block";
        resultArea.style.borderColor = "var(--acc)";

    } catch (e) {
        console.error('Encrypt error:', e);
        showBtnFeedback(btn, t('enc_err_unexpected'), "#ff4b4b");
    } finally {
        btnSpan.innerText = oldText;
        btn.disabled = false;
    }
}

// ─────────────────────────────────────────
// 8. فك التشفير
// ─────────────────────────────────────────
async function handleDecrypt() {
    const cipherB64  = document.getElementById('decInputText').value.trim();
    const password   = document.getElementById('decKey').value.trim();
    const btn        = document.getElementById('btn-do-decrypt');

    if (!cipherB64 || !password) {
        showBtnFeedback(btn, t('enc_fb_fill_decrypt'), "#ff4b4b");
        return;
    }

    const btnSpan = btn.querySelector('span');
    const oldText = btnSpan.innerText;
    btnSpan.innerText = t('enc_btn_decrypting');
    btn.disabled = true;

    try {
        const payload       = new Uint8Array(base64ToBuffer(cipherB64));
        const salt          = payload.slice(0, 32);   // 32B
        const iv            = payload.slice(32, 44);  // 12B
        const encryptedData = payload.slice(44);

        const key = await deriveKey(password, salt);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedData
        );

        resultTitle.innerText = t('enc_result_decrypted');
        resultTitle.style.color = "var(--acc2)";
        resultText.innerText = new TextDecoder().decode(decrypted);
        resultArea.style.display = "block";
        resultArea.style.borderColor = "var(--acc2)";

    } catch (e) {
        console.error('Decrypt error:', e);
        showBtnFeedback(btn, t('enc_err_wrong_key'), "#ff4b4b");
    } finally {
        btnSpan.innerText = oldText;
        btn.disabled = false;
    }
}

// ─────────────────────────────────────────
// 9. نسخ النتيجة
// ─────────────────────────────────────────
async function copyResultText(btnElement) {
    try {
        await navigator.clipboard.writeText(resultText.innerText);
        showBtnFeedback(btnElement, t('enc_fb_copy_success'), "var(--acc2)", true);
    } catch {
        showBtnFeedback(btnElement, t('enc_fb_copy_fail'), "#ff4b4b", true);
    }
}

// ─────────────────────────────────────────
// 10. تغذية راجعة الأزرار
// ─────────────────────────────────────────
function showBtnFeedback(btn, message, color, isSpan = false) {
    const originalBg    = btn.style.background;
    const originalColor = btn.style.color;

    if (isSpan) {
        const span    = btn.querySelector('span');
        const origTxt = span.innerText;
        span.innerText       = message;
        btn.style.color      = color;
        btn.style.borderColor = color;
        setTimeout(() => {
            span.innerText        = origTxt;
            btn.style.color       = originalColor;
            btn.style.borderColor = "var(--acc2)";
        }, 2000);
    } else {
        const origHTML  = btn.innerHTML;
        btn.innerHTML   = `<span>${message}</span>`;
        btn.style.background = color;
        btn.style.color      = "#fff";
        setTimeout(() => {
            btn.innerHTML        = origHTML;
            btn.style.background = originalBg;
            btn.style.color      = originalColor;
        }, 2000);
    }
}
