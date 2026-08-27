import { TOOLS } from '@shared/tools';
import { applyDocumentLocale, getLocale, localeMeta, localizeToolText, t, translateRenderedUi, watchRenderedUi } from '@shared/i18n';
import { registerOfflineWorker } from '@shared/pwa';
import type { ToolDefinition } from '@shared/types/tool';
import { iconSvg, type ArsenalIconName } from '@shared/ui/icons';
import { mountReferenceOrbs } from '@shared/ui/reference-orbs';

const themeKey = 'arsenal-theme';
type Theme = 'dark' | 'light';

type CategoryMeta = { label: string; icon: ArsenalIconName; accent: string };

const categoryMeta: Record<ToolDefinition['category'], CategoryMeta> = {
  video: { label: 'أدوات الفيديو', icon: 'video', accent: '#00d4aa' },
  audio: { label: 'أدوات الصوت', icon: 'audio', accent: '#f5a623' },
  image: { label: 'أدوات الصور', icon: 'image', accent: '#ff5f68' },
  pdf: { label: 'أدوات الـ PDF', icon: 'file', accent: '#a855f7' },
  text: { label: 'أدوات النصوص', icon: 'text', accent: '#2eb7ef' },
  utility: { label: 'مكتبة متعددة الأدوات', icon: 'qr', accent: '#00d4aa' }
};

function currentTheme(): Theme { return localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark'; }
function applyTheme(theme: Theme): void { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
export function initializeTheme(): void { applyTheme(currentTheme()); }

export interface PlatformShell {
  content: HTMLElement;
  status: HTMLElement;
  openMenu(): void;
  closeMenu(): void;
  setStatus(message: string, kind?: 'info' | 'success' | 'error'): void;
}

export interface ToolShell extends PlatformShell {}

/** طبقة المنصة المشتركة لكل صفحات MPA؛ لا تحتوي iframe أو محمّل مركزي. */
export function mountPlatformShell(mount: HTMLElement, activeSlug?: string, workspaceLabel = 'مساحة العمل'): PlatformShell {
  const locale = applyDocumentLocale();
  initializeTheme();
  void registerOfflineWorker();
  mount.innerHTML = `
    <div class="arsenal-backdrop" aria-hidden="true"></div>
    <header class="platform-topbar">
      <a class="platform-logo" href="/" aria-label="${t('العودة إلى الرئيسية', {}, locale)}"><img src="/assets/arsenal-reference-logo.png" alt="${t('الترسانة', {}, locale)}" width="42" height="42"></a>
      <form class="platform-search" id="platform-tool-search" role="search" novalidate>
        <span class="platform-search__icon" aria-hidden="true">${iconSvg('search', 'platform-icon')}</span>
        <label class="platform-search__label" for="platform-tool-search-input">${t('ابحث عن أداة', {}, locale)}</label>
        <input id="platform-tool-search-input" type="search" autocomplete="off" placeholder="${t('ابحث عن أداة…', {}, locale)}" aria-controls="platform-search-results" aria-expanded="false" />
        <div id="platform-search-results" class="platform-search-results" role="listbox" hidden></div>
      </form>
      <div class="platform-actions">
        <button class="platform-action tool-theme" type="button" aria-label="${t('تبديل المظهر', {}, locale)}">${iconSvg('theme', 'platform-icon')}</button>
        <button class="platform-action platform-menu" type="button" aria-label="${t('فتح القائمة', {}, locale)}" aria-expanded="false">${iconSvg('menu', 'platform-icon')}</button>
      </div>
    </header>
    <div class="platform-overlay" aria-hidden="true"></div>
    <aside class="platform-sidenav" aria-label="${t('قائمة الأدوات', {}, locale)}">
      <div class="platform-nav-head"><button class="platform-nav-close" type="button" aria-label="${t('إغلاق القائمة', {}, locale)}">${iconSvg('close', 'platform-icon')}</button></div>
      <nav class="platform-nav-body">
        <p class="platform-nav-section">${t('التنقل', {}, locale)}</p>
        <a class="platform-nav-home${activeSlug ? '' : ' is-active'}" href="/">${iconSvg('home', 'platform-nav-home__icon')}<b>${t('الرئيسية', {}, locale)}</b></a>
        <a class="platform-nav-home platform-nav-guide" href="/guide/">${iconSvg('file', 'platform-nav-home__icon')}<b>${t('دليل الأدوات', {}, locale)}</b></a>
        <div class="platform-nav-divider"></div>
        <p class="platform-nav-section">${t('ترسانة الأدوات', {}, locale)}</p>
        ${renderToolNavigation(activeSlug)}
        <div class="platform-nav-divider"></div>
        <a class="platform-nav-home platform-nav-settings" href="/settings/">${iconSvg('settings', 'platform-nav-home__icon')}<b>${t('الإعدادات', {}, locale)}</b></a>
      </nav>
      <div class="platform-nav-footer"><button class="platform-theme-row tool-theme" type="button"><span>${t('تبديل المظهر', {}, locale)}</span>${iconSvg('theme', 'platform-icon')}</button></div>
    </aside>
    <main class="arsenal-shell" dir="${localeMeta[locale].direction}">
      <section class="tool-workspace" aria-label="${workspaceLabel}"></section>
      <p class="arsenal-status" role="status" aria-live="polite" hidden></p>
    </main>
  `;

  const backdrop = requiredElement<HTMLElement>(mount, '.arsenal-backdrop');
  mountReferenceOrbs(backdrop);
  const sideNav = requiredElement<HTMLElement>(mount, '.platform-sidenav');
  const overlay = requiredElement<HTMLElement>(mount, '.platform-overlay');
  const menuButton = requiredElement<HTMLButtonElement>(mount, '.platform-menu');
  const closeButton = requiredElement<HTMLButtonElement>(mount, '.platform-nav-close');
  const setMenu = (open: boolean) => {
    sideNav.classList.toggle('is-open', open);
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    menuButton.setAttribute('aria-expanded', String(open));
  };
  menuButton.addEventListener('click', () => setMenu(!sideNav.classList.contains('is-open')));
  closeButton.addEventListener('click', () => setMenu(false));
  overlay.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); }, { signal: abortSignal(mount) });

  const navGroups = Array.from(mount.querySelectorAll<HTMLElement>('.platform-nav-group'));
  const setGroupOpen = (target: HTMLElement, open: boolean) => {
    target.classList.toggle('is-open', open);
    target.querySelector<HTMLButtonElement>('.platform-nav-group-toggle')?.setAttribute('aria-expanded', String(open));
    const body = target.querySelector<HTMLElement>('.platform-nav-group-body');
    if (body) {
      body.setAttribute('aria-hidden', String(!open));
      body.inert = !open;
    }
  };
  mount.querySelectorAll<HTMLButtonElement>('.platform-nav-group-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest<HTMLElement>('.platform-nav-group');
      if (!group) return;
      const shouldOpen = !group.classList.contains('is-open');
      navGroups.forEach((other) => setGroupOpen(other, other === group && shouldOpen));
    });
  });
  mount.querySelectorAll<HTMLButtonElement>('.tool-theme').forEach((button) => {
    button.addEventListener('click', () => {
      const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
      localStorage.setItem(themeKey, next);
      applyTheme(next);
    });
  });
  const content = requiredElement<HTMLElement>(mount, '.tool-workspace');
  const status = requiredElement<HTMLElement>(mount, '.arsenal-status');
  bindPlatformSearch(mount);
  translateRenderedUi(mount, locale);
  watchRenderedUi(mount, locale);
  return { content, status, openMenu: () => setMenu(true), closeMenu: () => setMenu(false), setStatus(message, kind = 'info') { status.textContent = t(message); status.dataset.kind = kind; status.hidden = true; } };
}

export function mountToolShell(mount: HTMLElement, tool: ToolDefinition): ToolShell {
  mount.dataset.tool = tool.slug;
  mount.style.setProperty('--tool-accent', tool.accent);
  document.title = `${localizeToolText(tool.title)} | Arsenal ATL`;
  return mountPlatformShell(mount, tool.slug, `${t('مساحة العمل')} ${localizeToolText(tool.title)}`);
}

function renderToolNavigation(activeSlug?: string): string {
  return (Object.keys(categoryMeta) as ToolDefinition['category'][]).map((category) => {
    const entries = TOOLS.filter((item) => item.category === category);
    if (!entries.length) return '';
    const meta = categoryMeta[category];
    const containsActiveTool = entries.some((item) => item.slug === activeSlug);
    return `<section class="platform-nav-group${containsActiveTool ? ' is-open' : ''}" style="--group-accent:${meta.accent}">
      <button class="platform-nav-group-toggle" type="button" aria-expanded="${String(containsActiveTool)}">
        <span class="platform-nav-group__icon">${iconSvg(meta.icon)}</span><b>${t(meta.label)}</b><i>${iconSvg('chevron-down')}</i>
      </button>
      <div class="platform-nav-group-body" aria-hidden="${String(!containsActiveTool)}"${containsActiveTool ? '' : ' inert'}>${entries.map((item) => `<a class="platform-nav-item${item.slug === activeSlug ? ' is-active' : ''}" href="/tools/${item.slug}/"><b>${localizeToolText(item.title)}</b></a>`).join('')}</div>
    </section>`;
  }).join('');
}

function bindPlatformSearch(mount: HTMLElement): void {
  const form = requiredElement<HTMLFormElement>(mount, '#platform-tool-search');
  const input = requiredElement<HTMLInputElement>(mount, '#platform-tool-search-input');
  const results = requiredElement<HTMLElement>(mount, '#platform-search-results');
  const locale = getLocale();
  const normalize = (value: string): string => {
    const lowered = value.toLocaleLowerCase(locale).trim();
    return locale === 'ar' ? lowered.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ـ/g, '') : lowered;
  };
  const close = () => { results.hidden = true; results.replaceChildren(); input.setAttribute('aria-expanded', 'false'); };
  const render = () => {
    const query = normalize(input.value);
    if (!query) { close(); return; }
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = TOOLS.filter((tool) => {
      const searchable = normalize(`${localizeToolText(tool.title, locale)} ${localizeToolText(tool.description, locale)} ${tool.keywords.join(' ')}`);
      const looseSearchable = searchable.replaceAll('ا', '');
      return terms.every((term) => searchable.includes(term) || looseSearchable.includes(term.replaceAll('ا', '')));
    }).slice(0, 6);
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    results.innerHTML = matches.length
      ? matches.map((tool) => `<a class="platform-search-result" role="option" href="/tools/${tool.slug}/"><span class="platform-search-result__icon">${iconSvg(tool.icon)}</span><span><b>${escapeHtml(localizeToolText(tool.title, locale))}</b><small>${escapeHtml(localizeToolText(tool.description, locale))}</small></span><i aria-hidden="true">${localeMeta[locale].direction === 'rtl' ? '←' : '→'}</i></a>`).join('')
      : `<p class="platform-search-empty">${t('لا توجد أداة مطابقة. جرّب كلمة أخرى.', {}, locale)}</p>`;
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => { if (event.key === 'Escape') { close(); input.blur(); } });
  form.addEventListener('submit', (event) => event.preventDefault());
  document.addEventListener('pointerdown', (event) => { if (!form.contains(event.target as Node)) close(); }, { signal: abortSignal(mount) });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}

function abortSignal(mount: HTMLElement): AbortSignal {
  const controller = new AbortController();
  new MutationObserver(() => { if (!mount.isConnected) controller.abort(); }).observe(document.body, { childList: true, subtree: true });
  return controller.signal;
}

export function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`العنصر المطلوب غير موجود: ${selector}`);
  return element;
}
