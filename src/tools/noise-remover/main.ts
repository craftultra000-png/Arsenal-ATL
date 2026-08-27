import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { toolBySlug } from '@shared/tools';
import { t } from '@shared/i18n';
import './noise-remover.css';

const SAMPLE_RATE = 48_000;
const MODEL_URL = 'https://huggingface.co/datasets/Silvr0098/arsenal-cdn/resolve/main/dpdfnet8_48khz_hr.onnx';
const MODEL_CACHE = 'arsenal-noise-model-v1';
// النموذج أدناه هو رابط المنصة المنشورة؛ المرآة المحلية للمحرك مطابقة لملفاتها وتعمل داخل Worker بلا CORS.
const ORT_URL = '/assets/runtime/onnx/ort.min.js';

type WorkerMessage =
  | { type: 'init-ok' }
  | { type: 'progress'; data: { pct: number; frame: number; totalFrames: number } }
  | { type: 'done'; data: Float32Array }
  | { type: 'error'; data?: string };

void bootstrapStandaloneTool('noise-remover', (shell) => {
  const tool = toolBySlug('noise-remover');
  if (!tool) throw new Error('تعذر العثور على تعريف أداة إزالة الضوضاء.');

  shell.content.innerHTML = `
    <div class="nrem-page">
      <header class="nrem-header">
        <span class="nrem-header-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle><line x1="2" y1="2" x2="22" y2="22"></line></svg></span>
        <div><h1 class="nrem-title">${t('مزيل الضوضاء')}</h1><p class="nrem-sub">${t('إزالة الضوضاء المحيطة وتنقية الصوت بالذكاء الاصطناعي.')}</p></div>
      </header>

      <section class="nrem-section">
        <p class="nrem-section-label">${t('الملف الصوتي')}</p>
        <div class="nrem-input-row">
          <label id="drop-zone" class="nrem-card nrem-input-btn" for="noise-file"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg><span class="nrem-input-label" id="drop-text">${t('رفع ملف')}</span><span class="nrem-drop-hint">WAV · MP3 · OGG · FLAC · M4A</span><input id="noise-file" class="nrem-file-input" type="file" accept="audio/*"></label>
          <button id="record-btn" class="nrem-card nrem-input-btn nrem-record-btn" type="button"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg><span class="nrem-input-label" id="record-label">${t('تسجيل')}</span><span class="nrem-drop-hint" id="record-hint">${t('اضغط للبدء')}</span></button>
        </div>
        <div id="start-wrap" class="nrem-start-wrap" hidden><button id="start-btn" class="nrem-btn nrem-btn-success" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>${t('بدء المعالجة')}</button></div>
      </section>

      <section id="model-section" class="nrem-section" hidden><div class="nrem-card nrem-model-card"><div class="nrem-ctrl-row"><span class="nrem-ctrl-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${t('جاري تحميل نموذج الذكاء الاصطناعي…')}</span><strong id="model-pct" class="nrem-ctrl-val">0%</strong></div><div class="nrem-progress-track"><span id="model-bar" class="nrem-progress-fill"></span></div></div></section>

      <section id="status-area" class="nrem-section" hidden>
        <p id="file-meta" class="nrem-file-meta"></p>
        <div id="process-progress" class="nrem-card nrem-progress-card" hidden><div class="nrem-progress-steps"><span id="step-model" class="nrem-pstep">${t('تحميل النموذج')}</span><span id="step-infer" class="nrem-pstep">${t('معالجة الإطارات')}</span><span id="step-encode" class="nrem-pstep">${t('تجميع الملف')}</span></div><div class="nrem-progress-track"><span id="process-bar" class="nrem-progress-fill"></span></div><p id="process-label" class="nrem-progress-label">${t('جارٍ التهيئة…')}</p></div>

        <div id="players" hidden>
          <div class="nrem-tabs"><button id="tab-original" class="nrem-tab" type="button">${t('الأصلي')}</button><button id="tab-clean" class="nrem-tab active" type="button">${t('المُنقّى')}</button></div>
          <button id="play-btn" class="nrem-btn nrem-btn-play" type="button"><svg id="play-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span id="play-copy">${t('تشغيل')}</span></button>
          <div id="timeline" class="nrem-timeline"><span id="current-time" class="nrem-time">00:00</span><div id="timeline-track" class="nrem-progress-track nrem-timeline-track"><span id="timeline-fill" class="nrem-progress-fill"></span><i id="timeline-thumb" class="nrem-progress-thumb"></i></div><span id="total-time" class="nrem-time">00:00</span></div>
        </div>

        <div id="podcast-controls" class="nrem-podcast-controls" hidden><div class="nrem-ctrl-row"><span class="nrem-ctrl-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path></svg>${t('تأثير البودكاست الاحترافي')}</span><button id="podcast-toggle" class="nrem-toggle-btn" type="button" aria-pressed="false"><span class="nrem-toggle-track"><i class="nrem-toggle-thumb"></i></span><span id="podcast-copy" class="nrem-toggle-text">${t('إيقاف')}</span></button></div></div>
        <div id="action-row" class="nrem-action-row" hidden><button id="download-btn" class="nrem-btn nrem-btn-success" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>${t('تحميل WAV')}</button><button id="reset-btn" class="nrem-btn nrem-btn-secondary" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 .49-3.96"></path></svg>${t('ملف آخر')}</button></div>
      </section>
    </div>`;

  const input = required<HTMLInputElement>(shell.content, '#noise-file');
  const dropZone = required<HTMLElement>(shell.content, '#drop-zone');
  const dropText = required<HTMLElement>(shell.content, '#drop-text');
  const recordBtn = required<HTMLButtonElement>(shell.content, '#record-btn');
  const recordLabel = required<HTMLElement>(shell.content, '#record-label');
  const recordHint = required<HTMLElement>(shell.content, '#record-hint');
  const startWrap = required<HTMLElement>(shell.content, '#start-wrap');
  const startBtn = required<HTMLButtonElement>(shell.content, '#start-btn');
  const modelSection = required<HTMLElement>(shell.content, '#model-section');
  const modelBar = required<HTMLElement>(shell.content, '#model-bar');
  const modelPct = required<HTMLElement>(shell.content, '#model-pct');
  const statusArea = required<HTMLElement>(shell.content, '#status-area');
  const fileMeta = required<HTMLElement>(shell.content, '#file-meta');
  const progressWrap = required<HTMLElement>(shell.content, '#process-progress');
  const processBar = required<HTMLElement>(shell.content, '#process-bar');
  const processLabel = required<HTMLElement>(shell.content, '#process-label');
  const stepModel = required<HTMLElement>(shell.content, '#step-model');
  const stepInfer = required<HTMLElement>(shell.content, '#step-infer');
  const stepEncode = required<HTMLElement>(shell.content, '#step-encode');
  const players = required<HTMLElement>(shell.content, '#players');
  const tabOriginal = required<HTMLButtonElement>(shell.content, '#tab-original');
  const tabClean = required<HTMLButtonElement>(shell.content, '#tab-clean');
  const playBtn = required<HTMLButtonElement>(shell.content, '#play-btn');
  const playIcon = required<SVGElement>(shell.content, '#play-icon');
  const playCopy = required<HTMLElement>(shell.content, '#play-copy');
  const timeline = required<HTMLElement>(shell.content, '#timeline');
  const timelineTrack = required<HTMLElement>(shell.content, '#timeline-track');
  const timelineFill = required<HTMLElement>(shell.content, '#timeline-fill');
  const timelineThumb = required<HTMLElement>(shell.content, '#timeline-thumb');
  const currentTime = required<HTMLElement>(shell.content, '#current-time');
  const totalTime = required<HTMLElement>(shell.content, '#total-time');
  const podcastControls = required<HTMLElement>(shell.content, '#podcast-controls');
  const podcastToggle = required<HTMLButtonElement>(shell.content, '#podcast-toggle');
  const podcastCopy = required<HTMLElement>(shell.content, '#podcast-copy');
  const actionRow = required<HTMLElement>(shell.content, '#action-row');
  const downloadBtn = required<HTMLButtonElement>(shell.content, '#download-btn');
  const resetBtn = required<HTMLButtonElement>(shell.content, '#reset-btn');

  let selectedFile: File | null = null;
  let worker: Worker | null = null;
  let originalSamples: Float32Array | null = null;
  let cleanSamples: Float32Array | null = null;
  let enhancedBlob: Blob | null = null;
  let podcastEnabled = false;
  let recorder: MediaRecorder | null = null;
  let recordStream: MediaStream | null = null;
  let recordChunks: Blob[] = [];
  let isRecording = false;
  let activeAudio: 'original' | 'clean' = 'clean';
  let audioContext: AudioContext | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let isPlaying = false;
  let currentPosition = 0;
  let playbackStartedAt = 0;
  let duration = 0;
  let animationFrame: number | null = null;
  let scrubbing = false;

  const steps = [stepModel, stepInfer, stepEncode];
  const setProgress = (pct: number, label: string) => {
    const value = Math.max(0, Math.min(100, pct));
    processBar.style.width = `${value}%`;
    processLabel.textContent = label;
    const activeStep = value < 20 ? 0 : value < 90 ? 1 : 2;
    steps.forEach((step, index) => step.className = `nrem-pstep${index < activeStep ? ' done' : index === activeStep ? ' active' : ''}`);
  };
  const setTimeline = (percent: number) => {
    const safe = Math.max(0, Math.min(1, percent));
    timelineFill.style.width = `${safe * 100}%`;
    timelineThumb.style.left = `${safe * 100}%`;
    currentTime.textContent = formatTime(currentPosition);
  };
  const selectedSamples = () => activeAudio === 'original' ? originalSamples : cleanSamples;
  const setAudioTab = (kind: 'original' | 'clean') => {
    const resume = isPlaying;
    stopPlayback();
    activeAudio = kind;
    currentPosition = 0;
    tabOriginal.classList.toggle('active', kind === 'original');
    tabClean.classList.toggle('active', kind === 'clean');
    setTimeline(0);
    if (resume) startPlayback();
  };

  const selectFile = (file: File) => {
    selectedFile = file;
    dropText.textContent = file.name;
    startWrap.hidden = false;
    startBtn.disabled = false;
    shell.setStatus(t('الملف جاهز. ابدأ المعالجة عندما تكون مستعداً.'));
  };

  input.addEventListener('change', () => { const file = input.files?.[0]; if (file) selectFile(file); });
  ['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('drag-over'); }));
  dropZone.addEventListener('drop', (event) => { const file = event.dataTransfer?.files[0]; if (file) selectFile(file); });

  recordBtn.addEventListener('click', async () => {
    if (isRecording) { recorder?.stop(); return; }
    try {
      recordStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      recordChunks = [];
      recorder = new MediaRecorder(recordStream);
      recorder.addEventListener('dataavailable', (event) => { if (event.data.size > 0) recordChunks.push(event.data); });
      recorder.addEventListener('stop', () => {
        recordStream?.getTracks().forEach((track) => track.stop());
        recordStream = null;
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordLabel.textContent = t('تسجيل');
        recordHint.textContent = t('اضغط للبدء');
        selectFile(new File([new Blob(recordChunks, { type: recorder?.mimeType || 'audio/webm' })], 'recorded-audio.webm', { type: 'audio/webm' }));
      }, { once: true });
      recorder.start();
      isRecording = true;
      recordBtn.classList.add('recording');
      recordLabel.textContent = t('إيقاف التسجيل');
      recordHint.textContent = t('يجري الالتقاط الآن');
    } catch (error) { shell.setStatus(t('تعذر الوصول إلى الميكروفون: {reason}', { reason: error instanceof Error ? error.message : t('خطأ غير متوقع') }), 'error'); }
  });

  startBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    startBtn.disabled = true;
    startWrap.hidden = true;
    statusArea.hidden = false;
    progressWrap.hidden = false;
    players.hidden = true;
    podcastControls.hidden = true;
    actionRow.hidden = true;
    fileMeta.textContent = `${selectedFile.name} · ${formatBytes(selectedFile.size)}`;
    try {
      const samples = await decodeToMono(selectedFile);
      originalSamples = new Float32Array(samples);
      duration = samples.length / SAMPLE_RATE;
      totalTime.textContent = formatTime(duration);
      currentPosition = 0;
      setTimeline(0);
      setProgress(3, t('يجري تجهيز الصوت…'));
      const model = await loadModel(modelBar, modelPct, modelSection);
      setProgress(18, t('يجري تشغيل نموذج إزالة الضوضاء…'));
      await processWithModel(model, samples);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('خطأ غير معروف');
      progressWrap.hidden = true;
      startWrap.hidden = false;
      startBtn.disabled = false;
      modelSection.hidden = true;
      shell.setStatus(t('تعذرت معالجة الصوت: {reason}', { reason: message }), 'error');
    }
  });

  const processWithModel = (model: ArrayBuffer, samples: Float32Array) => new Promise<void>((resolve, reject) => {
    worker?.terminate();
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'classic' });
    worker.onmessage = async (event: MessageEvent<WorkerMessage>) => {
      const eventData = event.data;
      if (eventData.type === 'init-ok') { modelSection.hidden = true; worker?.postMessage({ type: 'process', data: samples }, [samples.buffer]); return; }
      if (eventData.type === 'progress') { setProgress(20 + Math.round(eventData.data.pct * 0.76), t('جاري معالجة الإطار {current} من {total}…', { current: eventData.data.frame, total: eventData.data.totalFrames })); return; }
      if (eventData.type === 'done') {
        cleanSamples = eventData.data;
        setProgress(96, t('يجري تجميع ملف WAV…'));
        enhancedBlob = encodeWav(cleanSamples, SAMPLE_RATE);
        setProgress(100, t('اكتملت إزالة الضوضاء بنجاح'));
        window.setTimeout(() => {
          progressWrap.hidden = true;
          players.hidden = false;
          podcastControls.hidden = false;
          actionRow.hidden = false;
          activeAudio = 'clean';
          tabOriginal.classList.remove('active');
          tabClean.classList.add('active');
          // الأزرار الظاهرة تؤكد الجاهزية؛ لا نكرر رسالة نجاح أسفل الصفحة.
          shell.setStatus('');
          worker?.terminate(); worker = null;
          resolve();
        }, 300);
        return;
      }
      worker?.terminate(); worker = null; reject(new Error(eventData.data || t('خطأ في عامل المعالجة')));
    };
    worker.onerror = () => { worker?.terminate(); worker = null; reject(new Error(t('تعذر تشغيل عامل إزالة الضوضاء.'))); };
    worker.postMessage({ type: 'init', data: { onnxBytes: model, ortUrl: ORT_URL } }, [model]);
  });

  tabOriginal.addEventListener('click', () => setAudioTab('original'));
  tabClean.addEventListener('click', () => setAudioTab('clean'));
  playBtn.addEventListener('click', () => isPlaying ? stopPlayback() : startPlayback());

  function startPlayback() {
    const samples = selectedSamples();
    if (!samples) return;
    stopPlayback(false);
    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const audioBuffer = audioContext.createBuffer(1, samples.length, SAMPLE_RATE);
    audioBuffer.copyToChannel(new Float32Array(samples), 0);
    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    sourceNode.start(0, currentPosition);
    sourceNode.addEventListener('ended', () => { if (isPlaying) { currentPosition = 0; stopPlayback(); setTimeline(0); } }, { once: true });
    playbackStartedAt = audioContext.currentTime - currentPosition;
    isPlaying = true;
    playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
    playCopy.textContent = t('إيقاف');
    tickPlayback();
  }
  function stopPlayback(rememberPosition = true) {
    if (rememberPosition && audioContext && isPlaying) currentPosition = Math.min(duration, Math.max(0, audioContext.currentTime - playbackStartedAt));
    sourceNode?.stop(); sourceNode?.disconnect(); sourceNode = null;
    void audioContext?.close(); audioContext = null;
    isPlaying = false;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    playCopy.textContent = t('تشغيل');
  }
  function tickPlayback() {
    if (!isPlaying || !audioContext) return;
    currentPosition = Math.min(duration, Math.max(0, audioContext.currentTime - playbackStartedAt));
    setTimeline(duration ? currentPosition / duration : 0);
    animationFrame = requestAnimationFrame(tickPlayback);
  }
  const scrubPercent = (event: PointerEvent) => { const rect = timelineTrack.getBoundingClientRect(); return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); };
  timeline.addEventListener('pointerdown', (event) => { if (!selectedSamples()) return; scrubbing = true; timeline.classList.add('scrubbing'); timeline.setPointerCapture(event.pointerId); if (isPlaying) stopPlayback(); currentPosition = scrubPercent(event) * duration; setTimeline(duration ? currentPosition / duration : 0); });
  timeline.addEventListener('pointermove', (event) => { if (!scrubbing) return; currentPosition = scrubPercent(event) * duration; setTimeline(duration ? currentPosition / duration : 0); });
  timeline.addEventListener('pointerup', () => { scrubbing = false; timeline.classList.remove('scrubbing'); });

  podcastToggle.addEventListener('click', async () => {
    if (!cleanSamples) return;
    podcastEnabled = !podcastEnabled;
    podcastToggle.setAttribute('aria-pressed', String(podcastEnabled));
    podcastCopy.textContent = podcastEnabled ? t('تشغيل') : t('إيقاف');
    podcastToggle.classList.add('loading');
    try { enhancedBlob = encodeWav(podcastEnabled ? await applyPodcastChain(cleanSamples) : cleanSamples, SAMPLE_RATE); shell.setStatus(podcastEnabled ? t('طُبّق تأثير البودكاست على ملف التنزيل.') : t('أُلغي تأثير البودكاست.'), 'success'); }
    catch { shell.setStatus(t('تعذر تطبيق تأثير البودكاست.'), 'error'); }
    finally { podcastToggle.classList.remove('loading'); }
  });

  downloadBtn.addEventListener('click', () => {
    if (!enhancedBlob) return;
    const url = URL.createObjectURL(enhancedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedFile?.name.replace(/\.[^.]+$/, '') || 'audio'}-denoised.wav`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 800);
  });
  resetBtn.addEventListener('click', () => {
    worker?.terminate(); worker = null; stopPlayback(false);
    selectedFile = null; originalSamples = null; cleanSamples = null; enhancedBlob = null; podcastEnabled = false; input.value = '';
    dropText.textContent = t('رفع ملف'); startWrap.hidden = true; statusArea.hidden = true; actionRow.hidden = true; players.hidden = true; podcastControls.hidden = true; progressWrap.hidden = true; modelSection.hidden = true;
    podcastToggle.setAttribute('aria-pressed', 'false'); podcastCopy.textContent = t('إيقاف'); currentPosition = 0; duration = 0; totalTime.textContent = '00:00'; setTimeline(0); shell.setStatus(t('جاهز لملف جديد.'));
  });
});

async function loadModel(bar: HTMLElement, pct: HTMLElement, section: HTMLElement): Promise<ArrayBuffer> {
  section.hidden = false; bar.style.width = '0%'; pct.textContent = '0%';
  const cacheStorage = typeof globalThis.caches === 'undefined' ? null : globalThis.caches;
  if (cacheStorage) {
    try {
      const cache = await cacheStorage.open(MODEL_CACHE);
      const cached = await cache.match(MODEL_URL);
      if (cached) { bar.style.width = '100%'; pct.textContent = t('محفوظ محلياً'); return cached.arrayBuffer(); }
    } catch {
      // Cache API ليست متاحة دائماً على HTTP المحلي أو بعض WebViews؛ لا نمنع المعالجة بسببها.
    }
  }
  const response = await fetch(MODEL_URL);
  if (!response.ok || !response.body) throw new Error(t('تعذر تحميل النموذج ({status})', { status: response.status }));
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let received = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; if (value) { chunks.push(value); received += value.length; if (total) { const progress = Math.round(received / total * 100); bar.style.width = `${progress}%`; pct.textContent = `${progress}%`; } } }
  const bytes = new Uint8Array(received); let offset = 0; chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.length; });
  const data = bytes.buffer;
  if (cacheStorage) {
    try {
      const cache = await cacheStorage.open(MODEL_CACHE);
      await cache.put(MODEL_URL, new Response(data.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } }));
    } catch {
      // يستمر التنزيل الحالي حتى إن تعذر حفظ النموذج للمرة التالية.
    }
  }
  bar.style.width = '100%'; pct.textContent = '100%'; return data;
}

async function decodeToMono(file: File): Promise<Float32Array> {
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try { const decoded = await context.decodeAudioData(await file.arrayBuffer()); const mono = new Float32Array(decoded.length); for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) { const data = decoded.getChannelData(channel); for (let index = 0; index < mono.length; index += 1) mono[index] += data[index] / decoded.numberOfChannels; } return mono; }
  finally { await context.close(); }
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2); const view = new DataView(buffer); const write = (offset: number, value: string) => { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => { const safe = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + index * 2, safe < 0 ? safe * 0x8000 : safe * 0x7fff, true); }); return new Blob([buffer], { type: 'audio/wav' });
}

async function applyPodcastChain(samples: Float32Array): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, samples.length + Math.floor(SAMPLE_RATE * .8), SAMPLE_RATE); const input = context.createBuffer(1, samples.length, SAMPLE_RATE); input.copyToChannel(new Float32Array(samples), 0);
  const source = context.createBufferSource(); source.buffer = input;
  const warmth = context.createBiquadFilter(); warmth.type = 'peaking'; warmth.frequency.value = 200; warmth.gain.value = 2; warmth.Q.value = 1;
  const body = context.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 1000; body.gain.value = 5; body.Q.value = .8;
  const presence = context.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 3000; presence.gain.value = 4; presence.Q.value = .8;
  const air = context.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 8000; air.gain.value = 4;
  const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -24; compressor.ratio.value = 2.5; compressor.attack.value = .04; compressor.release.value = .4; compressor.knee.value = 12;
  const impulse = context.createBuffer(1, Math.floor(SAMPLE_RATE * .8), SAMPLE_RATE); const impulseData = impulse.getChannelData(0); impulseData.forEach((_, index) => { impulseData[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / impulseData.length, 2.5); });
  const convolver = context.createConvolver(); convolver.buffer = impulse; const dry = context.createGain(); dry.gain.value = .85; const wet = context.createGain(); wet.gain.value = .15;
  source.connect(warmth); warmth.connect(body); body.connect(presence); presence.connect(air); air.connect(compressor); compressor.connect(dry); dry.connect(context.destination); compressor.connect(convolver); convolver.connect(wet); wet.connect(context.destination); source.start();
  const rendered = await context.startRendering(); const output = new Float32Array(rendered.getChannelData(0).slice(0, samples.length)); let peak = 0; output.forEach((sample) => { peak = Math.max(peak, Math.abs(sample)); }); if (peak > 1e-9) { const gain = Math.pow(10, -1 / 20) / peak; output.forEach((sample, index) => { output[index] = sample * gain; }); } return output;
}

function formatTime(seconds: number): string { const minutes = Math.floor(seconds / 60); const secondsPart = Math.floor(seconds % 60); return `${String(minutes).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`; }
function formatBytes(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function required<T extends Element>(root: ParentNode, selector: string): T { const element = root.querySelector<T>(selector); if (!element) throw new Error(`العنصر المطلوب غير موجود: ${selector}`); return element; }
