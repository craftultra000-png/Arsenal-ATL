// ==========================================
// Arsenal — محرر الخلفية الشفاف
// ==========================================

window.addEventListener('load', () => {

const imageInput    = document.getElementById('imageInput');
const editorZone    = document.getElementById('editorZone');
const canvas        = document.getElementById('editorCanvas');
const ctx           = canvas.getContext('2d');
const downloadWrap  = document.getElementById('downloadWrap');
const zoomOverlay   = document.getElementById('zoomOverlay');
const zoomCanvas    = document.getElementById('zoomCanvas');
const zoomCtx       = zoomCanvas.getContext('2d');
const brushSlider   = document.getElementById('brushSlider');
const brushVal      = document.getElementById('brushVal');
const aiBtnText     = document.getElementById('aiBtnText');
const aiBgRemoveBtn = document.getElementById('aiBgRemoveBtn');

document.getElementById('upload-box').addEventListener('click', () => imageInput.click());

let originalCanvas = document.createElement('canvas');
let originalCtx    = originalCanvas.getContext('2d');
let originalImg    = new Image();
let currentMode    = 'erase';
let isDrawing      = false;
let lastX = 0, lastY = 0;
let originalFileName = 'Arsenal_Transparent';

// ── 1. تحميل الصورة ──────────────────────────────────────
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    originalFileName = file.name.replace(/\.[^/.]+$/, '');

    const uploadText = document.getElementById('uploadText');
    uploadText.innerText = file.name;
    uploadText.style.color = 'var(--acc2)';
    document.getElementById('upload-box').style.borderColor = 'var(--acc2)';

    const reader = new FileReader();
    reader.onload = (ev) => {
        originalImg.src = ev.target.result;
        originalImg.onload = () => {
            canvas.width = originalCanvas.width = originalImg.width;
            canvas.height = originalCanvas.height = originalImg.height;
            originalCtx.drawImage(originalImg, 0, 0);
            ctx.drawImage(originalImg, 0, 0);
            editorZone.style.display = 'block';
            downloadWrap.style.display = 'block';
            setMode('erase');
        };
    };
    reader.readAsDataURL(file);
});

// ── 2. أوضاع الأداة ──────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    document.getElementById('eraseModeBtn').classList.toggle('active', mode === 'erase');
    document.getElementById('restoreModeBtn').classList.toggle('active', mode === 'restore');
}

document.getElementById('eraseModeBtn').addEventListener('click', () => setMode('erase'));
document.getElementById('restoreModeBtn').addEventListener('click', () => setMode('restore'));

// ── 3. شريط الفرشاة ──────────────────────────────────────
brushSlider.addEventListener('input', () => {
    brushVal.innerText = brushSlider.value + 'px';
    const pct = ((brushSlider.value - 5) / 145) * 100;
    brushSlider.style.background =
        `linear-gradient(to right, var(--acc2) 0%, var(--acc2) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`;
});

// ── 4. إحداثيات اللمس/الماوس ─────────────────────────────
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top)  * (canvas.height / rect.height),
        clientX, clientY, rect
    };
}

// ── 5. العدسة الديناميكية ────────────────────────────────
// تنتقل للجهة المعاكسة حتى لا تحجب منطقة العمل
function updateZoom(pos) {
    zoomOverlay.style.display = 'block';
    zoomCtx.clearRect(0, 0, 120, 120);
    zoomCtx.fillStyle = '#1a1d29';
    zoomCtx.fillRect(0, 0, 120, 120);

    const sourceSize = 60;
    zoomCtx.drawImage(canvas,
        pos.x - sourceSize/2, pos.y - sourceSize/2, sourceSize, sourceSize,
        0, 0, 120, 120
    );

    // خط استهداف
    zoomCtx.strokeStyle = 'var(--acc2)';
    zoomCtx.lineWidth = 1.5;
    zoomCtx.beginPath();
    zoomCtx.moveTo(60, 44); zoomCtx.lineTo(60, 76);
    zoomCtx.moveTo(44, 60); zoomCtx.lineTo(76, 60);
    zoomCtx.stroke();

    // تحديد موضع العدسة ديناميكياً
    const rect      = pos.rect;
    const relX      = pos.clientX - rect.left;
    const relY      = pos.clientY - rect.top;
    const midX      = rect.width  / 2;
    const midY      = rect.height / 2;
    const margin    = 12;
    const zoomSize  = 130;

    // إذا الإصبع في النصف الأيمن → عدسة لليسار، والعكس
    if (relX > midX) {
        zoomOverlay.style.right  = 'auto';
        zoomOverlay.style.left   = margin + 'px';
    } else {
        zoomOverlay.style.left   = 'auto';
        zoomOverlay.style.right  = margin + 'px';
    }
    // إذا الإصبع في النصف السفلي → عدسة لفوق، والعكس
    if (relY > midY) {
        zoomOverlay.style.bottom = 'auto';
        zoomOverlay.style.top    = margin + 'px';
    } else {
        zoomOverlay.style.top    = 'auto';
        zoomOverlay.style.bottom = margin + 'px';
    }
}

// ── 6. محرك الرسم المحسّن + Undo/Redo ───────────────────

// تاريخ العمليات — 5 خطوات للخلف وللأمام
const MAX_HISTORY = 5;
let undoStack = [];  // snapshots السابقة
let redoStack = [];  // snapshots المستقبلية

// حفظ snapshot — يُستدعى عند بداية كل stroke
function saveSnapshot() {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.length > MAX_HISTORY) undoStack.shift(); // احذف الأقدم
    redoStack = []; // أي stroke جديد يمسح الـ redo
    updateUndoRedoBtns();
}

function undo() {
    if (!undoStack.length) return;
    redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (redoStack.length > MAX_HISTORY) redoStack.shift();
    ctx.putImageData(undoStack.pop(), 0, 0);
    updateUndoRedoBtns();
}

function redo() {
    if (!redoStack.length) return;
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    ctx.putImageData(redoStack.pop(), 0, 0);
    updateUndoRedoBtns();
}

function updateUndoRedoBtns() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

function startDrawing(e) {
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x; lastY = pos.y;
    saveSnapshot(); // نحفظ قبل أي تعديل
    handleDraw(e);
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    handleDraw(e);
}

function stopDrawing() {
    isDrawing = false;
    zoomOverlay.style.display = 'none';
}

function handleDraw(e) {
    const pos   = getPos(e);
    const brush = parseInt(brushSlider.value);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    ctx.lineWidth = brush;

    if (currentMode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    } else {
        // الاسترجاع — نفس أسلوب الإصدار القديم: نقسّم المسار لخطوات صغيرة
        // ونرسم من originalCanvas مباشرة بدون أي stroke/fillStyle
        ctx.globalCompositeOperation = 'source-over';
        const dx = pos.x - lastX;
        const dy = pos.y - lastY;
        const steps = 15;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const currX = lastX + dx * t;
            const currY = lastY + dy * t;
            ctx.drawImage(originalCanvas,
                currX - brush / 2, currY - brush / 2, brush, brush,
                currX - brush / 2, currY - brush / 2, brush, brush);
        }
    }

    ctx.restore();
    lastX = pos.x;
    lastY = pos.y;
    updateZoom(pos);
}

// Listeners
canvas.addEventListener('mousedown',  startDrawing);
canvas.addEventListener('mousemove',  draw);
window.addEventListener('mouseup',    stopDrawing);
canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove',  draw,         { passive: false });
window.addEventListener('touchend',   stopDrawing);

// ── 7. زر AI — إزالة الخلفية عبر Web Worker ──────────────
// كل العمليات الثقيلة (ORT + model + preprocess + run)
// تشتغل على thread منفصل — الـ UI يبقى متجاوباً كلياً

let aiWorker   = null;   // الـ worker instance
let workerReady = false; // صار init بنجاح

// نجيب مسارات الملفات من الـ script tags المحملة مسبقاً
function getAIPaths() {
    // نبني المسار من lang.js أو transformers script
    let base;
    const trScript = [...document.querySelectorAll('script[type="module"][data-url]')]
        .find(s => s.dataset.url && s.dataset.url.includes('transformers'));
    if (trScript) {
        base = trScript.dataset.url.replace('transformers.min.js', '');
    } else {
        const langScript = [...document.querySelectorAll('script[src]')]
            .find(s => s.src && s.src.includes('lang.js'));
        if (!langScript) return null;
        base = langScript.src.replace('lang.js', '');
    }

    return {
        ortUrl:        base + 'ort.min.js',
        modelBasePath: base,
        wasmBasePath:  base,
    };
}

// نجيب مسار الـ worker من الـ script tags
function getWorkerUrl() {
    const s = [...document.querySelectorAll('script[src]')]
        .find(s => s.src && s.src.includes('image_remover_worker.js'));
    return s ? s.src : null;
}

// تطبيق الـ mask على الـ canvas — يبقى على الـ main thread لأنه يحتاج DOM
function applyMask(maskBuffer, W, H) {
    const maskData = new Float32Array(maskBuffer);
    const imgData  = ctx.getImageData(0, 0, W, H);
    const pixels   = imgData.data;
    const size     = 1024;
    const scaleX   = size / W;
    const scaleY   = size / H;

    for (let i = 0; i < W * H; i++) {
        const mx  = Math.min(size - 1, Math.round((i % W) * scaleX));
        const my  = Math.min(size - 1, Math.round(Math.floor(i / W) * scaleY));
        const val = maskData[my * size + mx];
        pixels[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, val)) * 255);
    }
    ctx.putImageData(imgData, 0, 0);
}

aiBgRemoveBtn.addEventListener('click', () => {
    if (!originalImg.src) return;

    aiBgRemoveBtn.disabled = true;
    aiBtnText.innerText = 'جاري التحضير...';

    const paths = getAIPaths();
    if (!paths) {
        aiBtnText.innerText = 'خطأ: مسار ORT غير موجود';
        setTimeout(() => { aiBtnText.innerText = 'إزالة AI'; }, 3000);
        aiBgRemoveBtn.disabled = false;
        return;
    }

    const workerUrl = getWorkerUrl();
    if (!workerUrl) {
        aiBtnText.innerText = 'خطأ: worker غير موجود';
        setTimeout(() => { aiBtnText.innerText = 'إزالة AI'; }, 3000);
        aiBgRemoveBtn.disabled = false;
        return;
    }

    // ننشئ worker جديد لكل عملية — يضمن clean state
    if (aiWorker) { aiWorker.terminate(); aiWorker = null; }
    aiWorker = new Worker(workerUrl);

    aiWorker.onmessage = (e) => {
        const { type, text, maskBuffer, message } = e.data;

        if (type === 'progress') {
            aiBtnText.innerText = text;
        }

        if (type === 'ready') {
            aiBtnText.innerText = 'جاري التجهيز...';
            
            const MAX = 1024;
            let W = originalCanvas.width;
            let H = originalCanvas.height;
            
            if (W > MAX || H > MAX) {
                const scale = Math.min(MAX / W, MAX / H);
                W = Math.round(W * scale);
                H = Math.round(H * scale);
            }
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = W;
            tempCanvas.height = H;
            tempCanvas.getContext('2d').drawImage(originalCanvas, 0, 0, W, H);
            
            const imageData = tempCanvas.getContext('2d').getImageData(0, 0, W, H);
            const dataCopy  = imageData.data.buffer.slice(0);
            
            aiWorker.postMessage(
                { type: 'run', payload: { data: dataCopy, width: W, height: H } },
                [dataCopy]
            );
        }

        if (type === 'done') {
            // الـ worker أنهى — نطبق الـ mask على الـ canvas
            applyMask(maskBuffer, canvas.width, canvas.height);
            aiBtnText.innerText = 'إزالة AI ✓';
            setTimeout(() => { aiBtnText.innerText = 'إزالة AI'; }, 2500);
            aiBgRemoveBtn.disabled = false;
            aiWorker.terminate();
            aiWorker = null;
        }

        if (type === 'error') {
            console.error('AI Worker Error:', message);
            aiBtnText.innerText = 'فشل: ' + (message?.slice(0, 35) || 'خطأ');
            setTimeout(() => { aiBtnText.innerText = 'إزالة AI'; }, 4000);
            aiBgRemoveBtn.disabled = false;
            aiWorker.terminate();
            aiWorker = null;
        }
    };

    aiWorker.onerror = (err) => {
        console.error('Worker error:', err);
        aiBtnText.innerText = 'فشل: ' + (err.message?.slice(0, 35) || 'خطأ');
        setTimeout(() => { aiBtnText.innerText = 'إزالة AI'; }, 4000);
        aiBgRemoveBtn.disabled = false;
        aiWorker = null;
    };

    // نبدأ بـ init — نمرر كل المسارات للـ worker
    aiWorker.postMessage({ type: 'init', payload: paths });
});

// ── 8. التحميل ───────────────────────────────────────────
document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `${originalFileName}_transparent.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

}); // end load
