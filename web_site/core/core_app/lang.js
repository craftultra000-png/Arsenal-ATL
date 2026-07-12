(function() {
    // جلب اللغة المخزنة أو اعتماد العربية كافتراضية
    const currentLang = localStorage.getItem('arsenal_lang') || 'ar';

    // إعداد اتجاه الصفحة فوراً قبل التحميل البصري لمنع الوميض العشوائي
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

    // تصحيح المسار النسبي ليتوافق مع موقع الترسانة الحالي
    const scriptPath = `../core/lang/${currentLang}.js`;

    // انتظر تحميل بنية عناصر الصفحة بالكامل
    window.addEventListener('DOMContentLoaded', () => {

        const script = document.createElement('script');
        script.src = scriptPath;

        script.onload = () => {
            const dict = window.arsenalTranslations || {};

            // ── 1. ترجمة النصوص الثابتة [data-lang] ──
            document.querySelectorAll('[data-lang]').forEach(el => {
                const key = el.getAttribute('data-lang');
                if (dict[key]) el.innerHTML = dict[key];
            });

            // ── 2. ترجمة الـ placeholder [data-lang-placeholder] ──
            document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
                const key = el.getAttribute('data-lang-placeholder');
                if (dict[key]) el.setAttribute('placeholder', dict[key]);
            });

            // ── 3. ترجمة الـ title/tooltip [data-lang-title] ──
            document.querySelectorAll('[data-lang-title]').forEach(el => {
                const key = el.getAttribute('data-lang-title');
                if (dict[key]) el.setAttribute('title', dict[key]);
            });
        };

        script.onerror = () => {
            console.error('Arsenal Lang: فشل تحميل القاموس من المسار:', scriptPath);
        };

        document.head.appendChild(script);
    });

    // ── دالة تغيير اللغة ──
    window.changeLanguage = function(langCode) {
        localStorage.setItem('arsenal_lang', langCode);
        window.location.reload();
    };

    // ── دالة t() للنصوص الديناميكية داخل ملفات JS ──
    // الاستخدام: t('key') أو t('key', { var1: val1, var2: val2 })
    window.t = function(key, replacements = {}) {
        const dict = window.arsenalTranslations || {};
        let str = dict[key];

        // fallback: لو المفتاح غير موجود بالقاموس، أرجع المفتاح نفسه
        // هذا يضمن ما في كسر مرئي لو نسيت تضيف مفتاح
        if (str === undefined) return key;

        // استبدال المتغيرات الديناميكية: t('key', { name: 'file.mp3' })
        for (const [k, v] of Object.entries(replacements)) {
            str = str.replaceAll(`{${k}}`, v);
        }
        return str;
    };

})();
