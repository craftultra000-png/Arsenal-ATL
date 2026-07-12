/**
 * 🔐 محرك الأرشفة والتشفير المطور — الترسانة V1.4 (المستقرة والنهائية)
 * الميزات: Tabs | No Alerts | Drag & Drop | Folder Support | Silent Portable Extractor
 */

// ==========================================
// 1. المتغيرات العامة ونظام التبويبات (Tabs)
// ==========================================
let filesToCompress = [];
let fileToExtract = null;

// التبديل بين قسمي الإنشاء والاستخراج
function switchArchiveTab(tabId) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.arc-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    // إزالة اللون من كل الأزرار
    document.querySelectorAll('.arc-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // إظهار القسم المطلوب
    const activeTab = document.getElementById(tabId + '-tab');
    if (activeTab) activeTab.classList.add('active');

    // تلوين الزر المضغوط
    const activeBtn = document.getElementById(tabId === 'compress' ? 'tabCompressBtn' : 'tabExtractBtn');
    if (activeBtn) activeBtn.classList.add('active');
}

// ==========================================
// 2. تحديثات الواجهة الصامتة (البديل للـ alert المزعج)
// ==========================================
function updateStatus(message, type = 'info', progress = null, sizesObj = null) {
    const statusText = document.getElementById('archiveStatusText');
    const progressBar = document.getElementById('archiveProgressBar');
    const sizeStats = document.getElementById('archiveSizeStats');
    const origBadge = document.getElementById('originalSizeBadge');
    const finalBadge = document.getElementById('finalSizeBadge');
    
    if (statusText) {
        statusText.innerText = message;
        // تلوين النص حسب نوع الحالة
        if (type === 'error') statusText.style.color = '#ff4b4b';
        else if (type === 'success') statusText.style.color = 'var(--acc2)';
        else statusText.style.color = 'var(--c1)';
    }
    
    if (progressBar && progress !== null) progressBar.style.width = `${progress}%`;
    
    if (sizesObj && sizeStats && origBadge && finalBadge) {
        sizeStats.style.display = 'flex';
        origBadge.innerText = t('arc_size_original', { size: formatBytes(sizesObj.original) });
        if (sizesObj.final) {
            finalBadge.style.display = 'inline-block';
            finalBadge.innerText = t('arc_size_final', { size: formatBytes(sizesObj.final) });
        } else {
            finalBadge.style.display = 'none';
        }
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==========================================
// 2.1 تهيئة قائمة مستويات الضغط (ArsenalDropdown)
// ==========================================
setTimeout(() => {
    if (typeof ArsenalDropdown === 'function') {
        new ArsenalDropdown({
            containerId: 'compressionLevelDD',
            inputId: 'compressionLevel',
            accentVar: '--acc',
            defaultValue: '6',
            options: [
                { value: '3', label: t('arc_lvl_3_label'), desc: t('arc_lvl_3_desc') },
                { value: '4', label: t('arc_lvl_4_label'), desc: t('arc_lvl_4_desc') },
                { value: '5', label: t('arc_lvl_5_label'), desc: t('arc_lvl_5_desc') },
                { value: '6', label: t('arc_lvl_6_label'), desc: t('arc_lvl_6_desc') },
                { value: '7', label: t('arc_lvl_7_label'), desc: t('arc_lvl_7_desc') },
                { value: '8', label: t('arc_lvl_8_label'), desc: t('arc_lvl_8_desc') },
                { value: '9', label: t('arc_lvl_9_label'), desc: t('arc_lvl_9_desc') },
            ]
        });
    }
}, 100);

// ==========================================
// 3. نظام السحب والإفلات (Drag & Drop)
// ==========================================
setTimeout(() => {
    setupDropZone('createDropZone', 'archiveFiles', 'archiveFolder', 'selectedFilesCount', true);
    setupDropZone('extractDropZone', 'secureArchiveFile', null, 'selectedExtractFileCount', false);
}, 100);

function setupDropZone(zoneId, fileInputId, folderInputId, counterId, isMultiple) {
    const zone = document.getElementById(zoneId);
    const fileInput = document.getElementById(fileInputId);
    const folderInput = folderInputId ? document.getElementById(folderInputId) : null;
    const counter = document.getElementById(counterId);

    if (!zone || !fileInput) return;

    const handleFiles = (filesList) => {
        if (isMultiple) {
            filesToCompress = Array.from(filesList);
            counter.innerText = t('arc_selected_count', { count: filesToCompress.length });
            updateStatus(t('arc_ready_compress', { count: filesToCompress.length }), 'info');
        } else {
            fileToExtract = filesList[0];
            counter.innerText = t('arc_selected_file', { name: fileToExtract.name });
            updateStatus(t('arc_file_recognized', { name: fileToExtract.name }), 'info');
        }
    };

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    if (folderInput) folderInput.addEventListener('change', (e) => handleFiles(e.target.files));

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    // الضغط على الـdrop zone نفسها يفتح منتقي الملفات — الـinput مخفي (display:none) وبدون
    // <label> يحيط بالـzone، فالمتصفح لا يوصّل الضغطة تلقائياً، لذا نفعّلها يدوياً عبر click()
    zone.addEventListener('click', (e) => {
        // نتجاهل الضغط إن جاء من داخل زر "اختر مجلداً" (له سلوكه الخاص عبر label منفصل)
        // لمنع فتح منتقيين معاً عند الضغط على نفس النقطة
        if (folderInput && e.target.closest('.arc-folder-row')) return;
        fileInput.click();
    });
}

// ==========================================
// 4. أدوات المفاتيح والحماية
// ==========================================
function checkKeyStrength() {
    const val = document.getElementById('archivePassword').value.trim();
    const strengthText = document.getElementById('keyStrengthText');
    if (!strengthText) return;

    if (!val) return strengthText.innerHTML = "";
    if (val.length === 64 && /^[0-9A-Fa-f]+$/.test(val)) return strengthText.innerHTML = `<span style='color: var(--acc2); font-size: 12px; font-weight: bold;'>${t('arc_key_max')}</span>`;
    
    const weak = ["123456", "12345678", "password", "123", "arsenal"];
    if (val.length < 8 || weak.includes(val.toLowerCase())) {
        strengthText.innerHTML = `<span style='color: #ff4b4b; font-size: 12px; font-weight: bold;'>${t('arc_key_weak')}</span>`;
    } else {
        strengthText.innerHTML = `<span style='color: var(--acc3); font-size: 12px; font-weight: bold;'>${t('arc_key_strong')}</span>`;
    }
}

function generateSecureHexKey(fieldId) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const keyText = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const inputField = document.getElementById(fieldId);
    if(inputField) {
        inputField.value = keyText;
        checkKeyStrength();
        updateStatus(t('arc_key_generated'), "success");
    }
}

async function copyArchiveKey() {
    const key = document.getElementById('archivePassword').value;
    if (!key) return updateStatus(t('arc_err_no_key'), "error");
    try {
        await navigator.clipboard.writeText(key);
        updateStatus(t('arc_key_copied'), "success");
    } catch(e) {
        updateStatus(t('arc_err_copy_fail'), "error");
    }
}

function hexToBytes(hex) {
    if (hex.length !== 64) throw new Error(t('arc_err_hex_length'));
    const bytes = new Uint8Array(32);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    return bytes;
}

async function getCryptoKey(input, salt) {
    const cleaned = input.trim();
    if (cleaned.length === 64 && /^[0-9A-Fa-f]+$/.test(cleaned)) {
        return window.crypto.subtle.importKey("raw", hexToBytes(cleaned), "AES-GCM", false, ["encrypt", "decrypt"]);
    }
    const baseKey = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(cleaned), "PBKDF2", false, ["deriveKey"]);
    return window.crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 600000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// ==========================================
// 5. محركات الضغط والتشفير
// ==========================================
async function compressNormal() {
    if (filesToCompress.length === 0) return updateStatus(t('arc_err_no_files'), "error");
    let totalSize = filesToCompress.reduce((acc, file) => acc + file.size, 0);
    let archName = document.getElementById('archiveName').value.trim() || "arsenal_archive";
    if (!archName.endsWith(".zip")) archName += ".zip";

    const level = parseInt(document.getElementById('compressionLevel').value) || 6;

    try {
        const zip = new JSZip();
        for (let file of filesToCompress) {
            zip.file(file.webkitRelativePath || file.name, file);
        }
        
        const contentBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: level }
        }, (meta) => {
            updateStatus(t('arc_status_zipping', { pct: meta.percent.toFixed(0) }), "info", meta.percent, { original: totalSize });
        });
        
        updateStatus(t('arc_status_zip_done'), "success", 100, { original: totalSize, final: contentBlob.size });
        saveFile(contentBlob, archName);
    } catch (error) {
        updateStatus(t('arc_err_failed', { msg: error.message }), "error", 0);
    }
}

async function compressAndEncrypt() {
    if (filesToCompress.length === 0) return updateStatus(t('arc_err_no_files'), "error");
    const secretInput = document.getElementById('archivePassword').value;
    if (!secretInput) return updateStatus(t('arc_err_no_key_encrypt'), "error");

    let archName = document.getElementById('archiveName').value.trim() || "arsenal_archive";
    if (!archName.endsWith(".zip")) archName += ".zip";
    
    let totalSize = filesToCompress.reduce((acc, file) => acc + file.size, 0);
    const level = parseInt(document.getElementById('compressionLevel').value) || 6;

    try {
        const zip = new JSZip();
        for (let file of filesToCompress) {
            zip.file(file.webkitRelativePath || file.name, file);
        }

        const zipBuffer = await zip.generateAsync({
            type: "arraybuffer",
            compression: "DEFLATE",
            compressionOptions: { level: level }
        }, (meta) => {
            updateStatus(t('arc_step1_zipping', { pct: meta.percent.toFixed(0) }), "info", meta.percent * 0.7, { original: totalSize });
        });

        updateStatus(t('arc_step2_salt'), "info", 75, { original: totalSize });
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const cryptoKey = await getCryptoKey(secretInput, salt);

        updateStatus(t('arc_step3_encrypt'), "info", 85, { original: totalSize });
        const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, cryptoKey, zipBuffer);

        updateStatus(t('arc_step4_sign'), "info", 95, { original: totalSize });
        
        const magicBytes = new TextEncoder().encode("ARS1");
        const nameBytes = new TextEncoder().encode(archName);
        const nameLen = new Uint8Array([nameBytes.length]);
        
        const finalPayload = new Uint8Array(4 + 1 + nameBytes.length + 16 + 12 + encryptedBuffer.byteLength);
        finalPayload.set(magicBytes, 0);
        finalPayload.set(nameLen, 4);
        finalPayload.set(nameBytes, 5);
        finalPayload.set(salt, 5 + nameBytes.length);
        finalPayload.set(iv, 21 + nameBytes.length);
        finalPayload.set(new Uint8Array(encryptedBuffer), 33 + nameBytes.length);

        const secureBlob = new Blob([finalPayload], { type: "application/octet-stream" });

        updateStatus(t('arc_status_encrypt_done'), "success", 100, { original: totalSize, final: secureBlob.size });
        saveFile(secureBlob, archName.replace('.zip', '') + ".ars");

    } catch (error) {
        updateStatus(t('arc_err_encrypt_fail', { msg: error.message }), "error", 0);
    }
}

async function decryptAndExtract() {
    if (!fileToExtract) return updateStatus(t('arc_err_no_ars'), "error");
    const secretInput = document.getElementById('decryptPassword').value;
    if (!secretInput) return updateStatus(t('arc_err_no_key_decrypt'), "error");

    if (!fileToExtract.name.endsWith('.ars')) {
        return updateStatus(t('arc_err_not_ars'), "error");
    }

    try {
        updateStatus(t('arc_status_checking'), "info", 15);
        const payload = new Uint8Array(await fileToExtract.arrayBuffer());

        if (new TextDecoder().decode(payload.slice(0, 4)) !== "ARS1") throw new Error(t('arc_err_invalid_signature'));

        const nameLen = payload[4];
        const originalName = new TextDecoder().decode(payload.slice(5, 5 + nameLen));
        
        const salt = payload.slice(5 + nameLen, 21 + nameLen);
        const iv = payload.slice(21 + nameLen, 33 + nameLen);
        const ciphertext = payload.slice(33 + nameLen);

        updateStatus(t('arc_status_decrypting'), "info", 60);
        const cryptoKey = await getCryptoKey(secretInput, salt);
        const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, cryptoKey, ciphertext);

        updateStatus(t('arc_status_decrypt_done', { name: originalName }), "success", 95);
        saveFile(new Blob([decryptedBuffer], { type: "application/zip" }), originalName);
        updateStatus(t('arc_status_extract_done'), "success", 100);

    } catch (error) {
        updateStatus(t('arc_err_decrypt_fail'), "error", 0);
    }
}

// ==========================================
// 6. المحرك المحمول وتنزيل الملفات
// ==========================================
async function downloadPortableExtractor() {
    try {
        updateStatus(t('arc_status_fetching_extractor'), 'info');
        
        const filePath = '../multi_tools_library/archive/portable_extractor.html';
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(t('arc_err_extractor_not_found'));
        }
        
        const blob = await response.blob();
        
        // تحميل مخفي وصامت للملف
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'Arsenal_Portable_Extractor.html';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateStatus(t('arc_status_extractor_done'), 'success');
        }, 150);

    } catch (error) {
        updateStatus(t('arc_err_extractor_fail', { msg: error.message }), 'error');
    }
}

function saveFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
}
