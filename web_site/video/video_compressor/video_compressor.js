// ==========================================
// VIDEO COMPRESSOR V2 — Multi-Thread FFmpeg
// يعتمد على ffmpeg-core-mt (multi-thread) المحمّل من toolLoader
// ==========================================

function getFfmpegPaths() {
    const scripts   = [...document.querySelectorAll('script[src]')];
    const vcmScript = scripts.find(s => s.src.includes('video_compressor.js'));
    if (!vcmScript) return null;
    const base = vcmScript.src.replace('video/video_compressor/video_compressor.js', 'core/core_app/core_ffmpeg/');
    return {
        base,
        coreURL:   base + 'ffmpeg-core.js',
        wasmURL:   base + 'https://raw.githubusercontent.com/craftultra000-png/Arsenal-ATL/refs/heads/cdn/ffmpeg-core.wasm',
        workerURL: base + 'ffmpeg-core.worker.js',
    };
}

function getOptimalThreads(userChoice) {
    const logical = navigator.hardwareConcurrency || 2;
    // WASM يحتاج thread للـ main — نترك نواة واحدة دائماً للنظام
    const maxSafe = Math.max(1, logical - 1);
    if (userChoice === 'auto')  return Math.max(1, Math.floor(logical / 2));
    if (userChoice === 'max-2') return Math.max(1, logical - 2);
    const n = parseInt(userChoice);
    return Math.min(n, maxSafe);
}

function getSmartPreset(userPreset, width, height) {
    if (userPreset !== 'auto') return userPreset;
    const pixels = width * height;
    if (pixels >= 1920 * 1080) return 'fast';
    if (pixels >= 1280 * 720)  return 'medium';
    return 'slow';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + s[i];
}

async function fetchFileFallback(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(new Uint8Array(reader.result));
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsArrayBuffer(file);
    });
}

let ffmpegInstance = null;
let currentFile    = null;
let outputBlob     = null;

const uploadBox    = document.getElementById('vcm-upload-box');
const fileInput    = document.getElementById('vcm-file-input');
const uploadText   = document.getElementById('vcm-upload-text');
const fileMeta     = document.getElementById('vcm-file-meta');
const startBtn     = document.getElementById('vcm-start-btn');
const downloadBtn  = document.getElementById('vcm-download-btn');
const statusWrap   = document.getElementById('vcm-status-wrap');
const downloadWrap = document.getElementById('vcm-download-wrap');
const statusText   = document.getElementById('vcm-status-text');
const pctText      = document.getElementById('vcm-pct-text');
const progressBar  = document.getElementById('vcm-progress-bar');
const statsRow     = document.getElementById('vcm-stats-row');
const sizeOrig     = document.getElementById('vcm-size-orig');
const sizeNew      = document.getElementById('vcm-size-new');
const sizePct      = document.getElementById('vcm-size-pct');
const loadingText  = document.getElementById('vcm-loading-text');
const waitingText  = document.getElementById('vcm-waiting-text');

function initDropdowns() {
    if (typeof ArsenalDropdown !== 'function') return;

    new ArsenalDropdown({
        containerId:  'vcm-resolution-dd',
        inputId:      'vcm-resolution',
        accentVar:    '--acc',
        defaultValue: 'original',
        options: [
            { value: 'original', label: t('vcm_res_original'),  desc: t('vcm_res_original_desc') },
            { value: '1080',     label: '1080p',                desc: 'Full HD — 1920×1080' },
            { value: '720',      label: '720p',                 desc: 'HD — 1280×720' },
            { value: '480',      label: '480p',                 desc: 'SD — 854×480' },
            { value: '360',      label: '360p',                 desc: 'Low — 640×360' },
        ]
    });

    new ArsenalDropdown({
        containerId:  'vcm-crf-dd',
        inputId:      'vcm-crf',
        accentVar:    '--acc2',
        defaultValue: '28',
        options: [
            { value: '18', label: t('vcm_crf_18_name'), desc: t('vcm_crf_18_desc') },
            { value: '23', label: t('vcm_crf_23_name'), desc: t('vcm_crf_23_desc') },
            { value: '28', label: t('vcm_crf_28_name'), desc: t('vcm_crf_28_desc') },
            { value: '33', label: t('vcm_crf_33_name'), desc: t('vcm_crf_33_desc') },
            { value: '38', label: t('vcm_crf_38_name'), desc: t('vcm_crf_38_desc') },
        ]
    });

    new ArsenalDropdown({
        containerId:  'vcm-preset-dd',
        inputId:      'vcm-preset',
        accentVar:    '--acc',
        defaultValue: 'fast',
        options: [
            { value: 'ultrafast', label: 'Ultrafast', desc: t('vcm_preset_ultrafast_desc') },
            { value: 'superfast', label: 'Superfast', desc: t('vcm_preset_superfast_desc') },
            { value: 'veryfast',  label: 'Very Fast', desc: t('vcm_preset_veryfast_desc') },
            { value: 'fast',      label: 'Fast',   desc: t('vcm_preset_fast_desc') },
            { value: 'medium',    label: 'Medium',    desc: t('vcm_preset_medium_desc') },
            { value: 'slow',      label: 'Slow',      desc: t('vcm_preset_slow_desc') },
            { value: 'veryslow',  label: 'Very Slow', desc: t('vcm_preset_veryslow_desc') },
            { value: 'auto',      label: 'Auto',   desc: t('vcm_preset_auto_desc') },
        ]
    });

    const logical = navigator.hardwareConcurrency || 2;
    new ArsenalDropdown({
        containerId:  'vcm-threads-dd',
        inputId:      'vcm-threads',
        accentVar:    '--acc',
        defaultValue: 'auto',
        options: [
            { value: 'auto',  label: `Auto (${getOptimalThreads('auto')})`,    desc: t('vcm_threads_auto_desc') },
            { value: '2',     label: '2 ' + t('vcm_threads_unit'),             desc: t('vcm_threads_2_desc') },
            { value: '4',     label: '4 ' + t('vcm_threads_unit'),             desc: t('vcm_threads_4_desc') },
            { value: '6',     label: '6 ' + t('vcm_threads_unit'),             desc: t('vcm_threads_6_desc') },
            { value: '8',     label: '8 ' + t('vcm_threads_unit'),             desc: t('vcm_threads_8_desc') },
            { value: 'max', label: `MAX (${Math.max(1, logical - 2)})`,    desc: t('vcm_threads_max2_desc') },
        ].filter(o => { const n = parseInt(o.value); return isNaN(n) || n <= logical; })
    });
}

uploadBox.addEventListener('click', () => {
    if (!currentFile) {
        uploadText.style.display  = 'none';
        waitingText.style.display = 'inline';
    }
    fileInput.click();
});

// عند إغلاق الـ file picker بدون اختيار — نرجع النص الأصلي
fileInput.addEventListener('cancel', () => {
    waitingText.style.display = 'none';
    uploadText.style.display  = 'inline';
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.classList.add('drag-active'); });
uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('drag-active'));
uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-active');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) handleFile(f);
});

function handleFile(file) {
    if (!file) return;

    // أظهر حالة التحميل فوراً بدون أي تأخير
    uploadBox.classList.remove('has-file');
    uploadBox.classList.add('loading');
    uploadText.style.display   = 'none';
    waitingText.style.display  = 'none';
    loadingText.style.display  = 'inline';
    fileMeta.style.display     = 'none';
    startBtn.disabled          = true;
    downloadWrap.style.display = 'none';
    statusWrap.style.display   = 'none';
    statsRow.style.display     = 'none';
    progressBar.style.width    = '0%';
    pctText.textContent        = '0%';

    // نعطي المتصفح frame واحد فقط يرسم فيه النص، ثم نكمل
    requestAnimationFrame(() => {
        currentFile = file;
        outputBlob  = null;
        uploadBox.classList.remove('loading');
        uploadBox.classList.add('has-file');
        loadingText.style.display  = 'none';
        uploadText.style.display   = 'inline';
        uploadText.textContent     = file.name;
        fileMeta.style.display     = 'inline';
        fileMeta.textContent       = formatBytes(file.size);
        startBtn.disabled          = false;
    });
}

function setStatus(msg, pct = null) {
    statusText.textContent = msg;
    if (pct !== null) {
        const p = Math.min(100, Math.max(0, Math.round(pct)));
        progressBar.style.width = p + '%';
        pctText.textContent     = p + '%';
    }
}

startBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    const paths = getFfmpegPaths();
    if (!paths) { setStatus(t('vcm_err_no_ffmpeg')); statusWrap.style.display = 'block'; return; }

    startBtn.disabled          = true;
    statusWrap.style.display   = 'block';
    downloadWrap.style.display = 'none';
    statsRow.style.display     = 'none';
    outputBlob = null;

    try {
        if (!ffmpegInstance) {
            setStatus(t('vcm_status_loading_ffmpeg'), 5);
            const FFmpegLib = window.FFmpegWASM;
            if (!FFmpegLib?.FFmpeg) throw new Error(t('vcm_err_no_ffmpeg'));
            ffmpegInstance = new FFmpegLib.FFmpeg();
            ffmpegInstance.on('progress', ({ progress }) => {
                const pct = Math.round(progress * 100);
                setStatus(t('vcm_status_processing', { pct }), 10 + pct * 0.85);
            });
            ffmpegInstance.on('log', ({ message }) => {
                if (message.includes('error') || message.includes('Error')) console.error('[FFmpeg]', message);
            });
            setStatus(t('vcm_status_loading_core'), 8);
            await ffmpegInstance.load({ coreURL: paths.coreURL, wasmURL: paths.wasmURL, workerURL: paths.workerURL });
        }

        const ffmpeg  = ffmpegInstance;
        const inName  = 'input_'  + Date.now() + '.' + (currentFile.name.split('.').pop() || 'mp4');
        const outName = 'output_' + Date.now() + '.mp4';

        setStatus(t('vcm_status_reading'), 10);
        await ffmpeg.writeFile(inName, await fetchFileFallback(currentFile));

        const threads    = getOptimalThreads(document.getElementById('vcm-threads').value);
        const resolution = document.getElementById('vcm-resolution').value;
        const presetVal  = document.getElementById('vcm-preset').value;
        const crfVal     = document.getElementById('vcm-crf').value;

        let vidW = 1920, vidH = 1080;
        try {
            const url = URL.createObjectURL(currentFile);
            const vidEl = document.createElement('video');
            await new Promise(r => { vidEl.onloadedmetadata = r; vidEl.src = url; vidEl.load(); setTimeout(r, 2000); });
            vidW = vidEl.videoWidth  || 1920;
            vidH = vidEl.videoHeight || 1080;
            URL.revokeObjectURL(url);
        } catch (_) {}

        const preset = getSmartPreset(presetVal, vidW, vidH);
        const ffmpegCmd = ['-i', inName, '-threads', String(threads)];
        if (resolution !== 'original') ffmpegCmd.push('-vf', `scale=-2:${parseInt(resolution)}`);
        ffmpegCmd.push('-c:v', 'libx264', '-preset', preset, '-crf', crfVal, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', outName);

        setStatus(t('vcm_status_processing', { pct: 0 }), 12);
        await ffmpeg.exec(ffmpegCmd);

        setStatus(t('vcm_status_saving'), 97);
        const data = await ffmpeg.readFile(outName);
        outputBlob = new Blob([data.buffer], { type: 'video/mp4' });

        try { await ffmpeg.deleteFile(inName); await ffmpeg.deleteFile(outName); } catch (_) {}

        const savedBytes = currentFile.size - outputBlob.size;
        const savedPct   = ((savedBytes / currentFile.size) * 100).toFixed(1);
        sizeOrig.textContent   = formatBytes(currentFile.size);
        sizeNew.textContent    = formatBytes(outputBlob.size);
        sizePct.textContent    = savedBytes >= 0
            ? savedPct + '% ' + t('vcm_stat_saved_suffix')
            : t('vcm_stat_no_saving') || 'الملف الأصلي أصغر حجماً';
        statsRow.style.display = 'grid';

        setStatus(t('vcm_status_done'), 100);
        downloadWrap.style.display = 'block';

    } catch (err) {
        console.error('[VCM]', err);
        setStatus(t('vcm_err_failed') + ': ' + (err.message?.slice(0, 60) || ''));
        progressBar.style.width = '0%';
        pctText.textContent     = '';
    } finally {
        startBtn.disabled = false;
    }
});

downloadBtn.addEventListener('click', () => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'Arsenal_' + (currentFile?.name.replace(/\.[^.]+$/, '') || 'video') + '.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
});

function waitForTranslations(callback, tries = 0) {
    if (window.arsenalTranslations && Object.keys(window.arsenalTranslations).length > 0) {
        callback();
    } else if (tries < 50) {
        setTimeout(() => waitForTranslations(callback, tries + 1), 100);
    } else {
        callback(); // تجاوز المهلة وشغّل بدون ترجمات
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForTranslations(initDropdowns));
} else {
    waitForTranslations(initDropdowns);
}