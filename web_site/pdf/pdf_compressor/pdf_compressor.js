// ==========================================
// محرك ترسانة ضاغط الـ PDF الفائق (محلياً بالكامل)
// ==========================================

(function() {
    // تهيئة محرك PDF.js محلياً (اعتماداً على مكتبة pdf.worker.min.js المحقونة سابقاً)
    if (typeof window['pdfjs-dist/build/pdf'] !== 'undefined') {
        pdfjsLib = window['pdfjs-dist/build/pdf'];
        // يتم تحديد مسار الـ worker غالباً من ملف الـ HTML الرئيسي للترسانة، 
        // نضع مساراً افتراضياً ليعمل بسلاسة إذا كانت الملفات بنفس المجلد
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
    }

    const fileInput = document.getElementById('pdf-comp-input');
    const uploadText = document.getElementById('pdf-comp-text');
    const uploadBox = document.getElementById('upload-box');
    const startBtn = document.getElementById('btn-start-compress');
    const resultsZone = document.getElementById('comp-results');
    const statusText = document.getElementById('comp-status');
    const barFill = document.getElementById('comp-bar');
    const statsGrid = document.getElementById('comp-stats-grid');
    const downloadWrap = document.getElementById('download-wrap');
    const downloadBtn = document.getElementById('btn-download-comp');
    
    let originalFile = null;
    let originalArrayBuffer = null;
    let finalBlobUrl = null;

    // 1. استقبال الملف
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        originalFile = file;
        uploadText.innerText = t('pdfc_file_active', { name: file.name });
        uploadText.style.color = "var(--acc2)";
        uploadBox.style.borderColor = "var(--acc2)";
        
        // إخفاء النتائج السابقة
        resultsZone.style.display = 'none';

        const reader = new FileReader();
        reader.onload = function(event) {
            originalArrayBuffer = event.target.result;
            startBtn.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    });

    // 2. محرك الضغط والرندرة
    startBtn.addEventListener('click', async function() {
        if (!originalArrayBuffer) return;

        // قراءة مستوى الضغط المختار
        const compLevel = document.getElementById('comp-level').value;
        let scaleMultiplier, jpegQuality;

        // إعدادات خوارزمية الضغط
        if (compLevel === 'low') {
            scaleMultiplier = 2.0; // دقة عالية
            jpegQuality = 0.85;
        } else if (compLevel === 'medium') {
            scaleMultiplier = 1.5; // دقة متوسطة
            jpegQuality = 0.65;
        } else {
            scaleMultiplier = 1.0; // دقة قياسية لضغط قوي
            jpegQuality = 0.40;
        }

        // تهيئة الواجهة
        startBtn.disabled = true;
        const btnSpan = startBtn.querySelector('span');
        const oldBtnText = btnSpan.innerText;
        btnSpan.innerText = t('pdfc_btn_processing');
        
        resultsZone.style.display = 'block';
        statsGrid.style.display = 'none';
        downloadWrap.style.display = 'none';
        document.getElementById('comp-progress-wrap').style.display = 'block';

        try {
            statusText.innerText = t('pdfc_status_reading');
            barFill.style.width = "10%";

            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(originalArrayBuffer) });
            const pdf = await loadingTask.promise;
            
            // تهيئة مستند جديد نظيف تماماً لإزالة الـ Metadata
            const { jsPDF } = window.jspdf;
            const newPdf = new jsPDF('p', 'mm', 'a4');

            for (let i = 1; i <= pdf.numPages; i++) {
                statusText.innerText = t('pdfc_status_page', { i: i, total: pdf.numPages });
                barFill.style.width = `${10 + ((i / pdf.numPages) * 80)}%`;

                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: scaleMultiplier });

                // رسم الصفحة على كانفاس وهمي
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                // تحويل الكانفاس لصورة مضغوطة بالدقة المطلوبة
                const imgData = canvas.toDataURL('image/jpeg', jpegQuality);

                // حساب الأبعاد للـ A4 للحفاظ على التناسق
                const pdfWidth = newPdf.internal.pageSize.getWidth();
                const pdfHeight = newPdf.internal.pageSize.getHeight();
                
                if (i > 1) newPdf.addPage();
                
                newPdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            statusText.innerText = t('pdfc_status_building');
            barFill.style.width = "95%";

            // توليد الملف المضغوط
            const compressedBlob = newPdf.output('blob');
            
            // حساب وعرض الإحصائيات
            showStats(originalFile.size, compressedBlob.size);

            // تجهيز رابط التحميل
            if (finalBlobUrl) URL.revokeObjectURL(finalBlobUrl);
            finalBlobUrl = URL.createObjectURL(compressedBlob);
            
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = finalBlobUrl;
                a.download = `Arsenal_Compressed_${originalFile.name}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            barFill.style.width = "100%";
            statusText.innerText = t('pdfc_status_done');
            statusText.style.color = "var(--acc2)";
            
            setTimeout(() => {
                document.getElementById('comp-progress-wrap').style.display = 'none';
                statsGrid.style.display = 'grid';
                downloadWrap.style.display = 'flex';
                
                startBtn.disabled = false;
                btnSpan.innerText = t('pdfc_btn_another');
            }, 800);

        } catch (error) {
            console.error(error);
            statusText.innerText = t('pdfc_err_processing');
            statusText.style.color = "#ff4b4b";
            startBtn.disabled = false;
            btnSpan.innerText = oldBtnText;
        }
    });

    // دالة مساعدة لعرض الإحصائيات بأناقة
    function showStats(oldSize, newSize) {
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 MB';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const oldFormatted = formatBytes(oldSize);
        const newFormatted = formatBytes(newSize);
        
        // حساب نسبة التوفير
        let savedPct = ((oldSize - newSize) / oldSize) * 100;
        savedPct = savedPct > 0 ? savedPct.toFixed(1) : 0;

        document.getElementById('old-size-txt').innerText = oldFormatted;
        document.getElementById('new-size-txt').innerText = newFormatted;
        document.getElementById('save-pct-txt').innerText = `${savedPct}%`;
    }
})();
// ── Dropdown مستوى الضغط ─────────────────────────────────────────
window.addEventListener('load', () => {
    new ArsenalDropdown({
        containerId  : 'pdfc-dd-level',
        inputId      : 'comp-level',
        accentVar    : '--acc2',
        defaultValue : 'low',
        options: [
            { value: 'low',    label: window.t ? t('pdfc_level_low_title')  : 'ضغط منخفض',  desc: window.t ? t('pdfc_level_low_desc')  : 'أعلى جودة للصورة' },
            { value: 'medium', label: window.t ? t('pdfc_level_med_title')  : 'ضغط متوسط',  desc: window.t ? t('pdfc_level_med_desc')  : 'توازن مثالي (موصى به)' },
            { value: 'high',   label: window.t ? t('pdfc_level_high_title') : 'ضغط قوي',    desc: window.t ? t('pdfc_level_high_desc') : 'أصغر حجم ممكن' },
        ],
    });
});
