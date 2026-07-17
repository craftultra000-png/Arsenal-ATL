// ==========================================
// 1. قاموس الأدوات المركزي + طبقة المسارات
// ==========================================
const TOOL_GROUP_PATHS = Object.freeze({
    video: "../video",
    audio: "../audio",
    image: "../image",
    pdf: "../pdf",
    text: "../text",
    multi: "../multi_tools_library",
    home: "../arsenal_home",
    settings: "../arsenal_home/settings"
});

// مسار المكاتب المشتركة
const CORE_APP = "../core/core_app";

// اختصار للمكاتب المشتركة
const LIB = Object.freeze({
    index:        `${CORE_APP}/core_ffmpeg/index.js`,
    ffmpeg:       `${CORE_APP}/core_ffmpeg/ffmpeg.js`,
    ffmpeg814:    `${CORE_APP}/core_ffmpeg/814.ffmpeg.js`,
    ffmpegCore:   `${CORE_APP}/core_ffmpeg/ffmpeg-core.js`,
    ffmpegWorker: `${CORE_APP}/core_ffmpeg/ffmpeg-core.worker.js`,
    jszip:        `${CORE_APP}/jszip.min.js`,
    lame:         `${CORE_APP}/lame.min.js`,
    tone:         `${CORE_APP}/Tone.js`,
    html2canvas:  `${CORE_APP}/html2canvas.min.js`,
    jspdf:        `${CORE_APP}/jspdf.umd.min.js`,
    pdfMin:       `${CORE_APP}/pdf.min.js`,
    pdfWorker:    `${CORE_APP}/pdf.worker.min.js`,
    pdfLib:       `${CORE_APP}/pdf-lib.min.js`,
    qrcode:       `${CORE_APP}/easy.qrcode.min.js`,
    html5qr:      `${CORE_APP}/html5-qrcode.min.js`,
    ort:          `${CORE_APP}/ort.wasm.min.js`,
    argon2:       `${CORE_APP}/argon2.js`,
});

function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function defineTool(group, directory, options = {}) {
    const basePath = `${TOOL_GROUP_PATHS[group]}/${directory}`;
    const entry = options.entry || directory;
    const resolveLocalAsset = (fileName) => {
        if (/^(https?:)?\/\//.test(fileName) || fileName.startsWith("../")) {
            return fileName;
        }
        return `${basePath}/${fileName}`;
    };

    return Object.freeze({
        html: resolveLocalAsset(options.html || `${entry}.html`),
        css: toArray(options.css === false ? [] : (options.css || `${entry}.css`)).map(resolveLocalAsset),
        js: toArray(options.js || `${entry}.js`).map(resolveLocalAsset),
        moduleJs: toArray(options.moduleJs || []).map(resolveLocalAsset),
        lifecycle: Object.freeze(options.lifecycle || {})
    });
}

const arsenalTools = Object.freeze({
    //  أدوات الفيديو
    video_editor: defineTool("video", "video_editor", {
        js: [LIB.ffmpeg814, LIB.ffmpeg, "video_editor.js"]
    }),
    video_converter_f_voice: defineTool("video", "video_converter_f_voice", {
        js: ["video_converter_f_voice.js", LIB.lame]
    }),
        
    video_compressor: defineTool("video", "video_compressor", {
        js: [LIB.ffmpeg814, LIB.ffmpeg, "video_compressor.js"]
    }),


    //  أدوات الصوت
    audio_adapter: defineTool("audio", "audio_adapter", {
        js: [LIB.jszip, LIB.lame, "audio_adapter.js"]
    }),
    audio_cut: defineTool("audio", "audio_cut", {
        js: [LIB.lame, "audio_cut.js"]
    }),
    audio_rate: defineTool("audio", "audio_rate", {
        js: [LIB.tone, "audio_rate.js", LIB.lame]
    }),

    // ️ أدوات الصور
    image_editor: defineTool("image", "image_editor"),
    image_remover: defineTool("image", "image_remover", {
        js: ["image_remover_worker.js", "image_remover.js", LIB.ort], 
    }),
    image_compressor: defineTool("image", "image_compressor", {
        js: [LIB.jszip, "image_compressor.js"]
    }),

    //  أدوات الـ PDF
    pdf_create: defineTool("pdf", "pdf_create", {
        js: [LIB.html2canvas, LIB.pdfMin, LIB.pdfWorker, LIB.jspdf, "pdf_create.js"]
    }),
    pdf_compressor: defineTool("pdf", "pdf_compressor", {
        js: [LIB.pdfWorker, LIB.pdfMin, LIB.jspdf, "pdf_compressor.js"]
    }),
    pdf_editor: defineTool("pdf", "pdf_editor", {
        js: [LIB.pdfWorker, LIB.pdfMin, LIB.pdfLib, "pdf_editor.js"]
    }),

    // ️ أدوات النصوص
    encrypted_texts: defineTool("text", "encrypted_texts", {
      js: [LIB.argon2, "encrypted_texts.js"]
    }),
    text_filter: defineTool("text", "text_filter"),
    text_comparison: defineTool("text", "text_comparison"),

    //  الشبكة والـ QR والمشاركة
    qr_generator: defineTool("multi", "qr_generator", {
        js: [LIB.qrcode, LIB.html5qr, "qr_generator.js"]
    }),
    arsenal_share: defineTool("multi", "arsenal_share", {
        js: [LIB.qrcode, LIB.html5qr, LIB.jszip, "arsenal_share.js"]
    }),

    //  أدوات الأرشفة والتشفير
    arsenal_archive: defineTool("multi", "archive", {
        entry: "arsenal_archive",
        js: [LIB.jszip, "arsenal_archive.js"]
    }),

    // ️ صفحة الإعدادات
    arsenal_settings: defineTool("home", "settings", {
        entry: "settings",
        js: ["settings.js"]
    })
});

// ==========================================
// 2. محرك التحميل الذكي (The Core Loader)
// ==========================================
const TOOL_CACHE = {
    html: new Map(),
    srcdoc: new Map()
};

let currentToolId = null;
let activeToolFrame = null;
let activeToolToken = 0;

function resolveAssetUrl(path) {
    return new URL(path, document.baseURI).href;
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

//  السحر هنا: سحب الستايلات العالمية والألوان من الصفحة الأساسية لتوريثها للـ iframe
function getGlobalStyles() {
    let globalStyles = '';
    // نسخ جميع روابط الستايل (Stylesheets)
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        globalStyles += `<link rel="stylesheet" href="${link.href}">\n`;
    });
    // نسخ جميع المتغيرات والأكواد المكتوبة مباشرة في الـ Head (CSS Variables)
    document.querySelectorAll('style').forEach(style => {
        globalStyles += `<style>${style.innerHTML}</style>\n`;
    });
    return globalStyles;
}

async function getToolHtml(tool) {
    const htmlUrl = resolveAssetUrl(tool.html);
    if (!TOOL_CACHE.html.has(htmlUrl)) {
        TOOL_CACHE.html.set(htmlUrl, fetch(htmlUrl).then(async (response) => {
            if (!response.ok) throw new Error(`Network Error: ${response.status}`);
            return response.text();
        }));
    }
    return TOOL_CACHE.html.get(htmlUrl);
}

function getToolContainer() {
    let container = document.getElementById("dynamic-tool-page");
    if (!container) {
        container = document.createElement("div");
        container.id = "dynamic-tool-page";
        container.className = "page";
        container.style.paddingTop = "70px";
        document.body.appendChild(container);
    }
    return container;
}

function setToolLoading(container) {
    container.innerHTML = `<div class="container" style="text-align:center; padding-top:100px; color:var(--c1); font-family:'Tajawal', sans-serif;">جاري تهيئة الأداة والمكاتب...</div>`;
}

function setToolError(container, message) {
    container.innerHTML = `
        <div style="color:#ff4b4b; text-align:center; padding-top:100px; font-family:'Tajawal', sans-serif;">
            <h2>عذراً، تعذر تحميل الأداة.</h2>
            <p>تأكد من تشغيل السيرفر المحلي وسلامة مسارات المكاتب الرقمية.</p>
            <small style="color:var(--c2); opacity:0.6;">${escapeHtml(message)}</small>
        </div>`;
}

function createLifecycleBootstrap(toolId) {
    return `
        <script>
            (() => {
                const toolId = ${JSON.stringify(toolId)};
                const lifecycle = {};

                function callHook(name, payload) {
                    const hook = lifecycle[name] || (window.ArsenalTool && window.ArsenalTool[name]);
                    if (typeof hook === "function") {
                        hook(payload || { toolId });
                    }
                }

                function reportHeight() {
                    const body = document.body;
                    const html = document.documentElement;
                    const height = Math.max(
                        body ? body.scrollHeight : 0,
                        body ? body.offsetHeight : 0,
                        html ? html.clientHeight : 0,
                        html ? html.scrollHeight : 0,
                        html ? html.offsetHeight : 0
                    );
                    parent.postMessage({ type: "arsenal-tool-resize", toolId, height }, "*");
                }

                window.__ARSENAL_TOOL_ID__ = toolId;
                window.registerToolLifecycle = (hooks) => Object.assign(lifecycle, hooks || {});
                window.addEventListener("message", (event) => {
                    const message = event.data || {};
                    if (message.type !== "arsenal-tool-lifecycle" || message.toolId !== toolId) return;
                    callHook(message.hook, message.payload);
                });
                window.addEventListener("load", () => {
                    callHook("onInit", { toolId });
                    reportHeight();
                    parent.postMessage({ type: "arsenal-tool-ready", toolId }, "*");
                });
                document.addEventListener("DOMContentLoaded", reportHeight);
                if ("ResizeObserver" in window) {
                    const observer = new ResizeObserver(reportHeight);
                    document.addEventListener("DOMContentLoaded", () => {
                        observer.observe(document.documentElement);
                        if (document.body) observer.observe(document.body);
                    });
                }
                setInterval(reportHeight, 1000);
            })();
        <\/script>`;
}

function createToolSrcdoc(toolId, tool, htmlContent) {
    // قراءة اللغة الفعلية المختارة حالياً، بنفس الطريقة التي يعتمدها lang.js
    const currentLang = localStorage.getItem('arsenal_lang') || 'ar';
    const currentDir = currentLang === 'ar' ? 'rtl' : 'ltr';
    // قراءة حالة الثيم من الـ parent لتوريثها للـ iframe
    const isLight = document.body.classList.contains('light');
    const bodyClass = isLight ? 'light' : '';

    const cacheKey = JSON.stringify([toolId, tool.css, tool.js, tool.moduleJs, htmlContent, currentLang, bodyClass]);
    if (TOOL_CACHE.srcdoc.has(cacheKey)) {
        return TOOL_CACHE.srcdoc.get(cacheKey);
    }

    const cssTags = tool.css.map((cssPath) => (
        `<link rel="stylesheet" href="${escapeAttribute(resolveAssetUrl(cssPath))}">`
    )).join("\n");

    const scriptTags = tool.js.map((jsPath) => (
        `<script src="${escapeAttribute(resolveAssetUrl(jsPath))}"><\/script>`
    )).join("\n");

    // moduleJs: تُحقن كـ type="module" وتُصدِّر كل exports على window
    // moduleJs: تُحقن كـ type="module" وتُصدِّر كل exports على window
    // نضيف data-url لكل script حتى تقدر الأدوات تستخرج URL الملف منه (مثل image_remover)
    const moduleTags = tool.moduleJs.map((jsPath) => {
        const resolvedUrl = resolveAssetUrl(jsPath);
        return `<script type="module" data-url="${escapeAttribute(resolvedUrl)}">
import * as _mod from "${escapeAttribute(resolvedUrl)}";
Object.assign(window, _mod);
<\/script>`;
    }).join("\n");

        const srcdoc = `<!DOCTYPE html>
<html lang="${currentLang}" dir="${currentDir}">
<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    ${getGlobalStyles()}
    
    <script src="../core/core_app/lang.js"><\/script>
    <link rel="stylesheet" href="../core/style_and_sound/arsenal-dropdown.css">
    <script src="../core/style_and_sound/arsenal-dropdown.js"><\/script>
    
    <style>
        html, body {
            margin: 0;
            min-height: 100%;
            background: transparent !important;
            overflow-x: hidden;
        }
        html {
            scrollbar-width: none;
        }
        html::-webkit-scrollbar {
            display: none;
        }
        body {
            color: inherit;
            font-family: 'Tajawal', system-ui, sans-serif;
        }
    </style>
    ${cssTags}
    ${createLifecycleBootstrap(toolId)}
</head>
<body class="${bodyClass}">
    ${htmlContent}
    ${moduleTags}
    ${scriptTags}
</body>
</html>`;


    TOOL_CACHE.srcdoc.set(cacheKey, srcdoc);
    return srcdoc;
}

function createToolFrame(toolId, tool, htmlContent) {
    const iframe = document.createElement("iframe");
    iframe.className = "arsenal-tool-frame";
    iframe.title = `Arsenal tool: ${toolId}`;
    iframe.loading = "eager";
    iframe.sandbox = "allow-same-origin allow-scripts allow-forms allow-modals allow-downloads";
    iframe.style.width = "100%";
    iframe.style.height = "100dvh";
    iframe.style.minHeight = "100dvh";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "transparent";
    iframe.srcdoc = createToolSrcdoc(toolId, tool, htmlContent);
    return iframe;
}

function callActiveToolLifecycle(hook, payload = {}) {
    if (!activeToolFrame || !currentToolId) return;

    try {
        const lifecycle = activeToolFrame.contentWindow && activeToolFrame.contentWindow.ArsenalTool;
        if (lifecycle && typeof lifecycle[hook] === "function") {
            lifecycle[hook]({ toolId: currentToolId, ...payload });
            return;
        }
    } catch (error) {
        console.warn(`Unable to call ${hook} directly for ${currentToolId}:`, error);
    }

    activeToolFrame.contentWindow?.postMessage({
        type: "arsenal-tool-lifecycle",
        toolId: currentToolId,
        hook,
        payload: { toolId: currentToolId, ...payload }
    }, "*");
}

function pauseCurrentTool() {
    callActiveToolLifecycle("onPause");
}

function cleanupPreviousTool() {
    if (!activeToolFrame) return;
    callActiveToolLifecycle("onPause");
    callActiveToolLifecycle("onDestroy");
    activeToolFrame.remove();
    activeToolFrame = null;
    currentToolId = null;
}

async function loadTool(toolId) {
    const tool = arsenalTools[toolId];
    const container = getToolContainer();
    const token = ++activeToolToken;

    document.querySelectorAll(".page").forEach(page => {
        page.style.display = "none";
    });
    container.style.display = "block";

    if (!tool) {
        cleanupPreviousTool();
        const message = `Tool "${toolId}" not found in arsenalTools configuration.`;
        console.error(message);
        setToolError(container, message);
        return;
    }

    setToolLoading(container);

    try {
        const htmlContent = await getToolHtml(tool);
        if (token !== activeToolToken) return;

        cleanupPreviousTool();
        const iframe = createToolFrame(toolId, tool, htmlContent);
        container.innerHTML = "";
        container.appendChild(iframe);

        currentToolId = toolId;
        activeToolFrame = iframe;
        window.scrollTo(0, 0);
    } catch (error) {
        if (token !== activeToolToken) return;
        cleanupPreviousTool();
        console.error("Failed to load tool:", error);
        setToolError(container, error.message);
    }
}

function clearToolCache(toolId) {
    if (!toolId) {
        TOOL_CACHE.html.clear();
        TOOL_CACHE.srcdoc.clear();
        return;
    }

    const tool = arsenalTools[toolId];
    if (!tool) return;
    TOOL_CACHE.html.delete(resolveAssetUrl(tool.html));
    TOOL_CACHE.srcdoc.forEach((_, key) => {
        if (key.includes(`"${toolId}"`)) TOOL_CACHE.srcdoc.delete(key);
    });
}

// ==========================================
// مراقب تغيير حجم الأدوات (مُحدث لمنع التمدد اللانهائي)
// ==========================================
window.addEventListener("message", (event) => {
    const message = event.data || {};
    
    // التحقق من أن الرسالة تخص تغيير حجم الأداة الحالية
    if (message.type !== "arsenal-tool-resize" || message.toolId !== currentToolId || !activeToolFrame) return;

    // الارتفاع الجديد الصافي من الأداة (بحد أدنى 720 بكسل)
    const newHeight = Math.max(720, message.height);
    
    // جلب الارتفاع الحالي للإطار للمقارنة
    const currentHeight = parseInt(activeToolFrame.style.height) || 0;

    // شرط التسامح: لا تقم بتعديل الارتفاع إلا إذا كان الفرق أكبر من 5 بكسل
    // هذا الشرط يمنع حلقة التمدد المفرغة ويعالج ثقل الصفحة تماماً
    if (Math.abs(newHeight - currentHeight) > 5) {
        activeToolFrame.style.height = `${newHeight}px`;
    }
});

setTimeout(() => {
    if (typeof window.showPage !== "function" || window.showPage.__arsenalToolAware) return;
    const originalShowPage = window.showPage;
    window.showPage = function showPageWithToolLifecycle(...args) {
        pauseCurrentTool();
        return originalShowPage.apply(this, args);
    };
    window.showPage.__arsenalToolAware = true;
}, 0);

window.arsenalTools = arsenalTools;
window.clearToolCache = clearToolCache;
window.pauseCurrentTool = pauseCurrentTool;
