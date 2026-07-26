// ============================================================
//  Noise Remover — UI Controller v3
//  ① كاش النموذج في Cache API
//  ② زر التحميل يظهر بعد المعالجة فقط
//  ③ Timeline مع تشغيل حي (أسلوب audio_rate)
// ============================================================

const SR = 48000;
let worker        = null;
let enhancedBlob  = null;
let cleanSamples  = null;
let origSamples   = null;
let podcastEnabled = false;

// Timeline state
let audioCtxPlay     = null;
let sourceNode       = null;
let isPlaying        = false;
let currentPosition  = 0;
let lastTime         = 0;
let timelineInterval = null;
let duration         = 0;
let activeAudio      = 'clean'; // 'orig' | 'clean'

const TIMELINE_MS = 100;
const MODEL_CACHE = 'arsenal-noise-model-v1';
const MODEL_URL   = 'https://huggingface.co/datasets/Silvr0098/arsenal-cdn/resolve/main/dpdfnet8_48khz_hr.onnx';

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
const actionRow       = document.getElementById('actionRow');
const downloadBtn     = document.getElementById('downloadBtn');
const resetBtn        = document.getElementById('resetBtn');
const podcastControls = document.getElementById('podcastControls');
const podcastToggle   = document.getElementById('podcastToggle');
const modelSection    = document.getElementById('modelSection');
const modelBar        = document.getElementById('modelBar');
const modelPct        = document.getElementById('modelPct');
const startBtn        = document.getElementById('startBtn');
const startWrap       = document.getElementById('startWrap');

// Timeline DOM
const progressWrapper   = document.getElementById('progressWrapper');
const progressTrack     = document.getElementById('progressTrack');
const progressFill      = document.getElementById('progressFill');
const progressThumb     = document.getElementById('progressThumb');
const currentTimeText   = document.getElementById('currentTimeText');
const totalTimeText     = document.getElementById('totalTimeText');
const playBtn           = document.getElementById('playBtn');
const playIcon          = document.getElementById('playIcon');
const tabOrig           = document.getElementById('tabOrig');
const tabClean          = document.getElementById('tabClean');

let selectedFile = null;
let pendingFile  = null;

// ── Worker URL ───────────────────────────────────────────────
function getWorkerUrl() {
    if (window.Arsenal && Arsenal.ONNX) return Arsenal.ONNX.buildWorkerUrl('noise_remover_worker.js');
    const s = [...document.querySelectorAll('script[src]')]
        .find(s => s.src && s.src.includes('noise_remover.js'));
    return s ? s.src.replace('noise_remover.js', 'noise_remover_worker.js') : null;
}

function getOrtUrl() {
    if (window.Arsenal && Arsenal.ONNX) return Arsenal.ONNX.getOrtUrl();
    const s = [...document.querySelectorAll('script[src]')]
        .find(s => s.src && s.src.includes('ort.min.js'));
    return s ? s.src : null;
}

// ── Step Helpers ─────────────────────────────────────────────
function setStep(stepEl) {
    [pstepModel, pstepInfer, pstepEncode].forEach(s => s.classList.remove('active', 'done'));
    const steps = [pstepModel, pstepInfer, pstepEncode];
    const idx   = steps.indexOf(stepEl);
    steps.forEach((s, i) => {
        if (i < idx)      s.classList.add('done');
        else if (i === idx) s.classList.add('active');
    });
}

function updateUIProgress(pct, label) {
    requestAnimationFrame(() => {
        barFill.style.width       = pct + '%';
        progressLabel.textContent = label;
        if (pct < 20)      setStep(pstepModel);
        else if (pct < 90) setStep(pstepInfer);
        else               setStep(pstepEncode);
    });
}

// ── Worker ───────────────────────────────────────────────────
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker(getWorkerUrl());

    worker.onmessage = ({ data: e }) => {
        switch (e.type) {
            case 'init-ok':
                modelSection.hidden = true;
                if (pendingFile) {
                    const f = pendingFile;
                    pendingFile = null;
                    processAudioFile(f);
                }
                break;
            case 'progress':
                updateUIProgress(e.data.pct, e.data.label);
                break;
            case 'done':
                handleProcessDone(e.data);
                break;
            case 'error':
                modelSection.hidden = true;
                alert('خطأ في المعالجة: ' + e.data);
                progressWrap.hidden = true;
                startWrap.style.display = 'block';
                startBtn.disabled = false;
                break;
        }
    };

    worker.onerror = (err) => {
        modelSection.hidden = true;
        alert('خطأ في الـ Worker: ' + err.message);
        progressWrap.hidden = true;
    };
}

// ── كاش النموذج ──────────────────────────────────────────────
async function getModelBytes() {
    // ① تحقق من الكاش أولاً
    try {
        const cache    = await caches.open(MODEL_CACHE);
        const cached   = await cache.match(MODEL_URL);
        if (cached) {
            modelBar.style.width  = '100%';
            modelPct.textContent  = 'من الكاش ✓';
            const buf = await cached.arrayBuffer();
            return new Uint8Array(buf);
        }
    } catch (_) {}

    // ② تحميل من الشبكة مع شريط تقدم
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentLength = response.headers.get('Content-Length');
    const total  = contentLength ? parseInt(contentLength) : 0;
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
            modelBar.style.width  = pct + '%';
            modelPct.textContent  = pct + '%';
        }
    }

    const onnxBytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { onnxBytes.set(chunk, offset); offset += chunk.length; }

    // ③ احفظ في الكاش
    try {
        const cache = await caches.open(MODEL_CACHE);
        await cache.put(MODEL_URL, new Response(onnxBytes.buffer, {
            headers: { 'Content-Type': 'application/octet-stream' }
        }));
    } catch (_) {}

    return onnxBytes;
}

async function loadModel() {
    modelSection.hidden = false;
    modelBar.style.width = '0%';
    modelPct.textContent = '0%';

    try {
        const onnxBytes = await getModelBytes();
        const ortUrl    = getOrtUrl();
        worker.postMessage(
            { type: 'init', data: { onnxBytes: onnxBytes.buffer, ortUrl } },
            [onnxBytes.buffer]
        );
    } catch (err) {
        modelSection.hidden = true;
        alert('فشل تحميل النموذج: ' + err.message);
        startWrap.style.display = 'block';
        startBtn.disabled = false;
    }
}

// ── معالجة الملف ─────────────────────────────────────────────
async function processAudioFile(file) {
    if (!worker) return;

    dropText.textContent   = file.name;
    statusArea.hidden      = false;
    fileMeta.textContent   = `📁 ${file.name} — ${(file.size / 1024).toFixed(1)} كيلوبايت`;
    progressWrap.hidden    = false;
    players.hidden         = true;
    actionRow.hidden       = true;
    podcastControls.hidden = true;
    updateUIProgress(0, 'بدء معالجة الملف...');

    setTimeout(async () => {
        try {
            const arrayBuf = await file.arrayBuffer();
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
            const decoded  = await audioCtx.decodeAudioData(arrayBuf);
            audioCtx.close();

            let audio = decoded.getChannelData(0);
            if (decoded.numberOfChannels > 1) {
                const ch1  = decoded.getChannelData(1);
                const mono = new Float32Array(audio.length);
                for (let i = 0; i < audio.length; i++) mono[i] = (audio[i] + ch1[i]) * 0.5;
                audio = mono;
            }

            origSamples = new Float32Array(audio);
            duration    = audio.length / SR;

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

        updateUIProgress(100, 'اكتملت التنقية بنجاح! ✓');

        setTimeout(() => {
            progressWrap.hidden    = true;
            players.hidden         = false;
            podcastControls.hidden = false;
            actionRow.hidden       = false;

            // تهيئة التايم لاين
            totalTimeText.textContent = formatTime(duration);
            currentTimeText.textContent = '00:00';
            setTimelinePercent(0);
            activeAudio = 'clean';
            tabClean.classList.add('active');
            tabOrig.classList.remove('active');
        }, 500);
    }, 10);
}

// ── Timeline ─────────────────────────────────────────────────
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function setTimelinePercent(pct) {
    const p = Math.max(0, Math.min(1, pct)) * 100;
    progressFill.style.width = p + '%';
    progressThumb.style.left = p + '%';
}

function getCurrentSamples() {
    return activeAudio === 'orig' ? origSamples : cleanSamples;
}

function startPlayback() {
    if (!getCurrentSamples()) return;
    stopPlayback();

    audioCtxPlay = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
    const samples = getCurrentSamples();
    const buffer  = audioCtxPlay.createBuffer(1, samples.length, SR);
    buffer.copyToChannel(samples, 0);

    sourceNode = audioCtxPlay.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(audioCtxPlay.destination);
    sourceNode.start(0, currentPosition);

    sourceNode.onended = () => {
        if (isPlaying) {
            currentPosition = 0;
            stopPlayback();
        }
    };

    lastTime  = audioCtxPlay.currentTime;
    isPlaying = true;

    playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;

    startTimelineLoop();
}

function stopPlayback() {
    if (sourceNode) {
        try { sourceNode.stop(); } catch(_) {}
        sourceNode.disconnect();
        sourceNode = null;
    }
    if (audioCtxPlay) {
        audioCtxPlay.close();
        audioCtxPlay = null;
    }
    isPlaying = false;
    playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    stopTimelineLoop();
}

function startTimelineLoop() {
    stopTimelineLoop();
    timelineInterval = setInterval(() => {
        if (!isPlaying || !audioCtxPlay) return;
        const now   = audioCtxPlay.currentTime;
        const delta = now - lastTime;
        lastTime    = now;
        currentPosition += delta;
        if (currentPosition >= duration) {
            currentPosition = 0;
            stopPlayback();
            setTimelinePercent(0);
            currentTimeText.textContent = '00:00';
            return;
        }
        setTimelinePercent(currentPosition / duration);
        currentTimeText.textContent = formatTime(currentPosition);
    }, TIMELINE_MS);
}

function stopTimelineLoop() {
    if (timelineInterval) { clearInterval(timelineInterval); timelineInterval = null; }
}

// Scrubbing
let isScrubbing = false;

function getScrubPercent(e) {
    const rect    = progressTrack.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
}

function applyScrub(pct) {
    currentPosition = pct * duration;
    setTimelinePercent(pct);
    currentTimeText.textContent = formatTime(currentPosition);
}

progressWrapper.addEventListener('pointerdown', (e) => {
    if (!getCurrentSamples()) return;
    e.stopPropagation();
    isScrubbing = true;
    progressWrapper.classList.add('scrubbing');
    progressWrapper.setPointerCapture(e.pointerId);
    applyScrub(getScrubPercent(e));
    if (isPlaying) stopPlayback();
});

progressWrapper.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    applyScrub(getScrubPercent(e));
});

progressWrapper.addEventListener('pointerup', () => {
    if (!isScrubbing) return;
    isScrubbing = false;
    progressWrapper.classList.remove('scrubbing');
});

// زر التشغيل
playBtn.addEventListener('click', () => {
    if (!getCurrentSamples()) return;
    isPlaying ? stopPlayback() : startPlayback();
});

// تبديل الأصلي / المنقى
tabOrig.addEventListener('click', () => {
    if (activeAudio === 'orig') return;
    const wasPlaying = isPlaying;
    stopPlayback();
    activeAudio = 'orig';
    tabOrig.classList.add('active');
    tabClean.classList.remove('active');
    if (wasPlaying) startPlayback();
});

tabClean.addEventListener('click', () => {
    if (activeAudio === 'clean') return;
    const wasPlaying = isPlaying;
    stopPlayback();
    activeAudio = 'clean';
    tabClean.classList.add('active');
    tabOrig.classList.remove('active');
    if (wasPlaying) startPlayback();
});

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

// ── توليد Impulse Response بسيط للـ Reverb ───────────────────
function createImpulseResponse(ctx, duration = 0.8, decay = 2.5) {
    const len    = Math.floor(ctx.sampleRate * duration);
    const ir     = ctx.createBuffer(1, len, ctx.sampleRate);
    const data   = ir.getChannelData(0);
    for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return ir;
}

async function applyPodcastChain(samples) {
    const len    = samples.length + Math.floor(SR * 0.8); // مساحة للـ reverb tail
    const offCtx = new OfflineAudioContext(1, len, SR);
    const buffer = offCtx.createBuffer(1, samples.length, SR);
    buffer.copyToChannel(samples, 0);
    const src = offCtx.createBufferSource();
    src.buffer = buffer;

    const eqWarmth   = offCtx.createBiquadFilter();
    eqWarmth.type = 'peaking'; eqWarmth.frequency.value = 200; eqWarmth.gain.value = 2.0; eqWarmth.Q.value = 1.0;
    const eqBody     = offCtx.createBiquadFilter();
    eqBody.type = 'peaking'; eqBody.frequency.value = 1000; eqBody.gain.value = 5.0; eqBody.Q.value = 0.8;
    const eqPresence = offCtx.createBiquadFilter();
    eqPresence.type = 'peaking'; eqPresence.frequency.value = 3000; eqPresence.gain.value = 4.0; eqPresence.Q.value = 0.8;
    const eqAir      = offCtx.createBiquadFilter();
    eqAir.type = 'highshelf'; eqAir.frequency.value = 8000; eqAir.gain.value = 4.0;
    const comp       = offCtx.createDynamicsCompressor();
    comp.threshold.value = -24; comp.ratio.value = 2.5; comp.attack.value = 0.04; comp.release.value = 0.4; comp.knee.value = 12;

    // Reverb خفيف — wet 15% فقط لكسر الخشونة
    const convolver = offCtx.createConvolver();
    convolver.buffer = createImpulseResponse(offCtx, 0.8, 2.5);
    const dryGain   = offCtx.createGain(); dryGain.gain.value = 0.85;
    const wetGain   = offCtx.createGain(); wetGain.gain.value = 0.15;

    // dry path
    src.connect(eqWarmth); eqWarmth.connect(eqBody); eqBody.connect(eqPresence);
    eqPresence.connect(eqAir); eqAir.connect(comp); comp.connect(dryGain);
    dryGain.connect(offCtx.destination);

    // wet path (reverb)
    comp.connect(convolver); convolver.connect(wetGain);
    wetGain.connect(offCtx.destination);

    src.start();
    const rendered = await offCtx.startRendering();
    // اقطع فقط بطول الأصل
    const out = rendered.getChannelData(0).slice(0, samples.length);
    return truePeakNormalize(new Float32Array(out), -1.0);
}

async function renderCleanAudio() {
    if (!cleanSamples) return;
    const final    = podcastEnabled ? await applyPodcastChain(cleanSamples) : cleanSamples;
    enhancedBlob   = await encodeWav(final, SR);
    // إعادة تشغيل لو كان يعزف
    if (isPlaying && activeAudio === 'clean') {
        stopPlayback();
        startPlayback();
    }
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

const recordBtn   = document.getElementById('recordBtn');
const recordLabel = document.getElementById('recordLabel');
const recordHint  = document.getElementById('recordHint');

// ── Event Listeners ───────────────────────────────────────────
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
});
fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) selectFile(file);
});

// ── تسجيل الصوت ──────────────────────────────────────────────
let mediaRecorder = null;
let recordChunks  = [];
let isRecording   = false;

recordBtn.addEventListener('click', async () => {
    if (isRecording) {
        // إيقاف التسجيل
        mediaRecorder.stop();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        recordChunks  = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(recordChunks, { type: 'audio/webm' });
            const file = new File([blob], 'تسجيل_صوتي.webm', { type: 'audio/webm' });
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordLabel.textContent = 'تسجيل';
            recordHint.textContent  = 'اضغط للبدء';
            selectFile(file);
        };

        mediaRecorder.start();
        isRecording = true;
        recordBtn.classList.add('recording');
        recordLabel.textContent = 'جاري التسجيل...';
        recordHint.textContent  = 'اضغط للإيقاف';

    } catch (err) {
        alert('تعذّر الوصول للميكروفون: ' + err.message);
    }
});

function selectFile(file) {
    selectedFile         = file;
    dropText.textContent = file.name;
    startWrap.style.display = 'block';
    startBtn.disabled    = false;
}

startBtn.addEventListener('click', () => {
    if (!selectedFile) return;
    startBtn.disabled       = true;
    startWrap.style.display = 'none';
    pendingFile             = selectedFile;
    initWorker();
    loadModel();
});

downloadBtn.addEventListener('click', async () => {
    if (!enhancedBlob) return;
    const final = podcastEnabled
        ? await encodeWav(await applyPodcastChain(cleanSamples), SR)
        : enhancedBlob;
    const a = document.createElement('a');
    a.href     = URL.createObjectURL(final);
    a.download = 'denoised.wav';
    a.click();
});

resetBtn.addEventListener('click', () => {
    stopPlayback();
    statusArea.hidden      = true;
    players.hidden         = true;
    podcastControls.hidden = true;
    actionRow.hidden       = true;
    enhancedBlob  = null;
    cleanSamples  = null;
    origSamples   = null;
    fileInput.value        = '';
    selectedFile           = null;
    pendingFile            = null;
    startWrap.style.display = 'none';
    dropText.textContent   = 'اضغط هنا لرفع الملف الصوتي';
    podcastEnabled         = false;
    podcastToggle.setAttribute('aria-pressed', 'false');
    podcastToggle.querySelector('.nrem-toggle-text').textContent = 'إيقاف';
    currentPosition = 0;
    duration        = 0;
    setTimelinePercent(0);
    currentTimeText.textContent = '00:00';
    totalTimeText.textContent   = '00:00';
});

podcastToggle.addEventListener('click', async () => {
    podcastEnabled = !podcastEnabled;
    podcastToggle.setAttribute('aria-pressed', String(podcastEnabled));
    podcastToggle.querySelector('.nrem-toggle-text').textContent = podcastEnabled ? 'تشغيل' : 'إيقاف';
    podcastToggle.classList.add('loading');
    await renderCleanAudio();
    podcastToggle.classList.remove('loading');
});