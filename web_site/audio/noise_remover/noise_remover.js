// ============================================================
//  Noise Remover — UI Controller
//  نمط Arsenal: Worker URL من script[src]
// ============================================================

const SR = 48000;
let worker       = null;
let enhancedBlob = null;
let cleanSamples = null;
let podcastEnabled = false;

// ── DOM refs ─────────────────────────────────────────────────
const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const dropText        = document.getElementById('dropText');
const statusArea      = document.getElementById('statusArea');
const fileMeta        = document.getElementById('fileMeta');
const progressWrap    = document.getElementById('progressWrap');
const progressLabel   = document.getElementById('progressLabel');
const barFill         = document.getElementById('barFill');
const pstepModel      = document.getElementById('pstep-model');
const pstepInfer      = document.getElementById('pstep-infer');
const pstepEncode     = document.getElementById('pstep-encode');
const players         = document.getElementById('players');
const audioOrig       = document.getElementById('audioOrig');
const audioClean      = document.getElementById('audioClean');
const actionRow       = document.getElementById('actionRow');
const downloadBtn     = document.getElementById('downloadBtn');
const resetBtn        = document.getElementById('resetBtn');
const podcastControls = document.getElementById('podcastControls');
const podcastToggle   = document.getElementById('podcastToggle');
const modelSection    = document.getElementById('modelSection');
const modelBar        = document.getElementById('modelBar');
const modelPct        = document.getElementById('modelPct');

// ── Worker URL من script[src] — نمط Arsenal ─────────────────
function getWorkerUrl() {
    const s = [...document.querySelectorAll('script[src]')]
        .find(s => s.src && s.src.includes('noise_remover_worker.js'));
    return s ? s.src : 'noise_remover_worker.js';
}

function getOrtUrl() {
    const s = [...document.querySelectorAll('script[src]')]
        .find(s => s.src && s.src.includes('ort.min.js'));
    return s ? s.src : null;
}

// ── Step Helpers ─────────────────────────────────────────────
function setStep(stepEl) {
    [pstepModel, pstepInfer, pstepEncode].forEach(s =>
        s.classList.remove('active', 'done'));
    const steps = [pstepModel, pstepInfer, pstepEncode];
    const idx = steps.indexOf(stepEl);
    steps.forEach((s, i) => {
        if (i < idx) s.classList.add('done');
        else if (i === idx) s.classList.add('active');
    });
}

function updateUIProgress(pct, label) {
    requestAnimationFrame(() => {
        barFill.style.width = pct + '%';
        progressLabel.textContent = label;
        if (pct < 20)      setStep(pstepModel);
        else if (pct < 90) setStep(pstepInfer);
        else               setStep(pstepEncode);
    });
}

// ── تهيئة الـ Worker ─────────────────────────────────────────
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker(getWorkerUrl());

    worker.onmessage = ({ data: e }) => {
        switch (e.type) {
            case 'init-ok':
                modelSection.hidden = true;
                dropZone.style.pointerEvents = 'auto';
                dropZone.style.opacity = '1';
                break;
            case 'progress':
                updateUIProgress(e.data.pct, e.data.label);
                break;
            case 'done':
                handleProcessDone(e.data);
                break;
            case 'error':
                modelSection.hidden = true;
                alert('خطأ: ' + e.data);
                progressWrap.hidden = true;
                break;
        }
    };
}

// ── تحميل النموذج من HuggingFace ────────────────────────────
const MODEL_URL = 'https://huggingface.co/datasets/Silvr0098/arsenal-cdn/resolve/main/dpdfnet8_48khz_hr.onnx';

async function loadModel() {
    // تعطيل منطقة الرفع حتى يكتمل التحميل
    dropZone.style.pointerEvents = 'none';
    dropZone.style.opacity       = '0.5';
    modelSection.hidden          = false;

    try {
        // تحميل مع تتبع التقدم
        const response = await fetch(MODEL_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength) : 0;
        const reader = response.body.getReader();
        let received = 0;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (total > 0) {
                const pct = Math.round((received / total) * 100);
                modelBar.style.width = pct + '%';
                modelPct.textContent = pct + '%';
            }
        }

        // دمج الـ chunks
        const onnxBytes = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
            onnxBytes.set(chunk, offset);
            offset += chunk.length;
        }

        // إرسال للـ Worker
        const ortUrl = getOrtUrl();
        worker.postMessage(
            { type: 'init', data: { onnxBytes: onnxBytes.buffer, ortUrl } },
            [onnxBytes.buffer]
        );

    } catch (err) {
        modelSection.hidden = true;
        dropZone.style.pointerEvents = 'auto';
        dropZone.style.opacity = '1';
        console.error('[NoiseRemover] فشل تحميل النموذج:', err.message);
    }
}

// ── معالجة الملف الصوتي ──────────────────────────────────────
async function processAudioFile(file) {
    if (!worker) return;

    dropText.textContent = file.name;
    statusArea.hidden    = false;
    fileMeta.textContent = `📁 ${file.name} — ${(file.size / 1024).toFixed(1)} كيلوبايت`;
    progressWrap.hidden  = false;
    players.hidden       = true;
    actionRow.hidden     = true;
    podcastControls.hidden = true;
    updateUIProgress(0, 'بدء معالجة الملف...');

    setTimeout(async () => {
        try {
            const arrayBuf = await file.arrayBuffer();
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
            const decoded  = await audioCtx.decodeAudioData(arrayBuf);

            let audio = decoded.getChannelData(0);
            if (decoded.numberOfChannels > 1) {
                const ch1  = decoded.getChannelData(1);
                const mono = new Float32Array(audio.length);
                for (let i = 0; i < audio.length; i++) mono[i] = (audio[i] + ch1[i]) * 0.5;
                audio = mono;
            }

            const origBlob = await encodeWav(audio, SR);
            audioOrig.src  = URL.createObjectURL(origBlob);

            updateUIProgress(10, 'جاري إرسال البيانات للمعالج...');
            worker.postMessage({ type: 'process', data: audio }, [audio.buffer]);

        } catch (err) {
            alert('خطأ في قراءة الملف: ' + err.message);
            progressWrap.hidden = true;
        }
    }, 50);
}

async function handleProcessDone(enhanced) {
    setStep(pstepEncode);
    updateUIProgress(95, 'جاري إنشاء ملف الصوت النهائي…');

    setTimeout(async () => {
        cleanSamples  = enhanced;
        enhancedBlob  = await encodeWav(enhanced, SR);
        audioClean.src = URL.createObjectURL(enhancedBlob);
        updateUIProgress(100, 'اكتملت التنقية بنجاح! ✓');

        setTimeout(() => {
            progressWrap.hidden      = true;
            players.hidden           = false;
            podcastControls.hidden   = false;
            actionRow.hidden         = false;
        }, 500);
    }, 10);
}

// ── Podcast Chain ─────────────────────────────────────────────
function truePeakNormalize(samples, targetDb = -1.0) {
    const target = Math.pow(10, targetDb / 20);
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
        const abs = Math.abs(samples[i]);
        if (abs > peak) peak = abs;
    }
    if (peak < 1e-9) return samples;
    const gain = target / peak;
    const out  = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;
    return out;
}

async function applyPodcastChain(samples) {
    const offCtx = new OfflineAudioContext(1, samples.length, SR);
    const buffer = offCtx.createBuffer(1, samples.length, SR);
    buffer.copyToChannel(samples, 0);
    const src = offCtx.createBufferSource();
    src.buffer = buffer;

    const eqWarmth = offCtx.createBiquadFilter();
    eqWarmth.type = 'peaking'; eqWarmth.frequency.value = 200;
    eqWarmth.gain.value = 2.0; eqWarmth.Q.value = 1.0;

    const eqBody = offCtx.createBiquadFilter();
    eqBody.type = 'peaking'; eqBody.frequency.value = 1000;
    eqBody.gain.value = 5.0; eqBody.Q.value = 0.8;

    const eqPresence = offCtx.createBiquadFilter();
    eqPresence.type = 'peaking'; eqPresence.frequency.value = 3000;
    eqPresence.gain.value = 4.0; eqPresence.Q.value = 0.8;

    const eqAir = offCtx.createBiquadFilter();
    eqAir.type = 'highshelf'; eqAir.frequency.value = 8000;
    eqAir.gain.value = 4.0;

    const comp = offCtx.createDynamicsCompressor();
    comp.threshold.value = -24; comp.ratio.value = 2.5;
    comp.attack.value = 0.04;   comp.release.value = 0.4;
    comp.knee.value = 12;

    src.connect(eqWarmth); eqWarmth.connect(eqBody);
    eqBody.connect(eqPresence); eqPresence.connect(eqAir);
    eqAir.connect(comp); comp.connect(offCtx.destination);

    src.start();
    const rendered = await offCtx.startRendering();
    let out = new Float32Array(rendered.getChannelData(0));
    return truePeakNormalize(out, -1.0);
}

async function renderCleanAudio() {
    if (!cleanSamples) return;
    const final = podcastEnabled
        ? await applyPodcastChain(cleanSamples)
        : cleanSamples;
    enhancedBlob   = await encodeWav(final, SR);
    audioClean.src = URL.createObjectURL(enhancedBlob);
}

// ── WAV Encoder ───────────────────────────────────────────────
async function encodeWav(samples, sampleRate) {
    const buf  = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buf);
    const write = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true);
    write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);  view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); write(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
}

// ── Event Listeners ───────────────────────────────────────────
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processAudioFile(file);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) processAudioFile(file);
});

downloadBtn.addEventListener('click', () => {
    if (!enhancedBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(enhancedBlob);
    a.download = 'denoised.wav';
    a.click();
});

resetBtn.addEventListener('click', () => {
    statusArea.hidden      = true;
    players.hidden         = true;
    podcastControls.hidden = true;
    actionRow.hidden       = true;
    audioOrig.src = ''; audioClean.src = '';
    enhancedBlob = null; cleanSamples = null;
    fileInput.value = '';
    dropText.textContent = 'اضغط هنا لرفع الملف الصوتي';
    podcastEnabled = false;
    podcastToggle.setAttribute('aria-pressed', 'false');
    podcastToggle.querySelector('.nrem-toggle-text').textContent = 'إيقاف';
});

podcastToggle.addEventListener('click', async () => {
    podcastEnabled = !podcastEnabled;
    podcastToggle.setAttribute('aria-pressed', String(podcastEnabled));
    podcastToggle.querySelector('.nrem-toggle-text').textContent = podcastEnabled ? 'تشغيل' : 'إيقاف';
    podcastToggle.classList.add('loading');
    await renderCleanAudio();
    podcastToggle.classList.remove('loading');
});

// ── Init ──────────────────────────────────────────────────────
initWorker();
loadModel();
