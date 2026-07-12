// ==========================================
// محرك ترسانة مقص الصوت (المطور)
// ==========================================

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
let isPlaying = false;
let sourceNode = null;
let originalFileName = 'audio'; // [تعديل 1] حفظ اسم الملف الأصلي

async function processAudioFile(input) {
    const file = input.files[0];
    if(!file) return;

    // [تعديل 1] استخراج اسم الملف بدون الامتداد
    originalFileName = file.name.replace(/\.[^/.]+$/, '');
    
    document.getElementById('file-status').innerText = t('cut_status_reading');
    document.getElementById('file-status').style.color = "var(--acc2)";

    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        document.getElementById('file-status').innerText = t('cut_file_loaded', { name: file.name });
        
        const duration = audioBuffer.duration;
        const slideStart = document.getElementById('slide-start');
        const slideEnd = document.getElementById('slide-end');

        slideStart.max = duration; slideStart.value = 0; slideStart.disabled = false;
        slideEnd.max = duration; slideEnd.value = duration; slideEnd.disabled = false;

        updateVisuals();
        document.getElementById('btn-play').disabled = false;
        document.getElementById('btn-save').disabled = false;
    } catch (e) {
        document.getElementById('file-status').innerText = t('cut_err_read');
        document.getElementById('file-status').style.color = "#ff4b4b";
    }
}

function formatPrecisionTime(seconds) {
    let min = Math.floor(seconds / 60);
    let sec = Math.floor(seconds % 60);
    let ms = Math.floor((seconds % 1) * 100);
    return `${min < 10 ? '0'+min : min}:${sec < 10 ? '0'+sec : sec}.${ms < 10 ? '0'+ms : ms}`;
}

function moveStartSlider() {
    const start = document.getElementById('slide-start');
    const end = document.getElementById('slide-end');
    start.style.zIndex = "4";
    end.style.zIndex = "3";
    if (parseFloat(start.value) >= parseFloat(end.value)) {
        start.value = parseFloat(end.value) - 0.05;
    }
    updateVisuals();
}

function moveEndSlider() {
    const start = document.getElementById('slide-start');
    const end = document.getElementById('slide-end');
    end.style.zIndex = "4";
    start.style.zIndex = "3";
    if (parseFloat(end.value) <= parseFloat(start.value)) {
        end.value = parseFloat(start.value) + 0.05;
    }
    updateVisuals();
}

function updateVisuals() {
    const startVal = parseFloat(document.getElementById('slide-start').value);
    const endVal = parseFloat(document.getElementById('slide-end').value);
    const duration = audioBuffer ? audioBuffer.duration : 100;

    const startPercent = (startVal / duration) * 100;
    const endPercent = (endVal / duration) * 100;
    
    const trackFill = document.getElementById('track-fill');
    trackFill.style.left = startPercent + "%";
    trackFill.style.width = (endPercent - startPercent) + "%";

    document.getElementById('lbl-start').innerText = t('cut_lbl_start', { time: formatPrecisionTime(startVal) });
    document.getElementById('lbl-end').innerText = t('cut_lbl_end', { time: formatPrecisionTime(endVal) });
    document.getElementById('lbl-total').innerText = t('cut_lbl_duration', { time: formatPrecisionTime(endVal - startVal) });
}

function togglePlayPreview() {
    const playIcon = document.getElementById('playIcon');
    const playText = document.getElementById('playText');
    const btnPlay = document.getElementById('btn-play');

    if (isPlaying) {
        stopAudioPreview();
    } else {
        const start = parseFloat(document.getElementById('slide-start').value);
        const end = parseFloat(document.getElementById('slide-end').value);
        const cutDuration = end - start;
        if (cutDuration <= 0) return;

        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioCtx.destination);
        sourceNode.start(0, start, cutDuration);
        isPlaying = true;

        playText.innerText = t('cut_btn_stop');
        playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
        btnPlay.style.background = "#ff4b4b";

        sourceNode.onended = () => {
            if (isPlaying) stopAudioPreview();
        };
    }
}

function stopAudioPreview() {
    const playIcon = document.getElementById('playIcon');
    const playText = document.getElementById('playText');
    const btnPlay = document.getElementById('btn-play');

    if (sourceNode) {
        try { sourceNode.stop(); } catch(e){}
        sourceNode = null;
    }
    isPlaying = false;

    playText.innerText = t('cut_btn_play');
    playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    btnPlay.style.background = "var(--acc)";
}

// [تعديل 2+3] cutAndExportAudio — اسم الملف الأصلي + دعم MP3
async function cutAndExportAudio() {
    stopAudioPreview();

    const start = parseFloat(document.getElementById('slide-start').value);
    const end = parseFloat(document.getElementById('slide-end').value);
    const finalCutDuration = end - start;

    const outputBox = document.getElementById('output-box');
    const statusText = document.getElementById('status-text');
    const downloadWrap = document.getElementById('download-wrap');
    const pBar = document.getElementById('p-bar');

    outputBox.style.display = "block";
    downloadWrap.style.display = "none";
    statusText.innerText = t('cut_status_cutting');
    pBar.style.width = "0%";
    document.getElementById('btn-save').disabled = true;

    setTimeout(async () => {
        const sampleRate = audioBuffer.sampleRate;
        const offlineCtx = new OfflineAudioContext(2, sampleRate * finalCutDuration, sampleRate);

        const bufferSource = offlineCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(offlineCtx.destination);
        bufferSource.start(0, start, finalCutDuration);

        const renderedBuffer = await offlineCtx.startRendering();

        // [تعديل 2] تحديد الصيغة من الـ dropdown
        const format = (document.getElementById('target-format')?.value || 'WAV').toUpperCase();

        if (format === 'MP3') {
            // [تعديل 3] تصدير MP3 عبر lamejs
            statusText.innerText = t('cut_status_mp3') || 'جاري ترميز MP3...';
            pBar.style.width = "10%";

            if (typeof lamejs === 'undefined') {
                statusText.innerText = t('adp_err_no_mp3lib') || 'مكتبة MP3 غير متوفرة';
                statusText.style.color = "#ff4b4b";
                document.getElementById('btn-save').disabled = false;
                return;
            }

            encodeAudioBufferToMp3Async(
                renderedBuffer,
                (pct) => { pBar.style.width = (10 + pct * 0.9) + '%'; },
                (mp3Blob) => {
                    const url = URL.createObjectURL(mp3Blob);
                    const link = document.getElementById('download-link');
                    link.href = url;
                    link.download = `${originalFileName}_cut.mp3`;
                    pBar.style.width = "100%";
                    statusText.innerText = t('cut_status_done');
                    statusText.style.color = "var(--acc2)";
                    downloadWrap.style.display = "flex";
                    document.getElementById('btn-save').disabled = false;
                }
            );
        } else {
            // WAV — الطريقة الأصلية
            pBar.style.width = "100%";
            statusText.innerText = t('cut_status_done');
            statusText.style.color = "var(--acc2)";

            const wavBlob = audioBufferToWav(renderedBuffer);
            const url = URL.createObjectURL(wavBlob);

            const link = document.getElementById('download-link');
            link.href = url;
            link.download = `${originalFileName}_cut.wav`; // [تعديل 1]
            downloadWrap.style.display = "flex";
            document.getElementById('btn-save').disabled = false;
        }
    }, 100);
}

// محول الـ WAV الداخلي — بدون تعديل
function audioBufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels, sampleRate = buffer.sampleRate, format = 1, bitDepth = 16;
    let resultBuffer = numOfChan === 2 ? interleave(buffer.getChannelData(0), buffer.getChannelData(1)) : buffer.getChannelData(0);
    let bufferLength = resultBuffer.length * 2;
    let bufferArr = new ArrayBuffer(44 + bufferLength);
    let view = new DataView(bufferArr);
    
    writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + bufferLength, true); writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, format, true);
    view.setUint16(22, numOfChan, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true); view.setUint16(34, bitDepth, true); writeString(view, 36, 'data');
    view.setUint32(40, bufferLength, true);
    
    for (let i = 0; i < resultBuffer.length; i++) {
        let s = Math.max(-1, Math.min(1, resultBuffer[i]));
        view.setInt16(44 + (i * 2), s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
}

function interleave(inputL, inputR) {
    let length = inputL.length + inputR.length;
    let result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) { result[index++] = inputL[inputIndex]; result[index++] = inputR[inputIndex]; inputIndex++; }
    return result;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
}

// [تعديل 3] نسخ من audio_adapter — ترميز MP3 بـ lamejs
function encodeAudioBufferToMp3Async(buffer, onProgress, onComplete) {
    let channels = buffer.numberOfChannels;
    let sampleRate = buffer.sampleRate;
    let mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 192);
    let mp3Data = [];

    function floatTo16Bit(input) {
        let output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    let left = floatTo16Bit(buffer.getChannelData(0));
    let right = channels > 1 ? floatTo16Bit(buffer.getChannelData(1)) : left;

    let sampleBlockSize = 1152;
    let index = 0;

    function processChunk() {
        let blocksPerYield = 250;
        let loops = 0;
        while (index < left.length && loops < blocksPerYield) {
            let leftChunk  = left.subarray(index, index + sampleBlockSize);
            let rightChunk = channels > 1 ? right.subarray(index, index + sampleBlockSize) : leftChunk;
            let mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) mp3Data.push(mp3buf);
            index += sampleBlockSize;
            loops++;
        }
        if (index < left.length) {
            onProgress(Math.round((index / left.length) * 100));
            setTimeout(processChunk, 4);
        } else {
            let mp3buf = mp3encoder.flush();
            if (mp3buf.length > 0) mp3Data.push(mp3buf);
            let blob = new Blob(mp3Data, { type: 'audio/mp3' });
            onComplete(blob);
        }
    }
    processChunk();
}

// ── Dropdown صيغة التصدير ─────────────────────────────────────
window.addEventListener('load', () => {
    new ArsenalDropdown({
        containerId  : 'acut-dd-format',
        inputId      : 'target-format',
        accentVar    : '--acc',
        defaultValue : 'WAV',
        options: [
            { value: 'WAV', label: 'WAV', desc: window.t ? t('adp_wav_desc') : 'خام ونقي 100%' },
            { value: 'MP3', label: 'MP3', desc: window.t ? t('adp_mp3_desc') : 'مضغوط وعالي التوافق' },
        ],
    });
});
