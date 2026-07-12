// ══════════════════════════════════════════════
//  Arsenal — مستخرج الصوت من الفيديو (معزول)
//  لا يستخدم FFmpeg — يعتمد على AudioContext
// ══════════════════════════════════════════════

(function () {

    // ── DOM refs ──────────────────────────────
    const vcVideoInput       = document.getElementById('vc-video-input');
    const vcDropLabel        = document.getElementById('vc-drop-label');
    const vcDropZone         = document.getElementById('vc-drop-zone');
    const vcStatusBox        = document.getElementById('vc-status-box');
    const vcStatusMsg        = document.getElementById('vc-status-msg');
    const vcBarFill          = document.getElementById('vc-bar-fill');
    const vcStatusPct        = document.getElementById('vc-status-pct');
    const vcStatsArea        = document.getElementById('vc-stats-area');
    const vcVideoSize        = document.getElementById('vc-video-size');
    const vcAudioSize        = document.getElementById('vc-audio-size');
    const vcPreviewBox       = document.getElementById('vc-preview-box');
    const vcPlayBtn          = document.getElementById('vc-play-btn');
    const vcPlayText         = document.getElementById('vc-play-text');
    const vcPlayIcon         = document.getElementById('vc-play-icon');
    const vcProgressWrapper  = document.getElementById('vc-progress-wrapper');
    const vcProgressTrack    = document.getElementById('vc-progress-track');
    const vcProgressFill     = document.getElementById('vc-progress-fill');
    const vcProgressThumb    = document.getElementById('vc-progress-thumb');
    const vcCurrentTime      = document.getElementById('vc-current-time');
    const vcTotalTime        = document.getElementById('vc-total-time');
    const vcDownloadWrap     = document.getElementById('vc-download-wrap');
    const vcDownloadBtn      = document.getElementById('vc-download-btn');

    // ── حالة الـ player ───────────────────────
    let audioBlobUrl  = null;
    let vcAudioCtx    = null;
    let vcAudioBuffer = null;
    let vcSourceNode  = null;
    let vcIsPlaying   = false;
    let vcCurrentPos  = 0;
    let vcStartTime   = 0;
    let vcTotalDur    = 0;
    let vcTimerID     = null;
    let vcIsScrubbing = false;

    // ── اختيار الملف ─────────────────────────
    vcVideoInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        processVideo(e.target.files[0]);
    });

    // ── المعالجة الرئيسية ────────────────────
    async function processVideo(file) {
        vcDropLabel.innerText     = t('vcv_file_selected', { name: file.name });
        vcDropLabel.style.color   = 'var(--acc2)';
        vcStatusBox.style.display = 'block';
        vcPreviewBox.style.display   = 'none';
        vcDownloadWrap.style.display = 'none';
        vcStatsArea.style.display    = 'none';

        setProgress(10, t('vcv_status_reading'));

        try {
            const arrayBuffer = await file.arrayBuffer();
            setProgress(30, t('vcv_status_decoding'));

            const AudioCtx  = window.AudioContext || window.webkitAudioContext;
            const audioCtx  = new AudioCtx();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            setProgress(75, t('vcv_status_generating'));

            // تحويل AudioBuffer → WAV
            const wavBlob = bufferToWav(audioBuffer);
            if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
            audioBlobUrl = URL.createObjectURL(wavBlob);

            // بناء AudioContext للـ player
            vcAudioCtx    = new (window.AudioContext || window.webkitAudioContext)();
            const wavArrBuf = wavBlob.arrayBuffer
                ? await wavBlob.arrayBuffer()
                : await new Promise(r => {
                    const fr = new FileReader();
                    fr.onload = e => r(e.target.result);
                    fr.readAsArrayBuffer(wavBlob);
                });
            vcAudioBuffer = await vcAudioCtx.decodeAudioData(wavArrBuf);
            vcTotalDur    = vcAudioBuffer.duration;
            vcCurrentPos  = 0;
            vcTotalTime.innerText   = formatTime(vcTotalDur);
            vcCurrentTime.innerText = '00:00';
            setVcProgress(0);

            // الإحصائيات
            vcVideoSize.innerText = formatBytes(file.size);
            vcAudioSize.innerText = formatBytes(wavBlob.size);

            // زر التحميل
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            vcDownloadBtn.onclick = async () => {
                const fmt = document.getElementById('vcv-format').value;
                if (fmt === 'mp3') {
                    vcDownloadBtn.disabled = true;
                    setProgress(10, t('vcv_status_generating') || 'جاري التحويل...');
                    vcStatusBox.style.display = 'block';
                    try {
                        const mp3Blob = await bufferToMp3(audioBuffer);
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(mp3Blob);
                        a.download = 'Arsenal_' + baseName + '_audio.mp3';
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                    } catch (e) {
                        console.error('[Arsenal] MP3 encode error:', e);
                    } finally {
                        vcStatusBox.style.display = 'none';
                        vcDownloadBtn.disabled    = false;
                    }
                } else {
                    const a = document.createElement('a');
                    a.href      = audioBlobUrl;
                    a.download  = 'Arsenal_' + baseName + '_audio.wav';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                }
            };

            // إظهار النتائج
            setProgress(100, t('vcv_status_done'));
            setTimeout(() => {
                vcStatusBox.style.display    = 'none';
                vcStatsArea.style.display    = 'flex';
                vcPreviewBox.style.display   = 'block';
                vcDownloadWrap.style.display = 'flex';
                vcPlayBtn.disabled           = false;
                // الآن العنصر مرئي وله أبعاد — ننشئ الـ dropdown
                initFormatDropdown();
            }, 400);

        } catch (err) {
            vcStatusBox.style.display  = 'none';
            vcDropLabel.innerText      = t('vcv_err_no_audio');
            vcDropLabel.style.color    = '#ff4b4b';
            console.error('[Arsenal] audio extractor:', err);
        }
    }

    // ── شريط التقدم ──────────────────────────
    function setProgress(pct, msg) {
        vcBarFill.style.width = pct + '%';
        vcStatusPct.innerText = pct + '%';
        vcStatusMsg.innerText = msg;
    }

    // ══════════════════════════════════════════
    // Player — كل الكود داخل الـ IIFE لأن
    // المتغيرات (vcAudioBuffer، vcProgressFill…)
    // محددة بـ const هنا ولا يمكن الوصول إليها
    // من خارج الـ IIFE
    // ══════════════════════════════════════════

    function setVcProgress(pct) {
        const p = Math.max(0, Math.min(1, pct)) * 100;
        vcProgressFill.style.width = p + '%';
        vcProgressThumb.style.left = p + '%';
    }

    function vcStartPlay() {
        if (!vcAudioBuffer || !vcAudioCtx) return;
        if (vcAudioCtx.state === 'suspended') vcAudioCtx.resume();
        if (vcSourceNode) { try { vcSourceNode.disconnect(); } catch (e) {} }
        vcSourceNode = vcAudioCtx.createBufferSource();
        vcSourceNode.buffer = vcAudioBuffer;
        vcSourceNode.connect(vcAudioCtx.destination);
        vcSourceNode.start(0, vcCurrentPos);
        vcStartTime = vcAudioCtx.currentTime - vcCurrentPos;
        vcIsPlaying = true;
        vcPlayText.innerText = t('vcv_btn_pause') || 'إيقاف';
        vcPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
        vcPlayBtn.style.background = '#ff4b4b';
        vcSourceNode.onended = () => {
            if (vcIsPlaying) {
                vcIsPlaying  = false;
                vcCurrentPos = 0;
                setVcProgress(0);
                vcCurrentTime.innerText = '00:00';
                vcResetPlayBtn();
            }
        };
        vcTimerID = setInterval(() => {
            if (!vcIsPlaying) return;
            const pos = vcAudioCtx.currentTime - vcStartTime;
            vcCurrentPos = Math.min(pos, vcTotalDur);
            setVcProgress(vcCurrentPos / vcTotalDur);
            vcCurrentTime.innerText = formatTime(vcCurrentPos);
        }, 100);
    }

    function vcStopPlay() {
        if (vcSourceNode) {
            try { vcSourceNode.stop(); vcSourceNode.disconnect(); } catch (e) {}
            vcSourceNode = null;
        }
        if (vcTimerID) { clearInterval(vcTimerID); vcTimerID = null; }
        vcIsPlaying = false;
        vcResetPlayBtn();
    }

    function vcResetPlayBtn() {
        vcPlayText.innerText       = t('vcv_btn_play') || 'تشغيل المعاينة';
        vcPlayIcon.innerHTML       = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        vcPlayBtn.style.background = '';
    }

    // أزرار الـ player
    if (vcPlayBtn) {
        vcPlayBtn.disabled = true;
        vcPlayBtn.addEventListener('click', () => vcIsPlaying ? vcStopPlay() : vcStartPlay());
    }

    // Timeline Scrubbing
    if (vcProgressWrapper) {
        vcProgressWrapper.addEventListener('pointerdown', (e) => {
            if (!vcAudioBuffer) return;
            vcIsScrubbing = true;
            vcProgressWrapper.classList.add('scrubbing');
            vcProgressWrapper.setPointerCapture(e.pointerId);
            const rect = vcProgressTrack.getBoundingClientRect();
            const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            vcCurrentPos = pct * vcTotalDur;
            setVcProgress(pct);
            vcCurrentTime.innerText = formatTime(vcCurrentPos);
            if (vcIsPlaying) vcStopPlay();
        });

        vcProgressWrapper.addEventListener('pointermove', (e) => {
            if (!vcIsScrubbing) return;
            const rect = vcProgressTrack.getBoundingClientRect();
            const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            vcCurrentPos = pct * vcTotalDur;
            setVcProgress(pct);
            vcCurrentTime.innerText = formatTime(vcCurrentPos);
        });

        vcProgressWrapper.addEventListener('pointerup', () => {
            if (!vcIsScrubbing) return;
            vcIsScrubbing = false;
            vcProgressWrapper.classList.remove('scrubbing');
        });

        vcProgressWrapper.addEventListener('pointercancel', () => {
            vcIsScrubbing = false;
            vcProgressWrapper.classList.remove('scrubbing');
        });
    }

    // Dropdown الصيغة — يُنشأ أول مرة عند إظهار vc-download-wrap
    // (لا يُنشأ هنا لأن العنصر داخل display:none فـ clientWidth=0)
    let _ddFormatInit = false;
    function initFormatDropdown() {
        if (_ddFormatInit) return;
        _ddFormatInit = true;
        new ArsenalDropdown({
            containerId  : 'vcv-dd-format',
            inputId      : 'vcv-format',
            accentVar    : '--acc2',
            defaultValue : 'wav',
            options: [
                { value: 'wav', label: 'WAV', desc: t('adp_wav_desc') },
                { value: 'mp3', label: 'MP3', desc: t('adp_mp3_desc') },
            ],
            onChange: (val) => {
                const lbl = document.getElementById('vcv-btn-label');
                if (lbl) lbl.textContent = val === 'mp3' ? t('vcv_btn_down_mp3') : t('vcv_btn_down');
            },
        });
    }

    // ══════════════════════════════════════════
    // مساعدات Audio
    // ══════════════════════════════════════════

    function bufferToWav(buffer) {
        const numChan = buffer.numberOfChannels;
        const length  = buffer.length * numChan * 2 + 44;
        const arr     = new ArrayBuffer(length);
        const view    = new DataView(arr);
        const channels = [];
        let pos = 0, offset = 0;

        function setUint16(d) { view.setUint16(pos, d, true); pos += 2; }
        function setUint32(d) { view.setUint32(pos, d, true); pos += 4; }

        setUint32(0x46464952);                   // "RIFF"
        setUint32(length - 8);
        setUint32(0x45564157);                   // "WAVE"
        setUint32(0x20746d66);                   // "fmt "
        setUint32(16);
        setUint16(1);                            // PCM
        setUint16(numChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numChan);
        setUint16(numChan * 2);
        setUint16(16);                           // 16-bit
        setUint32(0x61746164);                   // "data"
        setUint32(length - pos - 4);

        for (let i = 0; i < numChan; i++)
            channels.push(buffer.getChannelData(i));

        while (pos < length) {
            for (let i = 0; i < numChan; i++) {
                let s = Math.max(-1, Math.min(1, channels[i][offset]));
                s = s < 0 ? s * 0x8000 : s * 0x7FFF;
                view.setInt16(pos, s, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([arr], { type: 'audio/wav' });
    }

    function bufferToMp3(buffer) {
        return new Promise((resolve, reject) => {
            try {
                const numChan    = Math.min(buffer.numberOfChannels, 2);
                const sampleRate = buffer.sampleRate;
                const kbps       = 128;
                const mp3enc     = new lamejs.Mp3Encoder(numChan, sampleRate, kbps);
                const blockSize  = 1152;
                const mp3Data    = [];

                const left  = pcmFloat32ToInt16(buffer.getChannelData(0));
                const right = numChan > 1 ? pcmFloat32ToInt16(buffer.getChannelData(1)) : left;

                for (let i = 0; i < buffer.length; i += blockSize) {
                    const lChunk  = left.subarray(i, i + blockSize);
                    const rChunk  = right.subarray(i, i + blockSize);
                    const encoded = numChan > 1
                        ? mp3enc.encodeBuffer(lChunk, rChunk)
                        : mp3enc.encodeBuffer(lChunk);
                    if (encoded.length > 0) mp3Data.push(new Int8Array(encoded));
                }

                const flushed = mp3enc.flush();
                if (flushed.length > 0) mp3Data.push(new Int8Array(flushed));

                resolve(new Blob(mp3Data, { type: 'audio/mp3' }));
            } catch (e) { reject(e); }
        });
    }

    function pcmFloat32ToInt16(float32) {
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16;
    }

    function formatBytes(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024, s = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
    }

    function formatTime(s) {
        const m   = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
    }

})();
