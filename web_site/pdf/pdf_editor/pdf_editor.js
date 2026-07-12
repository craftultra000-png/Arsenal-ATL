// ==========================================
// Arsenal — pdf_editor.js
// Workspace + Thumbnails layout
// ==========================================
(function () {

    // ── إعداد pdfjsLib ──
    let pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib || null;
    function initPdfJs() {
        if (!pdfjsLib) pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            const ws = [...document.querySelectorAll('script[src]')].find(s => s.src?.includes('pdf.worker.min.js'));
            pdfjsLib.GlobalWorkerOptions.workerSrc = ws ? ws.src : '../../core/core_app/pdf.worker.min.js';
        }
    }

    // ── الحالة ──
    let pagesState    = [];
    let documentCache = {};
    let docCounter    = 0;
    let selectedIds   = new Set();
    let draggedId     = null;
    let currentPage   = 0;      // index الصفحة الحالية المعروضة
    let renderTask    = null;   // مهمة الرسم الجارية

    const $ = id => document.getElementById(id);

    const dropZone          = $('pdfe-drop-zone');
    const fileInput         = $('pdfe-file-input');
    const workspace         = $('pdfe-workspace');
    const statusWrap        = $('pdfe-status-wrap');
    const statusMsg         = $('pdfe-status-msg');
    const progressFill      = $('pdfe-progress-fill');
    const filenameInput     = $('pdfe-filename');
    const deleteSelectedBtn = $('pdfe-delete-selected-btn');
    const mainCanvas        = $('pdfe-main-canvas');
    const mainCtx           = mainCanvas.getContext('2d');
    const thumbsRow         = $('pdfe-thumbs-row');
    const curPageEl         = $('pdfe-cur-page');
    const totalPagesEl      = $('pdfe-total-pages');
    const blankPlaceholder  = $('pdfe-blank-placeholder');

    // ── دوال مساعدة ──
    function showStatus(msg, pct) { statusWrap.style.display='block'; statusMsg.textContent=msg; progressFill.style.width=pct+'%'; }
    function hideStatus() { setTimeout(()=>{ statusWrap.style.display='none'; progressFill.style.width='0%'; },800); }
    function showModal(id) { $(id).style.display='flex'; }
    function hideModal(id) { $(id).style.display='none'; }
    function updateDeleteBtn() { deleteSelectedBtn.disabled = selectedIds.size === 0; }

    // ── عرض الصفحة الحالية في الـ Canvas الرئيسي ──
    async function renderCurrentPage() {
        if (!pagesState.length) return;
        const p = pagesState[currentPage];

        // إلغاء أي render جاري
        if (renderTask) { try { renderTask.cancel(); } catch(_) {} renderTask = null; }
        clearTimeout(window._pdfeRenderTimer);

        curPageEl.textContent    = currentPage + 1;
        totalPagesEl.textContent = pagesState.length;
        $('pdfe-prev-btn').disabled = currentPage === 0;
        $('pdfe-next-btn').disabled = currentPage === pagesState.length - 1;

        if (p.isBlank) {
            mainCanvas.style.display       = 'none';
            blankPlaceholder.style.display = 'flex';
            return;
        }

        mainCanvas.style.display       = 'block';
        blankPlaceholder.style.display = 'none';

        // عرض الـ thumbnail فوراً للاستجابة الفورية
        if (p.thumbData) {
            const img = new Image();
            img.onload = () => {
                mainCanvas.width  = img.width;
                mainCanvas.height = img.height;
                mainCtx.drawImage(img, 0, 0);
            };
            img.src = p.thumbData;
        }

        // رسم عالي الجودة بعد 200ms
        window._pdfeRenderTimer = setTimeout(async () => {
            const doc = documentCache[p.docId]?.pdfJsDoc;
            if (!doc) return;
            const page = await doc.getPage(p.pageIndex + 1);
            const vp   = page.getViewport({ scale: 1.4, rotation: p.rotation });
            mainCanvas.width  = vp.width;
            mainCanvas.height = vp.height;
            renderTask = page.render({ canvasContext: mainCtx, viewport: vp });
            try { await renderTask.promise; } catch(e) { if (e?.name !== 'RenderingCancelledException') console.error(e); }
            renderTask = null;
        }, 200);
    }

    // ── شريط المصغرات ──
    function renderThumbs() {
        thumbsRow.innerHTML = '';
        pagesState.forEach((p, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'pdfe-thumb' + (i === currentPage ? ' active' : '') + (selectedIds.has(p.id) ? ' selected' : '');
            thumb.dataset.id = p.id;
            thumb.draggable  = true;

            const inner = document.createElement('div');
            inner.className = 'pdfe-thumb-inner';

            if (p.isBlank) {
                inner.innerHTML = `<div class="pdfe-thumb-blank"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>`;
            } else {
                const img = document.createElement('img');
                img.src = p.thumbData;
                img.style.transform = `rotate(${p.rotation}deg)`;
                inner.appendChild(img);
            }

            const num = document.createElement('span');
            num.className   = 'pdfe-thumb-num';
            num.textContent = i + 1;
            inner.appendChild(num);

            const delBtn = document.createElement('button');
            delBtn.className = 'pdfe-thumb-del';
            delBtn.innerHTML = '×';

            const selBadge = document.createElement('div');
            selBadge.className = 'pdfe-thumb-selected-badge';
            selBadge.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

            thumb.appendChild(inner);
            thumb.appendChild(delBtn);
            thumb.appendChild(selBadge);

            // أحداث
            thumb.addEventListener('click', e => {
                if (e.target.closest('.pdfe-thumb-del')) return;
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    toggleSelectById(p.id);
                    renderThumbs();
                } else {
                    currentPage = i;
                    renderCurrentPage();
                    renderThumbs();
                }
            });

            delBtn.addEventListener('click', e => { e.stopPropagation(); deletePage(p.id); });

            // Drag & Drop
            thumb.addEventListener('dragstart', e => { draggedId=p.id; e.dataTransfer.effectAllowed='move'; setTimeout(()=>thumb.style.opacity='0.4',0); });
            thumb.addEventListener('dragover',  e => { e.preventDefault(); thumb.classList.add('drag-over'); });
            thumb.addEventListener('dragleave', ()=> thumb.classList.remove('drag-over'));
            thumb.addEventListener('drop', e => {
                e.preventDefault(); thumb.classList.remove('drag-over'); thumb.style.opacity='1';
                if (draggedId && draggedId !== p.id) {
                    const fi = pagesState.findIndex(x=>x.id===draggedId);
                    const ti = pagesState.findIndex(x=>x.id===p.id);
                    const [item] = pagesState.splice(fi,1); pagesState.splice(ti,0,item);
                    currentPage = ti;
                    renderThumbs(); renderCurrentPage();
                }
            });
            thumb.addEventListener('dragend', ()=>{ thumb.style.opacity='1'; draggedId=null; });

            thumbsRow.appendChild(thumb);
        });

        // اسكرول للـ thumb النشط
        setTimeout(()=>{
            const active = thumbsRow.querySelector('.pdfe-thumb.active');
            if (active) active.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
        }, 50);
    }

    function toggleSelectById(id) { if(selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id); updateDeleteBtn(); }

    // ── تحميل الملفات ──
    fileInput.addEventListener('change', async e => { const f=Array.from(e.target.files); if(f.length) await loadFiles(f); fileInput.value=''; });
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', async e => { e.preventDefault(); dropZone.classList.remove('drag-active'); const f=Array.from(e.dataTransfer.files).filter(x=>x.type==='application/pdf'); if(f.length) await loadFiles(f); });

    async function loadFiles(files) {
        initPdfJs();
        showStatus('جاري قراءة الملفات...', 10);
        for (let fi=0; fi<files.length; fi++) {
            const file = files[fi];
            try {
                const ab    = await file.arrayBuffer();
                const docId = `doc_${docCounter++}`;
                const plDoc = await PDFLib.PDFDocument.load(ab);
                const pjDoc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
                documentCache[docId] = { pdfLibDoc:plDoc, pdfJsDoc:pjDoc, name:file.name };

                for (let i=0; i<pjDoc.numPages; i++) {
                    const pg = await pjDoc.getPage(i+1);
                    const vp = pg.getViewport({ scale:0.4 });
                    const cv = document.createElement('canvas');
                    cv.width=vp.width; cv.height=vp.height;
                    const task = pg.render({ canvasContext:cv.getContext('2d'), viewport:vp });
                    await task.promise;
                    pagesState.push({ id:`p_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, docId, pageIndex:i, rotation:0, isBlank:false, thumbData:cv.toDataURL('image/jpeg',0.7) });
                }
                showStatus('جاري القراءة...', 10+(fi+1)/files.length*80);
            } catch(err) { console.error(err); }
        }
        workspace.style.display = 'block';
        currentPage = pagesState.length > 0 ? pagesState.length - (pagesState.length - (pagesState.length - files.reduce((a,f,i)=>a,0))) : 0;
        currentPage = 0;
        renderThumbs();
        await renderCurrentPage();
        hideStatus();
    }

    // ── التنقل بين الصفحات ──
    $('pdfe-prev-btn').addEventListener('click', async ()=>{ if(currentPage>0){ currentPage--; renderThumbs(); await renderCurrentPage(); } });
    $('pdfe-next-btn').addEventListener('click', async ()=>{ if(currentPage<pagesState.length-1){ currentPage++; renderThumbs(); await renderCurrentPage(); } });

    // ── تدوير وحذف الصفحة الحالية ──
    $('pdfe-rot-cur-btn').addEventListener('click', async ()=>{
        if(!pagesState.length) return;
        const p = pagesState[currentPage];
        p.rotation = (p.rotation + 90) % 360;
        if (!p.isBlank) {
            const doc = documentCache[p.docId]?.pdfJsDoc;
            const pg  = await doc.getPage(p.pageIndex+1);
            const vp  = pg.getViewport({ scale:0.4, rotation:p.rotation });
            const cv  = document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height;
            await pg.render({ canvasContext:cv.getContext('2d'), viewport:vp }).promise;
            p.thumbData = cv.toDataURL('image/jpeg',0.7);
        }
        renderThumbs(); await renderCurrentPage();
    });

    $('pdfe-del-cur-btn').addEventListener('click', ()=>{ if(!pagesState.length) return; deletePage(pagesState[currentPage].id); });

    function deletePage(id) {
        const idx = pagesState.findIndex(p=>p.id===id);
        pagesState.splice(idx,1);
        selectedIds.delete(id);
        if (currentPage >= pagesState.length) currentPage = Math.max(0, pagesState.length-1);
        if (!pagesState.length) { workspace.style.display='none'; return; }
        renderThumbs(); renderCurrentPage(); updateDeleteBtn();
    }

    // ── تحديد وحذف المتعدد ──
    $('pdfe-select-all-btn').addEventListener('click', ()=>{
        if(selectedIds.size===pagesState.length) selectedIds.clear();
        else pagesState.forEach(p=>selectedIds.add(p.id));
        renderThumbs(); updateDeleteBtn();
    });

    $('pdfe-delete-selected-btn').addEventListener('click', ()=>{
        pagesState = pagesState.filter(p=>!selectedIds.has(p.id));
        selectedIds.clear();
        currentPage = 0;
        if(!pagesState.length) { workspace.style.display='none'; return; }
        renderThumbs(); renderCurrentPage(); updateDeleteBtn();
    });

    // ── إضافة صفحة فارغة ──
    $('pdfe-add-blank-btn').addEventListener('click', ()=>{
        pagesState.push({ id:`blank_${Date.now()}`, docId:null, pageIndex:-1, rotation:0, isBlank:true, thumbData:null });
        workspace.style.display = 'block';
        currentPage = pagesState.length - 1;
        renderThumbs(); renderCurrentPage();
    });

    // ── مسح الكل ──
    $('pdfe-clear-btn').addEventListener('click', ()=>showModal('pdfe-modal-clear'));
    $('pdfe-modal-clear-cancel').addEventListener('click', ()=>hideModal('pdfe-modal-clear'));
    $('pdfe-modal-clear-confirm').addEventListener('click', ()=>{
        pagesState=[]; documentCache={}; selectedIds.clear(); currentPage=0;
        workspace.style.display='none'; hideModal('pdfe-modal-clear');
    });

    // ── تقسيم ──
    $('pdfe-split-btn').addEventListener('click', ()=>showModal('pdfe-modal-split'));
    document.querySelectorAll('input[name="split-mode"]').forEach(r=>{ r.addEventListener('change',()=>{ $('pdfe-range-inputs').style.display=r.value==='range'?'flex':'none'; }); });
    $('pdfe-split-cancel').addEventListener('click', ()=>hideModal('pdfe-modal-split'));
    $('pdfe-split-confirm').addEventListener('click', async ()=>{
        hideModal('pdfe-modal-split');
        const mode = document.querySelector('input[name="split-mode"]:checked').value;
        if(mode==='each') await splitEachPage();
        else { const f=parseInt($('pdfe-range-from').value)-1, t=parseInt($('pdfe-range-to').value)-1; await extractRange(f,t); }
    });

    async function splitEachPage() {
        showStatus('جاري التقسيم...', 10);
        for(let i=0;i<pagesState.length;i++) {
            progressFill.style.width=((i+1)/pagesState.length*100)+'%';
            const p=pagesState[i];
            if(p.isBlank){ const d=await PDFLib.PDFDocument.create(); d.addPage(); triggerDownload(await d.save(),`page_${i+1}.pdf`); }
            else{ const src=documentCache[p.docId].pdfLibDoc, dest=await PDFLib.PDFDocument.create(), [cp]=await dest.copyPages(src,[p.pageIndex]); if(p.rotation)cp.setRotation(PDFLib.degrees(p.rotation)); dest.addPage(cp); triggerDownload(await dest.save(),`page_${i+1}.pdf`); }
            await new Promise(r=>setTimeout(r,300));
        }
        hideStatus();
    }

    // ── استخراج نطاق ──
    $('pdfe-extract-btn').addEventListener('click', ()=>showModal('pdfe-modal-extract'));
    $('pdfe-extract-cancel').addEventListener('click', ()=>hideModal('pdfe-modal-extract'));
    $('pdfe-extract-confirm').addEventListener('click', async ()=>{
        const f=parseInt($('pdfe-extract-from').value)-1, t=parseInt($('pdfe-extract-to').value)-1;
        hideModal('pdfe-modal-extract'); await extractRange(f,t);
    });

    async function extractRange(from,to) {
        if(isNaN(from)||isNaN(to)||from>to) return;
        showStatus('جاري الاستخراج...', 20);
        const dest=await PDFLib.PDFDocument.create(), pages=pagesState.slice(from,to+1);
        for(let i=0;i<pages.length;i++){
            progressFill.style.width=((i+1)/pages.length*80+20)+'%';
            const p=pages[i];
            if(p.isBlank) dest.addPage();
            else{ const [cp]=await dest.copyPages(documentCache[p.docId].pdfLibDoc,[p.pageIndex]); if(p.rotation)cp.setRotation(PDFLib.degrees(p.rotation)); dest.addPage(cp); }
        }
        triggerDownload(await dest.save(),(filenameInput.value.trim()||'Arsenal_Extract')+`_${from+1}-${to+1}.pdf`);
        hideStatus();
    }

    // ── تصدير PDF ──
    $('pdfe-export-pdf-btn').addEventListener('click', async ()=>{
        if(!pagesState.length) return;
        showStatus('جاري بناء الملف...', 20);
        try{
            const merged = await PDFLib.PDFDocument.create();
            for(let i=0;i<pagesState.length;i++){
                progressFill.style.width=(20+i/pagesState.length*70)+'%';
                const p=pagesState[i];
                if(p.isBlank) merged.addPage();
                else{ const [cp]=await merged.copyPages(documentCache[p.docId].pdfLibDoc,[p.pageIndex]); if(p.rotation)cp.setRotation(PDFLib.degrees(cp.getRotation().angle+p.rotation)); merged.addPage(cp); }
            }
            triggerDownload(await merged.save(),(filenameInput.value.trim()||'Arsenal_Document')+'.pdf');
            showStatus('تم الحفظ!',100); hideStatus();
        }catch(err){ console.error(err); showStatus('حدث خطأ!',100); hideStatus(); }
    });

    // ── تصدير صور ──
    $('pdfe-export-img-btn').addEventListener('click', async ()=>{
        if(!pagesState.length) return;
        showStatus('جاري استخراج الصور...', 10);
        for(let i=0;i<pagesState.length;i++){
            progressFill.style.width=((i+1)/pagesState.length*100)+'%';
            const p=pagesState[i]; if(p.isBlank) continue;
            const doc=documentCache[p.docId].pdfJsDoc, pg=await doc.getPage(p.pageIndex+1);
            const vp=pg.getViewport({scale:2.0,rotation:p.rotation}), cv=document.createElement('canvas');
            cv.width=vp.width; cv.height=vp.height;
            const task = pg.render({canvasContext:cv.getContext('2d'),viewport:vp});
            await task.promise;
            const a=document.createElement('a'); a.href=cv.toDataURL('image/png'); a.download=`${filenameInput.value.trim()||'Arsenal'}_Page_${i+1}.png`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            await new Promise(r=>setTimeout(r,400));
        }
        hideStatus();
    });

    // ── إغلاق Modals ──
    document.querySelectorAll('.pdfe-modal-overlay').forEach(o=>{ o.addEventListener('click',e=>{ if(e.target===o) o.style.display='none'; }); });

    function triggerDownload(bytes, filename) {
        const blob=new Blob([bytes],{type:'application/pdf'}), url=URL.createObjectURL(blob), a=document.createElement('a');
        a.href=url; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

})();
