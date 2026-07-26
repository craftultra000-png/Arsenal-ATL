// ============================================================
//  Arsenal — ONNX Runtime Utilities
//  ملف مشترك يُحقن كـ script عادي في الـ iframe
//  يوفر دوال جاهزة للتعامل مع ORT و Workers
//
//  الاستخدام:
//    في toolLoader: js: [LIB.onnxRuntime, "my_tool.js"]
//    في الأداة:
//      const workerUrl = Arsenal.buildWorkerUrl('my_tool_worker.js');
//      const worker    = Arsenal.createOrtWorker('my_tool_worker.js');
//      const ortUrl    = Arsenal.getOrtUrl();
//      const basePath  = Arsenal.getWasmBasePath();
// ============================================================

(function () {
    'use strict';

    // ── الحصول على base path من lang.js — موجود في كل أداة ──
    function _getBasePath() {
        const langScript = [...document.querySelectorAll('script[src]')]
            .find(s => s.src && s.src.includes('lang.js'));
        if (langScript) {
            return langScript.src.substring(0, langScript.src.lastIndexOf('/') + 1);
        }
        // fallback من أي core script
        const coreScript = [...document.querySelectorAll('script[src]')]
            .find(s => s.src && s.src.includes('/core/core_app/'));
        if (coreScript) {
            return coreScript.src.substring(0, coreScript.src.lastIndexOf('/') + 1);
        }
        return '../core/core_app/';
    }

    // ── URL لملف ort.min.js ──────────────────────────────────
    function getOrtUrl() {
        // أولاً: ابحث عن script محقون مباشرة
        const ortScript = [...document.querySelectorAll('script[src]')]
            .find(s => s.src && s.src.includes('ort.min.js'));
        if (ortScript) return ortScript.src;
        // ثانياً: ابنه من base path
        return _getBasePath() + 'ort.min.js';
    }

    // ── مسار الـ wasm files ──────────────────────────────────
    function getWasmBasePath() {
        const ortUrl = getOrtUrl();
        return ortUrl.substring(0, ortUrl.lastIndexOf('/') + 1);
    }

    // ── بناء URL الـ Worker من اسم ملفه ─────────────────────
    // يبحث عن أي script للأداة ويستبدل اسمه باسم الـ worker
    // مثال: buildWorkerUrl('noise_remover_worker.js')
    function buildWorkerUrl(workerFileName) {
        // ابحث عن script يحتوي اسم الـ worker بدون _worker
        const toolName = workerFileName.replace('_worker.js', '.js');
        const toolScript = [...document.querySelectorAll('script[src]')]
            .find(s => s.src && s.src.includes(toolName));
        if (toolScript) {
            return toolScript.src.replace(toolName, workerFileName);
        }
        // fallback: ابنه من lang.js base
        const base = _getBasePath();
        // lang.js في /core/core_app/ — نحتاج نرجع لمجلد الأداة
        // هذا الـ fallback تقريبي فقط — يفضل الـ script tag يكون موجود
        console.warn('[Arsenal.ONNX] تعذّر إيجاد script للأداة، جرّب إضافة الـ tool script قبل الـ worker');
        return workerFileName;
    }

    // ── إنشاء Worker جاهز ────────────────────────────────────
    // ينشئ Worker فقط — ترسل init يدوياً مع بيانات الأداة
    // مثال:
    //   const w = Arsenal.createOrtWorker('noise_remover_worker.js');
    //   w.postMessage({ type: 'init', data: { onnxBytes, ortUrl: Arsenal.getOrtUrl() } }, [onnxBytes]);
    function createOrtWorker(workerFileName) {
        const url = buildWorkerUrl(workerFileName);
        if (!url) {
            console.error('[Arsenal.ONNX] تعذّر إنشاء Worker — URL غير صحيح');
            return null;
        }
        return new Worker(url);
    }

    // ── تصدير على window.Arsenal ─────────────────────────────
    window.Arsenal = window.Arsenal || {};
    window.Arsenal.ONNX = {
        getOrtUrl,
        getWasmBasePath,
        buildWorkerUrl,
        createOrtWorker,
    };

    // اختصارات مباشرة للتوافق مع الكود القديم
    window.getOrtUrl       = getOrtUrl;
    window.getWasmBasePath = getWasmBasePath;
    window.buildWorkerUrl  = buildWorkerUrl;
    window.createOrtWorker = createOrtWorker;

})();
