import GIF from 'gif.js';
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';
import { toolBySlug } from '@shared/tools';
import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { iconSvg } from '@shared/ui/icons';
import { getLocale, t } from '@shared/i18n';
import './video-editor.css';

const MAX_CLIP_SECONDS = 15;
const MAX_SAFE_FPS = 50;
const MAX_SAFE_FRAMES = 400;
const encoderWorkers = Math.max(1, Math.min(2, navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 2));

type ExportProfile = { width: number; height: number; fps: number; start: number; end: number };

void bootstrapStandaloneTool('video-editor', (shell) => {
  if (!toolBySlug('video-editor')) throw new Error('تعذر العثور على تعريف منشئ GIF.');

  shell.content.innerHTML = `
    <section class="gif-app">
      <header class="gif-app__hero">
        <span class="gif-app__hero-icon" aria-hidden="true">${gifIcon()}</span>
        <div><p>${t('أداة فيديو محلية')}</p><h1>${t('منشئ GIF')}</h1><span>${t('اقتطع وحوّل الفيديو إلى GIF فورياً من المتصفح.')}</span></div>
      </header>

      <section id="gif-dropzone" class="gif-dropzone" aria-label="${t('منطقة رفع فيديو')}">
        <input id="gif-file-input" type="file" accept="video/mp4,video/webm,video/quicktime,video/*" hidden>
        <span class="gif-dropzone__icon" aria-hidden="true">${iconSvg('video')}</span>
        <strong>${t('اسحب الفيديو هنا أو اختره من جهازك')}</strong>
        <p>${t('يدعم MP4 وWebM وMOV. لا يُرفع الفيديو إلى أي خادم.')}</p>
        <button id="gif-choose-file" type="button">${iconSvg('file-plus')}<span>${t('اختيار فيديو')}</span></button>
      </section>

      <section id="gif-studio" class="gif-studio" hidden>
        <div class="gif-preview-card">
          <div class="gif-preview-stage">
            <video id="gif-video" playsinline preload="metadata"></video>
            <div id="gif-preview-empty" class="gif-preview-empty">${gifIcon()}<span>${t('تظهر معاينة الفيديو هنا')}</span></div>
            <button id="gif-play" type="button" class="gif-play" aria-label="${t('تشغيل المعاينة')}">${iconSvg('play')}</button>
            <span id="gif-preview-time" class="gif-preview-time">00:00 / 00:00</span>
          </div>
          <div class="gif-file-summary"><span class="gif-file-summary__icon">${iconSvg('video')}</span><div><b id="gif-file-name">—</b><small id="gif-file-meta">—</small></div><button id="gif-replace-file" type="button">${t('استبدال')}</button></div>
        </div>

        <section class="gif-controls" aria-label="${t('إعدادات GIF')}">
          <div class="gif-control-heading"><div><span class="gif-step">1</span><h2>${t('اقتطاع المقطع')}</h2></div><strong id="gif-clip-duration">0.0 ${t('ث')}</strong></div>
          <p class="gif-controls__intro">${t('اختر بداية ونهاية المقطع. الحد المقترح هو {seconds} ثانية للحفاظ على سرعة التصدير.', { seconds: MAX_CLIP_SECONDS })}</p>
          <div class="gif-timeline-labels"><span>${t('البداية')} <b id="gif-start-label">00:00.0</b></span><span>${t('النهاية')} <b id="gif-end-label">00:00.0</b></span></div>
          <div class="gif-double-range" dir="ltr"><i id="gif-range-fill"></i><input id="gif-start" type="range" min="0" max="1" step="0.1" value="0"><input id="gif-end" type="range" min="0" max="1" step="0.1" value="1"></div>
          <p id="gif-clip-note" class="gif-control-note">${t('سيتم تصدير المقطع المحدد فقط.')}</p>

          <div class="gif-control-heading gif-control-heading--settings"><div><span class="gif-step">2</span><h2>${t('الجودة والأبعاد')}</h2></div><button id="gif-optimize" type="button" class="gif-optimize">${iconSvg('activity')}<span>${t('تحسين بنقرة واحدة')}</span></button></div>
          <div class="gif-settings-grid">
            <label class="gif-setting"><span>${t('معدل الإطارات (FPS)')}</span><div class="gif-setting__range"><input id="gif-fps" type="range" min="10" max="60" step="1" value="20"><output id="gif-fps-value">20 FPS</output></div></label>
            <label class="gif-setting"><span>${t('العرض')}</span><input id="gif-width" type="number" min="80" max="1920" step="2" inputmode="numeric"></label>
            <label class="gif-setting"><span>${t('الارتفاع')}</span><input id="gif-height" type="number" min="80" max="1080" step="2" inputmode="numeric"></label>
          </div>
          <div class="gif-presets" role="group" aria-label="${t('مقاسات سريعة')}"><button type="button" data-gif-preset="original">${t('الأصلية')}</button><button type="button" data-gif-preset="480">480px</button><button type="button" data-gif-preset="360">360px</button><button type="button" data-gif-preset="240">240px</button></div>

          <div class="gif-estimator" aria-live="polite"><div><span>${t('الإطارات الإجمالية')}</span><strong id="gif-frame-count">0</strong></div><div><span>${t('تقدير الحجم')}</span><strong id="gif-size-estimate">—</strong></div><div><span>${t('دقة التصدير')}</span><strong id="gif-output-size">—</strong></div></div>
          <div id="gif-warning" class="gif-warning" hidden></div>
          <button id="gif-export" type="button" class="gif-export" disabled>${gifIcon()}<span>${t('تصدير GIF')}</span></button>
          <p class="gif-export-hint">${t('تتم معالجة الإطارات محلياً في الخلفية، ويمكنك متابعة استخدام الصفحة أثناء التصدير.')}</p>
        </section>
      </section>

      <section id="gif-progress" class="gif-progress" hidden aria-live="polite"><div class="gif-progress__heading"><span>${gifIcon()}</span><div><strong id="gif-progress-text">${t('جاري تجهيز الإطارات…')}</strong><small id="gif-progress-detail">0%</small></div></div><div class="gif-progress__track"><i id="gif-progress-fill"></i></div><button id="gif-cancel" type="button">${t('إلغاء التصدير')}</button></section>
      <section id="gif-result" class="gif-result" hidden><img id="gif-result-image" alt="${t('معاينة GIF الناتج')}"><div><span>${t('تم إنشاء GIF محلياً')}</span><strong id="gif-result-size">—</strong><p id="gif-result-meta">—</p><div class="gif-result__actions"><a id="gif-download" download="Arsenal-GIF.gif">${iconSvg('download')}<span>${t('تنزيل GIF')}</span></a><button id="gif-create-another" type="button">${t('إنشاء GIF آخر')}</button></div></div></section>
    </section>
  `;

  const $ = <T extends Element>(selector: string): T => required<T>(shell.content, selector);
  const app = $<HTMLElement>('.gif-app');
  const dropzone = $<HTMLElement>('#gif-dropzone');
  const fileInput = $<HTMLInputElement>('#gif-file-input');
  const chooseFile = $<HTMLButtonElement>('#gif-choose-file');
  const studio = $<HTMLElement>('#gif-studio');
  const previewVideo = $<HTMLVideoElement>('#gif-video');
  const previewEmpty = $<HTMLElement>('#gif-preview-empty');
  const play = $<HTMLButtonElement>('#gif-play');
  const previewTime = $<HTMLElement>('#gif-preview-time');
  const fileName = $<HTMLElement>('#gif-file-name');
  const fileMeta = $<HTMLElement>('#gif-file-meta');
  const replaceFile = $<HTMLButtonElement>('#gif-replace-file');
  const startInput = $<HTMLInputElement>('#gif-start');
  const endInput = $<HTMLInputElement>('#gif-end');
  const startLabel = $<HTMLElement>('#gif-start-label');
  const endLabel = $<HTMLElement>('#gif-end-label');
  const clipDuration = $<HTMLElement>('#gif-clip-duration');
  const clipNote = $<HTMLElement>('#gif-clip-note');
  const rangeFill = $<HTMLElement>('#gif-range-fill');
  const fpsInput = $<HTMLInputElement>('#gif-fps');
  const fpsValue = $<HTMLOutputElement>('#gif-fps-value');
  const widthInput = $<HTMLInputElement>('#gif-width');
  const heightInput = $<HTMLInputElement>('#gif-height');
  const optimize = $<HTMLButtonElement>('#gif-optimize');
  const frameCount = $<HTMLElement>('#gif-frame-count');
  const sizeEstimate = $<HTMLElement>('#gif-size-estimate');
  const outputSize = $<HTMLElement>('#gif-output-size');
  const warning = $<HTMLElement>('#gif-warning');
  const exportButton = $<HTMLButtonElement>('#gif-export');
  const progress = $<HTMLElement>('#gif-progress');
  const progressText = $<HTMLElement>('#gif-progress-text');
  const progressDetail = $<HTMLElement>('#gif-progress-detail');
  const progressFill = $<HTMLElement>('#gif-progress-fill');
  const cancel = $<HTMLButtonElement>('#gif-cancel');
  const result = $<HTMLElement>('#gif-result');
  const resultImage = $<HTMLImageElement>('#gif-result-image');
  const resultSize = $<HTMLElement>('#gif-result-size');
  const resultMeta = $<HTMLElement>('#gif-result-meta');
  const download = $<HTMLAnchorElement>('#gif-download');
  const createAnother = $<HTMLButtonElement>('#gif-create-another');

  let sourceFile: File | null = null;
  let sourceUrl: string | null = null;
  let gifUrl: string | null = null;
  let videoDuration = 0;
  let nativeWidth = 0;
  let nativeHeight = 0;
  let activeEncoder: GIF | null = null;
  let exporting = false;
  let previewing = false;

  const resetResult = (): void => {
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    gifUrl = null;
    result.hidden = true;
    download.removeAttribute('href');
    resultImage.removeAttribute('src');
  };
  const openPicker = (): void => { if (!exporting) fileInput.click(); };
  const profile = (): ExportProfile => ({ width: even(Number(widthInput.value) || nativeWidth), height: even(Number(heightInput.value) || nativeHeight), fps: Number(fpsInput.value), start: Number(startInput.value), end: Number(endInput.value) });
  const selectedDuration = (): number => Math.max(0, Number(endInput.value) - Number(startInput.value));
  const selectedFrames = (): number => Math.max(1, Math.round(selectedDuration() * Number(fpsInput.value)));
  const setProgress = (value: number, message: string): void => { progress.hidden = false; progressText.textContent = message; progressDetail.textContent = `${Math.round(value)}%`; progressFill.style.width = `${Math.max(0, Math.min(100, value))}%`; };

  function updateTimeline(seeking = true): void {
    const max = videoDuration || 1;
    let start = Math.max(0, Math.min(Number(startInput.value), max));
    let end = Math.max(0, Math.min(Number(endInput.value), max));
    if (start >= end) {
      if (document.activeElement === startInput) { start = Math.max(0, end - 0.1); startInput.value = String(start); }
      else { end = Math.min(max, start + 0.1); endInput.value = String(end); }
    }
    if (end - start > MAX_CLIP_SECONDS) { end = Math.min(max, start + MAX_CLIP_SECONDS); endInput.value = String(end); }
    const duration = end - start;
    startLabel.textContent = formatTime(start);
    endLabel.textContent = formatTime(end);
    clipDuration.textContent = `${duration.toFixed(1)} ${t('ث')}`;
    clipNote.textContent = duration >= MAX_CLIP_SECONDS - 0.01 ? t('حُدّد الحد الأقصى المقترح: {seconds} ثانية.', { seconds: MAX_CLIP_SECONDS }) : t('سيتم تصدير المقطع المحدد فقط.');
    const left = start / max * 100;
    const right = end / max * 100;
    rangeFill.style.background = `linear-gradient(90deg, rgba(255,255,255,.05) ${left}%, rgba(0,212,170,.78) ${left}%, rgba(54,124,238,.85) ${right}%, rgba(255,255,255,.05) ${right}%)`;
    if (seeking && !previewing) previewVideo.currentTime = start;
    updateEstimator();
  }

  function updateDimensions(origin: 'width' | 'height' | 'preset' = 'preset'): void {
    if (!nativeWidth || !nativeHeight) return;
    const ratio = nativeWidth / nativeHeight;
    if (origin === 'width') heightInput.value = String(even(Number(widthInput.value) / ratio));
    if (origin === 'height') widthInput.value = String(even(Number(heightInput.value) * ratio));
    widthInput.value = String(clamp(even(Number(widthInput.value) || nativeWidth), 80, 1920));
    heightInput.value = String(clamp(even(Number(heightInput.value) || nativeHeight), 80, 1080));
    updateEstimator();
  }

  function updateEstimator(): void {
    if (!sourceFile) return;
    const current = profile();
    const frames = selectedFrames();
    fpsValue.textContent = `${current.fps} FPS`;
    frameCount.textContent = new Intl.NumberFormat(getLocale()).format(frames);
    outputSize.textContent = `${current.width} × ${current.height}`;
    const rawEstimate = frames * current.width * current.height * 0.085;
    const estimated = rawEstimate * (current.fps >= 30 ? 1.08 : .94);
    sizeEstimate.textContent = formatBytes(estimated);
    const warnings: string[] = [];
    if (current.fps > MAX_SAFE_FPS) warnings.push(t('معدل {fps} FPS مرتفع؛ قد تخفّض المتصفحات السرعة. نوصي بـ 20–24 FPS.', { fps: current.fps }));
    if (frames > MAX_SAFE_FRAMES) warnings.push(t('سيجري إنشاء {frames} إطاراً؛ اختر مقطعاً أقصر أو FPS أقل لتفادي ملف كبير.', { frames }));
    warning.innerHTML = warnings.length ? `${iconSvg('alert')}<span>${warnings.join(' ')}</span>` : '';
    warning.hidden = !warnings.length;
    exportButton.disabled = !videoDuration || exporting;
  }

  function selectPreset(preset: string): void {
    if (!nativeWidth || !nativeHeight) return;
    if (preset === 'original') { widthInput.value = String(even(nativeWidth)); heightInput.value = String(even(nativeHeight)); }
    else {
      const targetHeight = Number(preset);
      heightInput.value = String(Math.min(targetHeight, nativeHeight));
      widthInput.value = String(even(Number(heightInput.value) * nativeWidth / nativeHeight));
    }
    shell.content.querySelectorAll<HTMLButtonElement>('[data-gif-preset]').forEach((button) => button.classList.toggle('is-active', button.dataset.gifPreset === preset));
    updateDimensions();
  }

  function loadVideo(file: File): void {
    if (!file.type.startsWith('video/')) { shell.setStatus('اختر ملف فيديو صالحاً بصيغة MP4 أو WebM أو MOV.', 'error'); return; }
    resetResult();
    stopPreview();
    sourceFile = file;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    previewVideo.src = sourceUrl;
    previewVideo.load();
    fileName.textContent = file.name;
    fileMeta.textContent = `${formatBytes(file.size)} · ${t('جاري قراءة بيانات الفيديو…')}`;
    dropzone.classList.add('is-loading');
  }

  function stopPreview(): void {
    previewVideo.pause();
    previewing = false;
    play.innerHTML = iconSvg('play');
  }

  async function togglePreview(): Promise<void> {
    if (!sourceFile || !videoDuration || exporting) return;
    if (previewing) { stopPreview(); return; }
    if (previewVideo.currentTime < Number(startInput.value) || previewVideo.currentTime >= Number(endInput.value)) previewVideo.currentTime = Number(startInput.value);
    try { await previewVideo.play(); previewing = true; play.innerHTML = iconSvg('pause'); } catch { shell.setStatus('تعذر تشغيل المعاينة في هذا المتصفح.', 'error'); }
  }

  async function exportGif(): Promise<void> {
    if (!sourceFile || exporting) return;
    const current = profile();
    const frames = selectedFrames();
    if (!current.width || !current.height || !frames) return;
    resetResult();
    stopPreview();
    exporting = true;
    app.classList.add('is-exporting');
    exportButton.disabled = true;
    const canvas = document.createElement('canvas');
    canvas.width = current.width;
    canvas.height = current.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) { exporting = false; app.classList.remove('is-exporting'); shell.setStatus('لا يدعم هذا المتصفح Canvas المطلوب للتصدير.', 'error'); return; }
    const encoder = new GIF({ workers: encoderWorkers, quality: current.width * current.height > 240_000 ? 14 : 10, workerScript: gifWorkerUrl, width: current.width, height: current.height, repeat: 0, dither: 'FloydSteinberg-serpentine' });
    activeEncoder = encoder;
    const frameDelay = Math.round(1000 / current.fps);
    try {
      for (let index = 0; index < frames; index += 1) {
        if (!exporting) throw new Error('أُلغي التصدير.');
        const timestamp = Math.min(current.end - .001, current.start + index / current.fps);
        await seek(previewVideo, timestamp);
        context.fillStyle = '#000';
        context.fillRect(0, 0, current.width, current.height);
        drawCover(context, previewVideo, current.width, current.height);
        encoder.addFrame(canvas, { copy: true, delay: frameDelay });
        setProgress(3 + index / frames * 57, t('تجهيز الإطار {current} من {total}…', { current: index + 1, total: frames }));
        if (index % 6 === 0) await nextFrame();
      }
      await new Promise<Blob>((resolve, reject) => {
        encoder.on('progress', (value) => setProgress(60 + value * 39, t('يجري ضغط GIF في الخلفية…')));
        encoder.on('finished', resolve);
        try { encoder.render(); } catch (error) { reject(error); }
      }).then((blob) => {
        if (!exporting) return;
        gifUrl = URL.createObjectURL(blob);
        resultImage.src = gifUrl;
        download.href = gifUrl;
        download.download = `Arsenal_${sourceFile?.name.replace(/\.[^.]+$/, '') || 'GIF'}.gif`;
        resultSize.textContent = formatBytes(blob.size);
        resultMeta.textContent = `${new Intl.NumberFormat(getLocale()).format(frames)} ${t('إطار')} · ${current.fps} FPS · ${current.width} × ${current.height}`;
        setProgress(100, t('اكتمل إنشاء GIF'));
        result.hidden = false;
      });
    } catch (error) {
      if (exporting) shell.setStatus(`تعذر إنشاء GIF: ${error instanceof Error ? error.message : 'خطأ غير متوقع'}`, 'error');
    } finally {
      activeEncoder = null;
      exporting = false;
      app.classList.remove('is-exporting');
      window.setTimeout(() => { progress.hidden = true; }, 850);
      updateEstimator();
    }
  }

  chooseFile.addEventListener('click', openPicker);
  replaceFile.addEventListener('click', openPicker);
  dropzone.addEventListener('click', (event) => { if (event.target === dropzone || (event.target as Element).closest('.gif-dropzone__icon, strong, p')) openPicker(); });
  ['dragenter', 'dragover'].forEach((event) => dropzone.addEventListener(event, (item) => { item.preventDefault(); if (!exporting) dropzone.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach((event) => dropzone.addEventListener(event, (item) => { item.preventDefault(); dropzone.classList.remove('is-dragging'); }));
  dropzone.addEventListener('drop', (event) => { const file = event.dataTransfer?.files?.[0]; if (file) loadVideo(file); });
  fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) loadVideo(file); });
  previewVideo.addEventListener('loadedmetadata', () => {
    videoDuration = Number.isFinite(previewVideo.duration) ? previewVideo.duration : 0;
    nativeWidth = previewVideo.videoWidth;
    nativeHeight = previewVideo.videoHeight;
    if (!videoDuration || !nativeWidth || !nativeHeight) { shell.setStatus('تعذر قراءة أبعاد الفيديو. جرّب ملفاً آخر.', 'error'); return; }
    startInput.max = String(videoDuration);
    endInput.max = String(videoDuration);
    startInput.value = '0';
    endInput.value = String(Math.min(videoDuration, MAX_CLIP_SECONDS));
    widthInput.value = String(even(Math.min(nativeWidth, 640)));
    heightInput.value = String(even(Number(widthInput.value) * nativeHeight / nativeWidth));
    fileMeta.textContent = `${formatBytes(sourceFile?.size ?? 0)} · ${formatTime(videoDuration)} · ${nativeWidth} × ${nativeHeight}`;
    dropzone.hidden = true;
    dropzone.classList.remove('is-loading');
    studio.hidden = false;
    previewEmpty.hidden = true;
    selectPreset(nativeHeight <= 480 ? 'original' : '480');
    updateTimeline(false);
  });
  previewVideo.addEventListener('timeupdate', () => { previewTime.textContent = `${formatTime(previewVideo.currentTime)} / ${formatTime(Number(endInput.value))}`; if (previewing && previewVideo.currentTime >= Number(endInput.value) - .02) { previewVideo.currentTime = Number(startInput.value); } });
  previewVideo.addEventListener('ended', stopPreview);
  previewVideo.addEventListener('error', () => { dropzone.classList.remove('is-loading'); shell.setStatus('تعذر فتح الفيديو. جرّب ملف MP4 أو WebM متوافقاً.', 'error'); });
  play.addEventListener('click', () => void togglePreview());
  startInput.addEventListener('input', () => updateTimeline());
  endInput.addEventListener('input', () => updateTimeline());
  fpsInput.addEventListener('input', updateEstimator);
  widthInput.addEventListener('input', () => updateDimensions('width'));
  heightInput.addEventListener('input', () => updateDimensions('height'));
  shell.content.querySelectorAll<HTMLButtonElement>('[data-gif-preset]').forEach((button) => button.addEventListener('click', () => selectPreset(button.dataset.gifPreset ?? 'original')));
  optimize.addEventListener('click', () => { fpsInput.value = '22'; selectPreset(nativeHeight >= 480 ? '480' : 'original'); updateEstimator(); });
  exportButton.addEventListener('click', () => void exportGif());
  cancel.addEventListener('click', () => { exporting = false; activeEncoder?.abort(); activeEncoder = null; progress.hidden = true; app.classList.remove('is-exporting'); updateEstimator(); });
  createAnother.addEventListener('click', openPicker);
});

function gifIcon(): string { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 9 4-2v10l-4-2M7 9h6M7 13h4"/></svg>'; }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function even(value: number): number { return Math.max(2, Math.round(value / 2) * 2); }
function formatTime(seconds: number): string { const minutes = Math.floor(seconds / 60); const remainder = seconds - minutes * 60; return `${String(minutes).padStart(2, '0')}:${remainder.toFixed(1).padStart(4, '0')}`; }
function formatBytes(bytes: number): string { if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'; const units = ['B', 'KB', 'MB', 'GB']; const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** exponent).toFixed(exponent ? 1 : 0)} ${units[exponent]}`; }
function required<T extends Element>(root: ParentNode, selector: string): T { const element = root.querySelector<T>(selector); if (!element) throw new Error(`العنصر المطلوب غير موجود: ${selector}`); return element; }
function nextFrame(): Promise<void> { return new Promise((resolve) => requestAnimationFrame(() => resolve())); }
function seek(video: HTMLVideoElement, timestamp: number): Promise<void> { return new Promise((resolve, reject) => { if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && Math.abs(video.currentTime - timestamp) < .005) { resolve(); return; } const done = () => { cleanup(); resolve(); }; const fail = () => { cleanup(); reject(new Error('تعذر قراءة أحد إطارات الفيديو.')); }; const cleanup = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', fail); }; video.addEventListener('seeked', done, { once: true }); video.addEventListener('error', fail, { once: true }); video.currentTime = timestamp; }); }
function drawCover(context: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number): void { const sourceRatio = video.videoWidth / video.videoHeight; const targetRatio = width / height; let drawWidth = width; let drawHeight = height; let offsetX = 0; let offsetY = 0; if (sourceRatio > targetRatio) { drawWidth = height * sourceRatio; offsetX = (width - drawWidth) / 2; } else { drawHeight = width / sourceRatio; offsetY = (height - drawHeight) / 2; } context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight); }
