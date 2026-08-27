# محول الصيغ الصوتية المستقل — Arsenal ATL

## الاستقلالية المعمارية

هذه الأداة صفحة مستقلة على المسار `tools/audio-converter/index.html`. لا تحتوي على `iframe`، ولا تستدعي `ToolLoader`، ولا تعتمد على أي حقن من مشروع `web_site` القديم. يبدأ التنفيذ من `src/tools/audio-converter/main.ts` ويُبنى بواسطة Vite إلى صفحة ثابتة قابلة للنشر.

| الملف أو المجلد | مسؤوليته |
|---|---|
| `tools/audio-converter/index.html` | نقطة الدخول HTML المستقلة للأداة |
| `src/tools/audio-converter/main.ts` | منطق الرفع واختيار الصيغة والتحويل والتنزيل المحلي |
| `src/tools/audio-converter/audio-converter.css` | واجهة محول الصوت وقائمة الصيغ المخصصة للهاتف |
| `src/shared/ui/standalone-tool.ts` | تشغيل صفحة الأداة المستقلة ومعالجة أخطاء التحميل |
| `src/shared/ui/tool-shell.ts` | الشريط العلوي والقائمة الجانبية وروابط الأدوات الحقيقية |
| `src/shared/ui/reference-orbs.ts` | محرك Canvas الخفيف لخلفية Arsenal المتحركة |
| `src/shared/runtime/lame.ts` و`public/libraries/lame.min.js` | ترميز MP3 محلياً عند اختياره فقط |
| `dist/` | النسخة المبنية الجاهزة للتشغيل والنشر |

## تشغيل سريع من Termux

> لا تحتاج Node.js لتجربة النسخة الجاهزة؛ مجلد `dist` موجود داخل الحزمة.

```bash
cd dist
python -m http.server 8080
```

بعدها افتح من متصفح الهاتف:

```text
http://127.0.0.1:8080/tools/audio-converter/
```

## إعادة البناء من المصدر

إذا أردت تعديل TypeScript وCSS ثم بناء النسخة الجديدة:

```bash
pnpm install
pnpm build
pnpm preview --host 0.0.0.0 --port 4175
```

ثم افتح:

```text
http://127.0.0.1:4175/tools/audio-converter/
```

## نطاق التحويل المحلي

تعمل الأداة كلياً داخل المتصفح. تستخدم Web Audio لإنتاج WAV، وLAME لإنتاج MP3، وJSZip للأرشفة. لا تُرسل الملف إلى خادم خارجي.
