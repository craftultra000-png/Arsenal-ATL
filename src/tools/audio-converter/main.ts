import JSZip from 'jszip';
import { getLame } from '@shared/runtime/lame';
import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { toolBySlug } from '@shared/tools';
import { enhanceNativeSelect } from '@shared/ui/arsenal-select';
import { t } from '@shared/i18n';
import './audio-converter.css';

type AudioFormat = 'MP3' | 'WAV' | 'OGG' | 'ZIP';
const formatDescriptions: Record<AudioFormat, string> = { MP3: t('صيغة مرنة للمشاركة والاستخدام اليومي.'), WAV: t('ملف خام لأعلى دقة ممكنة.'), OGG: t('صيغة خفيفة موجهة للويب.'), ZIP: t('أرشفة الملف كما هو من دون تغيير.') };

void bootstrapStandaloneTool('audio-converter', (shell) => {
  const tool = toolBySlug('audio-converter');
  if (!tool) throw new Error('تعذر العثور على تعريف محول الصوت.');

  shell.content.innerHTML = `
    <div class="adp-page">
      <header class="adp-header">
        <span class="adp-header-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2-9 5 18 4-10h5"/></svg></span>
        <div><h1 class="adp-title">${t('محول الصيغ الصوتية')}</h1><p class="adp-sub">${t('تحويل الملفات الصوتية بين الصيغ المختلفة محلياً.')}</p></div>
      </header>
      <section class="adp-section">
        <p class="adp-section-label">${t('الملف الصوتي')}</p>
        <label id="ac-dropzone" class="adp-card adp-drop-zone" for="audio-file">
          <span class="adp-drop-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>
          <span class="adp-drop-text">${t('اسحب الملف الصوتي هنا أو اضغط للاختيار')}</span>
          <input id="audio-file" class="ac-file-input" type="file" accept="audio/*,video/*">
          <span id="ac-asset" class="adp-file-meta" hidden><strong id="file-meta-name">—</strong><small id="file-meta-summary">—</small><em id="file-meta-size">—</em><button id="clear-file" type="button" aria-label="${t('إزالة الملف')}">×</button></span>
        </label>
      </section>
      <section id="format-section" class="adp-section" hidden>
        <p class="adp-section-label">${t('اختر صيغة التصدير المطلوبة:')}</p>
        <div class="adp-format-card"><select id="target-format" aria-label="${t('صيغة التصدير')}"><option value="MP3" data-description="${t('صيغة مرنة للمشاركة والاستخدام اليومي.')}">MP3</option><option value="WAV" data-description="${t('ملف خام لأعلى دقة ممكنة.')}">WAV</option><option value="OGG" data-description="${t('صيغة خفيفة موجهة للويب.')}">OGG / WebM</option><option value="ZIP" data-description="${t('أرشفة الملف كما هو من دون تغيير.')}">ZIP</option></select><p id="format-description" class="adp-format-helper">${t('صيغة مرنة للمشاركة والاستخدام اليومي.')}</p><span id="mp3-quality-wrap" hidden><select id="mp3-quality" aria-label="${t('جودة MP3')}"><option value="192" selected>192 kbps</option></select></span></div>
      </section>
      <section id="action-section" class="adp-section" hidden><button id="action-button" class="adp-btn adp-btn-primary" type="button" disabled><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span>${t('بدء التحويل والمعالجة')}</span></button></section>
      <section id="status-box" class="adp-section adp-status" hidden><div class="adp-card"><div class="adp-status-text"><span id="status-text">${t('بانتظار بدء العملية…')}</span><b id="progress-value">0%</b></div><div class="adp-progress-track"><span id="progress-bar" class="adp-progress-fill"></span></div></div></section>
      <section id="download-wrapper" class="adp-section" hidden><a id="download-link" class="adp-btn adp-btn-success"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>${t('تحميل الملف المحول')}</span></a></section>
    </div>
  `;

  const product = required<HTMLElement>(shell.content, '.adp-page');
  const input = required<HTMLInputElement>(shell.content, '#audio-file');
  const asset = required<HTMLElement>(shell.content, '#ac-asset');
  const clearFile = required<HTMLButtonElement>(shell.content, '#clear-file');
  const formatSection = required<HTMLElement>(shell.content, '#format-section');
  const actionSection = required<HTMLElement>(shell.content, '#action-section');
  const format = required<HTMLSelectElement>(shell.content, '#target-format');
  const description = required<HTMLElement>(shell.content, '#format-description');
  const quality = required<HTMLSelectElement>(shell.content, '#mp3-quality');
  const qualityWrap = required<HTMLElement>(shell.content, '#mp3-quality-wrap');
  const action = required<HTMLButtonElement>(shell.content, '#action-button');
  const statusBox = required<HTMLElement>(shell.content, '#status-box');
  const statusText = required<HTMLElement>(shell.content, '#status-text');
  const progressValue = required<HTMLElement>(shell.content, '#progress-value');
  const progress = required<HTMLElement>(shell.content, '#progress-bar');
  const download = required<HTMLAnchorElement>(shell.content, '#download-link');
  const downloadWrapper = required<HTMLElement>(shell.content, '#download-wrapper');
  const fileMetaName = required<HTMLElement>(shell.content, '#file-meta-name');
  const fileMetaSummary = required<HTMLElement>(shell.content, '#file-meta-summary');
  const fileMetaSize = required<HTMLElement>(shell.content, '#file-meta-size');
  enhanceNativeSelect(format, { accent: 'var(--accent-2)' });
  enhanceNativeSelect(quality, { accent: 'var(--accent-2)' });
  let uploaded: File | null = null;
  let outputUrl: string | null = null;

  const setProgress = (value: number, text: string) => { const normalized = Math.max(0, Math.min(100, value)); statusBox.hidden = false; product.dataset.processing = String(normalized < 100); progress.style.width = `${normalized}%`; statusText.textContent = text; progressValue.textContent = `${Math.round(normalized)}%`; };
  const clearOutput = () => { if (outputUrl) URL.revokeObjectURL(outputUrl); outputUrl = null; download.removeAttribute('href'); downloadWrapper.hidden = true; };
  const resetFile = () => { uploaded = null; input.value = ''; product.dataset.hasFile = 'false'; action.disabled = true; asset.hidden = true; formatSection.hidden = true; actionSection.hidden = true; statusBox.hidden = true; progress.style.width = '0%'; progressValue.textContent = '0%'; clearOutput(); };
  const finish = (blob: Blob, filename: string) => { clearOutput(); outputUrl = URL.createObjectURL(blob); download.href = outputUrl; download.download = filename; downloadWrapper.hidden = false; setProgress(100, t('اكتمل التحويل بنجاح')); shell.setStatus(t('اكتمل تحويل الملف محلياً.'), 'success'); };
  const syncFormat = () => { const selected = format.value as AudioFormat; description.textContent = formatDescriptions[selected]; qualityWrap.hidden = true; };

  format.addEventListener('change', syncFormat);
  clearFile.addEventListener('click', resetFile);
  input.addEventListener('change', async () => {
    uploaded = input.files?.[0] ?? null;
    clearOutput();
    statusBox.hidden = true;
    if (!uploaded) { resetFile(); return; }
    action.disabled = false;
    product.dataset.hasFile = 'true';
    formatSection.hidden = false;
    actionSection.hidden = false;
    asset.hidden = false;
    fileMetaName.textContent = uploaded.name;
    fileMetaSize.textContent = formatBytes(uploaded.size);
    fileMetaSummary.textContent = t('جاري قراءة خصائص الملف…');
    try { fileMetaSummary.textContent = await readAudioSummary(uploaded); } catch { fileMetaSummary.textContent = uploaded.type || t('ملف صوتي'); }
  });
  syncFormat();

  action.addEventListener('click', async () => {
    if (!uploaded) return;
    action.disabled = true;
    clearOutput();
    const selectedFormat = format.value as AudioFormat;
    try {
      setProgress(10, t('جاري قراءة الملف'));

      if (selectedFormat === 'ZIP') { setProgress(60, t('جاري إنشاء الأرشيف')); const zip = new JSZip(); zip.file(uploaded.name, uploaded); finish(await zip.generateAsync({ type: 'blob' }), 'Arsenal_Audio_Package.zip'); return; }
      const bytes = await uploaded.arrayBuffer();
      setProgress(30, t('تمت قراءة الملف'));
      if (selectedFormat === 'OGG') { setProgress(70, t('يجري تجهيز ملف OGG')); finish(new Blob([bytes], { type: 'audio/ogg' }), 'audio_converted.ogg'); return; }
      setProgress(38, t('يجري فك ترميز الصوت'));
      const audioContext = new AudioContext();
      const audio = await audioContext.decodeAudioData(bytes);
      await audioContext.close();
      setProgress(50, t('اكتمل فك ترميز الصوت'));
      if (selectedFormat === 'WAV') { setProgress(70, t('يجري كتابة ملف WAV')); finish(encodeWav(audio), 'audio_converted.wav'); return; }
      const mp3 = await encodeMp3(audio, Number(quality.value), (percent) => setProgress(50 + percent / 2, t('يجري ترميز MP3…')));
      finish(mp3, 'audio_converted.mp3');
    } catch (error) { console.error(error); setProgress(0, t('تعذر تحويل الملف')); shell.setStatus(t('تعذر تحويل الملف. تحقق من صيغته ثم حاول مرة أخرى.'), 'error'); }
    finally { action.disabled = !uploaded; }
  });
});

function encodeWav(buffer: AudioBuffer): Blob { const channels = buffer.numberOfChannels; const samples = channels === 2 ? interleave(buffer.getChannelData(0), buffer.getChannelData(1)) : buffer.getChannelData(0); const bytes = new ArrayBuffer(44 + samples.length * 2); const view = new DataView(bytes); writeText(view, 0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); writeText(view, 8, 'WAVE'); writeText(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); writeText(view, 36, 'data'); view.setUint32(40, samples.length * 2, true); samples.forEach((sample, index) => { const value = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true); }); return new Blob([bytes], { type: 'audio/wav' }); }
function interleave(left: Float32Array, right: Float32Array): Float32Array { const result = new Float32Array(left.length + right.length); for (let index = 0; index < left.length; index += 1) { result[index * 2] = left[index]; result[index * 2 + 1] = right[index]; } return result; }
function writeText(view: DataView, offset: number, value: string): void { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); }
async function encodeMp3(buffer: AudioBuffer, bitrate: number, onProgress: (progress: number) => void): Promise<Blob> { const lame = await getLame(); return new Promise((resolve) => { const channels = buffer.numberOfChannels; const encoder = new lame.Mp3Encoder(channels, buffer.sampleRate, bitrate); const left = floatToInt16(buffer.getChannelData(0)); const right = channels > 1 ? floatToInt16(buffer.getChannelData(1)) : left; const blocks: Int8Array[] = []; const blockSize = 1152; let index = 0; const process = () => { let loops = 0; while (index < left.length && loops < 250) { const data = encoder.encodeBuffer(left.subarray(index, index + blockSize), right.subarray(index, index + blockSize)); if (data.length) blocks.push(data); index += blockSize; loops += 1; } if (index < left.length) { onProgress(Math.round(index / left.length * 100)); window.setTimeout(process, 4); return; } const last = encoder.flush(); if (last.length) blocks.push(last); resolve(new Blob(blocks.map((block) => block.buffer.slice(block.byteOffset, block.byteOffset + block.byteLength) as ArrayBuffer), { type: 'audio/mpeg' })); }; process(); }); }
function floatToInt16(source: Float32Array): Int16Array { const result = new Int16Array(source.length); source.forEach((value, index) => { const limited = Math.max(-1, Math.min(1, value)); result[index] = limited < 0 ? limited * 0x8000 : limited * 0x7fff; }); return result; }
async function readAudioSummary(file: File): Promise<string> { const context = new AudioContext(); try { const audio = await context.decodeAudioData(await file.arrayBuffer()); const duration = new Date(audio.duration * 1000).toISOString().slice(14, 19); return `${duration} · ${audio.sampleRate / 1000} kHz · ${audio.numberOfChannels === 1 ? t('أحادي') : t('ستيريو')}`; } finally { await context.close(); } }
function formatBytes(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function required<T extends Element>(root: ParentNode, selector: string): T { const element = root.querySelector<T>(selector); if (!element) throw new Error(`العنصر المطلوب غير موجود: ${selector}`); return element; }
