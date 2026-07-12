// تحديد الصيغة من الخيارات المدمجة
function selectFormat(el, format) {
    document.querySelectorAll('.audio-adapter-container .format-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelectorAll('.audio-adapter-container .format-radio').forEach(r => {
        r.classList.remove('active');
    });
    el.classList.add('selected');
    document.getElementById('radio-' + format).classList.add('active');
    document.getElementById('target-format').value = format;
}

// تهيئة الاختيار الافتراضي عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    const firstOption = document.querySelector('.audio-adapter-container .format-option');
    if (firstOption) selectFormat(firstOption, 'MP3');
});
// تهيئة فورية كذلك (في حال الـ DOM جاهز)
(function() {
    const firstOption = document.querySelector('.audio-adapter-container .format-option');
    if (firstOption) selectFormat(firstOption, 'MP3');
})();

// ========================================================
// محرك ترسانة محول الصوتيات (مضاد للتجميد)
// ========================================================

let uploadedFile = null;

const fileInput = document.getElementById('audioFile');
const fileDetails = document.getElementById('file-details');
const actionBtn = document.getElementById('action-btn');
const targetFormat = document.getElementById('target-format');
const statusBox = document.getElementById('status-box');
const statusText = document.getElementById('status-text');
const pBar = document.getElementById('p-bar');
const downloadWrapper = document.getElementById('download-wrapper');
const downloadLink = document.getElementById('download-link');

// 1. استقبال الملف
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadedFile = file;
    
    fileDetails.innerText = t('adp_file_selected', { name: file.name });
    fileDetails.style.color = "var(--acc2)";
    
    actionBtn.disabled = false;
    statusBox.style.display = "none";
    downloadWrapper.style.display = "none";
});

// 2. محرك التوجيه ومعالجة التحويل
actionBtn.addEventListener('click', async () => {
    if (!uploadedFile) return;

    const format = targetFormat.value;
    
    // تهيئة واجهة المستخدم للتحويل
    actionBtn.disabled = true;
    statusBox.style.display = "block";
    downloadWrapper.style.display = "none";
    pBar.style.width = "10%";

    statusText.innerText = t('adp_status_reading');
    
    try {
        // مسار ZIP السريع والمستقل
        if (format === "ZIP") {
            processZipConversion();
            return;
        }

        // المسارات الصوتية (تحتاج Web Audio API)
        const arrayBuffer = await uploadedFile.arrayBuffer();
        pBar.style.width = "30%";
        
        // مسار OGG السريع
        if (format === "OGG") {
            statusText.innerText = t('adp_status_encoding');
            const oggBlob = new Blob([arrayBuffer], { type: 'audio/ogg' });
            finishConversion(oggBlob, "audio_converted.ogg");
            return;
        }

        // فك تشفير الصوت لمسارات WAV و MP3
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        pBar.style.width = "50%";

        if (format === "WAV") {
            statusText.innerText = t('adp_status_writing');
            const wavBlob = encodeAudioBufferToWav(audioBuffer);
            finishConversion(wavBlob, "audio_converted.wav");
        } 
        else if (format === "MP3") {
            if (typeof lamejs === 'undefined') {
                statusText.innerText = t('adp_err_no_mp3lib');
                actionBtn.disabled = false;
                return;
            }
            
            statusText.innerText = t('adp_status_compressing');
            
            // استخدام التشفير المجزأ لمنع تجميد المتصفح
            encodeAudioBufferToMp3Async(audioBuffer, 
                (progress) => {
                    // تحديث شريط التقدم بين 50% و 100%
                    let actualProgress = 50 + (progress / 2);
                    pBar.style.width = `${actualProgress}%`;
                    statusText.innerText = t('adp_status_progress', { pct: progress });
                }, 
                (mp3Blob) => {
                    finishConversion(mp3Blob, "audio_converted.mp3");
                }
            );
        }

    } catch (e) {
        statusText.innerText = t('adp_err_read_fail');
        actionBtn.disabled = false;
        pBar.style.width = "0%";
    }
});

// إنهاء العملية وعرض زر التحميل
function finishConversion(blob, filename) {
    pBar.style.width = "100%";
    statusText.innerText = t('adp_status_done');
    
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = filename;
    
    downloadWrapper.style.display = "flex";
    actionBtn.disabled = false;
}

// ----------------------------------------------------
// محركات التحويل (Encoders)
// ----------------------------------------------------

// 🗜️ محرك ZIP
async function processZipConversion() {
    try {
        if (typeof JSZip === 'undefined') throw new Error("JSZip not found");
        
        statusText.innerText = t('adp_status_zipping');
        pBar.style.width = "60%";
        
        const zip = new JSZip();
        zip.file(uploadedFile.name, uploadedFile);
        
        const content = await zip.generateAsync({ type: "blob" });
        finishConversion(content, "Arsenal_Audio_Package.zip");
    } catch (e) {
        statusText.innerText = t('adp_err_zip');
        actionBtn.disabled = false;
    }
}

// 🎵 محرك WAV
function encodeAudioBufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        sampleRate = buffer.sampleRate,
        format = 1, bitDepth = 16;
    
    let resultBuffer = numOfChan === 2 ? interleave(buffer.getChannelData(0), buffer.getChannelData(1)) : buffer.getChannelData(0);
    let bufferLength = resultBuffer.length * 2;
    let bufferArr = new ArrayBuffer(44 + bufferLength);
    let view = new DataView(bufferArr);
    
    writeStringToDataView(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength, true);
    writeStringToDataView(view, 8, 'WAVE');
    writeStringToDataView(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, bitDepth, true);
    writeStringToDataView(view, 36, 'data');
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
    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
}

function writeStringToDataView(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// 🎼 محرك MP3 غير المتزامن (Asynchronous Anti-Freeze Encoder)
function encodeAudioBufferToMp3Async(buffer, onProgress, onComplete) {
    let channels = buffer.numberOfChannels;
    let sampleRate = buffer.sampleRate;
    let mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 192); // جودة 192kbps
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
            let leftChunk = left.subarray(index, index + sampleBlockSize);
            let rightChunk = channels > 1 ? right.subarray(index, index + sampleBlockSize) : leftChunk;
            
            let mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) mp3Data.push(mp3buf);
            
            index += sampleBlockSize;
            loops++;
        }
        
        if (index < left.length) {
            let percentage = Math.round((index / left.length) * 100);
            onProgress(percentage);
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
// ── Dropdown الصيغة ──────────────────────────────────────────────
window.addEventListener('load', () => {
    new ArsenalDropdown({
        containerId  : 'adp-dd-format',
        inputId      : 'target-format',
        accentVar    : '--acc',
        defaultValue : 'MP3',
        options: [
            { value: 'MP3', label: 'MP3',      desc: window.t ? t('adp_mp3_desc') : 'مضغوط وعالي التوافق' },
            { value: 'WAV', label: 'WAV',      desc: window.t ? t('adp_wav_desc') : 'خام ونقي 100%' },
            { value: 'OGG', label: 'OGG/WebM', desc: window.t ? t('adp_ogg_desc') : 'مثالي للويب' },
            { value: 'ZIP', label: 'ZIP',      desc: window.t ? t('adp_zip_desc') : 'أرشفة الملف كما هو' },
        ],
    });
});
