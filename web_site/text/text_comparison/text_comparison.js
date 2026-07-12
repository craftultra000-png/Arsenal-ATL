// ==========================================
// استوديو مقارنة النصوص — Arsenal
// ==========================================

(function () {

    // ─────────────────────────────────────────
    // وضع المقارنة
    // ─────────────────────────────────────────
    let _compareMode = 'text';

    window.setCompareMode = function (mode, btn) {
        _compareMode = mode;
        document.querySelectorAll('.smt-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const isCode = mode === 'code';
        ['comp-text-a', 'comp-text-b'].forEach(id => {
            const ta = document.getElementById(id);
            if (!ta) return;
            ta.style.direction  = isCode ? 'ltr' : '';
            ta.style.textAlign  = isCode ? 'left' : '';
            ta.style.fontFamily = isCode ? "'Courier New', monospace" : '';
        });

        const c = document.getElementById('diff-container');
        if (c) c.innerHTML = `<span class="smt-diff-empty">${_t('smt_diff_empty')}</span>`;
        hideDiffStats();
    };

    // ─────────────────────────────────────────
    // عداد الأسطر
    // ─────────────────────────────────────────
    window.updateLineCount = function (ta, counterId) {
        const el = document.getElementById(counterId);
        if (!el) return;
        const lines = ta.value === '' ? 0 : ta.value.split('\n').length;
        const unit  = _t('smt_lines_count') || 'سطر';
        el.textContent = lines + ' ' + unit;
    };

    // ─────────────────────────────────────────
    // LCS
    // ─────────────────────────────────────────
    function lcs(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
        for (let i = 1; i <= m; i++)
            for (let j = 1; j <= n; j++)
                dp[i][j] = a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1] + 1
                    : Math.max(dp[i - 1][j], dp[i][j - 1]);

        const ops = [];
        let ia = m, ib = n;
        while (ia > 0 || ib > 0) {
            if (ia > 0 && ib > 0 && a[ia - 1] === b[ib - 1]) {
                ops.push({ type: 'eq',  val: a[ia - 1] }); ia--; ib--;
            } else if (ib > 0 && (ia === 0 || dp[ia][ib - 1] >= dp[ia - 1][ib])) {
                ops.push({ type: 'add', val: b[ib - 1] }); ib--;
            } else {
                ops.push({ type: 'del', val: a[ia - 1] }); ia--;
            }
        }
        return ops.reverse();
    }

    // ─────────────────────────────────────────
    // Tokenizer — كلمات كاملة (لا يكسر العربي)
    // ─────────────────────────────────────────
    function tokenize(str, isCode) {
        if (isCode) {
            return str.match(/[A-Za-z_$][A-Za-z0-9_$]*|[0-9]+|[^\w\s]|\s+/g) || [''];
        }
        return str.match(/\S+|\s+/g) || [''];
    }

    // ─────────────────────────────────────────
    // إعادة تزويج del/add المتجاورة
    // LCS تجمع كل del أولاً ثم كل add — نعيد ترتيبها لأزواج (del,add)
    // ─────────────────────────────────────────
    function pairOps(ops) {
        const result = [];
        let i = 0;
        while (i < ops.length) {
            if (ops[i].type === 'eq') {
                result.push(ops[i++]);
            } else {
                // اجمع كل del/add المتجاورة في مجموعة واحدة
                const dels = [], adds = [];
                while (i < ops.length && ops[i].type === 'del') dels.push(ops[i++]);
                while (i < ops.length && ops[i].type === 'add') adds.push(ops[i++]);
                // زوّج del مع add واحد واحد
                const pairs = Math.min(dels.length, adds.length);
                for (let p = 0; p < pairs; p++) {
                    result.push({ type: 'pair', del: dels[p].val, add: adds[p].val });
                }
                // الباقي بدون تزويج
                for (let p = pairs; p < dels.length; p++) result.push(dels[p]);
                for (let p = pairs; p < adds.length; p++) result.push(adds[p]);
            }
        }
        return result;
    }

    // ─────────────────────────────────────────
    // المقارنة الرئيسية
    // ─────────────────────────────────────────
    window.compareTexts = function () {
        const textA     = document.getElementById('comp-text-a').value;
        const textB     = document.getElementById('comp-text-b').value;
        const container = document.getElementById('diff-container');
        const isCode    = _compareMode === 'code';

        container.classList.toggle('smt-code-mode', isCode);

        if (!textA.trim() && !textB.trim()) {
            container.innerHTML = `<span class="smt-diff-empty">${_t('smt_diff_empty')}</span>`;
            hideDiffStats();
            return;
        }

        const rawOps  = lcs(textA.split('\n'), textB.split('\n'));
        const lineOps = pairOps(rawOps);

        let html = '', addCount = 0, delCount = 0, lineNum = 0;

        for (const op of lineOps) {
            lineNum++;
            const num = `<span class="smt-line-num${isCode ? '' : ' smt-line-num-text'}">${lineNum}</span>`;

            if (op.type === 'eq') {
                html += `<div class="diff-equal">${num}<span class="diff-word-eq">${_esc(op.val)}</span></div>`;

            } else if (op.type === 'pair') {
                // سطر معدَّل — مقارنة كلمة بكلمة
                const wOps = lcs(tokenize(op.del, isCode), tokenize(op.add, isCode));
                let delLine = '', addLine = '';
                for (const wo of wOps) {
                    const v = _esc(wo.val);
                    if (wo.type === 'eq') {
                        delLine += `<span class="diff-word-eq">${v}</span>`;
                        addLine += `<span class="diff-word-eq">${v}</span>`;
                    } else if (wo.type === 'del') {
                        delLine += `<span class="diff-word-del">${v}</span>`;
                        if (wo.val.trim()) delCount++;
                    } else if (wo.type === 'add') {
                        addLine += `<span class="diff-word-add">${v}</span>`;
                        if (wo.val.trim()) addCount++;
                    }
                }
                html += `<div class="diff-deleted">${num}${delLine}</div>`;
                html += `<div class="diff-added">${num}${addLine}</div>`;

            } else if (op.type === 'del') {
                delCount++;
                html += `<div class="diff-deleted">${num}<span class="diff-word-del">${_esc(op.val)}</span></div>`;

            } else if (op.type === 'add') {
                addCount++;
                html += `<div class="diff-added">${num}<span class="diff-word-add">${_esc(op.val)}</span></div>`;
            }
        }

        const changed = addCount > 0 || delCount > 0;
        if (!changed && textA.trim() !== '') {
            container.innerHTML = `<div class="smt-identical">${_t('smt_diff_identical') || 'النصان متطابقان تماماً ✓'}</div>`;
            hideDiffStats();
        } else {
            container.innerHTML = html || `<span class="smt-diff-empty">${_t('smt_diff_empty')}</span>`;
            showDiffStats(addCount, delCount);
        }
    };

    // ─────────────────────────────────────────
    // عداد الفروقات
    // ─────────────────────────────────────────
    function showDiffStats(add, del) {
        const el = document.getElementById('smt-diff-stats');
        if (!el) return;
        el.style.display = 'flex';
        const addLbl = _t('smt_stat_added')   || 'مضاف';
        const delLbl = _t('smt_stat_deleted')  || 'محذوف';
        el.innerHTML = `
            <span class="smt-stat-add">+${add} ${addLbl}</span>
            <span class="smt-stat-sep">·</span>
            <span class="smt-stat-del">-${del} ${delLbl}</span>
        `;
    }

    function hideDiffStats() {
        const el = document.getElementById('smt-diff-stats');
        if (el) el.style.display = 'none';
    }

    // ─────────────────────────────────────────
    // نسخ النتيجة
    // ─────────────────────────────────────────
    window.copyDiffResult = async function (btn) {
        const c = document.getElementById('diff-container');
        if (!c || !c.innerText.trim()) return;
        try {
            await navigator.clipboard.writeText(c.innerText);
            _flashBtn(btn, _t('smt_btn_copied') || 'تم النسخ ✓');
        } catch (e) { console.error(e); }
    };

    // ─────────────────────────────────────────
    // مساعدات
    // ─────────────────────────────────────────
    function _t(key, vars) {
        if (typeof t === 'function') return t(key, vars);
        return '';
    }

    function _esc(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function _flashBtn(btn, msg) {
        const span = btn.querySelector('span') || btn;
        const orig = span.textContent;
        span.textContent = msg;
        btn.style.filter = 'brightness(1.15)';
        setTimeout(() => { span.textContent = orig; btn.style.filter = ''; }, 2000);
    }

})();
