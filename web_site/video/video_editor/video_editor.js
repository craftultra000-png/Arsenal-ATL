// ══════════════════════════════════════════════
//  Arsenal — محرر الفيديو V3
//  Full-Screen App Layout
// ══════════════════════════════════════════════

(function () {

    const C = (id) => document.getElementById(id);

    // ── DOM refs ─────────────────────────────────────────────────────
    const veVideoInput    = C('ve-video-input');
    const veAudioInput    = C('ve-audio-input');
    const veVideoLabel    = C('ve-video-label');
    const veAudioLabel    = C('ve-audio-label');
    const veVideoPill     = C('ve-video-pill');
    const veAudioPill     = C('ve-audio-pill');

    const veCanvas        = C('ve-canvas');
    const veCtx           = veCanvas.getContext('2d');
    const veTimeDisplay   = C('ve-time-display');
    const vePlayBtn       = C('ve-play-btn');
    const veNoVideo       = C('ve-no-video');

    const veTStart        = C('ve-t-start');
    const veTEnd          = C('ve-t-end');
    const veASlider       = C('ve-a-start');
    const veLblStart      = C('ve-lbl-start');
    const veLblEnd        = C('ve-lbl-end');
    const veLblAud        = C('ve-lbl-aud');
    const veTrackFill     = C('ve-track-fill');

    const veAVol          = C('ve-a-vol');
    const veValVol        = C('ve-val-vol');
    const veSelRes        = C('ve-sel-res');

    const veExportBtn     = C('ve-export-btn');
    const veStatusOverlay = C('ve-status-overlay');
    const veStatusMsg     = C('ve-status-msg');
    const veBarFill       = C('ve-bar-fill');
    const veStatusPct     = C('ve-status-pct');

    const veToast         = C('ve-toast');
    const veNewSize       = C('ve-new-size');
    const veDownloadBtn   = C('ve-download-btn');

    const veActiveSlider  = C('ve-active-slider');
    const veSliderName    = C('ve-slider-name');
    const veSliderVal     = C('ve-slider-val');
    const veMainSlider    = C('ve-main-slider');

    // ── حالة التأثيرات ────────────────────────────────────────────────
    const filters = {
        brightness: 100, contrast: 100, exposure: 0,
        highlights: 0,   shadows: 0,    vignette: 0,
        saturation: 100, hue: 0,        warmth: 0,
        fade: 0,         sharpness: 0,  noise: 0,
    };

    let activeToolBtn    = null;
    let activeTool       = null;

    // ── الحالة الداخلية ───────────────────────────────────────────────
    const vid = document.createElement('video');
    const aud = document.createElement('audio');
    let vidDuration       = 0;
    let isPlaying         = false;
    let ffmpegInstance    = null;
    let originalVideoSize = 0;
    let outputBlob        = null;
    let originalVideoSrc  = null;
    let currentVideoFile  = null;
    let currentAudioFile  = null;

    // ── fetchFile ─────────────────────────────────────────────────────
    async function fetchFileFallback(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(new Uint8Array(reader.result));
            reader.onerror = () => reject(new Error('فشل قراءة الملف'));
            reader.readAsArrayBuffer(file);
        });
    }

    // ── مسارات FFmpeg ─────────────────────────────────────────────────
    function getFfmpegPaths() {
        const scripts  = [...document.querySelectorAll('script[src]')];
        const veScript = scripts.find(s => s.src.includes('video_editor.js'));
        if (!veScript) return null;
        const base = veScript.src.replace('video/video_editor/video_editor.js', 'core/core_app/core_ffmpeg/');
        return { base, coreURL: base + 'ffmpeg-core.js', wasmURL: 'https://huggingface.co/datasets/Silvr0098/arsenal-cdn/resolve/main/ffmpeg-core.wasm', workerURL: base + 'ffmpeg-core.worker.js' };
    }

    // ── تهيئة FFmpeg ──────────────────────────────────────────────────
    async function initFFmpeg() {
        if (ffmpegInstance) return true;
        try {
            veStatusMsg.innerText = t('ve_status_loading_ffmpeg');
            const FFmpegLib = window.FFmpegWASM;
            if (!FFmpegLib?.FFmpeg) throw new Error(t('ve_err_ffmpeg_load'));
            ffmpegInstance = new FFmpegLib.FFmpeg();
            ffmpegInstance.on('progress', ({ progress }) => {
                const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
                veBarFill.style.width = pct + '%';
                veStatusPct.innerText = pct + '%';
            });
            veStatusMsg.innerText = t('ve_status_loading_core');
            const paths = getFfmpegPaths();
            if (!paths) throw new Error(t('ve_err_ffmpeg_load'));
            const workerScript   = document.querySelector('script[src*="814.ffmpeg.js"]');
            const classWorkerURL = workerScript ? workerScript.src : paths.base + '814.ffmpeg.js';
            await ffmpegInstance.load({ classWorkerURL, coreURL: paths.coreURL, wasmURL: paths.wasmURL, workerURL: paths.workerURL });
            return true;
        } catch (err) {
            console.error('❌ FFmpeg:', err.message);
            ffmpegInstance = null;
            return false;
        }
    }

    // ── رفع الفيديو ───────────────────────────────────────────────────
    veVideoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentVideoFile  = file;
        originalVideoSize = file.size;
        veVideoLabel.innerText = file.name;
        veVideoPill.classList.add('has-file');
        veToast.style.display = 'none';
        outputBlob = null;
        if (originalVideoSrc) URL.revokeObjectURL(originalVideoSrc);
        originalVideoSrc = URL.createObjectURL(file);
        vid.src = originalVideoSrc;
        vid.onloadedmetadata = () => {
            vidDuration = vid.duration;
            veCanvas.width  = vid.videoWidth  || 640;
            veCanvas.height = vid.videoHeight || 360;
            veTStart.max = veTEnd.max = veASlider.max = vidDuration;
            veTEnd.value = vidDuration;
            veLblEnd.innerText = vidDuration.toFixed(1);
            updateTimeline();
            drawFrame();
            veNoVideo.style.display = 'none';
            veExportBtn.disabled = false;
        };
    });

    // ── رفع الصوت ─────────────────────────────────────────────────────
    veAudioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentAudioFile = file;
        veAudioLabel.innerText = file.name;
        veAudioPill.classList.add('has-file');
        aud.src = URL.createObjectURL(file);
    });

    // ── التشغيل ───────────────────────────────────────────────────────
    vePlayBtn.addEventListener('click', togglePlay);

    function togglePlay() {
        if (isPlaying) {
            vid.pause(); aud.pause();
            vePlayBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
            isPlaying = false;
        } else {
            if (vid.currentTime >= parseFloat(veTEnd.value)) vid.currentTime = parseFloat(veTStart.value);
            vid.play();
            vePlayBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
            isPlaying = true;
            loop();
        }
    }

    function loop() {
        if (!isPlaying) return;
        const end = parseFloat(veTEnd.value);
        if (vid.currentTime >= end) { togglePlay(); return; }
        handleAudioSync();
        drawFrame();
        veTimeDisplay.innerText = formatTime(vid.currentTime) + ' / ' + formatTime(end);
        requestAnimationFrame(loop);
    }

    function handleAudioSync() {
        if (!currentAudioFile) return;
        const aStart = parseFloat(veASlider.value);
        if (vid.currentTime >= aStart) {
            if (aud.paused) { aud.currentTime = vid.currentTime - aStart; aud.play().catch(() => {}); }
            else if (Math.abs(aud.currentTime - (vid.currentTime - aStart)) > 0.3) aud.currentTime = vid.currentTime - aStart;
        } else { if (!aud.paused) aud.pause(); }
    }

    // ── التايم لاين ───────────────────────────────────────────────────
    veTStart.addEventListener('input', updateTimeline);
    veTEnd.addEventListener('input', updateTimeline);
    veASlider.addEventListener('input', updateTimeline);

    function updateTimeline() {
        let s = parseFloat(veTStart.value);
        let e = parseFloat(veTEnd.value);
        const a = parseFloat(veASlider.value);
        const max = vidDuration || 100;
        if (s >= e) { s = e - 0.1; veTStart.value = s; }
        veLblStart.innerText = s.toFixed(1);
        veLblEnd.innerText   = e.toFixed(1);
        veLblAud.innerText   = a.toFixed(1);
        const pS = (s / max) * 100, pE = (e / max) * 100;
        veTrackFill.style.background =
            `linear-gradient(to right, rgba(255,75,75,0.3) ${pS}%, rgba(54,124,238,0.25) ${pS}%, rgba(54,124,238,0.25) ${pE}%, rgba(255,75,75,0.3) ${pE}%)`;
        if (!isPlaying) { vid.currentTime = s; drawFrame(); }
    }

    // ── Tabs ──────────────────────────────────────────────────────────
    document.querySelectorAll('.ve-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ve-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.ve-tools-group').forEach(g => g.style.display = 'none');
            tab.classList.add('active');
            const group = document.querySelector(`.ve-tools-group[data-group="${tab.dataset.tab}"]`);
            if (group) group.style.display = tab.dataset.tab === 'export' ? 'flex' : 'flex';
            // hide slider if tool not in current tab
            if (activeTool) {
                const btn = document.querySelector(`.ve-tool-btn[data-tool="${activeTool}"]`);
                if (!btn || btn.closest('.ve-tools-group').style.display === 'none') {
                    veActiveSlider.style.display = 'none';
                    if (activeToolBtn) activeToolBtn.classList.remove('active');
                    activeTool = null; activeToolBtn = null;
                }
            }
        });
    });

    // ── أزرار الأدوات ─────────────────────────────────────────────────
    document.querySelectorAll('.ve-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (activeToolBtn) activeToolBtn.classList.remove('active');
            btn.classList.add('active');
            activeToolBtn = btn; activeTool = tool;

            veMainSlider.min   = btn.dataset.min;
            veMainSlider.max   = btn.dataset.max;
            veMainSlider.step  = (parseFloat(btn.dataset.max) - parseFloat(btn.dataset.min)) > 50 ? 1 : 0.5;
            veMainSlider.value = filters[tool];

            veSliderName.innerText = (typeof t === 'function') ? t(btn.dataset.langLabel) : (btn.querySelector('span')?.innerText || tool);
            veSliderVal.innerText  = formatFilterVal(tool, filters[tool], btn.dataset.unit || '');
            veActiveSlider.style.display = 'block';
            updateSliderGradient();
        });
    });

    veMainSlider.addEventListener('input', () => {
        if (!activeTool) return;
        const val = parseFloat(veMainSlider.value);
        const btn = document.querySelector(`.ve-tool-btn[data-tool="${activeTool}"]`);
        filters[activeTool] = val;
        veSliderVal.innerText = formatFilterVal(activeTool, val, btn?.dataset.unit || '');
        updateSliderGradient();
        if (btn) btn.classList.toggle('modified', val !== parseFloat(btn.dataset.default) && !btn.classList.contains('active'));
        if (!isPlaying) drawFrame();
    });

    function formatFilterVal(tool, val, unit) {
        if (unit === '%') return Math.round(val) + '%';
        if (unit === '°') return Math.round(val) + '°';
        return (val > 0 ? '+' : '') + Math.round(val);
    }

    function updateSliderGradient() {
        const min = parseFloat(veMainSlider.min), max = parseFloat(veMainSlider.max);
        const pct = ((parseFloat(veMainSlider.value) - min) / (max - min)) * 100;
        veMainSlider.style.background = `linear-gradient(to right, var(--acc) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
    }

    // ── صوت التصدير ───────────────────────────────────────────────────
    veAVol.addEventListener('input', () => {
        veValVol.innerText = veAVol.value + '%';
        vid.volume = veAVol.value / 100;
    });

    // ── drawFrame ─────────────────────────────────────────────────────
    function updateSharpen(val) {
        const v = (val / 100) * 0.2;
        const matrix = v === 0 ? '0 0 0 0 1 0 0 0 0' : `0 ${-v} 0 ${-v} ${1+4*v} ${-v} 0 ${-v} 0`;
        C('ve-sharp-matrix').setAttribute('kernelMatrix', matrix);
    }

    function drawFrame() {
        const f = filters;
        const br = f.brightness + (f.exposure * 0.3);
        updateSharpen(f.sharpness);
        let filterStr = `brightness(${br}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;
        if (f.warmth > 0) filterStr += ` sepia(${f.warmth * 0.5}%)`;
        if (f.fade > 0)   filterStr += ` opacity(${100 - f.fade * 0.3}%)`;
        if (f.sharpness > 0) filterStr += ` url(#ve-svg-sharpen)`;
        veCtx.filter = filterStr;
        veCtx.drawImage(vid, 0, 0, veCanvas.width, veCanvas.height);
        if (f.vignette > 0) {
            const alpha = f.vignette / 100 * 0.85;
            const grd = veCtx.createRadialGradient(veCanvas.width/2, veCanvas.height/2, veCanvas.height*0.3, veCanvas.width/2, veCanvas.height/2, veCanvas.height*0.75);
            grd.addColorStop(0, 'rgba(0,0,0,0)');
            grd.addColorStop(1, `rgba(0,0,0,${alpha})`);
            veCtx.filter = 'none';
            veCtx.fillStyle = grd;
            veCtx.fillRect(0, 0, veCanvas.width, veCanvas.height);
        }
        if (f.noise > 0) applyNoise(f.noise);
    }

    function applyNoise(amount) {
        try {
            const imgData = veCtx.getImageData(0, 0, veCanvas.width, veCanvas.height);
            const d = imgData.data, factor = amount * 0.8;
            for (let i = 0; i < d.length; i += 4) {
                const n = (Math.random() - 0.5) * factor;
                d[i] = Math.min(255, Math.max(0, d[i]+n));
                d[i+1] = Math.min(255, Math.max(0, d[i+1]+n));
                d[i+2] = Math.min(255, Math.max(0, d[i+2]+n));
            }
            veCtx.putImageData(imgData, 0, 0);
        } catch (_) {}
    }

    // ── التصدير ───────────────────────────────────────────────────────
    veExportBtn.addEventListener('click', startExport);

    async function startExport() {
        if (!currentVideoFile) return;
        if (isPlaying) togglePlay();
        veStatusOverlay.style.display = 'flex';
        veToast.style.display = 'none';
        veExportBtn.disabled = true;
        veExportBtn.querySelector('span').innerText = t('ve_btn_processing');
        veBarFill.style.width = '0%'; veStatusPct.innerText = '0%';
        try {
            const ok = await initFFmpeg();
            if (!ok) throw new Error(t('ve_err_ffmpeg_load'));
            const ffmpeg = ffmpegInstance, f = filters;
            const startT = parseFloat(veTStart.value) || 0;
            const endT   = parseFloat(veTEnd.value)   || vidDuration;
            const res    = veSelRes.value;
            const br_ff  = ((f.brightness + f.exposure * 0.3) - 100) / 350;
            const con_ff = f.contrast / 100;
            const sat_ff = f.saturation / 100;
            const shp_ff = f.sharpness / 50;
            const vol_ff = parseInt(veAVol.value) / 100;

            veStatusMsg.innerText = t('ve_status_reading');
            await ffmpeg.writeFile('input_vid.mp4', await fetchFileFallback(currentVideoFile));
            const hasAudio = !!currentAudioFile;
            if (hasAudio) { veStatusMsg.innerText = t('ve_status_merging'); await ffmpeg.writeFile('input_aud', await fetchFileFallback(currentAudioFile)); }

            let eqStr = `eq=brightness=${br_ff.toFixed(4)}:contrast=${con_ff.toFixed(4)}:saturation=${sat_ff.toFixed(4)}`;
            if (f.hue !== 0) eqStr += `,hue=h=${f.hue}`;
            let vfStr = res === 'original' ? eqStr : `scale=-2:${res},${eqStr}`;
            if (shp_ff > 0) vfStr += `,unsharp=5:5:${shp_ff.toFixed(3)}`;
            if (f.fade > 0) vfStr += `,curves=all='0/0 0.3/${(f.fade*0.003).toFixed(3)} 1/${(1-f.fade*0.002).toFixed(3)}'`;
            if (f.vignette > 0) vfStr += `,vignette=angle=${(f.vignette/100*1.5).toFixed(2)}`;
            if (f.noise > 0)   vfStr += `,noise=alls=${Math.round(f.noise*0.2)}:allf=t`;

            let args = ['-ss', startT.toString(), '-to', endT.toString(), '-i', 'input_vid.mp4'];
            if (hasAudio) {
                const aStartMs = parseFloat(veASlider.value) * 1000;
                args.push('-i', 'input_aud', '-filter_complex',
                    `[0:v]${vfStr}[v];[0:a]volume=${vol_ff}[ao];[1:a]adelay=${aStartMs}|${aStartMs}[an];[ao][an]amix=inputs=2:duration=first[a]`,
                    '-map', '[v]', '-map', '[a]');
            } else {
                args.push('-vf', vfStr, '-af', `volume=${vol_ff}`);
            }
            args.push('-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', 'output.mp4');

            veStatusMsg.innerText = t('ve_status_exporting');
            await ffmpeg.exec(args);
            veStatusMsg.innerText = t('ve_status_building');
            const data = await ffmpeg.readFile('output.mp4');
            outputBlob = new Blob([data.buffer], { type: 'video/mp4' });
            try { await ffmpeg.deleteFile('input_vid.mp4'); await ffmpeg.deleteFile('output.mp4'); if (hasAudio) await ffmpeg.deleteFile('input_aud'); } catch (_) {}

            veNewSize.innerText = formatBytes(outputBlob.size);
            veStatusOverlay.style.display = 'none';
            veToast.style.display = 'flex';
        } catch (err) {
            veStatusMsg.innerText = (t('ve_err_processing') || 'خطأ') + ': ' + (err.message?.slice(0, 60) || '');
            console.error(err);
        }
        veExportBtn.disabled = false;
        veExportBtn.querySelector('span').innerText = t('ve_btn_export');
    }

    // ── التحميل ───────────────────────────────────────────────────────
    veDownloadBtn.addEventListener('click', () => {
        if (!outputBlob) return;
        const url = URL.createObjectURL(outputBlob);
        const a = document.createElement('a');
        a.href = url; a.download = 'Arsenal_' + (currentVideoFile?.name.replace(/\.[^.]+$/, '') || 'video') + '.mp4';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    // ── دوال مساعدة ───────────────────────────────────────────────────
    function formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024, s = ['B','KB','MB','GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + s[i];
    }

    function formatTime(sec) {
        const m = Math.floor(sec/60), s = Math.floor(sec%60);
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

})();

// ── Dropdown ──────────────────────────────────────────────────────
function waitForTranslations(cb, tries=0) {
    if (window.arsenalTranslations && Object.keys(window.arsenalTranslations).length > 0) cb();
    else if (tries < 50) setTimeout(() => waitForTranslations(cb, tries+1), 100);
    else cb();
}

function initVeDropdowns() {
    if (typeof ArsenalDropdown !== 'function') return;
    new ArsenalDropdown({
        containerId: 've-dd-res', inputId: 've-sel-res',
        accentVar: '--acc', defaultValue: 'original',
        options: [
            { value: 'original', label: t('vcm_res_original'), desc: t('vcm_res_original_desc') },
            { value: '1080', label: '1080p', desc: 'Full HD — 1920×1080' },
            { value: '720',  label: '720p',  desc: 'HD — 1280×720' },
            { value: '480',  label: '480p',  desc: 'SD — 854×480' },
            { value: '360',  label: '360p',  desc: 'Low — 640×360' },
        ],
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => waitForTranslations(initVeDropdowns));
else waitForTranslations(initVeDropdowns);
