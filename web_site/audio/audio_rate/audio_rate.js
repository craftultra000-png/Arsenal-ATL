// ========================================================
// Slowed Studio — المنطق الأصلي + Timeline Scrubbing
// ========================================================

let player       = null;
let reverbNode   = null;
let audioBuffer  = null;
let isPlaying    = false;
let originalFileName = 'audio';

// Timeline
let currentPosition  = 0;
let lastTime         = 0;
let timelineInterval = null;
const TIMELINE_MS    = 100; // 10fps — خفيف على الموبايل

// DOM refs
const fileInput       = document.getElementById('audioFile');
const fileNameText    = document.getElementById('fileName');
const speedSlider     = document.getElementById('speedSlider');
const speedValEl      = document.getElementById('speedVal');
const speedDescEl     = document.getElementById('speedDesc');
const playBtn         = document.getElementById('playBtn');
const playText        = document.getElementById('playText');
const playIcon        = document.getElementById('playIcon');
const downloadWavBtn  = document.getElementById('downloadWavBtn');
const downloadMp3Btn  = document.getElementById('downloadMp3Btn');
const currentTimeText = document.getElementById('currentTimeText');
const totalTimeText   = document.getElementById('totalTimeText');
const progressFill    = document.getElementById('progressFill');
const progressThumb   = document.getElementById('progressThumb');
const progressTrack   = document.getElementById('progressTrack');
const progressWrapper = document.getElementById('progressWrapper');
const reverbToggle    = document.getElementById('reverbToggle');
const reverbDecay     = document.getElementById('reverbDecay');
const reverbMix       = document.getElementById('reverbMix');
const decayVal        = document.getElementById('decayVal');
const mixVal          = document.getElementById('mixVal');
const reverbControlsContainer = document.getElementById('reverbControlsContainer');

// ── 1. تحميل الملف ──────────────────────────────────────────────
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    originalFileName = file.name.replace(/\.[^/.]+$/, '');
    fileNameText.innerText = t('rate_status_init') || 'جاري المعالجة...';

    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);

        fileNameText.innerText  = file.name;
        totalTimeText.innerText = formatTime(audioBuffer.duration);
        resetTimeline();

        if (player)     player.dispose();
        if (reverbNode) reverbNode.dispose();

        // السلسلة الأصلية: player → reverb → destination
        reverbNode = new Tone.Reverb({ decay: parseFloat(reverbDecay.value), wet: 0 }).toDestination();
        await reverbNode.generate();
        player = new Tone.Player(audioBuffer).connect(reverbNode);

        // تفعيل عناصر الواجهة
        speedSlider.disabled   = false;
        reverbToggle.disabled  = false;
        playBtn.disabled       = false;
        downloadWavBtn.disabled = false;
        downloadMp3Btn.disabled = false;

        updateSpeedUI(1.0);
        syncReverbUI();

    } catch (err) {
        fileNameText.innerText = t('rate_err_decode') || 'تعذّر قراءة الملف';
        console.error(err);
    }
});

// ── 2. شريط السرعة ──────────────────────────────────────────────
speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    updateSpeedUI(val);
    if (player) player.playbackRate = val;
});

function updateSpeedUI(val) {
    if (Math.abs(val - 1.0) < 0.005) {
        speedValEl.innerText  = t('rate_speed_normal') || 'طبيعي (1.00x)';
        speedDescEl.innerText = '';
    } else if (val < 1.0) {
        speedValEl.innerText  = val.toFixed(2) + 'x';
        speedDescEl.innerText = t('rate_slow_desc').replace('{pct}', Math.round((1 - val) * 100));
    } else {
        speedValEl.innerText  = val.toFixed(2) + 'x';
        speedDescEl.innerText = t('rate_fast_desc').replace('{pct}', Math.round((val - 1) * 100));
    }
}

// ── 3. Reverb ───────────────────────────────────────────────────
reverbToggle.addEventListener('change', () => syncReverbUI());

reverbMix.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    mixVal.innerText = Math.round(val * 100) + '%';
    if (reverbNode && reverbToggle.checked) reverbNode.wet.value = val;
});

reverbDecay.addEventListener('change', async (e) => {
    const val = parseFloat(e.target.value);
    decayVal.innerText = val.toFixed(1) + 's';
    if (reverbNode) {
        reverbNode.decay = val;
        await reverbNode.generate();
    }
});

function syncReverbUI() {
    if (!reverbNode) return;
    if (reverbToggle.checked) {
        reverbControlsContainer.classList.remove('arat-disabled');
        reverbNode.wet.value = parseFloat(reverbMix.value);
    } else {
        reverbControlsContainer.classList.add('arat-disabled');
        reverbNode.wet.value = 0;
    }
}

// ── 4. تشغيل / إيقاف ────────────────────────────────────────────
playBtn.addEventListener('click', async () => {
    await Tone.start();
    isPlaying ? stopPlayback() : startPlayback();
});

function startPlayback() {
    player.playbackRate = parseFloat(speedSlider.value);
    player.start(0, currentPosition);
    lastTime = Tone.now();
    playText.innerText   = t('rate_btn_pause') || 'إيقاف';
    playIcon.innerHTML   = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    playBtn.style.background = '#ff4b4b';
    isPlaying = true;
    startTimelineLoop();
}

function stopPlayback() {
    if (player) player.stop();
    playText.innerText       = t('rate_btn_play') || 'تشغيل المعاينة';
    playIcon.innerHTML       = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    playBtn.style.background = 'var(--acc)';
    isPlaying = false;
    stopTimelineLoop();
}

function resetTimeline() {
    currentPosition = 0;
    setTimelinePercent(0);
    currentTimeText.innerText = '00:00';
    if (isPlaying) stopPlayback();
}

// ── 5. Timeline Loop (setInterval 10fps) ────────────────────────
function startTimelineLoop() {
    stopTimelineLoop();
    lastTime = Tone.now();
    timelineInterval = setInterval(() => {
        if (!isPlaying || !audioBuffer) return;
        const now   = Tone.now();
        const delta = now - lastTime;
        lastTime = now;
        currentPosition += delta * player.playbackRate;
        if (currentPosition >= audioBuffer.duration) {
            resetTimeline();
            return;
        }
        const pct = currentPosition / audioBuffer.duration;
        setTimelinePercent(pct);
        currentTimeText.innerText = formatTime(currentPosition);
    }, TIMELINE_MS);
}

function stopTimelineLoop() {
    if (timelineInterval) { clearInterval(timelineInterval); timelineInterval = null; }
}

function setTimelinePercent(pct) {
    const p = Math.max(0, Math.min(1, pct)) * 100;
    progressFill.style.width  = p + '%';
    progressThumb.style.left  = p + '%';
}

// ── 6. Timeline Scrubbing — سحب حقيقي بالإصبع ──────────────────
let isScrubbing = false;

function getScrubPercent(e) {
    const rect = progressTrack.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
}

function applyScrub(pct) {
    currentPosition = pct * audioBuffer.duration;
    setTimelinePercent(pct);
    currentTimeText.innerText = formatTime(currentPosition);
}

// pointerdown — بداية السحب
progressWrapper.addEventListener('pointerdown', (e) => {
    if (!audioBuffer) return;
    isScrubbing = true;
    progressWrapper.classList.add('scrubbing');
    progressWrapper.setPointerCapture(e.pointerId);
    const pct = getScrubPercent(e);
    applyScrub(pct);
    if (isPlaying) { player.stop(); stopTimelineLoop(); }
});

// pointermove — أثناء السحب
progressWrapper.addEventListener('pointermove', (e) => {
    if (!isScrubbing || !audioBuffer) return;
    applyScrub(getScrubPercent(e));
});

// pointerup — نهاية السحب، استئناف التشغيل
progressWrapper.addEventListener('pointerup', (e) => {
    if (!isScrubbing) return;
    isScrubbing = false;
    progressWrapper.classList.remove('scrubbing');
    if (isPlaying) {
        player.start(0, currentPosition);
        lastTime = Tone.now();
        startTimelineLoop();
    }
});

progressWrapper.addEventListener('pointercancel', () => {
    isScrubbing = false;
    progressWrapper.classList.remove('scrubbing');
});

// ── 7. التصدير ──────────────────────────────────────────────────
async function renderAudioOffline() {
    const currentRate = player.playbackRate;
    const duration    = audioBuffer.duration / currentRate;

    return await Tone.Offline(async () => {
        const recReverb = new Tone.Reverb({
            decay: parseFloat(reverbDecay.value),
            wet:   reverbToggle.checked ? parseFloat(reverbMix.value) : 0
        }).toDestination();
        await recReverb.generate();

        const recPlayer = new Tone.Player(audioBuffer).connect(recReverb);
        recPlayer.playbackRate = currentRate;
        recPlayer.start(0);
    }, duration);
}

downloadWavBtn.addEventListener('click', async () => {
    if (!audioBuffer) return;
    toggleLoading(downloadWavBtn, true, t('rate_btn_wav_loading') || 'جاري التصدير...');
    try {
        const buffer   = await renderAudioOffline();
        const wavBytes = audioBufferToWav(buffer);
        const blob     = new Blob([wavBytes], { type: 'audio/wav' });
        triggerDownload(blob, `${originalFileName}_rate.wav`);
    } catch (e) { console.error(e); }
    toggleLoading(downloadWavBtn, false, t('rate_btn_wav') || 'تصدير WAV نقي');
});

downloadMp3Btn.addEventListener('click', async () => {
    if (!audioBuffer) return;
    if (typeof lamejs === 'undefined') { alert('⚠️ مكتبة MP3 غير محقونة.'); return; }
    toggleLoading(downloadMp3Btn, true, t('rate_btn_mp3_loading') || 'جاري الترميز...');
    setTimeout(async () => {
        try {
            const buffer  = await renderAudioOffline();
            const mp3Blob = await audioBufferToMp3Async(buffer, (pct) => {
                downloadMp3Btn.querySelector('span').innerText = `${pct}%...`;
            });
            triggerDownload(mp3Blob, `${originalFileName}_rate.mp3`);
        } catch (err) { console.error(err); }
        toggleLoading(downloadMp3Btn, false, t('rate_btn_mp3') || 'تصدير MP3 مضغوط');
    }, 50);
});

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function toggleLoading(btn, isLoading, text) {
    btn.disabled = isLoading;
    btn.querySelector('span').innerText = text;
}

// ── Encoders ─────────────────────────────────────────────────────
function audioBufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        length    = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length),
        view      = new DataView(bufferArr),
        channels  = [], i, sample, offset = 0, pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

    for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true); pos += 2;
        }
        offset++;
    }
    return bufferArr;
}

async function audioBufferToMp3Async(buffer, onProgress) {
    const channels   = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 192);
    const mp3Data    = [];

    function floatTo16Bit(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    const left  = floatTo16Bit(buffer.getChannelData(0));
    const right = channels > 1 ? floatTo16Bit(buffer.getChannelData(1)) : left;
    const blockSize = 1152;
    let iterations = 0;

    for (let i = 0; i < left.length; i += blockSize) {
        const lChunk = left.subarray(i, i + blockSize);
        const rChunk = channels > 1 ? right.subarray(i, i + blockSize) : lChunk;
        const mp3buf = mp3encoder.encodeBuffer(lChunk, rChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
        iterations++;
        if (iterations % 150 === 0) {
            if (onProgress) onProgress(Math.round((i / left.length) * 100));
            await new Promise(r => setTimeout(r, 0));
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
    if (onProgress) onProgress(100);
    return new Blob(mp3Data, { type: 'audio/mp3' });
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min < 10 ? '0'+min : min}:${sec < 10 ? '0'+sec : sec}`;
}
