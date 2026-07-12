// ==========================================
// محرك ترسانة الـ QR Code (النسخة النهائية الصامتة والمتفاعلة)
// ==========================================

// --- منطق التنقل بين التبويبات الرئيسي ---
function switchTab(tabName) {
    const qrRoot = document.querySelector('.qrg-page');
    qrRoot.querySelectorAll('.qrg-main-tab-btn').forEach(btn => btn.classList.remove('active'));
    qrRoot.querySelectorAll('.qrg-tab-content').forEach(content => content.classList.remove('active'));

    if(tabName === 'generate') {
        qrRoot.querySelectorAll('.qrg-main-tab-btn')[0].classList.add('active');
        document.getElementById('generate-tab').classList.add('active');
        stopLiveScan(); // إيقاف الكاميرا فوراً عند الخروج لحماية الخصوصية والبطارية
    } else {
        qrRoot.querySelectorAll('.qrg-main-tab-btn')[1].classList.add('active');
        document.getElementById('scan-tab').classList.add('active');
        setScanMethod('file'); // 🛡️ تعيين خيار الرفع كخيار افتراضي أولي وآمن جداً
    }
}

// --- محرك التوليد والحفظ ---
const urlInput = document.getElementById('urlInput');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const qrcodeContainer = document.getElementById('qrcode');

generateBtn.addEventListener('click', () => {
    const urlText = urlInput.value.trim();
    
    // إزالة الـ alert المزعج واستبداله بتأثير بصري أنيق
    if (urlText === "") { 
        urlInput.style.borderColor = "#ff4b4b";
        urlInput.placeholder = t('qr_err_empty_input');
        setTimeout(() => {
            urlInput.style.borderColor = "var(--bd)";
            urlInput.placeholder = "https://example.com";
        }, 2000);
        return; 
    }
    
    qrcodeContainer.innerHTML = "";
    qrcodeContainer.style.display = "flex";

    new QRCode(qrcodeContainer, {
        text: urlText,
        width: 512,
        height: 512,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    setTimeout(() => { downloadBtn.style.display = "inline-flex"; }, 200);
});

downloadBtn.addEventListener('click', () => {
    const originalCanvas = qrcodeContainer.querySelector('canvas');
    if (!originalCanvas) return;
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    const padding = 20;
    
    finalCanvas.width = originalCanvas.width + (padding * 2);
    finalCanvas.height = originalCanvas.height + (padding * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(originalCanvas, padding, padding);

    finalCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Arsenal_QRCode.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
});

urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') generateBtn.click(); });


// --- محرك القراءة المباشرة المستمرة (Continuous Live Scan) ---
let html5QrScanner = null;
let isCameraScanning = false;
const videoElement = document.getElementById('webcam-preview');

function setScanMethod(method) {
    document.getElementById('result-box').style.display = "none";
    document.getElementById('open-link-btn').style.display = "none";
    document.getElementById('rescan-btn').style.display = "none";
    
    if(method === 'camera') {
        document.getElementById('opt-cam').classList.add('active');
        document.getElementById('opt-file').classList.remove('active');
        document.getElementById('camera-container').style.display = "block";
        document.getElementById('file-input-container').style.display = "none";
        startLiveScan(); 
    } else {
        document.getElementById('opt-file').classList.add('active');
        document.getElementById('opt-cam').classList.remove('active');
        document.getElementById('file-input-container').style.display = "flex";
        document.getElementById('camera-container').style.display = "none";
        stopLiveScan(); 
    }
}

// تشغيل المسح المباشر المستمر — يقرأ كل فريم تلقائياً بدون ضغط زر
function startLiveScan() {
    stopLiveScan();
    isCameraScanning = true;

    html5QrScanner = new Html5Qrcode("webcam-preview-region");

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5QrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            // نجاح فوري: يوقف المسح ويعرض النتيجة
            if (!isCameraScanning) return; // منع التشغيل المتكرر بعد التوقف
            isCameraScanning = false;
            vibratePhone();
            handleScanSuccess(decodedText);
            stopLiveScan();
            document.getElementById('rescan-btn').style.display = "inline-flex";
        },
        () => { /* فشل المسح بفريم واحد أمر طبيعي جداً، يتجاهل بصمت */ }
    ).catch((err) => {
        document.getElementById('result-box').style.display = "block";
        document.getElementById('result-text').innerText = t('qr_err_camera');
        setScanMethod('file');
    });
}

// إيقاف المسح المباشر وتحرير الكاميرا بالكامل
function stopLiveScan() {
    isCameraScanning = false;
    if (html5QrScanner) {
        html5QrScanner.stop()
            .then(() => html5QrScanner.clear())
            .catch(() => {});
        html5QrScanner = null;
    }
}

// زر "مسح رمز آخر" — يعيد تشغيل الكاميرا من جديد
function rescanCode() {
    document.getElementById('result-box').style.display = "none";
    document.getElementById('rescan-btn').style.display = "none";
    startLiveScan();
}

// 📁 مسح الرموز من ملف صورة مرفوع محلياً
function scanLocalFile(input) {
    if (input.files.length === 0) return;
    const file = input.files[0];
    
    const fileScanner = new Html5Qrcode("reader-hidden");
    fileScanner.scanFile(file, true)
        .then(decodedText => {
            handleScanSuccess(decodedText);
        })
        .catch(err => {
            document.getElementById('result-box').style.display = "block";
            document.getElementById('result-text').innerText = t('qr_err_no_qr_image');
            document.getElementById('open-link-btn').style.display = "none";
        });
}

// إدارة البيانات المستخرجة
function handleScanSuccess(text) {
    document.getElementById('result-box').style.display = "block";
    document.getElementById('result-text').innerText = text;

    const linkBtn = document.getElementById('open-link-btn');
    if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("www.")) {
        let correctUrl = text.startsWith("www.") ? "https://" + text : text;
        linkBtn.href = correctUrl;
        linkBtn.style.display = "inline-flex";
    } else {
        linkBtn.style.display = "none";
    }
}

// نسخ النص المستخرج إلى الحافظة
function copyQrResult() {
    const text = document.getElementById('result-text').innerText;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-result-btn');
        const span = btn.querySelector('span');
        const oldText = span.innerText;
        span.innerText = t('qrg_btn_copied');
        setTimeout(() => { span.innerText = oldText; }, 1500);
    }).catch(() => {});
}

function vibratePhone() {
    if (navigator.vibrate) navigator.vibrate(100);
}