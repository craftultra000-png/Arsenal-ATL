// ==========================================
// محرك ترسانة الـ PDF الشامل V2 (صانع حقيقي + قارئ + Thumbnails)
// ==========================================

// ── تهيئة pdfjsLib مع workerSrc الصحيح — ضروري لعمل القارئ ──
let pdfjsLib = null;
(function initPdfjsLib() {
    // pdf.js يُحمَّل كـ script عادي من toolLoader — يضع نفسه على window بأسماء مختلفة
    if (window['pdfjs-dist/build/pdf']) {
        pdfjsLib = window['pdfjs-dist/build/pdf'];
    } else if (window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
    } else if (window.pdfjsDist) {
        pdfjsLib = window.pdfjsDist;
    }

    if (!pdfjsLib) {
        console.warn('pdfjsLib غير متاح بعد — سيُعاد المحاولة عند فتح PDF');
        return;
    }

    if (pdfjsLib.GlobalWorkerOptions) {
        // worker.min.js يُحمَّل قبل pdf.min.js في toolLoader — نجيب URL المطلق منه مباشرة
        const workerScript = [...document.querySelectorAll('script[src]')]
            .find(s => s.src && s.src.includes('pdf.worker.min.js'));
        if (workerScript) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerScript.src;
        } else {
            // fallback بالمسار النسبي المعتمد في مشروعك
            pdfjsLib.GlobalWorkerOptions.workerSrc = '../core/core_app/pdf.worker.min.js';
        }
    }
})();

function switchPdfTab(tabName) {
    document.getElementById('tab-btn-build').classList.remove('active');
    document.getElementById('tab-btn-read').classList.remove('active');
    document.getElementById('build-tab').classList.remove('active');
    document.getElementById('read-tab').classList.remove('active');

    if (tabName === 'build') {
        document.getElementById('tab-btn-build').classList.add('active');
        document.getElementById('build-tab').classList.add('active');
    } else {
        document.getElementById('tab-btn-read').classList.add('active');
        document.getElementById('read-tab').classList.add('active');
    }
}

(function() {

    // ==========================================
    // 1. حالة المستند — مصفوفة صفحات، كل صفحة مصفوفة عناصر
    // ==========================================
    // كل عنصر: { id, type: 'text'|'image', x, y, width, height, fontSize, bold, content/dataUrl }
    // الإحداثيات والأبعاد كلها بالميليمتر (mm) — نفس وحدة jsPDF مباشرة، بدون أي تحويل

    const PAGE_SIZES = {
        a4:     { w: 210, h: 297 },
        letter: { w: 215.9, h: 279.4 },
    };

    let doc = {
        pageSize: 'a4',
        orientation: 'p', // 'p' = portrait, 'l' = landscape
        pages: [ { id: genId(), elements: [] } ],
    };

    let activePageId = doc.pages[0].id;
    let elIdCounter = 0;
    let dragState = null; // لإعادة ترتيب الصفحات بالـthumbnails

    function genId() { return 'pg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
    function genElId() { return 'el_' + (++elIdCounter) + '_' + Date.now(); }

    function getPageDims() {
        const base = PAGE_SIZES[doc.pageSize];
        return doc.orientation === 'l' ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
    }

    function getActivePage() {
        return doc.pages.find(p => p.id === activePageId);
    }

    // ==========================================
    // 2. عناصر الواجهة
    // ==========================================
    const workspace      = document.getElementById('pdf-workspace');
    const thumbsBuildRow  = document.getElementById('thumbs-build-row');
    const addPageBtn      = document.getElementById('add-page-btn');
    const exportPdfBtn    = document.getElementById('export-pdf-btn');
    const statusBox       = document.getElementById('pdf-status-box');
    const progressFill    = document.getElementById('pdf-progress-fill');
    const pageSizeSelect  = document.getElementById('page-size-select');
    const orientationBtn  = document.getElementById('orientation-toggle-btn');
    const docNameInput    = document.getElementById('doc-name-input');

    // localStorage — حفظ تلقائي حتى لا يضيع العمل بإغلاق الصفحة بالخطأ
    const STORAGE_KEY = 'arsenal_pdf_creator_draft';

    function saveDraft() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
        } catch (e) { /* تجاهل أخطاء التخزين الممتلئ بصمت */ }
    }

    function loadDraft() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
                doc = parsed;
                activePageId = doc.pages[0].id;
                return true;
            }
        } catch (e) { /* بيانات تالفة — نتجاهلها ونبدأ من جديد */ }
        return false;
    }

    function clearDraft() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    // ==========================================
    // 3. رسم مساحة العمل (الصفحة النشطة) — DOM-based مع عناصر قابلة للسحب
    // ==========================================
    // MM_TO_PX يُحسب ديناميكياً حسب عرض الـcontainer الفعلي
    // الصفحة تملأ ~90% من عرض المساحة المتاحة بحد أقصى 96dpi
    const BASE_MM_TO_PX = 3.7795; // ~96dpi — الأساس الحقيقي للتحويل

    function calcMmToPx() {
        const wrap = document.getElementById('pdf-workspace')?.parentElement;
        const availW = wrap ? (wrap.clientWidth - 40) : 500; // 40px padding يمين+يسار
        const dims = getPageDims();
        const fullW = dims.w * BASE_MM_TO_PX; // حجم الصفحة بالـ96dpi الكاملة
        if (fullW <= availW) return BASE_MM_TO_PX; // الشاشة واسعة كفاية → حجم كامل
        return availW / dims.w; // تصغير نسبي ليناسب الشاشة
    }

    function renderWorkspace() {
        const dims = getPageDims();
        const page = getActivePage();
        if (!page) return;

        const MM_TO_PX = calcMmToPx(); // ديناميكي حسب حجم الشاشة

        workspace.innerHTML = '';
        workspace.dataset.mmToPx = MM_TO_PX; // نحفظه للاستخدام في drag/resize
        workspace.style.width  = (dims.w * MM_TO_PX) + 'px';
        workspace.style.height = (dims.h * MM_TO_PX) + 'px';

        if (page.elements.length === 0) {
            // placeholder يرشد المستخدم عند الصفحة الفارغة
            const ph = document.createElement('div');
            ph.className = 'pdfm-workspace-placeholder';
            ph.innerHTML = `
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>${t('pdfm_workspace_hint')}</span>
            `;
            workspace.appendChild(ph);
        }

        page.elements.forEach(el => {
            const elDiv = renderElement(el, page.id);
            workspace.appendChild(elDiv);
        });

        renderThumbnails();
        updateExportButton();
        saveDraft();
    }

    function renderElement(el, pageId) {
        const MM_TO_PX = parseFloat(workspace.dataset.mmToPx) || 3.7795;
        const wrap = document.createElement('div');
        wrap.className = 'pdfm-element';
        wrap.dataset.elId = el.id;
        wrap.style.left   = (el.x * MM_TO_PX) + 'px';
        wrap.style.top    = (el.y * MM_TO_PX) + 'px';
        wrap.style.width  = (el.width * MM_TO_PX) + 'px';
        if (el.height) wrap.style.height = (el.height * MM_TO_PX) + 'px';

        if (el.type === 'text') {
            const ta = document.createElement('textarea');
            ta.className = 'pdfm-text-input';
            ta.value = el.content || '';
            ta.style.fontSize = (el.fontSize || 14) + 'px';
            ta.style.fontWeight = el.bold ? '700' : '400';
            ta.placeholder = t('pdfm_page_placeholder');
            ta.addEventListener('input', () => {
                el.content = ta.value;
                saveDraft();
            });
            // منع بدء سحب العنصر عند الكتابة داخل النص
            ta.addEventListener('mousedown', e => e.stopPropagation());
            ta.addEventListener('touchstart', e => e.stopPropagation());
            wrap.appendChild(ta);

            // شريط تحكم صغير بالخط (حجم + Bold) يظهر فقط حين تكون الفقرة هذه نشطة
            const ctrl = document.createElement('div');
            ctrl.className = 'pdfm-text-ctrl';
            ctrl.dataset.html2canvasIgnore = "true";
            ctrl.innerHTML = `
                <button class="pdfm-mini-icon-btn" data-act="font-dec" title="تصغير الخط">A-</button>
                <span class="pdfm-font-size-val">${el.fontSize || 14}</span>
                <button class="pdfm-mini-icon-btn" data-act="font-inc" title="تكبير الخط">A+</button>
                <button class="pdfm-mini-icon-btn ${el.bold ? 'active' : ''}" data-act="bold" title="عريض"><b>B</b></button>
            `;
            ctrl.querySelector('[data-act="font-dec"]').onclick = (e) => { e.stopPropagation(); el.fontSize = Math.max(8, (el.fontSize || 14) - 2); renderWorkspace(); };
            ctrl.querySelector('[data-act="font-inc"]').onclick = (e) => { e.stopPropagation(); el.fontSize = Math.min(48, (el.fontSize || 14) + 2); renderWorkspace(); };
            ctrl.querySelector('[data-act="bold"]').onclick = (e) => { e.stopPropagation(); el.bold = !el.bold; renderWorkspace(); };
            wrap.appendChild(ctrl);

        } else if (el.type === 'image') {
            const img = document.createElement('img');
            img.className = 'pdfm-img-el';
            img.src = el.dataUrl;
            wrap.appendChild(img);

            // شريط تحكم الصورة — يظهر عند hover
            const imgCtrl = document.createElement('div');
            imgCtrl.className = 'pdfm-text-ctrl pdfm-img-ctrl';
            imgCtrl.dataset.html2canvasIgnore = "true";

            const dims = getPageDims();
            const alignments = [
                { key: 'right',  icon: '▶|', label: t('pdfm_img_right') },
                { key: 'center', icon: '|▶|', label: t('pdfm_img_center') },
                { key: 'left',   icon: '|▶', label: t('pdfm_img_left') },
                { key: 'free',   icon: '✥',  label: t('pdfm_img_free') },
            ];

            alignments.forEach(({ key, icon, label }) => {
                const btn = document.createElement('button');
                btn.className = 'pdfm-mini-icon-btn' + (el.align === key ? ' active' : '');
                btn.title = label;
                btn.textContent = icon;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    el.align = key;
                    const margin = 5;
                    if (key === 'right') {
                        el.x = dims.w - el.width - margin;
                    } else if (key === 'center') {
                        el.x = (dims.w - el.width) / 2;
                    } else if (key === 'left') {
                        el.x = margin;
                    }
                    // free: يبقى في موضعه الحالي
                    renderWorkspace();
                };
                imgCtrl.appendChild(btn);
            });

            // فاصل
            const sep = document.createElement('span');
            sep.style.cssText = 'width:1px;height:16px;background:var(--bd);margin:0 3px;display:inline-block;';
            imgCtrl.appendChild(sep);

            // تصغير الحجم
            const sizeDown = document.createElement('button');
            sizeDown.className = 'pdfm-mini-icon-btn';
            sizeDown.title = t('pdfm_img_smaller');
            sizeDown.textContent = '−';
            sizeDown.onclick = (e) => {
                e.stopPropagation();
                const ratio = el.width / el.height;
                el.width  = Math.max(15, el.width  - 10);
                el.height = el.width / ratio;
                renderWorkspace();
            };
            imgCtrl.appendChild(sizeDown);

            // تكبير الحجم
            const sizeUp = document.createElement('button');
            sizeUp.className = 'pdfm-mini-icon-btn';
            sizeUp.title = t('pdfm_img_bigger');
            sizeUp.textContent = '+';
            sizeUp.onclick = (e) => {
                e.stopPropagation();
                const ratio = el.width / el.height;
                el.width  = Math.min(dims.w - el.x - 5, el.width + 10);
                el.height = el.width / ratio;
                renderWorkspace();
            };
            imgCtrl.appendChild(sizeUp);

            wrap.appendChild(imgCtrl);

            // مقبض تغيير الحجم (resize handle) — سحب من الزاوية السفلية
            const handle = document.createElement('div');
            handle.className = 'pdfm-resize-handle';
            handle.dataset.html2canvasIgnore = "true";
            wrap.appendChild(handle);
            bindResize(handle, wrap, el);
        }

        // زر حذف العنصر
        const delBtn = document.createElement('button');
        delBtn.className = 'pdfm-element-delete';
        delBtn.dataset.html2canvasIgnore = "true";
        delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        delBtn.onclick = (e) => {
            e.stopPropagation();
            const page = getActivePage();
            page.elements = page.elements.filter(x => x.id !== el.id);
            renderWorkspace();
        };
        wrap.appendChild(delBtn);

        bindDrag(wrap, el);
        return wrap;
    }

    // ── سحب العنصر لتغيير موضعه (x, y) ──
    function bindDrag(wrap, el) {
        let startX, startY, origX, origY, dragging = false;

        const onDown = (e) => {
            const point = e.touches ? e.touches[0] : e;
            startX = point.clientX; startY = point.clientY;
            origX = el.x; origY = el.y;
            dragging = true;
            wrap.classList.add('pdfm-dragging');
            e.preventDefault();
        };
        const onMove = (e) => {
            if (!dragging) return;
            const MM_TO_PX = parseFloat(workspace.dataset.mmToPx) || 3.7795;
            const dims = getPageDims();
            const point = e.touches ? e.touches[0] : e;
            const dx = (point.clientX - startX) / MM_TO_PX;
            const dy = (point.clientY - startY) / MM_TO_PX;
            // نمنع الخروج عن حدود الصفحة
            el.x = Math.max(0, Math.min(dims.w - el.width, origX + dx));
            el.y = Math.max(0, Math.min(dims.h - (el.height || 20), origY + dy));
            wrap.style.left = (el.x * MM_TO_PX) + 'px';
            wrap.style.top  = (el.y * MM_TO_PX) + 'px';
        };
        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            wrap.classList.remove('pdfm-dragging');
            saveDraft();
        };

        wrap.addEventListener('mousedown', onDown);
        wrap.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
    }

    // ── سحب مقبض الزاوية لتغيير حجم الصورة (width, height) مع الحفاظ على النسبة ──
    function bindResize(handle, wrap, el) {
        let startX, startY, origW, origH, ratio, resizing = false;

        const onDown = (e) => {
            const point = e.touches ? e.touches[0] : e;
            startX = point.clientX; startY = point.clientY;
            origW = el.width; origH = el.height;
            ratio = origW / origH;
            resizing = true;
            e.stopPropagation();
            e.preventDefault();
        };
        const onMove = (e) => {
            if (!resizing) return;
            const MM_TO_PX = parseFloat(workspace.dataset.mmToPx) || 3.7795;
            const point = e.touches ? e.touches[0] : e;
            const dx = (point.clientX - startX) / MM_TO_PX;
            const newW = Math.max(15, origW + dx);
            el.width  = newW;
            el.height = newW / ratio;
            wrap.style.width  = (el.width * MM_TO_PX) + 'px';
            wrap.style.height = (el.height * MM_TO_PX) + 'px';
        };
        const onUp = () => {
            if (!resizing) return;
            resizing = false;
            saveDraft();
        };

        handle.addEventListener('mousedown', onDown);
        handle.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
    }

    // ==========================================
    // 4. Thumbnails — القارئ + المنشئ + Drag&Drop لإعادة الترتيب
    // ==========================================
    function renderThumbnails() {
        if (!thumbsBuildRow) return;
        thumbsBuildRow.innerHTML = '';
        doc.pages.forEach((page, idx) => {
            const thumb = document.createElement('div');
            thumb.className = 'pdfm-thumb' + (page.id === activePageId ? ' active' : '');
            thumb.dataset.pageId = page.id;
            thumb.draggable = true;
            thumb.innerHTML = `
                <div class="pdfm-thumb-inner">
                    <span class="pdfm-thumb-label">${idx + 1}</span>
                    ${page.elements.length > 0
                        ? `<div class="pdfm-thumb-content-badge">${page.elements.length} ${page.elements.length === 1 ? t('pdfm_el_single') : t('pdfm_el_plural')}</div>`
                        : `<div class="pdfm-thumb-empty-badge">${t('pdfm_page_empty')}</div>`
                    }
                </div>
                <button class="pdfm-thumb-delete" data-pid="${page.id}" title="${t('pdfm_del_page')}">×</button>
            `;

            // ضغط لتفعيل الصفحة
            thumb.addEventListener('click', (e) => {
                if (e.target.classList.contains('pdfm-thumb-delete')) return;
                activePageId = page.id;
                renderWorkspace();
            });

            // حذف الصفحة
            thumb.querySelector('.pdfm-thumb-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (doc.pages.length === 1) { showStatus(t('pdfm_err_last_page'), 'error'); return; }
                doc.pages = doc.pages.filter(p => p.id !== page.id);
                activePageId = doc.pages[Math.max(0, idx - 1)].id;
                renderWorkspace();
            });

            // Drag&Drop لإعادة الترتيب
            thumb.addEventListener('dragstart', (e) => {
                dragState = { fromId: page.id, fromIdx: idx };
                thumb.classList.add('pdfm-thumb-dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            thumb.addEventListener('dragend', () => {
                thumb.classList.remove('pdfm-thumb-dragging');
                dragState = null;
                thumbsBuildRow.querySelectorAll('.pdfm-thumb').forEach(t => t.classList.remove('pdfm-thumb-over'));
            });
            thumb.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                thumbsBuildRow.querySelectorAll('.pdfm-thumb').forEach(t => t.classList.remove('pdfm-thumb-over'));
                if (dragState && dragState.fromId !== page.id) thumb.classList.add('pdfm-thumb-over');
            });
            thumb.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!dragState || dragState.fromId === page.id) return;
                const fromIdx = doc.pages.findIndex(p => p.id === dragState.fromId);
                const toIdx   = doc.pages.findIndex(p => p.id === page.id);
                if (fromIdx < 0 || toIdx < 0) return;
                const [removed] = doc.pages.splice(fromIdx, 1);
                doc.pages.splice(toIdx, 0, removed);
                dragState = null;
                renderWorkspace();
            });

            thumbsBuildRow.appendChild(thumb);
        });

        // زر إضافة صفحة في نهاية الشريط
        const addThumb = document.createElement('button');
        addThumb.className = 'pdfm-thumb-add';
        addThumb.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        addThumb.onclick = addPage;
        thumbsBuildRow.appendChild(addThumb);
    }

    // ==========================================
    // 5. إضافة عناصر للصفحة النشطة
    // ==========================================
    function addTextElement() {
        const dims = getPageDims();
        const page = getActivePage();
        if (!page) return;
        const newEl = {
            id: genElId(), type: 'text',
            x: 15, y: 15, width: dims.w - 30,
            fontSize: 14, bold: false, content: ''
        };
        page.elements.push(newEl);
        renderWorkspace();
        // نُحدد الـtextarea تلقائياً بعد الرسم ليبدأ المستخدم الكتابة فوراً
        setTimeout(() => {
            const ta = workspace.querySelector(`[data-el-id="${newEl.id}"] textarea`);
            if (ta) ta.focus();
        }, 50);
    }

    function addImageElement() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', () => {
            if (!input.files[0]) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const dims = getPageDims();
                    const page = getActivePage();
                    if (!page) return;
                    // حجم أولي مناسب — نصف عرض الصفحة كحد أقصى، مع الحفاظ على النسبة
                    const maxW = (dims.w - 30) / 2; // نصف عرض الصفحة كحد أقصى
                    const ratio = img.naturalWidth / img.naturalHeight;
                    const elW = Math.min(maxW, 80); // 80mm حد أقصى افتراضي
                    const elH = Math.min(elW / ratio, dims.h - 20); // لا يتجاوز ارتفاع الصفحة
                    page.elements.push({
                        id: genElId(), type: 'image',
                        x: 15, y: 15, width: elW, height: elH,
                        dataUrl: e.target.result
                    });
                    renderWorkspace();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        });
        input.click();
    }

    function addPage() {
        const newPage = { id: genId(), elements: [] };
        doc.pages.push(newPage);
        activePageId = newPage.id;
        renderWorkspace();
    }

    // ==========================================
    // 6. إعدادات الصفحة (حجم واتجاه)
    // ==========================================
    // ── قائمة حجم الصفحة عبر ArsenalDropdown ──
    if (document.getElementById('page-size-dd-container') && typeof ArsenalDropdown === 'function') {
        new ArsenalDropdown({
            containerId: 'page-size-dd-container',
            inputId: 'page-size-select',
            accentVar: '--acc',
            defaultValue: doc.pageSize,
            options: [
                { value: 'a4',     label: 'A4',     desc: '210 × 297 mm' },
                { value: 'letter', label: 'Letter', desc: '215.9 × 279.4 mm' },
            ],
            onChange: (val) => {
                doc.pageSize = val;
                renderWorkspace();
            }
        });
    } else if (document.getElementById('page-size-select')) {
        // fallback للـ select العادي لو ArsenalDropdown غير متاحة
        document.getElementById('page-size-select').addEventListener('change', (e) => {
            doc.pageSize = e.target.value;
            renderWorkspace();
        });
    }

    if (orientationBtn) {
        orientationBtn.addEventListener('click', () => {
            doc.orientation = doc.orientation === 'p' ? 'l' : 'p';
            orientationBtn.dataset.val = doc.orientation;
            orientationBtn.querySelector('.pdfm-orient-label').textContent =
                doc.orientation === 'p' ? t('pdfm_orient_portrait') : t('pdfm_orient_landscape');
            renderWorkspace();
        });
    }

    // ==========================================
    // 7. تصدير PDF حقيقي (نص + صور) بدون html2canvas
    // ==========================================
    function updateExportButton() {
        if (!exportPdfBtn) return;
        const hasContent = doc.pages.some(p => p.elements.length > 0);
        exportPdfBtn.disabled = !hasContent;
    }

    async function exportPDF() {
        if (!window.jspdf) { showStatus(t('pdfm_err_lib'), 'error'); return; }
        const { jsPDF } = window.jspdf;
        const dims = getPageDims();
        const orientation = doc.orientation === 'l' ? 'landscape' : 'portrait';
        const pdf = new jsPDF({ orientation, unit: 'mm', format: doc.pageSize });

        showStatus(t('pdfm_export_start'), 'info');
        updateProgress(0);

        const totalPages = doc.pages.length;
        const PX_PER_MM = 3.7795;

        for (let pi = 0; pi < totalPages; pi++) {
            const page = doc.pages[pi];
            if (pi > 0) pdf.addPage();
            updateProgress(Math.round((pi / totalPages) * 80));

            for (const el of page.elements) {
                if (el.type === 'text' && el.content && el.content.trim()) {
                    // نرسم النص على canvas مؤقت — يدعم العربية/RTL وأي خط بشكل كامل
                    const fs = (el.fontSize || 14);
                    const fontPx = fs * 1.5; // تحويل pt → px تقريبي
                    const wPx = Math.round(el.width * PX_PER_MM);

                    const tmpCanvas = document.createElement('canvas');
                    const tmpCtx = tmpCanvas.getContext('2d');
                    tmpCtx.font = `${el.bold ? 'bold ' : ''}${fontPx}px Tajawal, Arial`;

                    // نحسب الارتفاع الكافي بتقسيم النص لسطور أولاً
                    const words = el.content.split('\n');
                    let allLines = [];
                    words.forEach(paragraph => {
                        const lineWords = paragraph.split(' ');
                        let currentLine = '';
                        lineWords.forEach(word => {
                            const testLine = currentLine ? currentLine + ' ' + word : word;
                            if (tmpCtx.measureText(testLine).width > wPx && currentLine) {
                                allLines.push(currentLine);
                                currentLine = word;
                            } else {
                                currentLine = testLine;
                            }
                        });
                        if (currentLine) allLines.push(currentLine);
                    });

                    const lineH = fontPx * 1.5;
                    const hPx = Math.max(lineH, allLines.length * lineH + lineH * 0.5);
                    tmpCanvas.width  = wPx;
                    tmpCanvas.height = Math.ceil(hPx);

                    // إعادة تعيين الخط بعد تغيير حجم الـcanvas (يُعيد ضبط السياق)
                    tmpCtx.font = `${el.bold ? 'bold ' : ''}${fontPx}px Tajawal, Arial`;
                    tmpCtx.fillStyle = '#111111';
                    tmpCtx.textAlign = 'right'; // RTL
                    tmpCtx.direction = 'rtl';

                    allLines.forEach((line, i) => {
                        tmpCtx.fillText(line, wPx, lineH * (i + 1));
                    });

                    const dataUrl = tmpCanvas.toDataURL('image/png');
                    const hMm = tmpCanvas.height / PX_PER_MM;
                    pdf.addImage(dataUrl, 'PNG', el.x, el.y, el.width, hMm);

                } else if (el.type === 'image' && el.dataUrl) {
                    try {
                        const ext = el.dataUrl.substring(11, el.dataUrl.indexOf(';')).toUpperCase();
                        const imgFmt = ['PNG', 'JPEG', 'JPG', 'WEBP'].includes(ext) ? ext : 'JPEG';
                        pdf.addImage(el.dataUrl, imgFmt, el.x, el.y, el.width, el.height);
                    } catch (e) {
                        console.warn('فشل إضافة صورة:', e.message);
                    }
                }
            }
        }

        updateProgress(95);
        const name = (docNameInput && docNameInput.value.trim()) ? docNameInput.value.trim() : 'Arsenal_Document';
        pdf.save(name.endsWith('.pdf') ? name : name + '.pdf');
        updateProgress(100);
        showStatus(t('pdfm_export_done'), 'success');
        setTimeout(() => { updateProgress(0); hideStatus(); }, 3000);
    }

    function showStatus(msg, type) {
        if (!statusBox) return;
        statusBox.textContent = msg;
        statusBox.className = 'pdfm-status-box pdfm-status-' + (type || 'info');
        statusBox.style.display = 'block';
    }

    function hideStatus() {
        if (statusBox) statusBox.style.display = 'none';
    }

    function updateProgress(pct) {
        if (progressFill) progressFill.style.width = pct + '%';
    }

    // ==========================================
    // 8. ربط الأزرار
    // ==========================================
    document.getElementById('add-text-btn')?.addEventListener('click', addTextElement);
    document.getElementById('add-image-btn')?.addEventListener('click', addImageElement);
    document.getElementById('add-page-btn')?.addEventListener('click', addPage);
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportPDF);

    document.getElementById('clear-doc-btn')?.addEventListener('click', () => {
        showConfirmModal(t('pdfm_confirm_clear'), () => {
            doc = { pageSize: doc.pageSize, orientation: doc.orientation, pages: [{ id: genId(), elements: [] }] };
            activePageId = doc.pages[0].id;
            clearDraft();
            renderWorkspace();
            showStatus(t('pdfm_cleared'), 'info');
            setTimeout(hideStatus, 2000);
        });
    });

    // ── Modal تأكيد داخلي بدل confirm() النظامي الذي لا يتوافق مع معايير التصميم ──
    function showConfirmModal(message, onConfirm) {
        const existing = document.getElementById('pdfm-confirm-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'pdfm-confirm-modal';
        modal.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.65);
            display:flex; align-items:center; justify-content:center;
            z-index:9999; padding:20px; box-sizing:border-box;
            animation: fadeInTool 0.2s ease;
        `;
        modal.innerHTML = `
            <div style="
                background:var(--bg2,#1a1a2a); border:1px solid var(--bd);
                border-radius:16px; padding:28px 24px; max-width:320px; width:100%;
                text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.5);
            ">
                <div style="font-size:14px; color:var(--c1); line-height:1.6; margin-bottom:24px; font-family:'Tajawal',sans-serif;">
                    ${message}
                </div>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button id="pdfm-modal-cancel" style="
                        flex:1; padding:11px; border-radius:8px; border:1px solid var(--bd);
                        background:transparent; color:var(--c2); font-family:'Tajawal',sans-serif;
                        font-size:14px; font-weight:700; cursor:pointer;
                    ">${t('pdfm_modal_cancel')}</button>
                    <button id="pdfm-modal-confirm" style="
                        flex:1; padding:11px; border-radius:8px; border:none;
                        background:#ff4b4b; color:#fff; font-family:'Tajawal',sans-serif;
                        font-size:14px; font-weight:700; cursor:pointer;
                    ">${t('pdfm_modal_ok')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#pdfm-modal-cancel').addEventListener('click', close);
        modal.querySelector('#pdfm-modal-confirm').addEventListener('click', () => { close(); onConfirm(); });
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    }


    // ==========================================
    // 9. القارئ — مع Loading Overlay + Thumbnails
    // ==========================================
    let readerPdf        = null;
    let readerCurrentPage = 1;
    let readerRendering  = false;
    let readerPendingPage = null;

    const readerCanvas   = document.getElementById('reader-canvas');
    const readerCtx      = readerCanvas ? readerCanvas.getContext('2d') : null;
    const thumbsReadRow  = document.getElementById('thumbs-read-row');
    const pageNumEl      = document.getElementById('reader-page-num');
    const pageTotalEl    = document.getElementById('reader-page-total');
    const prevBtn        = document.getElementById('reader-prev-btn');
    const nextBtn        = document.getElementById('reader-next-btn');
    const zoomInBtn      = document.getElementById('reader-zoom-in');
    const zoomOutBtn     = document.getElementById('reader-zoom-out');
    const readerDropZone = document.getElementById('reader-drop-zone');
    const readerInput    = document.getElementById('reader-file-input');
    const readerOverlay  = document.getElementById('reader-overlay');
    const readerSpinner  = document.getElementById('reader-spinner-text');

    let readerScale = 1.5;

    function showReaderOverlay(msg) {
        if (!readerOverlay) return;
        if (readerSpinner) readerSpinner.textContent = msg || t('pdfm_reader_loading');
        readerOverlay.style.display = 'flex';
    }

    function hideReaderOverlay() {
        if (readerOverlay) readerOverlay.style.display = 'none';
    }

    async function openPDF(file) {
        if (!file || file.type !== 'application/pdf') {
            showStatus(t('pdfm_err_not_pdf'), 'error');
            return;
        }

        // إعادة محاولة اكتشاف pdfjsLib لو لم تنجح عند بدء التشغيل
        if (!pdfjsLib || !pdfjsLib.getDocument) {
            if (window['pdfjs-dist/build/pdf']) {
                pdfjsLib = window['pdfjs-dist/build/pdf'];
            } else if (window.pdfjsLib) {
                pdfjsLib = window.pdfjsLib;
            }
            if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                const workerScript = [...document.querySelectorAll('script[src]')]
                    .find(s => s.src && s.src.includes('pdf.worker.min.js'));
                if (workerScript) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = workerScript.src;
                } else {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = '../core/core_app/pdf.worker.min.js';
                }
            }
        }

        if (!pdfjsLib || !pdfjsLib.getDocument) {
            showStatus(t('pdfm_err_lib') + ' (pdf.min.js)', 'error');
            console.error('pdfjsLib غير متاح — تأكد من إضافة LIB.pdfWorker + LIB.pdfMin في toolLoader');
            return;
        }

        showReaderOverlay(t('pdfm_reader_reading'));
        document.getElementById('reader-view-panel').style.display = 'none';

        try {
            const arrayBuf = await file.arrayBuffer();
            showReaderOverlay(t('pdfm_reader_parsing'));
            const loadTask = pdfjsLib.getDocument({ data: arrayBuf });
            loadTask.onProgress = (p) => {
                if (p.total > 0) {
                    const pct = Math.round((p.loaded / p.total) * 100);
                    if (readerSpinner) readerSpinner.textContent = t('pdfm_reader_progress', { pct });
                }
            };
            readerPdf = await loadTask.promise;
            readerCurrentPage = 1;
            if (pageTotalEl) pageTotalEl.textContent = readerPdf.numPages;
            document.getElementById('reader-view-panel').style.display = 'block';
            hideReaderOverlay();
            if (readerDropZone) readerDropZone.style.display = 'none';
            await renderReaderPage(readerCurrentPage);
            await buildReaderThumbnails();
        } catch (e) {
            hideReaderOverlay();
            showStatus(t('pdfm_err_pdf_failed'), 'error');
            console.error('PDF load error:', e);
        }
    }

    async function renderReaderPage(pageNum) {
        if (!readerPdf || !readerCtx) return;
        if (readerRendering) { readerPendingPage = pageNum; return; }
        readerRendering = true;
        readerCurrentPage = pageNum;
        if (pageNumEl) pageNumEl.textContent = pageNum;

        try {
            const page = await readerPdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: readerScale });
            readerCanvas.width  = viewport.width;
            readerCanvas.height = viewport.height;
            await page.render({ canvasContext: readerCtx, viewport }).promise;

            // تحديث التمييز بشريط الـthumbnails
            if (thumbsReadRow) {
                thumbsReadRow.querySelectorAll('.pdfm-reader-thumb').forEach((t, i) => {
                    t.classList.toggle('active', i + 1 === pageNum);
                });
            }
            updateReaderNav();
        } catch (e) {
            console.warn('renderReaderPage error:', e);
        } finally {
            // نضمن دائماً تحرير القفل حتى لو حصل خطأ أثناء الرسم
            readerRendering = false;
        }

        if (readerPendingPage !== null) {
            const next = readerPendingPage;
            readerPendingPage = null;
            await renderReaderPage(next);
        }
    }

    async function buildReaderThumbnails() {
        if (!thumbsReadRow || !readerPdf) return;
        thumbsReadRow.innerHTML = '';
        const totalPages = readerPdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            const page = await readerPdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.18 }); // صغير للـthumbnail فقط
            thumbCanvas.width  = viewport.width;
            thumbCanvas.height = viewport.height;
            await page.render({ canvasContext: thumbCtx, viewport }).promise;

            const wrapper = document.createElement('div');
            wrapper.className = 'pdfm-reader-thumb' + (i === 1 ? ' active' : '');
            wrapper.dataset.page = i;
            wrapper.innerHTML = `<span class="pdfm-reader-thumb-num">${i}</span>`;
            wrapper.prepend(thumbCanvas);
            wrapper.addEventListener('click', () => {
                readerCurrentPage = i;
                renderReaderPage(i);
            });
            thumbsReadRow.appendChild(wrapper);
        }
    }

    function updateReaderNav() {
        if (!readerPdf) return;
        if (prevBtn) prevBtn.disabled = readerCurrentPage <= 1;
        if (nextBtn) nextBtn.disabled = readerCurrentPage >= readerPdf.numPages;
    }

    // ربط أزرار القارئ
    // دالة مساعدة لإضافة click + touchstart معاً (لموبايل مع user-scalable=no)
    function addBtnListener(btn, fn) {
        if (!btn) return;
        btn.addEventListener('click', fn);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
    }

    addBtnListener(prevBtn, () => {
        if (!readerPdf || readerCurrentPage <= 1) return;
        readerPendingPage = null;
        renderReaderPage(readerCurrentPage - 1);
    });
    addBtnListener(nextBtn, () => {
        if (!readerPdf || readerCurrentPage >= readerPdf.numPages) return;
        readerPendingPage = null;
        renderReaderPage(readerCurrentPage + 1);
    });
    addBtnListener(zoomInBtn, () => {
        readerScale = Math.min(3, readerScale + 0.25);
        readerPendingPage = null;
        renderReaderPage(readerCurrentPage);
    });
    addBtnListener(zoomOutBtn, () => {
        readerScale = Math.max(0.5, readerScale - 0.25);
        readerPendingPage = null;
        renderReaderPage(readerCurrentPage);
    });

    // رفع ملف القارئ
    if (readerInput) {
        readerInput.addEventListener('change', (e) => { if (e.target.files[0]) openPDF(e.target.files[0]); });
    }
    if (readerDropZone) {
        readerDropZone.addEventListener('click', () => readerInput?.click());
        readerDropZone.addEventListener('dragover', (e) => { e.preventDefault(); readerDropZone.classList.add('pdfm-drag-over'); });
        readerDropZone.addEventListener('dragleave', () => readerDropZone.classList.remove('pdfm-drag-over'));
        readerDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            readerDropZone.classList.remove('pdfm-drag-over');
            if (e.dataTransfer.files[0]) openPDF(e.dataTransfer.files[0]);
        });
    }

    // ==========================================
    // 10. التهيئة الأولى — استعادة المسودة أو بداية جديدة
    // ==========================================
    const hasDraft = loadDraft();
    if (hasDraft) {
        activePageId = doc.pages[0].id;
        showStatus(t('pdfm_draft_restored'), 'info');
        setTimeout(hideStatus, 3000);
    }
    if (pageSizeSelect) pageSizeSelect.value = doc.pageSize;
    if (orientationBtn) {
        orientationBtn.dataset.val = doc.orientation;
        orientationBtn.querySelector('.pdfm-orient-label').textContent =
            doc.orientation === 'p' ? t('pdfm_orient_portrait') : t('pdfm_orient_landscape');
    }
    renderWorkspace();

    // إعادة رسم مساحة العمل عند تغيير حجم الشاشة (تحديث MM_TO_PX تلقائياً)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(renderWorkspace, 150);
    });

})();
