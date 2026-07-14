<div align="center">

<img src="web_site/core/style_and_sound/arsenal_Silver.png" alt="Arsenal" width="96"/>

<br/>

# Arsenal — الترسانة

**منصة أدوات رقمية احترافية تعمل بالكامل في متصفحك**

[![License](https://img.shields.io/badge/License-ASAL_v1.0-367cee?style=flat-square)](./LICENSE.txt)
[![Live](https://img.shields.io/badge/Live-arsenal--atl.pages.dev-00d4aa?style=flat-square)](https://arsenal-atl.pages.dev)
[![PWA](https://img.shields.io/badge/PWA-Ready-f5a623?style=flat-square)](#)
[![Languages](https://img.shields.io/badge/Languages-AR_·_EN_·_RU_·_ZH-367cee?style=flat-square)](#)
[![Status](https://img.shields.io/badge/Status-Production-00d4aa?style=flat-square)](#)

<br/>

[العربية](#ar) · [English](#en)

</div>

---

<a name="ar"></a>

## نظرة عامة

**الترسانة** منصة أدوات رقمية احترافية مفتوحة المصدر، مبنية على مبدأ واحد:

> ملفاتك ملكك وحدك. نحن لا نراها، لا نحتفظ بها، ولا نشاركها مع أي طرف ثالث — أبداً.

جميع عمليات المعالجة تتم داخل متصفحك مباشرةً باستخدام تقنيات WebAssembly. لا رفع ملفات. لا سيرفرات. لا قيود.

---

## المميزات

| الميزة | التفاصيل |
|--------|----------|
| خصوصية تامة | المعالجة محلية 100% — ملفاتك لا تغادر جهازك |
| فوري بالكامل | لا انتظار، لا رفع، لا اتصال مطلوب |
| يعمل بدون إنترنت | بعد أول تحميل يعمل offline بشكل كامل |
| 4 لغات | العربية، الإنجليزية، الروسية، الصينية مع دعم RTL |
| قابل للتثبيت | PWA — يُثبَّت على الجوال والحاسوب كتطبيق مستقل |

---

## الأدوات

**فيديو**
محرر فيديو · ضاغط فيديو · تحويل فيديو إلى صوت

**صوت**
محول صوت · قص صوت · معدّل السرعة

**صور**
محرر صور · مزيل خلفية بالذكاء الاصطناعي · ضاغط صور

**PDF**
إنشاء PDF · ضغط PDF · محرر PDF

**نصوص**
تشفير AES-256-GCM · مصفاة نصوص · مقارنة نصوص

**متعدد**
مولد QR · أرشفة وتشفير · مشاركة ملفات محلية

---

## التقنيات

```
FFmpeg (WASM)       —  معالجة الفيديو والصوت محلياً
ONNX Runtime        —  الذكاء الاصطناعي لإزالة الخلفية
pdf-lib             —  معالجة ملفات PDF
AES-256-GCM         —  تشفير النصوص والملفات بمعيار عسكري
Google OAuth 2.0    —  تسجيل الدخول
Firebase Firestore  —  تخزين الفيدباك
Cloudflare Pages    —  الاستضافة والنشر
```

---

## هيكل المشروع

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
│   └── settings/               ← الإعدادات، الخطط، السياسات
│
├── core/
│   ├── toolLoader.js           ← محرك تحميل الأدوات
│   ├── lang/                   ← ملفات الترجمة (ar · en · ru · zh)
│   └── core_app/               ← المكتبات (FFmpeg · ONNX · pdf-lib)
│
├── video/ · audio/ · image/ · pdf/ · text/
│                               ← أدوات مستقلة لكل فئة
└── tools/                      ← صفحات SEO لكل أداة
```

---

## كيف يعمل

```
المستخدم يختار أداة
         ↓
toolLoader.js يحمّل ملفات الأداة
         ↓
HTML + CSS + JS تُحقن في iframe معزول
         ↓
الأداة تعمل محلياً داخل المتصفح
         ↓
الملف الناتج يُحمَّل مباشرة على جهاز المستخدم
```

---

## الترخيص

هذا المشروع مرخص بموجب **Arsenal Source Available License (ASAL) v1.0**

مسموح: الاستخدام الشخصي والدراسة · التعديل لأغراض شخصية · Fork للتعلم

غير مسموح: إعادة التوزيع باسم مختلف · الاستخدام التجاري · نشر نسخة عامة

للتراخيص التجارية: `arsenalatl.feedback@gmail.com`

راجع [LICENSE.txt](./LICENSE.txt) للتفاصيل الكاملة.

---
---

<a name="en"></a>

## Overview

**Arsenal** is an open-source professional digital toolkit built on a single principle:

> Your files belong to you alone. We never see them, store them, or share them with any third party — ever.

All processing happens directly inside your browser using WebAssembly technologies. No file uploads. No servers. No limits.

---

## Features

| Feature | Details |
|---------|---------|
| Total Privacy | 100% local processing — files never leave your device |
| Instant | No waiting, no uploads, no connection required |
| Works Offline | After first load, runs fully offline |
| 4 Languages | Arabic, English, Russian, Chinese with full RTL support |
| Installable | PWA — installs on mobile and desktop as a standalone app |

---

## Tools

**Video**
Video Editor · Video Compressor · Video to Audio

**Audio**
Audio Converter · Audio Cutter · Speed Changer

**Image**
Image Editor · AI Background Remover · Image Compressor

**PDF**
PDF Creator · PDF Compressor · PDF Editor

**Text**
AES-256-GCM Encryption · Text Filter · Text Comparison

**Multi**
QR Generator · Archive & Encrypt · Local File Share

---

## Tech Stack

```
FFmpeg (WASM)       —  Local video & audio processing
ONNX Runtime        —  AI-powered background removal
pdf-lib             —  PDF manipulation
AES-256-GCM         —  Military-grade text & file encryption
Google OAuth 2.0    —  Authentication
Firebase Firestore  —  Feedback storage
Cloudflare Pages    —  Hosting & deployment
```

---

## Project Structure

```
arsenal/
├── index.html                  ← Welcome & Onboarding page
├── manifest.json               ← PWA configuration
├── sw.js                       ← Service Worker
├── robots.txt                  ← Search engine configuration
├── sitemap.xml                 ← Site map
│
├── arsenal_home/
│   ├── arsenal.html            ← Main shell page
│   ├── arsenal.css             ← Full design system
│   ├── arsenal.js              ← Core app logic
│   └── settings/               ← Settings, plans, policies
│
├── core/
│   ├── toolLoader.js           ← Tool loading engine
│   ├── lang/                   ← Translation files (ar · en · ru · zh)
│   └── core_app/               ← Libraries (FFmpeg · ONNX · pdf-lib)
│
├── video/ · audio/ · image/ · pdf/ · text/
│                               ← Independent tools per category
└── tools/                      ← SEO landing pages per tool
```

---

## How It Works

```
User selects a tool
         ↓
toolLoader.js fetches the tool files
         ↓
HTML + CSS + JS injected into an isolated iframe
         ↓
Tool runs locally inside the browser
         ↓
Output file downloaded directly to user's device
```

---

## License

This project is licensed under the **Arsenal Source Available License (ASAL) v1.0**

Permitted: Personal use and study · Modification for personal projects · Forking for learning

Prohibited: Redistribution under a different name · Commercial use · Deploying a public copy

For commercial licensing: `arsenalatl.feedback@gmail.com`

See [LICENSE.txt](./LICENSE.txt) for full details.

---

<div align="center">

<br/>

[![Visit](https://img.shields.io/badge/arsenal--atl.pages.dev-Visit_Live-367cee?style=for-the-badge)](https://arsenal-atl.pages.dev)

<br/>

**Arsenal ATL · ثقتكم وجودنا**

</div>
