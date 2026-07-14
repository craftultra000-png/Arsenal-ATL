# Arsenal ATL: The Ultimate Local-First Digital Toolkit

<p align="center">
  <img src="https://img.shields.io/badge/Privacy-100%25_Local--First-00D4AA?style=for-the-badge" alt="Local-First Privacy" />
  <img src="https://img.shields.io/badge/Tech_Stack-WebAssembly_|_JS-7C5CFC?style=for-the-badge" alt="Tech Stack" />
  <img src="https://img.shields.io/badge/License-ASAL_v1.0-orange?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-51.7%25-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JS 51.7%" />
  <img src="https://img.shields.io/badge/HTML-31.5%25-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML 31.5%" />
  <img src="https://img.shields.io/badge/CSS-16.8%25-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS 16.8%" />
</p>

<p align="center">
  <a href="#english-version">English Version</a> • 
  <a href="#arabic-version">النسخة العربية</a>
</p>

---

<div id="english-version">

## Vision & Overview (English)

**Arsenal ATL** is a professional-grade, all-in-one digital ecosystem designed to empower users with powerful web tools while maintaining absolute data sovereignty. 

Unlike traditional online services that compromise privacy by requiring file uploads to remote servers, Arsenal ATL operates strictly on a **Local-First** philosophy. Every single byte of data is processed directly inside the browser's secure sandbox.

### Core Architecture & Capabilities

*   **Zero-Knowledge Environment:** True serverless architecture ensuring data never leaves the device.
*   **Progressive Web App (PWA):** Fully installable and offline-capable, powered by a dedicated manifest and Service Workers.
*   **Cross-Origin Isolation:** Integrates `coi-serviceworker.js` to enable SharedArrayBuffer for high-performance WebAssembly multithreading.
*   **Global Localization:** Built-in multi-language support (Arabic, English, Russian, Chinese) natively integrated into the core architecture.

### Comprehensive Tool Ecosystem

**Audio Processing**
*   **Audio Rate:** Advanced local playback speed modification and manipulation.
*   **Audio Adapter:** Universal offline format converter.
*   **Audio Cut:** Precision timeline-based trimmer.

**Video Engineering**
*   **Video Editor:** Non-linear web-based editing.
*   **Video Compressor:** High-fidelity bitrate reduction.
*   **Video Converter:** Instant audio track extraction from video files.

**Image Manipulation**
*   **Image Remover:** AI-powered background removal utilizing Web Workers.
*   **Image Editor:** Client-side visual correction and cropping.
*   **Image Compressor:** Visual-quality preserving size reduction.

**PDF Operations**
*   **PDF Creator & Editor:** Secure document compilation.
*   **PDF Compressor:** Local document optimization.

**Text & Utilities**
*   **Encrypted Texts:** Cryptographic text security.
*   **Text Comparison & Filter:** Data analysis and duplication removal.
*   **Multi-Tools Library:** Featuring an Archive manager, Portable Extractor, QR Generator, and Arsenal Share utilities.

### Core Technologies & Libraries

Arsenal ATL relies on an advanced `core/` directory housing industry-standard local computing libraries:

| Technology | Implementation Scope |
| :--- | :--- |
| **FFmpeg.wasm** | Heavy video/audio encoding and decoding (`ffmpeg-core.wasm`) |
| **ONNX Runtime** | Executing the `isnet-general` neural network model for AI background masking |
| **Argon2** | High-security key derivation and cryptographic hashing (`argon2.wasm`) |
| **Tone.js** | Interactive Web Audio API framework for the Audio Rate tool |
| **PDF Core** | Utilizing `jspdf`, `pdf-lib`, and `pdf.js` for complex document processing |

### Quick Start & Deployment

1. **Clone the repository:** `git clone https://github.com/yourusername/arsenal-atl.git`
2. **Run locally:** Open `index.html` or serve via `npx serve .`

### License & Contact
*   **License:** Governed by the **Arsenal Source Available License (ASAL) v1.0**.
*   **Official Website:** [https://arsenal-atl.pages.dev/](https://arsenal-atl.pages.dev/)
*   **Support Email:** arsenalatl.feedback@gmail.com

</div>

---

<div id="arabic-version" dir="rtl">

## الرؤية والنظرة العامة (النسخة العربية)

**Arsenal ATL** هي منظومة رقمية متكاملة واحترافية، صُممت لتمكين المستخدمين من أدوات ويب متقدمة مع الحفاظ التام على سيادة البيانات.

بخلاف الخدمات التقليدية التي تتطلب رفع الملفات لخوادم بعيدة، تعمل المنصة بمبدأ **"المعالجة المحلية أولاً" (Local-First)**، حيث تتم معالجة كافة البيانات داخل البيئة الآمنة لمتصفح المستخدم.

### المعمارية التقنية والقدرات

*   **بيئة خالية من الخوادم (Zero-Knowledge):** ملفاتك لا تغادر جهازك أبداً.
*   **تطبيق ويب تقدمي (PWA):** قابل للتثبيت ويعمل بالكامل دون إنترنت بفضل ملفات الـ Manifest و Service Workers.
*   **عزل النطاقات (Cross-Origin):** استخدام `coi-serviceworker.js` لدعم تعدد المسارات (Multithreading) لتقنيات WebAssembly.
*   **دعم اللغات:** نظام ترجمة مدمج يدعم العربية، الإنجليزية، الروسية، والصينية.

### منظومة الأدوات الشاملة

**المعالجة الصوتية**
*   **معدل الصوت (Audio Rate):** تعديل سرعة ودرجة الصوت محلياً باحترافية.
*   **محول الصوت (Audio Adapter):** تغيير صيغ الملفات الصوتية بسلاسة.
*   **قاطع الصوت (Audio Cut):** قص دقيق للمسارات الصوتية.

**هندسة الفيديو**
*   **محرر الفيديو:** تحرير متقدم وقص دون الحاجة للرندرة السحابية.
*   **ضاغط الفيديو:** تقليل الحجم مع الحفاظ على الجودة.
*   **مستخرج الصوت:** فصل المسار الصوتي عن الفيديو بضغطة زر.

**معالجة الصور**
*   **مزيل الخلفية:** عزل ذكي يعتمد على الذكاء الاصطناعي وتقنية Web Workers.
*   **محرر الصور:** تصحيح وتعديل بصري شامل.
*   **ضاغط الصور:** تصغير الأحجام دون فقدان الجودة.

**عمليات PDF**
*   **منشئ ومحرر PDF:** بناء المستندات بأمان تام.
*   **ضاغط PDF:** تحسين حجم المستندات لتسهيل المشاركة.

**النصوص والأدوات المساعدة**
*   **النصوص المشفرة:** تأمين البيانات النصية الحساسة.
*   **مقارنة وتصفية النصوص:** تحليل البيانات وإزالة التكرارات.
*   **مكتبة الأدوات المتعددة:** تتضمن إدارة الأرشيف، الاستخراج المحمول، مولد رموز QR، وأداة مشاركة Arsenal.

### المحرك التقني والمكتبات الأساسية

يعتمد المشروع على مجلد `core` يحتوي على أقوى المكتبات لمعالجة البيانات محلياً:

| التقنية البرمجية | نطاق الاستخدام |
| :--- | :--- |
| **FFmpeg.wasm** | ترميز ومعالجة الفيديو والصوت الثقيلة |
| **ONNX Runtime** | تشغيل نموذج الذكاء الاصطناعي `isnet-general` لعزل الصور |
| **Argon2** | عمليات التشفير وتأمين البيانات المعقدة |
| **Tone.js** | إطار عمل متقدم للتحكم الدقيق بالصوت |
| **PDF Core** | مكتبات `jspdf` و `pdf-lib` و `pdf.js` لمعالجة المستندات |

### كيفية التشغيل

1. **تحميل المستودع:** `git clone https://github.com/yourusername/arsenal-atl.git`
2. **التشغيل:** افتح ملف `index.html` أو استخدم خادم محلي خفيف عبر `npx serve .`

### الترخيص والتواصل
*   **الترخيص:** محكوم ببنود **Arsenal Source Available License (ASAL) v1.0**.
*   **الموقع الرسمي:** [https://arsenal-atl.pages.dev/](https://arsenal-atl.pages.dev/)
*   **البريد الإلكتروني:** arsenalatl.feedback@gmail.com

</div>

---
<p align="center">Built by ATL — Empowering Privacy through Innovation.</p>
