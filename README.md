# Arsenal ATL

منصة Arsenal ATL هي مجموعة أدوات رقمية تعمل محلياً في المتصفح لمعالجة الفيديو والصوت والصور وPDF والنصوص، مع دعم واجهة عربية RTL وثماني لغات إضافية.

## المتطلبات

يُستخدم Node.js 22 أو إصدار حديث متوافق مع Vite 7، مع pnpm.

```bash
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

## بناء الإنتاج

```bash
pnpm check
pnpm build
```

ينشئ أمر البناء المجلد `dist/`. هذا هو **المجلد الوحيد** الذي يجب أن تنشره Cloudflare Pages عند النشر اليدوي، أو يُضبط بوصفه مجلد الإخراج عند النشر المتصل بـGitHub.

| إعداد Cloudflare Pages | القيمة |
|---|---|
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Node.js | 22 أو أحدث متوافق |
| Root directory | جذر هذا المستودع |

## PWA والعمل دون اتصال

تولّد عملية البناء `manifest.webmanifest` و`service-worker.js`. في الواجهة افتح **الإعدادات** ثم اضغط **«تحميل للاستخدام Offline»** لتخزين الصفحات والأصول المحلية اللازمة. تعمل الميزات المعتمدة على نموذج ONNX أو محرك FFmpeg لم يُنزّل من قبل عند توفر الإنترنت في الاستخدام الأول، ثم تستفيد من التخزين المحلي اللاحق.

## SEO

تُنشأ البيانات الوصفية وJSON-LD و`sitemap.xml` من السجل المركزي `src/shared/seo.ts` أثناء البناء. يبقى `robots.txt` في `public/` ويشير إلى خريطة الموقع على النطاق:

```text
https://arsenal-atl.pages.dev/sitemap.xml
```

## البنية

```text
src/       TypeScript للواجهة والأدوات والطبقات المشتركة
public/    أصول النشر الثابتة وPWA وCloudflare headers
index.html الصفحة الرئيسية
vite.config.ts  مداخل Vite متعددة الصفحات وتوليد PWA وSEO
```

لا ترفع `node_modules/` أو `dist/` إلى Git. كلاهما مستثنى في `.gitignore`؛ يعيد Cloudflare إنشاء `dist/` من أمر البناء.
