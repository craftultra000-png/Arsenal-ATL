export type ArsenalSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type ArsenalSelectOptions = {
  host: HTMLElement;
  options: ArsenalSelectOption[];
  value?: string;
  values?: string[];
  multi?: boolean;
  emptyLabel?: string;
  accent?: string;
  ariaLabel?: string;
  onChange?: (value: string) => void;
  onValuesChange?: (values: string[]) => void;
};

let currentOpen: ArsenalSelect | null = null;
let sequence = 0;

/**
 * قائمة Arsenal مخصصة وملائمة للمس على الهاتف.
 * تدعم الاختيار الأحادي والمتعدد ولا تعتمد نافذة Android الأصلية.
 */
export class ArsenalSelect {
  private readonly id = `arsenal-select-${++sequence}`;
  private readonly host: HTMLElement;
  private readonly options: ArsenalSelectOption[];
  private readonly trigger: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly multi: boolean;
  private readonly emptyLabel: string;
  private selected: string;
  private readonly selectedValues: Set<string>;
  private readonly onChange?: (value: string) => void;
  private readonly onValuesChange?: (values: string[]) => void;

  constructor(config: ArsenalSelectOptions) {
    this.host = config.host;
    this.options = config.options.filter((option) => !option.disabled);
    this.multi = Boolean(config.multi);
    this.emptyLabel = config.emptyLabel ?? 'اختر خياراً…';
    this.selectedValues = new Set((config.values ?? []).filter((value) => this.options.some((option) => option.value === value)));
    this.selected = config.value ?? this.options[0]?.value ?? '';
    if (this.multi) this.selected = '';
    this.onChange = config.onChange;
    this.onValuesChange = config.onValuesChange;
    this.host.classList.add('arsenal-select');
    if (this.multi) this.host.classList.add('arsenal-select--multi');
    if (config.accent) this.host.style.setProperty('--arsenal-select-accent', config.accent);

    this.host.innerHTML = `
      <button id="${this.id}-button" class="arsenal-select__button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(config.ariaLabel ?? 'اختر خياراً')}">
        <span class="arsenal-select__label"></span>
        <svg class="arsenal-select__chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div id="${this.id}-menu" class="arsenal-select__menu" role="listbox" aria-hidden="true"></div>
    `;
    this.trigger = required<HTMLButtonElement>(this.host, `#${this.id}-button`);
    this.menu = required<HTMLElement>(this.host, `#${this.id}-menu`);
    this.render();
    this.bind();
  }

  get value(): string { return this.selected; }
  get values(): string[] { return this.options.filter((option) => this.selectedValues.has(option.value)).map((option) => option.value); }

  setValue(value: string, notify = false): void {
    if (!this.options.some((option) => option.value === value)) return;
    if (this.multi) { this.setValues(value ? [value] : [], notify); return; }
    this.selected = value;
    this.render();
    if (notify) this.onChange?.(value);
  }

  setValues(values: string[], notify = false): void {
    if (!this.multi) { this.setValue(values[0] ?? '', notify); return; }
    this.selectedValues.clear();
    values.forEach((value) => { if (this.options.some((option) => option.value === value)) this.selectedValues.add(value); });
    this.render();
    if (notify) this.onValuesChange?.(this.values);
  }

  open(): void {
    if (currentOpen && currentOpen !== this) currentOpen.close();
    currentOpen = this;
    this.host.classList.add('is-open');
    const rect = this.trigger.getBoundingClientRect();
    const gutter = 12;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - gutter;
    const spaceAbove = rect.top - gutter;
    const above = spaceBelow < 150 && spaceAbove > spaceBelow;
    const height = Math.max(140, Math.min(280, above ? spaceAbove : spaceBelow));

    this.menu.style.cssText = `display:block;position:absolute;width:100%;left:0;right:auto;max-height:${height}px;${above ? 'bottom:calc(100% - 1px);top:auto;' : 'top:calc(100% - 1px);bottom:auto;'}`;
    this.trigger.classList.toggle('is-open-up', above);
    this.trigger.classList.add('is-open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.menu.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      this.menu.classList.add('is-open');
      const active = this.menu.querySelector<HTMLElement>('[aria-selected="true"]');
      if (active && !this.multi) this.menu.scrollTop = Math.max(0, active.offsetTop - (this.menu.clientHeight - active.offsetHeight) / 2);
    });
  }

  close(): void {
    if (!this.menu.classList.contains('is-open') && !this.trigger.classList.contains('is-open')) return;
    if (currentOpen === this) currentOpen = null;
    this.menu.classList.remove('is-open');
    this.host.classList.remove('is-open');
    this.trigger.classList.remove('is-open', 'is-open-up');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.menu.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      if (!this.menu.classList.contains('is-open')) this.menu.removeAttribute('style');
    }, 190);
  }

  private render(): void {
    const label = required<HTMLElement>(this.host, '.arsenal-select__label');
    if (this.multi) {
      const selectedOptions = this.options.filter((option) => this.selectedValues.has(option.value));
      label.textContent = selectedOptions.length ? selectedOptions.map((option) => option.label).join('، ') : this.emptyLabel;
    } else {
      const selectedOption = this.options.find((option) => option.value === this.selected) ?? this.options[0];
      label.textContent = selectedOption?.label ?? '—';
    }
    this.menu.innerHTML = this.options.map((option) => {
      const selected = this.multi ? this.selectedValues.has(option.value) : option.value === this.selected;
      const marker = this.multi
        ? '<span class="arsenal-select__check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span>'
        : '<span class="arsenal-select__mark" aria-hidden="true"></span>';
      return `<button class="arsenal-select__option${selected ? ' is-selected' : ''}" type="button" role="option" data-value="${escapeHtml(option.value)}" aria-selected="${String(selected)}">${marker}<span class="arsenal-select__option-copy"><strong>${escapeHtml(option.label)}</strong>${option.description ? `<small>${escapeHtml(option.description)}</small>` : ''}</span></button>`;
    }).join('');
  }

  private toggleValue(value: string): void {
    if (this.selectedValues.has(value)) this.selectedValues.delete(value);
    else this.selectedValues.add(value);
    this.render();
    this.onValuesChange?.(this.values);
  }

  private bind(): void {
    this.trigger.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.menu.classList.contains('is-open')) this.close();
      else this.open();
    });
    this.trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { this.close(); return; }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.open();
      }
    });
    this.menu.addEventListener('click', (event) => {
      const option = (event.target as HTMLElement).closest<HTMLButtonElement>('.arsenal-select__option');
      if (!option) return;
      const value = option.dataset.value;
      if (!value) return;
      if (this.multi) { this.toggleValue(value); return; }
      if (value === this.selected) return;
      this.setValue(value, true);
    });
    document.addEventListener('pointerdown', (event) => {
      if (!this.host.contains(event.target as Node)) this.close();
    });
    window.addEventListener('resize', () => this.close(), { passive: true });
  }
}

/** يحافظ على select الأصلي مخفياً مع واجهة Arsenal مخصصة. */
export function enhanceNativeSelect(select: HTMLSelectElement, options: Omit<ArsenalSelectOptions, 'host' | 'options' | 'value' | 'onChange'> = {}): ArsenalSelect {
  const host = document.createElement('div');
  host.className = 'arsenal-select-host';
  select.classList.add('arsenal-select-native');
  select.hidden = true;
  select.insertAdjacentElement('afterend', host);
  const nativeOptions = Array.from(select.options).map((option) => ({
    value: option.value,
    label: option.textContent?.trim() || option.value,
    description: option.dataset.description?.trim() || undefined,
    disabled: option.disabled,
  }));
  return new ArsenalSelect({
    ...options,
    host,
    options: nativeOptions,
    value: select.value,
    ariaLabel: select.getAttribute('aria-label') ?? select.labels?.[0]?.textContent?.trim() ?? 'اختر خياراً',
    onChange: (value) => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    },
  });
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`عنصر قائمة Arsenal غير موجود: ${selector}`);
  return element;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
