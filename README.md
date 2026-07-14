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
*   **Progressive Web App (PWA):** Fully installable and offline-capable, powered by a dedicated manifest and Service Workers[span_2](start_span)[span_2](end_span).
*   **Cross-Origin Isolation:** Integrates `coi-serviceworker.js` to enable SharedArrayBuffer for high-performance WebAssembly multithreading[span_3](start_span)[span_3](end_span).
*   **Global Localization:** Built-in multi-language support (Arabic, English, Russian, Chinese) natively integrated into the core architecture[span_4](start_span)[span_4](end_span).

### Comprehensive Tool Ecosystem

**Audio Processing**
*   **Audio Rate:** Advanced local playback speed modification and manipulation[span_5](start_span)[span_5](end_span).
*   **Audio Adapter:** Universal offline format converter[span_6](start_span)[span_6](end_span).
*   **Audio Cut:** Precision timeline-based trimmer[span_7](start_span)[span_7](end_span).

**Video Engineering**
*   **Video Editor:** Non-linear web-based editing[span_8](start_span)[span_8](end_span).
*   **Video Compressor:** High-fidelity bitrate reduction[span_9](start_span)[span_9](end_span).
*   **Video Converter:** Instant audio track extraction from video files[span_10](start_span)[span_10](end_span).

**Image Manipulation**
*   **Image Remover:** AI-powered background removal utilizing Web Workers[span_11](start_span)[span_11](end_span).
*   **Image Editor:** Client-side visual correction and cropping[span_12](start_span)[span_12](end_span).
*   **Image Compressor:** Visual-quality preserving size reduction[span_13](start_span)[span_13](end_span).

**PDF Operations**
*   **PDF Creator & Editor:** Secure document compilation[span_14](start_span)[span_14](end_span).
*   **PDF Compressor:** Local document optimization[span_15](start_span)[span_15](end_span).

**Text & Utilities**
*   **Encrypted Texts:** Cryptographic text security[span_16](start_span)[span_16](end_span).
*   **Text Comparison & Filter:** Data analysis and duplication removal[span_17](start_span)[span_17](end_span).
*   **Multi-Tools Library:** Featuring an Archive manager, Portable Extractor, QR Generator, and Arsenal Share utilities[span_18](start_span)[span_18](end_span).

### Core Technologies & Libraries

Arsenal ATL relies on an advanced `core/` directory housing industry-standard local computing libraries[span_19](start_span)[span_19](end_span):

| Technology | Implementation Scope |
| :--- | :--- |
| **FFmpeg.wasm** | Heavy video/audio encoding and decoding (`ffmpeg-core.wasm`)[span_20](start_span)[span_20](end_span) |
| **ONNX Runtime** | Executing the `isnet-general` neural network model for AI background masking[span_21](start_span)[span_21](end_span) |
| **Argon2** | High-security key derivation and cryptographic hashing (`argon2.wasm`)[span_22](start_span)[span_22](end_span) |
| **Tone.js** | Interactive Web Audio API framework for the Audio Rate tool[span_23](start_span)[span_23](end_span) |
| **PDF Core** | Utilizing `jspdf`, `pdf-lib`, and `pdf.js` for complex document processing[span_24](start_span)[span_24](end_span) |

### Quick Start & Deployment

1. **Clone the repository:** `git clone https://github.com/yourusername/arsenal-atl.git`
2. **Run locally:** Open `index.html` or serve via `npx serve .`[span_25](start_span)[span_25](end_span)

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
*   **تطبيق ويب تقدمي (PWA):** قابل للتثبيت ويعمل بالكامل دون إنترنت بفضل ملفات الـ Manifest و Service Workers[span_26](start_span)[span_26](end_span).
*   **عزل النطاقات (Cross-Origin):** استخدام `coi-serviceworker.js` لدعم تعدد المسارات (Multithreading) لتقنيات WebAssembly[span_27](start_span)[span_27](end_span).
*   **دعم اللغات:** نظام ترجمة مدمج يدعم العربية، الإنجليزية، الروسية، والصينية[span_28](start_span)[span_28](end_span).

### منظومة الأدوات الشاملة

**المعالجة الصوتية**
*   **معدل الصوت (Audio Rate):** تعديل سرعة ودرجة الصوت محلياً باحترافية[span_29](start_span)[span_29](end_span).
*   **محول الصوت (Audio Adapter):** تغيير صيغ الملفات الصوتية بسلاسة[span_30](start_span)[span_30](end_span).
*   **قاطع الصوت (Audio Cut):** قص دقيق للمسارات الصوتية[span_31](start_span)[span_31](end_span).

**هندسة الفيديو**
*   **محرر الفيديو:** تحرير متقدم وقص دون الحاجة للرندرة السحابية[span_32](start_span)[span_32](end_span).
*   **ضاغط الفيديو:** تقليل الحجم مع الحفاظ على الجودة[span_33](start_span)[span_33](end_span).
*   **مستخرج الصوت:** فصل المسار الصوتي عن الفيديو بضغطة زر[span_34](start_span)[span_34](end_span).

**معالجة الصور**
*   **مزيل الخلفية:** عزل ذكي يعتمد على الذكاء الاصطناعي وتقنية Web Workers[span_35](start_span)[span_35](end_span).
*   **محرر الصور:** تصحيح وتعديل بصري شامل[span_36](start_span)[span_36](end_span).
*   **ضاغط الصور:** تصغير الأحجام دون فقدان الجودة[span_37](start_span)[span_37](end_span).

**عمليات PDF**
*   **منشئ ومحرر PDF:** بناء المستندات بأمان تام[span_38](start_span)[span_38](end_span).
*   **ضاغط PDF:** تحسين حجم المستندات لتسهيل المشاركة[span_39](start_span)[span_39](end_span).

**النصوص والأدوات المساعدة**
*   **النصوص المشفرة:** تأمين البيانات النصية الحساسة[span_40](start_span)[span_40](end_span).
*   **مقارنة وتصفية النصوص:** تحليل البيانات وإزالة التكرارات[span_41](start_span)[span_41](end_span).
*   **مكتبة الأدوات المتعددة:** تتضمن إدارة الأرشيف، الاستخراج المحمول، مولد رموز QR، وأداة مشاركة Arsenal[span_42](start_span)[span_42](end_span).

### المحرك التقني والمكتبات الأساسية

يعتمد المشروع على مجلد `core` يحتوي على أقوى المكتبات لمعالجة البيانات محلياً[span_43](start_span)[span_43](end_span):

| التقنية البرمجية | نطاق الاستخدام |
| :--- | :--- |
| **FFmpeg.wasm** | ترميز ومعالجة الفيديو والصوت الثقيلة[span_44](start_span)[span_44](end_span) |
| **ONNX Runtime** | تشغيل نموذج الذكاء الاصطناعي `isnet-general` لعزل الصور[span_45](start_span)[span_45](end_span) |
| **Argon2** | عمليات التشفير وتأمين البيانات المعقدة[span_46](start_span)[span_46](end_span) |
| **Tone.js** | إطار عمل متقدم للتحكم الدقيق بالصوت[span_47](start_span)[span_47](end_span) |
| **PDF Core** | مكتبات `jspdf` و `pdf-lib` و `pdf.js` لمعالجة المستندات[span_48](start_span)[span_48](end_span) |

### كيفية التشغيل

1. **تحميل المستودع:** `git clone https://github.com/yourusername/arsenal-atl.git`
2. **التشغيل:** افتح ملف `index.html` أو استخدم خادم محلي عبر `npx serve .`[span_49](start_span)[span_49](end_span)

### الترخيص والتواصل
*   **الترخيص:** محكوم ببنود **Arsenal Source Available License (ASAL) v1.0**.
*   **الموقع الرسمي:** [https://arsenal-atl.pages.dev/](https://arsenal-atl.pages.dev/)
*   **البريد الإلكتروني:** arsenalatl.feedback@gmail.com

</div>

---
<p align="center">Built by ATL — Empowering Privacy through Innovation.</p>
