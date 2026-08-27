import JSZip from 'jszip';
import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { toolBySlug } from '@shared/tools';
import { iconSvg } from '@shared/ui/icons';
import { enhanceNativeSelect } from '@shared/ui/arsenal-select';
import { t } from '@shared/i18n';
import './archive-encryption.css';

type StatusKind = 'info' | 'success' | 'error';
type ArchiveTab = 'create' | 'extract';

void bootstrapStandaloneTool('archive-encryption', (shell) => {
  if (!toolBySlug('archive-encryption')) throw new Error('تعذر العثور على تعريف أداة الأرشفة والتشفير.');

  shell.content.innerHTML = `<section class="archive-encryption">
    <header class="ae-header">${iconSvg('archive', 'ae-icon')}<div><h1>${t('أرشفة وتشفير الملفات')}</h1><p>${t('اضغط وشفّر ملفاتك محلياً بالكامل بمعيار AES-256-GCM، من دون رفعها إلى أي خادم.')}</p></div></header>
    <div class="ae-tabs"><button id="ae-tab-create" class="active" type="button">${iconSvg('archive', 'ae-inline-icon')} ${t('إنشاء أرشيف وتشفير')}</button><button id="ae-tab-extract" type="button">${iconSvg('file-down', 'ae-inline-icon')} ${t('استخراج وفك التشفير')}</button></div>
    <section id="ae-create" class="ae-panel active"><p class="ae-label">${t('الملفات')}</p><div id="ae-create-zone" class="ae-drop-zone" role="button" tabindex="0" aria-label="${t('اختيار ملفات للأرشفة')}"><input id="ae-files" type="file" multiple hidden>${iconSvg('upload', 'ae-drop-icon')}<b>${t('اسحب الملفات هنا أو اضغط للاختيار')}</b><small>${t('تُعالج الملفات محلياً على جهازك فقط.')}</small><span class="ae-or">${t('أو')}</span><button id="ae-folder-button" class="ae-folder" type="button">${iconSvg('folder', 'ae-inline-icon')} ${t('اختر مجلداً كاملاً')}</button><input id="ae-folder" type="file" multiple webkitdirectory directory hidden></div><p id="ae-file-count" class="ae-badge">${t('لم يتم تحديد ملفات')}</p>
      <p class="ae-label">${t('اسم الأرشيف')}</p><div class="ae-card"><input id="ae-name" class="ae-input" type="text" placeholder="${t('مثال: project_backup')}"></div>
      <p class="ae-label">${t('مستوى الضغط')}</p><div class="ae-card ae-select-card"><select id="ae-level" class="ae-input ae-select"><option value="3" data-description="${t('أسرع خيار؛ حجم أكبر للأرشيف.')}">3 — ${t('سريع جداً')}</option><option value="4" data-description="${t('ضغط بسيط لصالح السرعة.')}">4 — ${t('سريع')}</option><option value="5" data-description="${t('توازن سريع للملفات اليومية.')}">5 — ${t('متوازن سريع')}</option><option value="6" selected data-description="${t('توازن جيد بين السرعة والحجم؛ الخيار الافتراضي.')}">6 — ${t('متوازن موصى به')}</option><option value="7" data-description="${t('ضغط أقوى مع وقت أطول قليلاً.')}">7 — ${t('ضغط جيد')}</option><option value="8" data-description="${t('حجم أصغر مقابل سرعة أقل.')}">8 — ${t('ضغط عالٍ')}</option><option value="9" data-description="${t('أقصى ضغط؛ الأنسب عند أولوية الحجم.')}">9 — ${t('أقصى ضغط')}</option></select></div>
      <p class="ae-label">${t('مفتاح الحماية')}</p><div class="ae-card"><label class="ae-field-label" for="ae-password">${t('مفتاح الحماية المشفّر')}</label><div class="ae-key-row"><input id="ae-password" class="ae-input" type="text" autocomplete="new-password" placeholder="${t('اكتب كلمة مرور قوية أو ولّد مفتاحاً…')}"><button id="ae-generate-key" class="ae-inline-button" type="button">${iconSvg('key', 'ae-inline-icon')} ${t('توليد')}</button><button id="ae-copy-key" class="ae-inline-button icon-only" type="button" title="${t('نسخ المفتاح')}">${iconSvg('copy', 'ae-inline-icon')}</button></div><p id="ae-strength" class="ae-strength"></p></div>
      <div class="ae-actions"><button id="ae-zip" class="ae-button ghost" type="button">${iconSvg('archive', 'ae-inline-icon')} ${t('ضغط ZIP عادي')}</button><button id="ae-encrypt" class="ae-button primary" type="button">${iconSvg('lock', 'ae-inline-icon')} ${t('ضغط وتشفير ARS قوي')}</button></div>
    </section>
    <section id="ae-extract" class="ae-panel"><p class="ae-label">${t('الملف المشفّر')}</p><label id="ae-extract-zone" class="ae-drop-zone mint"><input id="ae-secure-file" type="file" accept=".ars,.zip" hidden>${iconSvg('file-down', 'ae-drop-icon')}<b>${t('اسحب ملف الأرشيف المشفّر (.ars) هنا')}</b><small>${t('أو اضغط لاختيار الملف من جهازك.')}</small></label><p id="ae-extract-count" class="ae-badge">${t('لم يتم تحديد ملف')}</p><p class="ae-label">${t('مفتاح فك التشفير')}</p><div class="ae-card"><label class="ae-field-label" for="ae-decrypt-password">${t('مفتاح فك التشفير الخاص')}</label><input id="ae-decrypt-password" class="ae-input" type="password" autocomplete="current-password" placeholder="${t('أدخل مفتاح المرور الصحيح لفك القفل…')}"></div><button id="ae-decrypt" class="ae-button mint-button full" type="button">${iconSvg('file-down', 'ae-inline-icon')} ${t('فك التشفير واستخراج ZIP')}</button></section>
    <section class="ae-status-card"><div id="ae-status" class="ae-status">${t('بانتظار الطلب')}</div><div class="ae-progress"><span id="ae-progress" style="width:0%"></span></div><div id="ae-stats" class="ae-stats" hidden><span id="ae-original"></span><span id="ae-final"></span></div></section>
    <section class="ae-portable"><div><b>${t('هل تريد إرسال الملف إلى شخص لا يملك Arsenal؟')}</b><p>${t('نزّل المستخرج المحمول؛ ملف HTML مستقل يعمل من دون إنترنت لفك ملفات ARS بأمان.')}</p></div><button id="ae-portable" class="ae-button outline" type="button">${iconSvg('file-down', 'ae-inline-icon')} ${t('تنزيل المستخرج المحمول')}</button></section>
  </section>`;

  const $ = <T extends Element>(selector: string) => required<T>(shell.content, selector);
  const createTab = $<HTMLButtonElement>('#ae-tab-create');
  const extractTab = $<HTMLButtonElement>('#ae-tab-extract');
  const createPanel = $<HTMLElement>('#ae-create');
  const extractPanel = $<HTMLElement>('#ae-extract');
  const filesInput = $<HTMLInputElement>('#ae-files');
  const folderInput = $<HTMLInputElement>('#ae-folder');
  const folderButton = $<HTMLButtonElement>('#ae-folder-button');
  const filesZone = $<HTMLElement>('#ae-create-zone');
  const fileCount = $<HTMLElement>('#ae-file-count');
  const secureInput = $<HTMLInputElement>('#ae-secure-file');
  const secureZone = $<HTMLElement>('#ae-extract-zone');
  const extractCount = $<HTMLElement>('#ae-extract-count');
  const nameInput = $<HTMLInputElement>('#ae-name');
  const levelInput = $<HTMLSelectElement>('#ae-level');
  const passwordInput = $<HTMLInputElement>('#ae-password');
  const decryptInput = $<HTMLInputElement>('#ae-decrypt-password');
  const strength = $<HTMLElement>('#ae-strength');
  const status = $<HTMLElement>('#ae-status');
  const progress = $<HTMLElement>('#ae-progress');
  const stats = $<HTMLElement>('#ae-stats');
  const original = $<HTMLElement>('#ae-original');
  const final = $<HTMLElement>('#ae-final');

  // توكيد السمتين برمجياً للمحركات التي لا تقرأ webkitdirectory من القالب وحده.
  folderInput.webkitdirectory = true;
  folderInput.setAttribute('webkitdirectory', '');
  folderInput.setAttribute('directory', '');
  enhanceNativeSelect(levelInput, { accent: 'var(--accent-2)' });
  let files: File[] = [];
  let fileToExtract: File | undefined;
  let activeTab: ArchiveTab = 'create';

  const setStatus = (message: string, kind: StatusKind = 'info', percent?: number, sizes?: { original: number; final?: number }) => {
    status.textContent = message;
    status.dataset.kind = kind;
    if (percent !== undefined) progress.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (sizes) {
      stats.hidden = false;
      original.textContent = t('الحجم الأصلي: {size}', { size: formatBytes(sizes.original) });
      final.textContent = sizes.final === undefined ? '' : t('الحجم النهائي: {size}', { size: formatBytes(sizes.final) });
      final.hidden = sizes.final === undefined;
    }
    shell.setStatus(message, kind === 'info' ? undefined : kind);
  };
  const switchTab = (next: ArchiveTab) => {
    activeTab = next;
    const creating = next === 'create';
    createPanel.classList.toggle('active', creating);
    extractPanel.classList.toggle('active', !creating);
    createTab.classList.toggle('active', creating);
    extractTab.classList.toggle('active', !creating);
  };
  const setFiles = (next: File[]) => {
    files = next;
    const size = files.reduce((sum, file) => sum + file.size, 0);
    fileCount.textContent = files.length ? t('{count} ملف — {size}', { count: files.length, size: formatBytes(size) }) : t('لم يتم تحديد ملفات');
    setStatus(files.length ? t('جاهز لأرشفة {count} ملف.', { count: files.length }) : t('بانتظار اختيار الملفات'));
  };
  const setExtractFile = (file?: File) => {
    fileToExtract = file;
    extractCount.textContent = file ? t('الملف المحدد: {name}', { name: file.name }) : t('لم يتم تحديد ملف');
    if (file) setStatus(t('تم التعرف على الملف: {name}', { name: file.name }));
  };
  const drop = (zone: HTMLElement, callback: (items: File[]) => void) => {
    zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('dragover');
      if (event.dataTransfer) callback([...event.dataTransfer.files]);
    });
  };
  const keyStrength = () => {
    const value = passwordInput.value.trim();
    if (!value) { strength.textContent = ''; strength.dataset.kind = ''; return; }
    if (value.length === 64 && /^[\da-f]+$/i.test(value)) { strength.textContent = t('مفتاح عشوائي كامل القوة (256 بت)'); strength.dataset.kind = 'max'; return; }
    if (value.length < 8 || ['123456', '12345678', 'password', '123', 'arsenal'].includes(value.toLowerCase())) { strength.textContent = t('المفتاح ضعيف؛ استخدم 8 محارف أو أكثر أو ولّد مفتاحاً.'); strength.dataset.kind = 'weak'; return; }
    strength.textContent = t('مفتاح قوي؛ يمكن تحسينه باستخدام مفتاح مولّد.');
    strength.dataset.kind = 'strong';
  };
  const archiveName = () => {
    let name = nameInput.value.trim() || 'arsenal_archive';
    if (!name.endsWith('.zip')) name += '.zip';
    return name;
  };
  const buildZip = async (type: 'blob' | 'arraybuffer', onProgress: (percent: number) => void) => {
    const zip = new JSZip();
    for (const file of files) zip.file(file.webkitRelativePath || file.name, file);
    return zip.generateAsync({ type, compression: 'DEFLATE', compressionOptions: { level: Number(levelInput.value) || 6 } }, (meta) => onProgress(meta.percent));
  };
  const encrypt = async () => {
    if (!files.length) { setStatus(t('اختر ملفاً واحداً على الأقل للأرشفة.'), 'error', 0); return; }
    const secret = passwordInput.value.trim();
    if (!secret) { setStatus(t('أدخل مفتاح حماية قبل التشفير.'), 'error', 0); return; }
    const total = files.reduce((sum, file) => sum + file.size, 0);
    try {
      setStatus(t('يجري ضغط الملفات…'), 'info', 0, { original: total });
      const zipBuffer = await buildZip('arraybuffer', (percent) => setStatus(t('يجري ضغط الملفات: {percent}%', { percent: percent.toFixed(0) }), 'info', percent * .7, { original: total })) as ArrayBuffer;
      setStatus(t('يجري اشتقاق مفتاح الحماية…'), 'info', 75, { original: total });
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await getCryptoKey(secret, salt);
      setStatus(t('يجري تشفير الأرشيف…'), 'info', 85, { original: total });
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, zipBuffer);
      const zipName = archiveName();
      const nameBytes = new TextEncoder().encode(zipName);
      if (nameBytes.length > 255) throw new Error('اسم الأرشيف طويل جداً.');
      const output = new Uint8Array(4 + 1 + nameBytes.length + 16 + 12 + encrypted.byteLength);
      output.set(new TextEncoder().encode('ARS1'));
      output[4] = nameBytes.length;
      output.set(nameBytes, 5);
      output.set(salt, 5 + nameBytes.length);
      output.set(iv, 21 + nameBytes.length);
      output.set(new Uint8Array(encrypted), 33 + nameBytes.length);
      const blob = new Blob([output], { type: 'application/octet-stream' });
      download(blob, zipName.replace(/\.zip$/i, '') + '.ars');
      setStatus(t('اكتمل ضغط الملفات وتشفيرها بنجاح.'), 'success', 100, { original: total, final: blob.size });
    } catch (error) { setStatus(t('تعذر إنشاء الأرشيف المشفّر: {reason}', { reason: errorMessage(error) }), 'error', 0); }
  };
  const zipNormal = async () => {
    if (!files.length) { setStatus(t('اختر ملفاً واحداً على الأقل للأرشفة.'), 'error', 0); return; }
    const total = files.reduce((sum, file) => sum + file.size, 0);
    try {
      setStatus(t('يجري إنشاء ZIP…'), 'info', 0, { original: total });
      const blob = await buildZip('blob', (percent) => setStatus(t('يجري ضغط الملفات: {percent}%', { percent: percent.toFixed(0) }), 'info', percent, { original: total })) as Blob;
      download(blob, archiveName());
      setStatus(t('اكتمل إنشاء أرشيف ZIP محلياً.'), 'success', 100, { original: total, final: blob.size });
    } catch (error) { setStatus(t('تعذر إنشاء ZIP: {reason}', { reason: errorMessage(error) }), 'error', 0); }
  };
  const decrypt = async () => {
    if (!fileToExtract) { setStatus(t('اختر ملف ARS مشفّراً أولاً.'), 'error', 0); return; }
    const secret = decryptInput.value.trim();
    if (!secret) { setStatus(t('أدخل مفتاح فك التشفير.'), 'error', 0); return; }
    if (!fileToExtract.name.toLowerCase().endsWith('.ars')) { setStatus(t('هذا الملف ليس أرشيف ARS مشفّراً.'), 'error', 0); return; }
    try {
      setStatus(t('يجري فحص الأرشيف…'), 'info', 15);
      const payload = new Uint8Array(await fileToExtract.arrayBuffer());
      if (payload.length < 33 || new TextDecoder().decode(payload.slice(0, 4)) !== 'ARS1') throw new Error('توقيع ARS غير صالح.');
      const nameLength = payload[4];
      const nameEnd = 5 + nameLength;
      if (payload.length < nameEnd + 28) throw new Error('ملف ARS غير مكتمل.');
      const zipName = new TextDecoder().decode(payload.slice(5, nameEnd));
      const salt = payload.slice(nameEnd, nameEnd + 16);
      const iv = payload.slice(nameEnd + 16, nameEnd + 28);
      const ciphertext = payload.slice(nameEnd + 28);
      setStatus(t('يجري فك التشفير…'), 'info', 60);
      const key = await getCryptoKey(secret, salt);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext));
      download(new Blob([plain], { type: 'application/zip' }), zipName || 'arsenal_archive.zip');
      setStatus(t('اكتمل فك التشفير: {name}', { name: zipName }), 'success', 100, { original: fileToExtract.size, final: plain.byteLength });
    } catch { setStatus(t('تعذر فك التشفير. تحقق من المفتاح وأن الملف ARS صحيح.'), 'error', 0); }
  };

  createTab.addEventListener('click', () => switchTab('create'));
  extractTab.addEventListener('click', () => switchTab('extract'));
  filesInput.addEventListener('change', () => setFiles([...(filesInput.files ?? [])]));
  folderInput.addEventListener('change', () => setFiles([...(folderInput.files ?? [])]));
  secureInput.addEventListener('change', () => setExtractFile(secureInput.files?.[0]));
  // لا نعتمد label متداخلاً: زر المجلد يملك مساراً مستقلاً ولا يمكن أن يمرّر نقرة إلى منتقي الملف.
  filesZone.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('#ae-folder-button')) return;
    filesInput.click();
  });
  filesZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); filesInput.click(); }
  });
  folderButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    folderInput.click();
  });
  drop(filesZone, setFiles);
  drop(secureZone, (next) => setExtractFile(next[0]));
  passwordInput.addEventListener('input', keyStrength);
  $('#ae-generate-key').addEventListener('click', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    passwordInput.value = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
    keyStrength();
    setStatus(t('تم توليد مفتاح عشوائي آمن.'), 'success');
  });
  $('#ae-copy-key').addEventListener('click', async () => {
    if (!passwordInput.value) { setStatus(t('لا يوجد مفتاح لنسخه.'), 'error'); return; }
    try { await navigator.clipboard.writeText(passwordInput.value); setStatus(t('تم نسخ مفتاح الحماية.'), 'success'); }
    catch { setStatus(t('تعذر النسخ تلقائياً. انسخ المفتاح يدوياً.'), 'error'); }
  });
  $('#ae-zip').addEventListener('click', () => void zipNormal());
  $('#ae-encrypt').addEventListener('click', () => void encrypt());
  $('#ae-decrypt').addEventListener('click', () => void decrypt());
  $('#ae-portable').addEventListener('click', async () => {
    try {
      setStatus(t('يجري تجهيز المستخرج المحمول…'));
      const response = await fetch('/libraries/Arsenal_Portable_Extractor.html');
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      download(blob, 'Arsenal_Portable_Extractor.html');
      setStatus(t('تم تنزيل المستخرج المحمول.'), 'success');
    } catch { setStatus(t('تعذر تجهيز المستخرج المحمول.'), 'error'); }
  });
  void activeTab;
});

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer { return bytes.slice().buffer as ArrayBuffer; }
async function getCryptoKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  if (secret.length === 64 && /^[\da-f]+$/i.test(secret)) {
    const bytes = new Uint8Array(secret.match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? []);
    return crypto.subtle.importKey('raw', toArrayBuffer(bytes), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const base = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(secret)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 160);
}
function formatBytes(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power ? 2 : 0)} ${units[power]}`;
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : t('خطأ غير معروف'); }
function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`العنصر المطلوب غير موجود: ${selector}`);
  return element;
}
