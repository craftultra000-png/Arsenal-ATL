/* ══════════════════════════════════════════════
   ARSENAL DROPDOWN — مكوّن مشترك قابل لإعادة الاستخدام
   الاستخدام:
     new ArsenalDropdown({
       containerId : 'my-dd',           // id للـ div الحاوي
       inputId     : 'hidden-input-id', // hidden input يحمل القيمة
       options     : [
         { value: '720', label: '720p', desc: 'موصى به' },
       ],
       defaultValue: '720',
       accentVar   : '--acc',           // CSS variable للون (اختياري)
       onChange    : (value) => {},     // callback (اختياري)
       multi       : false,             // multi-select (اختياري)
     })
══════════════════════════════════════════════ */

class ArsenalDropdown {
    constructor(opts) {
        this.containerId  = opts.containerId;
        this.inputId      = opts.inputId;
        this.options      = opts.options || [];
        this.accentVar    = opts.accentVar || '--acc';
        this.onChange     = opts.onChange || null;
        this.multi        = opts.multi || false;

        // القيمة الحالية: single = string، multi = Set
        if (this.multi) {
            const def = Array.isArray(opts.defaultValue) ? opts.defaultValue : (opts.defaultValue ? [opts.defaultValue] : []);
            this.selected = new Set(def);
        } else {
            this.selected = opts.defaultValue || (this.options[0] && this.options[0].value) || '';
        }

        this._build();
        this._bind();
    }

    /* ── بناء الـ HTML ── */
    _build() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.classList.add('asl-dropdown');
        container.style.setProperty('--asl-accent', `var(${this.accentVar})`);

        container.innerHTML = `
            <button type="button" class="asl-dropdown-btn" id="${this.containerId}-btn" aria-haspopup="listbox" aria-expanded="false">
                <span class="asl-dropdown-btn-label" id="${this.containerId}-label"></span>
                <svg class="asl-dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>
            <div class="asl-dropdown-menu" id="${this.containerId}-menu" role="listbox">
                ${this.options.map(opt => this._itemHTML(opt)).join('')}
            </div>
        `;

        this._updateLabel();
    }

    /* ── HTML لكل عنصر ── */
    _itemHTML(opt) {
        const indicator = this.multi
            ? `<span class="asl-dropdown-check">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
               </span>`
            : `<span class="asl-dropdown-dot"></span>`;

        return `
            <div class="asl-dropdown-item" role="option" data-value="${opt.value}">
                ${indicator}
                <span class="asl-dropdown-item-text">
                    <span class="asl-dropdown-item-name">${opt.label}</span>
                    ${opt.desc ? `<div class="asl-dropdown-item-desc">${opt.desc}</div>` : ''}
                </span>
            </div>
        `;
    }

    /* ── ربط الأحداث ── */
    _bind() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const btn  = container.querySelector(`#${this.containerId}-btn`);
        const menu = container.querySelector(`#${this.containerId}-menu`);

        // فتح/إغلاق — نستخدم pointerdown بدل click لأسرع استجابة على الموبايل
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('open');
            this._closeAll();
            if (!isOpen) this._open();
        });

        // اختيار عنصر — نستخدم click بدل pointerdown
        // click ينتظر طبيعياً نهاية اللمسة بدون حركة سحب، فهذا يسمح بالتمرير
        // داخل القائمة بدون أن يُحتسب أول تماس كاختيار فعلي
        menu.querySelectorAll('.asl-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = item.dataset.value;
                if (this.multi) {
                    if (this.selected.has(val)) {
                        this.selected.delete(val);
                    } else {
                        this.selected.add(val);
                    }
                    this._updateSelected();
                    this._updateLabel();
                    this._syncInput();
                    if (this.onChange) this.onChange([...this.selected]);
                } else {
                    this.selected = val;
                    this._updateSelected();
                    this._updateLabel();
                    this._syncInput();
                    if (this.onChange) this.onChange(val);
                    this._close();
                }
            });
        });

        // إغلاق عند الضغط خارجاً — pointerdown على document
        // container لا يحتوي القائمة بصرياً (fixed)، لكنها لا تزال child بالـ DOM
        // لذلك container.contains(e.target) يبقى صحيحاً لأي لمسة داخل الزر أو القائمة
        document.addEventListener('pointerdown', (e) => {
            if (!container.contains(e.target)) {
                this._close();
            }
        });

        // تحديث الاختيار المرئي
        this._updateSelected();
    }

    /* ── فتح القائمة ── */
    _open() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const btn  = container.querySelector(`#${this.containerId}-btn`);
        const menu = container.querySelector(`#${this.containerId}-menu`);

        // نحسب موقع الزر بالنسبة للـ viewport ونحط القائمة بـ fixed
        // هيك ما تضيف لـ document height وما تدفع الصفحة
        const rect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top      = rect.bottom + 'px';
        menu.style.left     = rect.left + 'px';
        menu.style.width    = rect.width + 'px';
        menu.style.right    = 'auto';
        menu.style.display  = 'block';

        // frame واحد قبل نضيف open حتى يشتغل الـ transition
        requestAnimationFrame(() => {
            btn.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            menu.classList.add('open');
        });
    }

    /* ── إغلاق هذا الـ dropdown ── */
    _close() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const btn  = container.querySelector(`#${this.containerId}-btn`);
        const menu = container.querySelector(`#${this.containerId}-menu`);
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        menu.classList.remove('open');
        // بعد انتهاء الـ transition نشيل الـ display والـ fixed styles
        setTimeout(() => {
            if (!menu.classList.contains('open')) {
                menu.style.display  = '';
                menu.style.position = '';
                menu.style.top      = '';
                menu.style.left     = '';
                menu.style.width    = '';
                menu.style.right    = '';
            }
        }, 220);
    }

    /* ── إغلاق كل الـ dropdowns في الصفحة ── */
    _closeAll() {
        document.querySelectorAll('.asl-dropdown-menu.open').forEach(m => {
            m.classList.remove('open');
            const btn = m.previousElementSibling;
            if (btn) {
                btn.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /* ── تحديث الكلاس selected على العناصر ── */
    _updateSelected() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        container.querySelectorAll('.asl-dropdown-item').forEach(item => {
            const val = item.dataset.value;
            const isSelected = this.multi ? this.selected.has(val) : this.selected === val;
            item.classList.toggle('selected', isSelected);
        });
    }

    /* ── تحديث نص الزر ── */
    _updateLabel() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        const labelEl = container.querySelector(`#${this.containerId}-label`);
        if (!labelEl) return;

        if (this.multi) {
            const count = this.selected.size;
            if (count === 0) {
                labelEl.textContent = '—';
            } else {
                const names = [...this.selected].map(v => {
                    const opt = this.options.find(o => o.value === v);
                    return opt ? opt.label : v;
                });
                labelEl.textContent = names.join('، ');
            }
        } else {
            const opt = this.options.find(o => o.value === this.selected);
            labelEl.textContent = opt ? opt.label : '—';
        }
    }

    /* ── مزامنة الـ hidden input ── */
    _syncInput() {
        const input = document.getElementById(this.inputId);
        if (!input) return;
        if (this.multi) {
            input.value = [...this.selected].join(',');
        } else {
            input.value = this.selected;
        }
        // إطلاق change event حتى يشتغل أي listener موجود
        input.dispatchEvent(new Event('change'));
    }

    /* ── API عام: تغيير القيمة برمجياً ── */
    setValue(val) {
        if (this.multi) {
            this.selected = new Set(Array.isArray(val) ? val : [val]);
        } else {
            this.selected = val;
        }
        this._updateSelected();
        this._updateLabel();
        this._syncInput();
    }

    getValue() {
        return this.multi ? [...this.selected] : this.selected;
    }
}
