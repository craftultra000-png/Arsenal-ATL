// ========================================================
// Arsenal — Image Editor
// كل التأثيرات تعمل على pixel data عبر Canvas API
// ========================================================

(function () {

// ── State ─────────────────────────────────────────────
const state = {
    originalImage: null,      // ImageData الأصلية
    currentImageData: null,   // ImageData الحالية (بعد التعديلات)
    originalFile: null,       // الملف الأصلي (للصيغة والاسم)
    originalMime: 'image/jpeg',
    originalExt: 'jpg',
    fileName: 'image',

    // قيم جميع الأدوات
    values: {
        brightness: 0, contrast: 0, exposure: 0,
        highlights: 0, shadows: 0, whites: 0, blacks: 0,
        saturation: 0, hue: 0, warmth: 0, vibrance: 0, fade: 0,
        sharpness: 0, clarity: 0, noise: 0, vignette: 0, denoise: 0,
    },

    activeTool: null,
    activeTab: 'adjust',

    // تصدير
    exportFmt: 'original',
    exportSize: 'original',
    customW: 0,
    customH: 0,

    // قص
    cropMode: false,
    cropRatio: 'free',
    cropRect: null,

    // undo stack
    history: [],
    MAX_HISTORY: 20,
};

// ── DOM refs ───────────────────────────────────────────
const canvas        = document.getElementById('ied-canvas');
const ctx           = canvas.getContext('2d', { willReadFrequently: true });
const cropCanvas    = document.getElementById('ied-crop-canvas');
const cropCtx       = cropCanvas.getContext('2d');
const fileInput     = document.getElementById('ied-file-input');
const uploadScreen  = document.getElementById('ied-upload-screen');
const editorScreen  = document.getElementById('ied-editor');
const sliderPanel   = document.getElementById('ied-slider-panel');
const cropPanel     = document.getElementById('ied-crop-panel');
const exportPanel   = document.getElementById('ied-export-panel');
const mainSlider    = document.getElementById('ied-main-slider');
const sliderName    = document.getElementById('ied-slider-name');
const sliderVal     = document.getElementById('ied-slider-val');
const customSizeDiv = document.getElementById('ied-custom-size');
const customW       = document.getElementById('ied-custom-w');
const customH       = document.getElementById('ied-custom-h');
const lockRatio     = document.getElementById('ied-lock-ratio');

// ── تحميل الملف ───────────────────────────────────────
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadImageFile(file);
});

document.getElementById('ied-drop-zone').addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.getElementById('ied-drop-zone').addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
});

function loadImageFile(file) {
    state.originalFile = file;
    state.originalMime = file.type || 'image/jpeg';
    state.fileName     = file.name.replace(/\.[^/.]+$/, '');
    state.originalExt  = file.name.split('.').pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            state.originalImage  = ctx.getImageData(0, 0, canvas.width, canvas.height);
            state.currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            state.history = [];
            resetAllValues();
            switchToEditor();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function switchToEditor() {
    uploadScreen.style.display = 'none';
    editorScreen.style.display = 'flex';
    fitCanvasToArea();
}

function fitCanvasToArea() {
    const area   = document.getElementById('ied-canvas-area');
    const maxW   = area.clientWidth;
    const maxH   = area.clientHeight;
    const ratio  = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
    canvas.style.width  = (canvas.width  * ratio) + 'px';
    canvas.style.height = (canvas.height * ratio) + 'px';
}

window.addEventListener('resize', fitCanvasToArea);

// ── Tabs ───────────────────────────────────────────────
document.querySelectorAll('.ied-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.ied-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTab = tab.dataset.tab;

        document.querySelectorAll('.ied-tools-group').forEach(g => g.style.display = 'none');
        const group = document.querySelector(`.ied-tools-group[data-group="${state.activeTab}"]`);
        if (group) group.style.display = 'flex';

        closeActiveTool();
    });
});

// ── أزرار الأدوات ─────────────────────────────────────
document.querySelectorAll('.ied-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (state.activeTool === tool) {
            closeActiveTool();
            return;
        }
        // إلغاء تفعيل القص والتصدير
        closeCropMode();
        hideExportPanel();

        // تفعيل الأداة
        document.querySelectorAll('.ied-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTool = tool;

        // إعداد السلايدر
        const min = parseInt(btn.dataset.min ?? -100);
        const max = parseInt(btn.dataset.max ?? 100);
        const langKey = btn.dataset.langLabel;
        const label   = (langKey && typeof t === 'function') ? t(langKey) : (btn.dataset.label || tool);
        mainSlider.min   = min;
        mainSlider.max   = max;
        mainSlider.value = state.values[tool] ?? 0;
        sliderName.textContent = label;
        sliderVal.textContent  = mainSlider.value;
        updateSliderTrack();

        showPanel('slider');
    });
});

// ── debounce + RAF للسلايدر ────────────────────────────
let renderScheduled = false;
let renderDebounce  = null;

function scheduleRender() {
    // RAF للاستجابة الفورية على التأثيرات الخفيفة
    if (!renderScheduled) {
        renderScheduled = true;
        requestAnimationFrame(() => {
            renderScheduled = false;
            renderImage();
        });
    }
}

// السلايدر الرئيسي ──────────────────────────────────────
mainSlider.addEventListener('input', () => {
    if (!state.activeTool) return;
    const val = parseInt(mainSlider.value);
    state.values[state.activeTool] = val;
    sliderVal.textContent = val;
    updateSliderTrack();
    markToolModified(state.activeTool);

    // التأثيرات الثقيلة (sharpness, clarity, denoise) تنتظر 80ms
    const heavyTools = ['sharpness', 'clarity', 'denoise'];
    if (heavyTools.includes(state.activeTool)) {
        clearTimeout(renderDebounce);
        renderDebounce = setTimeout(renderImage, 80);
    } else {
        scheduleRender();
    }
});

mainSlider.addEventListener('change', () => {
    pushHistory();
});

function updateSliderTrack() {
    const min  = parseInt(mainSlider.min);
    const max  = parseInt(mainSlider.max);
    const val  = parseInt(mainSlider.value);
    const pct  = ((val - min) / (max - min)) * 100;
    mainSlider.style.background =
        `linear-gradient(to right, var(--acc) 0%, var(--acc) ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.12) 100%)`;
}

function markToolModified(tool) {
    document.querySelectorAll('.ied-tool-btn').forEach(btn => {
        if (btn.dataset.tool === tool) {
            const isDefault = (state.values[tool] === parseInt(btn.dataset.default ?? 0));
            btn.classList.toggle('modified', !isDefault);
        }
    });
}

function closeActiveTool() {
    document.querySelectorAll('.ied-tool-btn').forEach(b => b.classList.remove('active'));
    state.activeTool = null;
    showPanel(null);
}

// ── إدارة اللوحات ─────────────────────────────────────
function showPanel(type) {
    sliderPanel.style.display  = type === 'slider' ? 'block' : 'none';
    cropPanel.style.display    = type === 'crop'   ? 'block' : 'none';
    exportPanel.style.display  = type === 'export' ? 'block' : 'none';
}

function hideExportPanel() {
    exportPanel.style.display = 'none';
    document.getElementById('ied-btn-export').classList.remove('active');
}

// ════════════════════════════════════════════════════════
// ── خوارزميات التأثيرات على البكسل ─────────────────────
// ════════════════════════════════════════════════════════

let isRendering = false;

function renderImage() {
    if (!state.originalImage) return;
    if (isRendering) return; // منع تكديس الـ renders
    isRendering = true;

    // نسخ من الأصل
    const src  = state.originalImage.data;
    const out  = new Uint8ClampedArray(src.length);
    const w    = state.originalImage.width;
    const h    = state.originalImage.height;
    const v    = state.values;

    for (let i = 0; i < src.length; i += 4) {
        let r = src[i], g = src[i+1], b = src[i+2], a = src[i+3];

        // 1. Brightness — يضيف قيمة ثابتة لكل قناة
        if (v.brightness !== 0) {
            const br = v.brightness * 2.55;
            r = clamp(r + br); g = clamp(g + br); b = clamp(b + br);
        }

        // 2. Contrast — يمد أو يضيق نطاق الألوان حول المنتصف
        if (v.contrast !== 0) {
            const factor = (259 * (v.contrast + 255)) / (255 * (259 - v.contrast));
            r = clamp(factor * (r - 128) + 128);
            g = clamp(factor * (g - 128) + 128);
            b = clamp(factor * (b - 128) + 128);
        }

        // 3. Exposure — يضرب القيم بمعامل أسي (stops)
        if (v.exposure !== 0) {
            const exp = Math.pow(2, v.exposure / 50);
            r = clamp(r * exp); g = clamp(g * exp); b = clamp(b * exp);
        }

        // تحويل لـ HSL للعمليات اللاحقة
        let [h2, s2, l2] = rgbToHsl(r, g, b);

        // 4. Highlights — يؤثر فقط على الأجزاء الفاتحة (L > 0.5)
        if (v.highlights !== 0) {
            const mask = Math.max(0, (l2 - 0.5) * 2);
            l2 = clamp01(l2 + (v.highlights / 100) * 0.4 * mask);
        }

        // 5. Shadows — يؤثر فقط على الأجزاء الغامقة (L < 0.5)
        if (v.shadows !== 0) {
            const mask = Math.max(0, (0.5 - l2) * 2);
            l2 = clamp01(l2 + (v.shadows / 100) * 0.4 * mask);
        }

        // 6. Whites — يرفع حد الأبيض (L > 0.75)
        if (v.whites !== 0) {
            const mask = Math.max(0, (l2 - 0.75) * 4);
            l2 = clamp01(l2 + (v.whites / 100) * 0.25 * mask);
        }

        // 7. Blacks — يخفض حد الأسود (L < 0.25)
        if (v.blacks !== 0) {
            const mask = Math.max(0, (0.25 - l2) * 4);
            l2 = clamp01(l2 - (v.blacks / 100) * 0.25 * mask);
        }

        // 8. Saturation — يغير تشبع اللون مباشرة
        if (v.saturation !== 0) {
            s2 = clamp01(s2 + v.saturation / 100);
        }

        // 9. Vibrance — تشبع ذكي يؤثر أكثر على الألوان الباهتة
        if (v.vibrance !== 0) {
            const boost = (v.vibrance / 100) * (1 - s2);
            s2 = clamp01(s2 + boost);
        }

        // 10. Hue — يدور درجة اللون
        if (v.hue !== 0) {
            h2 = (h2 + v.hue / 360 + 1) % 1;
        }

        // رجوع لـ RGB
        [r, g, b] = hslToRgb(h2, s2, l2);

        // 11. Warmth — يضيف دفئاً (أصفر/برتقالي) أو برودة (أزرق)
        if (v.warmth !== 0) {
            const w2 = v.warmth / 100;
            r = clamp(r + w2 * 30);
            g = clamp(g + w2 * 10);
            b = clamp(b - w2 * 30);
        }

        // 12. Fade — يرفع الحد الأدنى للقنوات (يضيف غشاوة)
        if (v.fade !== 0) {
            const fadeAmt = v.fade * 0.5;
            r = clamp(r + fadeAmt); g = clamp(g + fadeAmt); b = clamp(b + fadeAmt);
        }

        out[i]   = r;
        out[i+1] = g;
        out[i+2] = b;
        out[i+3] = a;
    }

    // 13. Sharpness — Unsharp Mask (يطبق على نسخة blur ثم يطرح)
    let finalData = new Uint8ClampedArray(out);
    if (v.sharpness > 0) {
        finalData = applySharpness(finalData, w, h, v.sharpness);
    }

    // 14. Clarity — Contrast محلي (mid-tone contrast)
    if (v.clarity !== 0) {
        finalData = applyClarity(finalData, w, h, v.clarity);
    }

    // 15. Noise — يضيف حبيبات عشوائية
    if (v.noise > 0) {
        finalData = applyNoise(finalData, v.noise);
    }

    // 16. Denoise — blur خفيف لإزالة الضوضاء
    if (v.denoise > 0) {
        finalData = applyDenoise(finalData, w, h, v.denoise);
    }

    // إنشاء ImageData وعرضه
    const imgData = new ImageData(finalData, w, h);

    // 17. Vignette — يطبق بعد عرض البكسلات كـ radial gradient
    canvas.width  = w;
    canvas.height = h;
    ctx.putImageData(imgData, 0, 0);

    if (v.vignette !== 0) {
        applyVignette(v.vignette);
    }

    state.currentImageData = ctx.getImageData(0, 0, w, h);
    fitCanvasToArea();
    isRendering = false;
}

// ── Sharpness (Unsharp Mask) ──────────────────────────
function applySharpness(data, w, h, amount) {
    const blurred = boxBlur(data, w, h, 1);
    const str     = amount / 100 * 1.5;
    const out     = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        out[i]   = clamp(data[i]   + str * (data[i]   - blurred[i]));
        out[i+1] = clamp(data[i+1] + str * (data[i+1] - blurred[i+1]));
        out[i+2] = clamp(data[i+2] + str * (data[i+2] - blurred[i+2]));
        out[i+3] = data[i+3];
    }
    return out;
}

// ── Clarity (mid-tone local contrast) ────────────────
function applyClarity(data, w, h, amount) {
    const blurred = boxBlur(data, w, h, 5);
    const str     = amount / 100 * 0.6;
    const out     = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const lum = 0.299*r + 0.587*g + 0.114*b;
        // يؤثر أكثر على mid-tones
        const midMask = 1 - Math.abs(lum/255 - 0.5) * 2;
        out[i]   = clamp(r + str * midMask * (r - blurred[i]));
        out[i+1] = clamp(g + str * midMask * (g - blurred[i+1]));
        out[i+2] = clamp(b + str * midMask * (b - blurred[i+2]));
        out[i+3] = data[i+3];
    }
    return out;
}

// ── Box Blur — سريع عبر OffscreenCanvas + CSS filter ──
function boxBlur(data, w, h, radius) {
    // نستخدم OffscreenCanvas وfilter blur — أسرع بكثير من nested loops
    const off = new OffscreenCanvas(w, h);
    const offCtx = off.getContext('2d');
    const imgData = new ImageData(new Uint8ClampedArray(data), w, h);
    offCtx.putImageData(imgData, 0, 0);
    
    // نسخة ثانية بالـ blur
    const off2 = new OffscreenCanvas(w, h);
    const off2Ctx = off2.getContext('2d');
    off2Ctx.filter = `blur(${radius * 2}px)`;
    off2Ctx.drawImage(off, 0, 0);
    off2Ctx.filter = 'none';
    
    return off2Ctx.getImageData(0, 0, w, h).data;
}

// ── Noise ─────────────────────────────────────────────
function applyNoise(data, amount) {
    const out = new Uint8ClampedArray(data);
    const str = amount * 0.8;
    for (let i = 0; i < out.length; i += 4) {
        const n = (Math.random() - 0.5) * str;
        out[i]   = clamp(out[i]   + n);
        out[i+1] = clamp(out[i+1] + n);
        out[i+2] = clamp(out[i+2] + n);
    }
    return out;
}

// ── Denoise (fast blur) ───────────────────────────────
function applyDenoise(data, w, h, amount) {
    const radius = Math.round(amount / 100 * 2);
    return radius > 0 ? boxBlur(data, w, h, radius) : data;
}

// ── Vignette (radial gradient على Canvas) ────────────
function applyVignette(amount) {
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2;
    const r  = Math.sqrt(cx*cx + cy*cy);
    const grad = ctx.createRadialGradient(cx, cy, r*0.3, cx, cy, r);
    if (amount > 0) {
        // تعتيم الحواف
        const strength = amount / 100 * 0.85;
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${strength})`);
    } else {
        // إضاءة الحواف (vignette سالب)
        const strength = Math.abs(amount) / 100 * 0.6;
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(255,255,255,${strength})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// ── مساعدات اللون ─────────────────────────────────────
function clamp(v)   { return Math.min(255, Math.max(0, Math.round(v))); }
function clamp01(v) { return Math.min(1, Math.max(0, v)); }

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h3, s3, l3 = (max+min)/2;
    if (max === min) { h3 = s3 = 0; }
    else {
        const d = max - min;
        s3 = l3 > 0.5 ? d/(2-max-min) : d/(max+min);
        switch(max) {
            case r: h3 = ((g-b)/d + (g<b?6:0))/6; break;
            case g: h3 = ((b-r)/d + 2)/6; break;
            default: h3 = ((r-g)/d + 4)/6;
        }
    }
    return [h3, s3, l3];
}

function hslToRgb(h3, s3, l3) {
    if (s3 === 0) { const v = clamp(l3*255); return [v,v,v]; }
    const q = l3 < 0.5 ? l3*(1+s3) : l3+s3-l3*s3;
    const p = 2*l3 - q;
    const hue2rgb = (p2,q2,t) => {
        if (t<0) t+=1; if (t>1) t-=1;
        if (t<1/6) return p2+(q2-p2)*6*t;
        if (t<1/2) return q2;
        if (t<2/3) return p2+(q2-p2)*(2/3-t)*6;
        return p2;
    };
    return [
        clamp(hue2rgb(p,q,h3+1/3)*255),
        clamp(hue2rgb(p,q,h3)*255),
        clamp(hue2rgb(p,q,h3-1/3)*255)
    ];
}

// ── History (Undo) ────────────────────────────────────
function pushHistory() {
    state.history.push({ ...state.values });
    if (state.history.length > state.MAX_HISTORY) state.history.shift();
}

document.getElementById('ied-btn-undo').addEventListener('click', () => {
    if (state.history.length === 0) return;
    Object.assign(state.values, state.history.pop());
    if (state.activeTool) {
        mainSlider.value = state.values[state.activeTool];
        sliderVal.textContent = mainSlider.value;
        updateSliderTrack();
    }
    document.querySelectorAll('.ied-tool-btn').forEach(btn => {
        markToolModified(btn.dataset.tool);
    });
    renderImage();
});

document.getElementById('ied-btn-reset').addEventListener('click', () => {
    if (!state.originalImage) return;
    pushHistory();
    resetAllValues();
    renderImage();
    document.querySelectorAll('.ied-tool-btn').forEach(btn => {
        btn.classList.remove('modified');
    });
    if (state.activeTool) {
        mainSlider.value = 0;
        sliderVal.textContent = '0';
        updateSliderTrack();
    }
});

function resetAllValues() {
    Object.keys(state.values).forEach(k => state.values[k] = 0);
}

// ── صورة جديدة ────────────────────────────────────────
document.getElementById('ied-btn-new').addEventListener('click', () => {
    state.originalImage = null;
    state.currentImageData = null;
    state.history = [];
    resetAllValues();
    closeActiveTool();
    closeCropMode();
    hideExportPanel();
    uploadScreen.style.display = 'flex';
    editorScreen.style.display = 'none';
    fileInput.value = '';
});

// ════════════════════════════════════════════════════════
// ── القص (Crop) ─────────────────────────────────────────
// ════════════════════════════════════════════════════════

let cropStart  = null;
let cropEnd    = null;
let isCropping = false;

document.getElementById('ied-btn-crop').addEventListener('click', () => {
    if (!state.originalImage) return;
    closeActiveTool();
    hideExportPanel();
    state.cropMode = true;
    document.getElementById('ied-btn-crop').classList.add('active');
    document.getElementById('ied-crop-overlay').style.display = 'flex';
    cropCanvas.width  = canvas.clientWidth;
    cropCanvas.height = canvas.clientHeight;
    showPanel('crop');
    drawCropGuide();
});

function closeCropMode() {
    state.cropMode = false;
    state.cropRect = null;
    document.getElementById('ied-btn-crop').classList.remove('active');
    document.getElementById('ied-crop-overlay').style.display = 'none';
    showPanel(null);
}

// أحداث لمس وماوس على cropCanvas
cropCanvas.addEventListener('pointerdown', (e) => {
    if (!state.cropMode) return;
    isCropping = true;
    cropCanvas.setPointerCapture(e.pointerId);
    const rect = cropCanvas.getBoundingClientRect();
    cropStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    cropEnd   = { ...cropStart };
});

cropCanvas.addEventListener('pointermove', (e) => {
    if (!isCropping) return;
    const rect = cropCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    // تأمين النسبة إذا اختار المستخدم نسبة محددة
    if (state.cropRatio !== 'free') {
        const [rw, rh] = state.cropRatio.split(':').map(Number);
        const dx = x - cropStart.x;
        const dy = y - cropStart.y;
        const targetDy = dx * (rh / rw);
        y = cropStart.y + (dy < 0 ? -Math.abs(targetDy) : Math.abs(targetDy));
    }
    cropEnd = { x, y };
    drawCropGuide();
});

cropCanvas.addEventListener('pointerup', () => { isCropping = false; });

function drawCropGuide() {
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    if (!cropStart || !cropEnd) return;

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w2 = Math.abs(cropEnd.x - cropStart.x);
    const h2 = Math.abs(cropEnd.y - cropStart.y);

    // تعتيم المناطق خارج الإطار
    cropCtx.fillStyle = 'rgba(0,0,0,0.5)';
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.clearRect(x, y, w2, h2);

    // إطار الاقتصاص
    cropCtx.strokeStyle = '#fff';
    cropCtx.lineWidth   = 2;
    cropCtx.strokeRect(x, y, w2, h2);

    // خطوط الثلث
    cropCtx.strokeStyle = 'rgba(255,255,255,0.4)';
    cropCtx.lineWidth   = 0.5;
    for (let i = 1; i < 3; i++) {
        cropCtx.beginPath();
        cropCtx.moveTo(x + w2*i/3, y);
        cropCtx.lineTo(x + w2*i/3, y+h2);
        cropCtx.moveTo(x, y + h2*i/3);
        cropCtx.lineTo(x+w2, y + h2*i/3);
        cropCtx.stroke();
    }

    state.cropRect = { x, y, w: w2, h: h2 };
}

document.getElementById('ied-crop-apply').addEventListener('click', () => {
    if (!state.cropRect || state.cropRect.w < 10 || state.cropRect.h < 10) {
        closeCropMode();
        return;
    }
    pushHistory();

    // تحويل إحداثيات الشاشة للـ canvas الفعلي
    const scaleX = canvas.width  / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    const cx = Math.round(state.cropRect.x * scaleX);
    const cy = Math.round(state.cropRect.y * scaleY);
    const cw = Math.round(state.cropRect.w * scaleX);
    const ch = Math.round(state.cropRect.h * scaleY);

    // قص الـ originalImage أيضاً حتى تبقى التعديلات نسبية
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width  = cw;
    tmpCanvas.height = ch;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.putImageData(state.originalImage, -cx, -cy);
    state.originalImage = tmpCtx.getImageData(0, 0, cw, ch);

    canvas.width  = cw;
    canvas.height = ch;
    renderImage();
    closeCropMode();
});

document.getElementById('ied-crop-cancel').addEventListener('click', closeCropMode);

// أزرار نسبة الاقتصاص
document.querySelectorAll('.ied-ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ied-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.cropRatio = btn.dataset.ratio;
        cropStart = null; cropEnd = null;
        drawCropGuide();
    });
});

// ════════════════════════════════════════════════════════
// ── التصدير ─────────────────────────────────────────────
// ════════════════════════════════════════════════════════

document.getElementById('ied-btn-export').addEventListener('click', () => {
    if (!state.originalImage) return;
    closeActiveTool();
    closeCropMode();
    const isOpen = exportPanel.style.display !== 'none';
    if (isOpen) { hideExportPanel(); return; }
    document.getElementById('ied-btn-export').classList.add('active');
    showPanel('export');
});

// اختيار الصيغة
document.querySelectorAll('.ied-fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ied-fmt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.exportFmt = btn.dataset.fmt;
    });
});

// اختيار الحجم
document.querySelectorAll('.ied-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ied-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.exportSize = btn.dataset.size;
        customSizeDiv.style.display = (state.exportSize === 'custom') ? 'flex' : 'none';
        if (state.exportSize === 'custom') {
            customW.value = canvas.width;
            customH.value = canvas.height;
        }
    });
});

// تأمين النسبة عند الأبعاد المخصصة
customW.addEventListener('input', () => {
    if (!lockRatio.checked) return;
    const ratio = canvas.height / canvas.width;
    customH.value = Math.round(parseInt(customW.value || 1) * ratio);
});

customH.addEventListener('input', () => {
    if (!lockRatio.checked) return;
    const ratio = canvas.width / canvas.height;
    customW.value = Math.round(parseInt(customH.value || 1) * ratio);
});

// زر الحفظ
document.getElementById('ied-export-btn').addEventListener('click', () => {
    exportImage();
});

function exportImage() {
    const exportCanvas = document.createElement('canvas');
    const exportCtx    = exportCanvas.getContext('2d');

    // حساب الأبعاد النهائية
    let targetW = canvas.width;
    let targetH = canvas.height;

    if (state.exportSize === 'custom') {
        targetW = parseInt(customW.value) || canvas.width;
        targetH = parseInt(customH.value) || canvas.height;
    } else if (state.exportSize !== 'original') {
        const maxDim = parseInt(state.exportSize);
        const scale  = Math.min(maxDim / canvas.width, maxDim / canvas.height, 1);
        targetW = Math.round(canvas.width  * scale);
        targetH = Math.round(canvas.height * scale);
    }

    exportCanvas.width  = targetW;
    exportCanvas.height = targetH;
    exportCtx.drawImage(canvas, 0, 0, targetW, targetH);

    // الصيغة
    const fmt  = state.exportFmt === 'original' ? state.originalMime : state.exportFmt;
    const ext  = fmt === 'image/png'  ? 'png'
               : fmt === 'image/webp' ? 'webp'
               : fmt === 'image/jpeg' ? 'jpg'
               : state.originalExt;
    const quality = fmt === 'image/jpeg' ? 0.95 : fmt === 'image/webp' ? 0.92 : undefined;

    const dataURL = exportCanvas.toDataURL(fmt, quality);
    const a = document.createElement('a');
    a.href     = dataURL;
    a.download = `${state.fileName}_edited.${ext}`;
    a.click();
}

// ── تهيئة أولية ───────────────────────────────────────
renderImage();

})();
