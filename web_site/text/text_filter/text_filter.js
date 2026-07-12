// ==========================================
// محرك ترسانة النصوص والبيانات (مع التصفية التراكمية)
// ==========================================

// متغير لحفظ حالة الفلاتر النشطة
let activeCleanFilters = {
    emojis: false,
    spaces: false,
    lines: false
};

// مراقبة حقل الإدخال لتطبيق الفلاتر النشطة بالوقت الفعلي (Real-time)
document.getElementById('main-input').addEventListener('input', () => {
    // إذا كان هناك أي فلتر نشط، قم بالتنظيف المباشر
    if (activeCleanFilters.emojis || activeCleanFilters.spaces || activeCleanFilters.lines) {
        applyActiveCleaning();
    }
});

// 1. محرك تفعيل الفلاتر التراكمية
function toggleCleanFilter(type, btnElement) {
    // تبديل الحالة
    activeCleanFilters[type] = !activeCleanFilters[type];
    
    // إضافة أو إزالة التصميم المرئي للزر
    if (activeCleanFilters[type]) {
        btnElement.classList.add('active');
    } else {
        btnElement.classList.remove('active');
    }
    
    // تطبيق المعالجة فوراً بعد الضغط
    applyActiveCleaning();
}

// 2. محرك التنظيف (Pipeline Processing)
function applyActiveCleaning() {
    const inputObj = document.getElementById('main-input');
    const outputObj = document.getElementById('main-output');
    let currentText = inputObj.value;

    if(currentText.trim() === "") {
        outputObj.value = "";
        return;
    }

    // أ) مسح الإيموجي والأشكال
    if(activeCleanFilters.emojis) {
        currentText = currentText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    }
    
    // ب) مسح الأسطر الفارغة
    if(activeCleanFilters.lines) {
        currentText = currentText.split('\n').filter(line => line.trim() !== '').join('\n');
    }

    // ج) دمج المسافات والمسافات البادئة
    if(activeCleanFilters.spaces) {
        currentText = currentText.replace(/[ \t]+/g, ' ');
    }

    outputObj.value = currentText;
    outputObj.dataset.isError = "false";
}

// 3. محرك الاستخراج الفردي
function extractData(type) {
    const input = document.getElementById('main-input').value;
    const output = document.getElementById('main-output');
    let matches = [];

    if(input.trim() === "") return;

    // تعطيل الفلاتر النشطة مؤقتاً لتجنب تضارب العرض
    disableAllFilters();

    switch(type) {
        case 'links':
            matches = input.match(/https?:\/\/[^\s]+/g);
            break;
        case 'emails':
            matches = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            break;
        case 'tags':
            matches = input.match(/#[\u0600-\u06FFa-zA-Z0-9_]+/g);
            break;
        case 'phones':
            matches = input.match(/\+?[0-9]{7,15}/g);
            break;
    }

    if(matches && matches.length > 0) {
        output.value = [...new Set(matches)].join('\n');
        output.dataset.isError = "false";
    } else {
        output.value = t('etx_err_no_match');
        output.dataset.isError = "true";
    }
}

// 4. محرك الترميز الفوري (Encoding / Decoding)
function cryptoText(mode) {
    let inputObj = document.getElementById('main-input');
    let outputObj = document.getElementById('main-output');
    let inputText = inputObj.value;

    disableAllFilters(); // إيقاف التنظيف أثناء الترميز

    // لو كان حقل الإدخال فارغ، اسحب القيمة من المخرجات لتسريع العمل
    if (inputText.trim() === "" && outputObj.value.trim() !== "") {
        inputText = outputObj.value;
        inputObj.value = inputText;
    }

    if (inputText.trim() === "") return;

    try {
        switch(mode) {
            case 'b64e':
                outputObj.value = btoa(unescape(encodeURIComponent(inputText)));
                break;
            case 'b64d':
                let cleanedB64 = inputText.replace(/\s/g, '');
                outputObj.value = decodeURIComponent(escape(atob(cleanedB64)));
                break;
            case 'urle':
                outputObj.value = encodeURIComponent(inputText);
                break;
            case 'urld':
                outputObj.value = decodeURIComponent(inputText);
                break;
        }
        outputObj.dataset.isError = "false";
    } catch(err) {
        outputObj.value = t('etx_err_invalid_encode');
        outputObj.dataset.isError = "true";
    }
}

// دالة مساعدة لتعطيل الأزرار التراكمية عند استخدام الاستخراج أو الترميز
function disableAllFilters() {
    activeCleanFilters = { emojis: false, spaces: false, lines: false };
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
}

// دالة التفريغ
function clearBoxes() {
    document.getElementById('main-input').value = "";
    document.getElementById('main-output').value = "";
    disableAllFilters();
}

// النسخ السريع
function copyOutput() {
    const output = document.getElementById('main-output');
    if(output.value === "" || output.dataset.isError === "true") return;

    output.select();
    output.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(output.value);

    const toast = document.getElementById('status-toast');
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 2000);
}
// ── Dropdowns ────────────────────────────────────────────────────
window.addEventListener('load', () => {

    // 1. استخراج البيانات — single select يستدعي الدالة مباشرة
    new ArsenalDropdown({
        containerId  : 'etx-dd-extract',
        inputId      : 'etx-extract-val',
        accentVar    : '--acc2',
        defaultValue : '',
        options: [
            { value: 'links',  label: window.t ? t('etx_extract_links')  : 'روابط URL' },
            { value: 'emails', label: window.t ? t('etx_extract_emails') : 'الإيميلات' },
            { value: 'tags',   label: window.t ? t('etx_extract_tags')   : 'الهاشتاغات' },
            { value: 'phones', label: window.t ? t('etx_extract_phones') : 'أرقام الهواتف' },
        ],
        onChange: (val) => { if (val) extractData(val); },
    });
    // إضافة hidden input للـ dropdown
    if (!document.getElementById('etx-extract-val')) {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.id = 'etx-extract-val';
        document.getElementById('etx-dd-extract').appendChild(inp);
    }

    // 2. التنظيف — multi-select يحدّث activeCleanFilters مباشرة
    new ArsenalDropdown({
        containerId  : 'etx-dd-clean',
        inputId      : 'etx-clean-val',
        accentVar    : '--acc',
        multi        : true,
        defaultValue : [],
        options: [
            { value: 'emojis', label: window.t ? t('etx_filter_emojis') : 'مسح الإيموجي' },
            { value: 'spaces', label: window.t ? t('etx_filter_spaces') : 'دمج المسافات' },
            { value: 'lines',  label: window.t ? t('etx_filter_lines')  : 'مسح الأسطر الفارغة' },
        ],
        onChange: (vals) => {
            activeCleanFilters.emojis = vals.includes('emojis');
            activeCleanFilters.spaces = vals.includes('spaces');
            activeCleanFilters.lines  = vals.includes('lines');
            applyActiveCleaning();
        },
    });
    if (!document.getElementById('etx-clean-val')) {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.id = 'etx-clean-val';
        document.getElementById('etx-dd-clean').appendChild(inp);
    }

    // 3. الترميز — single select يستدعي cryptoText مباشرة
    new ArsenalDropdown({
        containerId  : 'etx-dd-encode',
        inputId      : 'etx-encode-val',
        accentVar    : '--acc',
        defaultValue : '',
        options: [
            { value: 'b64e', label: window.t ? t('etx_encode_b64')  : 'ترميز Base64' },
            { value: 'b64d', label: window.t ? t('etx_decode_b64')  : 'فك ترميز Base64' },
            { value: 'urle', label: window.t ? t('etx_encode_url')  : 'ترميز URL' },
            { value: 'urld', label: window.t ? t('etx_decode_url')  : 'فك ترميز URL' },
        ],
        onChange: (val) => { if (val) cryptoText(val); },
    });
    if (!document.getElementById('etx-encode-val')) {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.id = 'etx-encode-val';
        document.getElementById('etx-dd-encode').appendChild(inp);
    }

});
