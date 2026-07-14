<div align="center">

<img src="core/style_and_sound/arsenal_Silver.png" alt="Arsenal Logo" width="100"/>

# Arsenal — الترسانة

### منصة أدوات رقمية احترافية تعمل 100% في متصفحك

[![License: ASAL](https://img.shields.io/badge/License-ASAL%20v1.0-367cee?style=flat-square)](./LICENSE.txt)
[![Live Demo](https://img.shields.io/badge/Live-arsenal--atl.pages.dev-00d4aa?style=flat-square)](https://arsenal-atl.pages.dev)
[![PWA](https://img.shields.io/badge/PWA-Ready-f5a623?style=flat-square)](#)
[![Languages](https://img.shields.io/badge/Languages-AR%20%7C%20EN%20%7C%20RU%20%7C%20ZH-367cee?style=flat-square)](#)

**[🇸🇦 العربية](#-نظرة-عامة) · [🇺🇸 English](#-overview)**

---

</div>

---

## 🇸🇦 نظرة عامة

**الترسانة (Arsenal)** منصة أدوات رقمية احترافية مفتوحة المصدر تعمل بالكامل داخل متصفحك — بدون سيرفرات، بدون رفع ملفات، بخصوصية 100%.

> ملفاتك ملكك وحدك. نحن لا نراها، لا نحتفظ بها، ولا نشاركها مع أي طرف ثالث — أبداً.

### ✨ المميزات الرئيسية

- **🔒 خصوصية تامة** — جميع عمليات المعالجة تتم محلياً داخل متصفحك
- **⚡ فوري 100%** — لا انتظار، لا رفع، لا سيرفرات
- **📴 يعمل بدون إنترنت** — بعد أول تحميل يعمل offline كاملاً
- **🌍 4 لغات** — العربية، الإنجليزية، الروسية، الصينية مع دعم RTL
- **📱 PWA** — قابل للتثبيت على الهاتف كتطبيق

### 🛠️ الأدوات المتاحة

| الفئة | الأدوات |
|-------|---------|
| 🎬 **فيديو** | محرر فيديو · ضاغط فيديو · تحويل فيديو إلى صوت |
| 🎵 **صوت** | محول صوت · قص صوت · معدّل السرعة |
| 🖼️ **صور** | محرر صور · مزيل خلفية (AI) · ضاغط صور |
| 📄 **PDF** | إنشاء PDF · ضغط PDF · محرر PDF |
| 📝 **نصوص** | تشفير AES-256 · مصفاة نصوص · مقارنة نصوص |
| 🔧 **متعدد** | مولد QR · أرشفة وتشفير · مشاركة محلية |

### 🚀 تجربة مباشرة

```
https://arsenal-atl.pages.dev
```

### 🏗️ التقنيات المستخدمة

```
FFmpeg (WASM)     — معالجة الفيديو والصوت
ONNX Runtime      — الذكاء الاصطناعي لإزالة الخلفية
pdf-lib           — معالجة PDF
AES-256-GCM       — تشفير النصوص والملفات
Google OAuth 2.0  — تسجيل الدخول
Firebase          — تخزين الفيدباك
Cloudflare Pages  — الاستضافة
```

### 📁 هيكل المشروع

```
arsenal/
├── index.html                  ← صفحة الترحيب والـ Onboarding
├── manifest.json               ← إعدادات PWA
├── sw.js                       ← Service Worker
├── robots.txt                  ← إعدادات محركات البحث
├── sitemap.xml                 ← خريطة الموقع
│
├── arsenal_home/
│   ├── arsenal.html            ← الصفحة الرئيسية (Shell)
│   ├── arsenal.css             ← النظام البصري الكامل
│   ├── arsenal.js              ← منطق التطبيق الرئيسي
│   └── settings/               ← صفحة الإعدادات
│
├── core/
│   ├── toolLoader.js           ← محرك تحميل الأدوات
│   ├── lang/                   ← ملفات الترجمة (ar/en/ru/zh)
│   └── core_app/               ← المكتبات (FFmpeg, ONNX, pdf-lib...)
│
├── video/                      ← أدوات الفيديو
├── audio/                      ← أدوات الصوت
├── image/                      ← أدوات الصور
├── pdf/                        ← أدوات PDF
├── text/                       ← أدوات النصوص
├── multi_tools_library/        ← الأدوات المتعددة
└── tools/                      ← صفحات SEO لكل أداة
```

### ⚙️ كيف يعمل

```
المستخدم يضغط أداة
        ↓
toolLoader.js يحمّل الأداة
        ↓
يُحقن HTML + CSS + JS في iframe معزول
        ↓
الأداة تعمل محلياً داخل المتصفح
        ↓
النتيجة تُحمَّل مباشرة على جهاز المستخدم
```

### 📜 الترخيص

هذا المشروع مرخص بموجب **Arsenal Source Available License (ASAL) v1.0**

- ✅ الاستخدام الشخصي والدراسة
- ✅ التعديل لأغراض شخصية
- ✅ Fork للتعلم والتطوير
- ❌ إعادة التوزيع باسم مختلف
- ❌ الاستخدام التجاري بدون إذن
- ❌ نشر نسخة عامة من المشروع

للتراخيص التجارية: **arsenalatl.feedback@gmail.com**

راجع ملف [LICENSE.txt](./LICENSE.txt) للتفاصيل الكاملة.

---

---

## 🇺🇸 Overview

**Arsenal** is an open-source professional digital toolkit that runs entirely inside your browser — no servers, no file uploads, 100% private.

> Your files belong to you alone. We never see them, store them, or share them with any third party — ever.

### ✨ Key Features

- **🔒 Total Privacy** — All processing happens locally inside your browser
- **⚡ Instant** — No waiting, no uploads, no servers
- **📴 Works Offline** — After the first load, runs fully offline
- **🌍 4 Languages** — Arabic, English, Russian, Chinese with full RTL support
- **📱 PWA Ready** — Installable on mobile as a native app

### 🛠️ Available Tools

| Category | Tools |
|----------|-------|
| 🎬 **Video** | Video Editor · Video Compressor · Video to Audio |
| 🎵 **Audio** | Audio Converter · Audio Cutter · Speed Changer |
| 🖼️ **Image** | Image Editor · AI Background Remover · Image Compressor |
| 📄 **PDF** | PDF Creator · PDF Compressor · PDF Editor |
| 📝 **Text** | AES-256 Encryption · Text Filter · Text Compare |
| 🔧 **Multi** | QR Generator · Archive & Encrypt · Local File Share |

### 🚀 Live Demo

```
https://arsenal-atl.pages.dev
```

### 🏗️ Tech Stack

```
FFmpeg (WASM)     — Local video & audio processing
ONNX Runtime      — AI-powered background removal
pdf-lib           — PDF manipulation
AES-256-GCM       — Military-grade text & file encryption
Google OAuth 2.0  — Authentication
Firebase          — Feedback storage
Cloudflare Pages  — Hosting
```

### 📁 Project Structure

```
arsenal/
├── index.html                  ← Welcome & Onboarding page
├── manifest.json               ← PWA configuration
├── sw.js                       ← Service Worker
├── robots.txt                  ← Search engine config
├── sitemap.xml                 ← Site map
│
├── arsenal_home/
│   ├── arsenal.html            ← Main shell page
│   ├── arsenal.css             ← Full design system
│   ├── arsenal.js              ← Core app logic
│   └── settings/               ← Settings page
│
├── core/
│   ├── toolLoader.js           ← Tool loading engine
│   ← lang/                    ← Translation files (ar/en/ru/zh)
│   └── core_app/               ← Libraries (FFmpeg, ONNX, pdf-lib...)
│
├── video/                      ← Video tools
├── audio/                      ← Audio tools
├── image/                      ← Image tools
├── pdf/                        ← PDF tools
├── text/                       ← Text tools
├── multi_tools_library/        ← Multi-purpose tools
└── tools/                      ← SEO landing pages per tool
```

### ⚙️ How It Works

```
User clicks a tool
        ↓
toolLoader.js fetches the tool
        ↓
HTML + CSS + JS injected into isolated iframe
        ↓
Tool runs locally inside the browser
        ↓
Output downloaded directly to user's device
```

### 📜 License

This project is licensed under the **Arsenal Source Available License (ASAL) v1.0**

- ✅ Personal use and study
- ✅ Modification for personal projects
- ✅ Forking for learning and development
- ❌ Redistribution under a different name
- ❌ Commercial use without permission
- ❌ Deploying a public copy of the project

For commercial licensing: **arsenalatl.feedback@gmail.com**

See [LICENSE.txt](./LICENSE.txt) for full details.

---

<div align="center">

**Arsenal ATL · ثقتكم وجودنا**

[![Live](https://img.shields.io/badge/🌐-arsenal--atl.pages.dev-367cee?style=for-the-badge)](https://arsenal-atl.pages.dev)

</div>
