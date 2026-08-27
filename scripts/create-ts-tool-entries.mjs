import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tools = [
  ['video-editor', 'محرر الفيديو', 'قص وترتيب وتصدير الفيديو محلياً من المتصفح.'],
  ['video-compressor', 'ضاغط الفيديو', 'ضغط الفيديو بإعدادات جودة ودقة وأداء قابلة للتحكم.'],
  ['video-to-audio', 'فيديو إلى صوت', 'استخراج المسار الصوتي من ملف فيديو محلياً.'],
  ['audio-converter', 'محول الصوت', 'تحويل صيغ الملفات الصوتية بصورة مستقلة.'],
  ['noise-remover', 'مزيل الضوضاء', 'تنقية الصوت بالذكاء الاصطناعي داخل المتصفح.'],
  ['audio-rate', 'معدل الصوت', 'تغيير سرعة الصوت وتصديره كملف جديد.'],
  ['image-editor', 'محرر الصور', 'تعديلات أساسية للصور عبر مساحة عمل محلية.'],
  ['background-remover', 'مزيل الخلفية', 'عزل الخلفية ومعالجة الصورة محلياً.'],
  ['image-compressor', 'ضاغط الصور', 'ضغط صور متعددة مع تنزيل النتيجة.'],
  ['pdf-create', 'إنشاء PDF', 'تكوين مستند PDF من عناصر ومحتوى محلي.'],
  ['pdf-compressor', 'ضاغط PDF', 'تقليل حجم مستند PDF محلياً.'],
  ['pdf-editor', 'محرر PDF', 'تحميل واستعراض وتعديل مستندات PDF.'],
  ['text-encryption', 'تشفير النصوص', 'تشفير وفك تشفير النصوص محلياً.'],
  ['text-filter', 'مِصفاة النصوص', 'تنسيق وترميز وتحويل النصوص.'],
  ['text-comparison', 'مقارنة النصوص', 'إظهار الفروقات بين نصين محلياً.'],
  ['qr-generator', 'مولد QR', 'إنشاء رمز QR قابل للتنزيل.'],
  ['archive-encryption', 'الأرشفة والتشفير', 'إنشاء أرشيفات ZIP وتشفيرها محلياً.'],
  ['local-share', 'المشاركة المحلية', 'مشاركة الملفات بين الأجهزة على الشبكة المحلية.']
];

for (const [slug, title, description] of tools) {
  const htmlPath = resolve(root, `tools/${slug}/index.html`);
  await mkdir(dirname(htmlPath), { recursive: true });
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <link rel="canonical" href="https://arsenal-atl.pages.dev/tools/${slug}/">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title} | Arsenal ATL">
    <meta property="og:description" content="${description}">
    <title>${title} | Arsenal ATL</title>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"${title}","applicationCategory":"UtilitiesApplication","operatingSystem":"Web","url":"https://arsenal-atl.pages.dev/tools/${slug}/"}</script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/tools/${slug}/main.ts"></script>
  </body>
</html>
`;
  await writeFile(htmlPath, html, 'utf8');
}

console.log(`Created ${tools.length} independent tool entries.`);
