// ==========================================
// محرك ترسانة ضاغط الصور (دفعي — معزول وسريع)
// ==========================================

window.addEventListener('load', () => {

const imageInput   = document.getElementById('imageInput');
const folderInput  = document.getElementById('folderInput');
const uploadText   = document.getElementById('uploadText');

const compressBtn  = document.getElementById('compressBtn');
const downloadAllWrap = document.getElementById('downloadAllWrap');
const downloadAllBtn  = document.getElementById('downloadAllBtn');

// ربط الـ drop zone والأزرار
document.getElementById('upload-box').addEventListener('click', () => imageInput.click());
document.getElementById('imc-btn-folder').addEventListener('click', () => folderInput.click());

const qualitySlider = document.getElementById('qualitySlider');
const qualityVal     = document.getElementById('qualityVal');

const overallProgressWrap = document.getElementById('overallProgressWrap');
const overallProgressFill = document.getElementById('overallProgressFill');
const overallProgressText = document.getElementById('overallProgressText');

const queueList = document.getElementById('queueList');

// ── حالة الدفعة ──
// كل عنصر: { id, file, status: 'pending'|'processing'|'done'|'error', compressedBlob, originalSize, newSize, cardEl }
let queue = [];
let isBatchRunning = false;
let idCounter = 0;

// ── تحديث نص مستوى الجودة العام عند تحريك السلايدر ──
qualitySlider.addEventListener('input', () => {
    qualityVal.innerText = qualitySlider.value + '%';
    const pct = ((qualitySlider.value - 10) / 90) * 100;
    qualitySlider.style.background =
        `linear-gradient(to right, var(--acc) 0%, var(--acc) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`;
});

// ── 1. استقبال الملفات (متعددة) ──
imageInput.addEventListener('change', (e) => {
    addFilesToQueue(Array.from(e.target.files));
    imageInput.value = ''; // للسماح باختيار نفس الملفات مرة أخرى لاحقاً
});

// ── 2. استقبال مجلد كامل ──
folderInput.addEventListener('change', (e) => {
    const imageFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    addFilesToQueue(imageFiles);
    folderInput.value = '';
});

// ── 3. إضافة ملفات جديدة لقائمة الانتظار وبناء بطاقاتها ──
function addFilesToQueue(files) {
    if (!files || files.length === 0) return;

    files.forEach(file => {
        const id = 'imgc-item-' + (idCounter++);
        const item = {
            id,
            file,
            status: 'pending',
            compressedBlob: null,
            originalSize: file.size,
            newSize: 0,
        };
        queue.push(item);
    });

    uploadText.innerText = `تم تحديد ${queue.length} صورة — اضغط لإضافة المزيد`;
    uploadText.style.color = "var(--acc2)";
    compressBtn.disabled = false;
    updateSummaryBar();
}

// ── عرض ملخص الملفات (بدل بطاقة لكل صورة) ──
function updateSummaryBar(afterCompress) {
    if (queue.length === 0) {
        queueList.style.display = 'none';
            return;
    }

    const totalOriginal = queue.reduce((s, it) => s + it.originalSize, 0);
    const doneItems     = queue.filter(it => it.status === 'done');
    const totalNew      = doneItems.reduce((s, it) => s + it.newSize, 0);
    const savedPct      = totalOriginal > 0 && totalNew > 0
        ? Math.round((1 - totalNew / totalOriginal) * 100)
        : 0;

    queueList.innerHTML = `
        <div class="imc-summary">
            <div class="imc-summary-row">
                <div class="imc-summary-item">
                    <span class="imc-summary-label">الملفات</span>
                    <span class="imc-summary-value">${queue.length} صورة</span>
                </div>
                <div class="imc-summary-item">
                    <span class="imc-summary-label">الحجم الأصلي</span>
                    <span class="imc-summary-value">${formatBytes(totalOriginal)}</span>
                </div>
                ${doneItems.length > 0 ? `
                <div class="imc-summary-item">
                    <span class="imc-summary-label">بعد الضغط</span>
                    <span class="imc-summary-value imc-saved">${formatBytes(totalNew)}</span>
                </div>
                <div class="imc-summary-item">
                    <span class="imc-summary-label">وفّرت</span>
                    <span class="imc-summary-value imc-pct">${savedPct}%</span>
                </div>` : ''}
            </div>
            ${doneItems.length === 0 ? `<div class="imc-summary-hint">اضغط "اضغط كل الصور" لبدء المعالجة</div>` : ''}
        </div>
    `;
    queueList.style.display = 'block';
}

// ── 4. renderQueueCard مُستبدلة بـ updateSummaryBar ──

function escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

// ── 5. إزالة عنصر من القائمة (قبل بدء المعالجة فقط) ──
function removeFromQueue(id) {
    if (isBatchRunning) return;
    queue = queue.filter(it => it.id !== id);

    if (queue.length === 0) {
        compressBtn.disabled = true;
        uploadText.innerText = t('img_drop');
        uploadText.style.color = "var(--c1)";
    }
}

// ── 6. ضغط صورة واحدة عبر Canvas، يرجع Promise<Blob> ──
function compressOneImage(file, qualityPct) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (event) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const quality = qualityPct / 100;
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('toBlob failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => reject(new Error('image load failed'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('file read failed'));
        reader.readAsDataURL(file);
    });
}

// ── 7. تحديث حالة بطاقة واحدة بصرياً ──
function setCardStatus(item, status) {
    item.status = status;
    // نحدّث الـ summary بعد كل تغيير حالة
    updateSummaryBar();
}

// ── 8. تشغيل المعالجة الدفعية المتسلسلة ──
compressBtn.addEventListener('click', async () => {
    if (isBatchRunning || queue.length === 0) return;
    isBatchRunning = true;

    const btnSpan = compressBtn.querySelector('span');
    const oldBtnText = btnSpan.innerText;
    compressBtn.disabled = true;
    btnSpan.innerText = t('imgc_btn_compressing');

    overallProgressWrap.style.display = 'block';
    downloadAllWrap.style.display = 'none';

    const pending = queue.filter(it => it.status === 'pending' || it.status === 'error');
    let doneCount = 0;

    for (const item of pending) {
        setCardStatus(item, 'processing');
        overallProgressText.innerText = `جاري المعالجة: ${doneCount + 1} من ${pending.length}`;

        try {
            const qualityPct = parseInt(qualitySlider.value, 10);
            const blob = await compressOneImage(item.file, qualityPct);
            item.compressedBlob = blob;
            item.newSize = blob.size;

            setCardStatus(item, 'done');
        } catch (err) {
            console.error(err);
            setCardStatus(item, 'error');
        }

        doneCount++;
        overallProgressFill.style.width = Math.round((doneCount / pending.length) * 100) + '%';
    }

    overallProgressText.innerText = 'تم الضغط بنجاح ✓';
    isBatchRunning = false;
    compressBtn.disabled = false;
    btnSpan.innerText = oldBtnText;

    const successCount = queue.filter(it => it.status === 'done').length;
    if (successCount > 0) {
        updateSummaryBar(true);
        downloadAllWrap.style.display = 'flex';
    }
});

// ── 9. تحميل الكل كملف ZIP واحد ──
downloadAllBtn.addEventListener('click', async () => {
    const doneItems = queue.filter(it => it.status === 'done' && it.compressedBlob);
    if (doneItems.length === 0) return;

    const oldText = downloadAllBtn.querySelector('span').innerText;
    downloadAllBtn.querySelector('span').innerText = t('imgc_zipping');
    downloadAllBtn.disabled = true;

    try {
        const zip = new JSZip();
        doneItems.forEach(item => {
            const nameParts = item.file.name.split('.');
            nameParts.pop();
            zip.file(`${nameParts.join('.')}_compressed.jpg`, item.compressedBlob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Arsenal_Compressed_Images.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
    }

    downloadAllBtn.querySelector('span').innerText = oldText;
    downloadAllBtn.disabled = false;
});

// دالة مساعدة لتحويل أحجام الملفات البايت إلى كيلوبايت وميجابايت
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

}); // end load
