import '@shared/ui/tool-shell.css';
import '@shared/ui/arsenal-select.css';
import '@pages/settings/styles.css';
import { iconSvg } from '@shared/ui/icons';
import { cachePlatformOffline, supportsOffline } from '@shared/pwa';
import { mountPlatformShell } from '@shared/ui/tool-shell';
import { enhanceNativeSelect } from '@shared/ui/arsenal-select';
import { LOCALES, getLocale, localeMeta, setLocale, t } from '@shared/i18n';

type UserProfile = { name: string; email: string; picture?: string; sub?: string };
type View = 'main' | 'feedback' | 'subscription' | 'privacy' | 'terms';
type FeedbackKind = 'suggestion' | 'bug' | 'praise' | 'other';

const USER_KEY = 'asl_user';
const USER_ID_KEY = 'arsenal_user_id';
const THEME_KEY = 'arsenal-theme';
const SOUND_KEY = 'asl_sound';
const PAYMENT_WORKER = 'https://arsenal-payment.craftultra000.workers.dev';
const GOOGLE_CLIENT_ID = '971416834152-nqnns94gg7dn2gdu04cqh9oups0d2gs7.apps.googleusercontent.com';
const FEEDBACK_URL = 'https://firestore.googleapis.com/v1/projects/arsenal-feedback/databases/(default)/documents/feedback?key=AIzaSyA9rZva181tyLdHLdVjjMqCNnU5cccli9o';

const mount = document.querySelector<HTMLElement>('#app');
if (!mount) throw new Error('لم يتم العثور على نقطة تحميل الإعدادات.');
mount.dataset.page = 'settings';
document.title = `${t('الإعدادات')} | Arsenal ATL`;
const shell = mountPlatformShell(mount, undefined, t('الإعدادات'));
shell.content.classList.add('settings-workspace');

let activeView: View = 'main';
let feedbackKind: FeedbackKind = 'suggestion';
let feedbackRating = 0;
let currentPlan: 'monthly' | 'yearly' = 'monthly';
let paymentPoll: number | undefined;

function user(): UserProfile | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as UserProfile | null; } catch { return null; }
}
function currentTheme(): 'dark' | 'light' { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }
function soundOn(): boolean { return localStorage.getItem(SOUND_KEY) !== 'off'; }
function language(): string { return getLocale(); }
function setTheme(next: 'dark' | 'light'): void { localStorage.setItem(THEME_KEY, next); document.documentElement.dataset.theme = next; document.documentElement.style.colorScheme = next; }
function setView(view: View): void { activeView = view; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function render(): void {
  shell.content.innerHTML = activeView === 'main' ? mainTemplate() : activeView === 'feedback' ? feedbackTemplate() : activeView === 'subscription' ? subscriptionTemplate() : legalTemplate(activeView);
  bindCurrentView();
}

function section(title: string, body: string): string { return `<section class="settings-section"><p class="settings-section__label">${title}</p>${body}</section>`; }
function settingRow(icon: string, accent: string, title: string, description: string, action = '', className = ''): string {
  return `<button type="button" class="settings-row ${className}" ${action}><span class="settings-row__icon" style="--row-accent:${accent}">${icon}</span><span class="settings-row__body"><b>${title}</b><small>${description}</small></span><span class="settings-row__end">${iconSvg('chevron-down')}</span></button>`;
}
function languageOptions(selected: string): string {
  return LOCALES.map((locale) => {
    const meta = localeMeta[locale];
    const description = locale === 'ar' ? `${meta.nativeLabel} — ${t('اللغة الافتراضية')}` : meta.nativeLabel;
    return `<option value="${locale}" data-description="${escapeHtml(description)}" ${locale === selected ? 'selected' : ''}>${escapeHtml(meta.nativeLabel)}</option>`;
  }).join('');
}
function mainTemplate(): string {
  const profile = user();
  const isLight = currentTheme() === 'light';
  const sound = soundOn();
  const lang = language();
  return `<section class="settings-page">
    <header class="settings-header"><span class="settings-header__icon">${iconSvg('settings')}</span><div><h1>الإعدادات</h1><p>تحكم في تجربتك داخل الترسانة.</p></div></header>
    ${section('الحساب', profile ? `<article class="settings-account settings-card"><span class="settings-avatar">${profile.picture ? `<img src="${escapeHtml(profile.picture)}" alt="">` : escapeHtml(profile.name.slice(0, 1).toUpperCase())}</span><span class="settings-account__data"><b>${escapeHtml(profile.name)}</b><small>${escapeHtml(profile.email)}</small></span><button id="settings-logout" class="settings-mini-button" type="button">${iconSvg('log-out')} خروج</button></article>` : `<article class="settings-account settings-card"><span class="settings-row__icon" style="--row-accent:#367cee">${iconSvg('users')}</span><span class="settings-account__data"><b>تسجيل الدخول</b><small>سجّل دخولك لمزامنة إعداداتك واشتراكك وفيدباكك.</small></span><button id="google-login" class="settings-google-button" type="button"><span class="settings-google-mark">${iconSvg('google')}</span> الدخول عبر Google</button></article>`)}
    ${section('المظهر', `<div class="settings-card settings-card--stack"><button id="settings-theme" class="settings-row" type="button"><span class="settings-row__icon" style="--row-accent:#f5a623">${iconSvg('theme')}</span><span class="settings-row__body"><b>وضع العرض</b><small>${isLight ? 'الوضع الفاتح' : 'الوضع الداكن'}</small></span><span class="settings-switch ${isLight ? 'is-on' : ''}"><i></i></span></button><button id="settings-sound" class="settings-row" type="button"><span class="settings-row__icon" style="--row-accent:#00d4aa">${iconSvg('audio')}</span><span class="settings-row__body"><b>صوت التنقل</b><small>${sound ? 'مفعّل' : 'مكتوم'}</small></span><span class="settings-switch ${sound ? 'is-on' : ''}"><i></i></span></button></div>`)}
    ${section('اللغة', `<article class="settings-card settings-language"><div class="settings-language__head"><span class="settings-row__icon" style="--row-accent:#00d4aa">${iconSvg('text')}</span><span><b>لغة المنصة</b><small>اختر لغة واجهة المنصة على هذا الجهاز.</small></span></div><label class="settings-language__select-label" for="settings-language-select">اللغة المفضلة</label><select id="settings-language-select" aria-label="${t('اللغة المفضلة')}">${languageOptions(lang)}</select></article><p class="settings-caption">سيُستخدم اختيار اللغة في صفحات المنصة المتوافقة ويحفظ على هذا الجهاز.</p>`)}
    ${section('دعم المشروع', `<div class="settings-card">${settingRow(iconSvg('diamond'), '#f5a623', 'عضوية VIP', 'ادعم المشروع واحصل على مزايا وخيارات إضافية.', 'id="open-subscription"')}</div>`)}
    ${section('الاستخدام بدون إنترنت', `<article class="settings-card settings-offline"><div class="settings-offline__copy"><span class="settings-row__icon" style="--row-accent:#00d4aa">${iconSvg('file-down')}</span><span><b>تحميل الصفحات محلياً</b><small id="offline-description">احفظ صفحة المنصة وروابط الأدوات لفتحها من ذاكرة المتصفح.</small></span></div><div id="offline-progress" class="settings-progress" hidden><div><span id="offline-progress-label">جاري التحضير…</span><b id="offline-progress-value">0%</b></div><i><em id="offline-progress-fill"></em></i></div><button id="offline-cache" type="button" class="settings-primary-button">${iconSvg('file-down')}<span>تحميل للاستخدام Offline</span></button></article>`)}
    ${section('قانوني', `<div class="settings-card settings-card--stack">${settingRow(iconSvg('shield'), '#00d4aa', 'السياسة والخصوصية', 'كيف نتعامل مع بياناتك وملفاتك.', 'id="open-privacy"')}${settingRow(iconSvg('file-edit'), '#367cee', 'شروط الاستخدام', 'حقوقك والتزاماتك عند استخدام المنصة.', 'id="open-terms"')}</div>`)}
    ${section('رأيك يهمنا', `<div class="settings-card">${settingRow(iconSvg('share'), '#367cee', 'أرسل رأيك', profile ? 'اقترح ميزة أو أبلغ عن مشكلة أو قيّم تجربتك.' : 'سجّل دخولك عبر Google لتتمكن من إرسال الفيدباك.', 'id="open-feedback"')}</div>`)}
    <p class="settings-version">الترسانة · الإصدار المستقل متعدد الصفحات</p>
  </section>`;
}

function feedbackTemplate(): string {
  const profile = user();
  if (!profile) return `<section class="settings-inner"><button class="settings-back" data-back>${iconSvg('chevron-down')} رجوع</button><header class="settings-header"><span class="settings-header__icon">${iconSvg('share')}</span><div><h1>أرسل رأيك</h1><p>الفيدباك متاح للحسابات المسجلة.</p></div></header><article class="settings-empty-card"><span>${iconSvg('lock')}</span><h2>سجّل دخولك أولاً</h2><p>استخدم الدخول عبر Google لحفظ هويتك مع الفيدباك الذي ترسله.</p><button id="feedback-google-login" class="settings-google-button" type="button"><span class="settings-google-mark">${iconSvg('google')}</span> الدخول عبر Google</button></article></section>`;
  return `<section class="settings-inner"><button class="settings-back" data-back>${iconSvg('chevron-down')} رجوع</button><header class="settings-header"><span class="settings-header__icon">${iconSvg('share')}</span><div><h1>أرسل رأيك</h1><p>كلامك يساعدنا على تطوير الترسانة أكثر.</p></div></header><article class="feedback-card"><label>نوع الرسالة</label><div class="feedback-types">${(['suggestion:اقتراح','bug:مشكلة','praise:إطراء','other:أخرى'] as const).map((entry) => { const [value, label] = entry.split(':'); return `<button type="button" data-feedback-kind="${value}" class="${feedbackKind === value ? 'is-active' : ''}">${label}</button>`; }).join('')}</div><label>تقييمك للترسانة</label><div class="feedback-stars" aria-label="التقييم">${[1,2,3,4,5].map((value) => `<button type="button" data-rating="${value}" class="${value <= feedbackRating ? 'is-active' : ''}" aria-label="${value} نجوم">★</button>`).join('')}</div><label for="feedback-message">رسالتك</label><textarea id="feedback-message" maxlength="1000" placeholder="اكتب اقتراحك أو وصف المشكلة هنا…"></textarea><p class="feedback-counter"><span id="feedback-count">0</span> / 1000</p><button id="submit-feedback" class="settings-primary-button" type="button">${iconSvg('share')}<span>إرسال الفيدباك</span></button><p id="feedback-status" class="settings-status" role="status"></p></article></section>`;
}

function subscriptionTemplate(): string {
  const active = localStorage.getItem('arsenal_sub_active') === 'true';
  const plan = localStorage.getItem('arsenal_sub_plan');
  return `<section class="settings-inner"><button class="settings-back" data-back>${iconSvg('chevron-down')} رجوع</button><header class="subscription-hero"><p>دعم المشروع</p><h1><span>اختر خطتك</span></h1><small>الترسانة تعمل على جهازك بلا إعلانات ولا رفع ملفات.</small></header><div class="subscription-grid"><article class="plan-card"><span class="plan-card__icon">${iconSvg('archive')}</span><h2>مجاني</h2><p class="plan-card__price">0<span>$</span></p><small>للأبد</small><ul><li>${iconSvg('check')} معظم الأدوات بلا حدود</li><li>${iconSvg('check')} معالجة محلية 100%</li><li>${iconSvg('check')} بدون إعلانات</li></ul><button disabled>خطتك الحالية</button></article><article class="plan-card plan-card--featured"><span class="plan-card__badge">الأكثر شيوعاً</span><span class="plan-card__icon">${iconSvg('lock')}</span><h2>VIP شهري</h2><p class="plan-card__price">5<span>$</span></p><small>شهرياً</small><ul><li>${iconSvg('check')} وصول مبكر للأدوات الجديدة</li><li>${iconSvg('check')} ثيمات وخيارات إضافية</li><li>${iconSvg('check')} أولوية في الدعم</li></ul><button class="subscription-action" data-plan="monthly" ${active && plan === 'monthly' ? 'disabled' : ''}>${active && plan === 'monthly' ? 'خطتك الحالية' : 'اشترك الآن'}</button></article><article class="plan-card plan-card--gold"><span class="plan-card__badge">وفّر 17%</span><span class="plan-card__icon">${iconSvg('lock')}</span><h2>VIP سنوي</h2><p class="plan-card__price">50<span>$</span></p><small>سنوياً</small><ul><li>${iconSvg('check')} كل مزايا VIP</li><li>${iconSvg('check')} شارة دعم المنصة</li><li>${iconSvg('check')} أولوية في الدعم</li></ul><button class="subscription-action" data-plan="yearly" ${active && plan === 'yearly' ? 'disabled' : ''}>${active && plan === 'yearly' ? 'خطتك الحالية' : 'اشترك سنوياً'}</button></article></div><p class="settings-caption">تتطلب عملية الاشتراك تسجيل الدخول أولاً. لن يُنشأ طلب دفع إلا بعد تأكيدك في النافذة التالية.</p></section>`;
}
function legalSection(icon: string, accent: string, title: string, content: string): string {
  return `<article class="legal-section"><span class="legal-section__icon" style="--legal-accent:${accent}">${icon}</span><h2>${title}</h2>${content}</article>`;
}
function legalList(items: string[]): string { return `<ul class="legal-list">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`; }
function legalTemplate(kind: 'privacy' | 'terms'): string {
  const privacy = kind === 'privacy';
  const privacyContent = [
    legalSection(iconSvg('info'), '#367cee', 'نظرة عامة', '<p>الترسانة (Arsenal) منصة أدوات رقمية تعمل بالكامل داخل متصفحك دون الحاجة إلى أي خوادم خارجية لمعالجة ملفاتك. نحن نؤمن بأن خصوصيتك حق أساسي، وقد بُنيت المنصة من الأساس على مبدأ «الخصوصية أولاً».</p>'),
    legalSection(iconSvg('message'), '#00d4aa', 'ما الذي نجمعه؟', `<div class="legal-table"><div class="legal-table__row"><b>ملفاتك</b><span>لا نجمعها ولا نرفعها — تُعالَج محلياً فقط</span></div><div class="legal-table__row"><b>الاسم والبريد الإلكتروني</b><span class="is-positive">عند تسجيل الدخول عبر Google — لتخصيص تجربتك فقط</span></div><div class="legal-table__row"><b>الإعدادات والتفضيلات</b><span class="is-positive">تُحفظ محلياً على جهازك فقط (localStorage)</span></div><div class="legal-table__row"><b>الفيدباك الذي ترسله</b><span class="is-positive">يُخزَّن في قاعدة بيانات آمنة لتحسين المنصة</span></div><div class="legal-table__row"><b>بيانات الإعلانات</b><span>لا توجد إعلانات — لا تتبع ولا بيع بيانات</span></div></div>`),
    legalSection(iconSvg('lock'), '#f5a623', 'كيف نحمي بياناتك؟', legalList(['جميع عمليات معالجة الملفات تتم داخل متصفحك باستخدام تقنيات WebAssembly المعتمدة عالمياً.', 'لا تمر ملفاتك عبر أي خادم خارجي في أي مرحلة من مراحل المعالجة.', 'بيانات الفيدباك المرسلة محمية بقواعد أمان Firebase الصارمة ولا يمكن قراءتها من طرف ثالث.', 'تسجيل الدخول عبر Google OAuth 2.0 — لا نحتفظ بكلمة مرورك أو أي بيانات حساسة.'])),
    legalSection(iconSvg('users'), '#367cee', 'حقوقك', legalList(['حق الوصول: يمكنك في أي وقت الاطلاع على البيانات المرتبطة بحسابك.', 'حق الحذف: يمكنك حذف حسابك وجميع بياناتك المرتبطة به بالتواصل معنا.', 'حق الإلغاء: يمكنك إلغاء اشتراكك في أي وقت.', 'حق الشفافية: نلتزم بإعلامك بأي تغيير في سياسة الخصوصية.']))
  ].join('');
  const termsContent = [
    legalSection(iconSvg('info'), '#367cee', 'القبول بالشروط', '<p>باستخدامك لمنصة الترسانة (Arsenal)، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق على أي بند من هذه الشروط، يُرجى التوقف عن استخدام المنصة. نحتفظ بحق تعديل هذه الشروط في أي وقت مع الإشارة إلى تاريخ آخر تحديث.</p>'),
    legalSection(iconSvg('activity'), '#00d4aa', 'الاستخدام المقبول', legalList(['يُسمح باستخدام المنصة للأغراض الشخصية والتجارية المشروعة.', 'يجب أن لا يقل عمر المستخدم عن 13 عاماً.', 'أنت مسؤول عن المحتوى الذي تعالجه عبر المنصة وامتثاله للقوانين المعمول بها.', 'يُحظر استخدام المنصة لمعالجة محتوى ينتهك حقوق الملكية الفكرية للغير.'])),
    legalSection(iconSvg('close'), '#f5a623', 'الاستخدام المحظور', legalList(['يُحظر محاولة اختراق أو التلاعب بأي مكون من مكونات المنصة.', 'يُحظر إعادة بيع الأدوات أو تضمينها في منتجات تجارية دون إذن كتابي مسبق.', 'يُحظر استخدام المنصة لأغراض غير مشروعة أو تنتهك حقوق الآخرين.', 'يُحظر نشر محتوى يحض على التمييز أو العنف عبر المنصة.'])),
    legalSection(iconSvg('dollar'), '#367cee', 'الاشتراكات والمدفوعات', legalList(['الاشتراكات المدفوعة تُفعَّل يدوياً بعد التحقق من عملية الدفع.', 'بسبب طبيعة الأدوات الرقمية، لا يمكن استرداد المبالغ المدفوعة بعد تفعيل الاشتراك إلا في حالات استثنائية يُبت فيها بحسب كل حالة على حدة.', 'نحتفظ بحق تعديل الأسعار مع إشعار مسبق لا يقل عن 30 يوماً.', 'في حال إساءة الاستخدام، يحق لنا إلغاء الاشتراك دون استرداد.'])),
    legalSection(iconSvg('shield'), '#00d4aa', 'الملكية الفكرية', '<p>جميع عناصر المنصة من تصميم وكود وشعارات هي ملك حصري للترسانة. يُسمح باستخدام الأدوات وفق هذه الشروط، لكن يُحظر نسخ أو توزيع أو إعادة إنتاج أي جزء من المنصة دون إذن كتابي مسبق.</p>'),
    legalSection(iconSvg('alert'), 'var(--text-muted)', 'إخلاء المسؤولية', '<p>تُقدَّم المنصة «كما هي» دون أي ضمانات صريحة أو ضمنية. لا نتحمل المسؤولية عن أي خسارة في البيانات أو أضرار ناجمة عن استخدام المنصة. يتحمل المستخدم كامل المسؤولية عن النتائج المترتبة على استخدامه للأدوات.</p>')
  ].join('');
  return `<section class="settings-inner legal-page"><button class="settings-back" data-back>${iconSvg('chevron-down')} رجوع</button><header class="legal-hero"><span class="legal-hero__icon ${privacy ? 'is-privacy' : 'is-terms'}">${privacy ? iconSvg('shield') : iconSvg('file-edit')}</span><div><h1>${privacy ? 'سياسة الخصوصية' : 'شروط الاستخدام'}</h1><p>آخر تحديث: يوليو 2026</p></div></header>${privacy ? privacyContent : termsContent}<aside class="legal-highlight ${privacy ? 'is-privacy' : 'is-terms'}">${privacy ? iconSvg('check') : iconSvg('message')}<p>${privacy ? 'ملفاتك ملكك وحدك. نحن لا نراها، لا نحتفظ بها، ولا نشاركها مع أي طرف ثالث — أبداً.' : 'للاستفسارات والشكاوى المتعلقة بهذه الشروط، تواصل معنا عبر نموذج الفيدباك داخل التطبيق.'}</p></aside></section>`;
}

function paymentModal(): string { return `<div id="payment-modal" class="payment-modal" hidden><button class="payment-modal__backdrop" data-close-payment aria-label="إغلاق"></button><section class="payment-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title"><button class="payment-modal__close" data-close-payment type="button">${iconSvg('close')}</button><span class="payment-modal__icon">${iconSvg('lock')}</span><h2 id="payment-title">تأكيد خطة VIP</h2><p id="payment-copy">راجع تفاصيل الخطة قبل إنشاء عنوان الدفع.</p><div id="payment-info" class="payment-modal__info"></div><button id="payment-confirm" class="settings-primary-button" type="button">إنشاء عنوان الدفع</button><p id="payment-status" class="settings-status"></p></section></div>`; }

function bindCurrentView(): void {
  shell.content.querySelectorAll<HTMLElement>('[data-back]').forEach((button) => button.addEventListener('click', () => setView('main')));
  if (activeView === 'main') bindMain();
  if (activeView === 'feedback') bindFeedback();
  if (activeView === 'subscription') bindSubscription();
}
function bindMain(): void {
  shell.content.querySelector<HTMLButtonElement>('#google-login')?.addEventListener('click', () => void loginWithGoogle());
  shell.content.querySelector<HTMLButtonElement>('#settings-logout')?.addEventListener('click', logout);
  shell.content.querySelector<HTMLButtonElement>('#settings-theme')?.addEventListener('click', () => { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); render(); });
  shell.content.querySelector<HTMLButtonElement>('#settings-sound')?.addEventListener('click', () => { localStorage.setItem(SOUND_KEY, soundOn() ? 'off' : 'on'); render(); });
  const languageSelect = shell.content.querySelector<HTMLSelectElement>('#settings-language-select');
  if (languageSelect) {
    enhanceNativeSelect(languageSelect, { accent: 'var(--accent)', ariaLabel: t('اللغة المفضلة') });
    languageSelect.addEventListener('change', () => {
      setLocale(languageSelect.value);
      window.location.reload();
    });
  }
  shell.content.querySelector<HTMLButtonElement>('#open-subscription')?.addEventListener('click', () => setView('subscription'));
  shell.content.querySelector<HTMLButtonElement>('#open-feedback')?.addEventListener('click', () => setView('feedback'));
  shell.content.querySelector<HTMLButtonElement>('#open-privacy')?.addEventListener('click', () => setView('privacy'));
  shell.content.querySelector<HTMLButtonElement>('#open-terms')?.addEventListener('click', () => setView('terms'));
  shell.content.querySelector<HTMLButtonElement>('#offline-cache')?.addEventListener('click', () => void cacheOffline());
}
function bindFeedback(): void {
  shell.content.querySelector<HTMLButtonElement>('#feedback-google-login')?.addEventListener('click', () => void loginWithGoogle());
  shell.content.querySelectorAll<HTMLButtonElement>('[data-feedback-kind]').forEach((button) => button.addEventListener('click', () => { feedbackKind = button.dataset.feedbackKind as FeedbackKind; render(); }));
  shell.content.querySelectorAll<HTMLButtonElement>('[data-rating]').forEach((button) => button.addEventListener('click', () => { feedbackRating = Number(button.dataset.rating); render(); }));
  const message = shell.content.querySelector<HTMLTextAreaElement>('#feedback-message');
  const counter = shell.content.querySelector<HTMLElement>('#feedback-count');
  message?.addEventListener('input', () => { if (counter) counter.textContent = String(message.value.length); });
  shell.content.querySelector<HTMLButtonElement>('#submit-feedback')?.addEventListener('click', () => void submitFeedback());
}
function bindSubscription(): void {
  shell.content.querySelectorAll<HTMLButtonElement>('.subscription-action').forEach((button) => button.addEventListener('click', () => openPayment(button.dataset.plan as 'monthly' | 'yearly')));
}

async function loginWithGoogle(): Promise<void> {
  try {
    await loadGoogle();
    const google = (window as Window & { google?: any }).google;
    if (!google) throw new Error('تعذر تحميل خدمة تسجيل الدخول.');
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (response: { credential?: string }) => {
      if (!response.credential) { shell.setStatus('لم يكتمل تسجيل الدخول.', 'error'); return; }
      try {
        const payload = decodeJwt(response.credential);
        const profile: UserProfile = { name: String(payload.name ?? 'مستخدم Arsenal'), email: String(payload.email ?? ''), picture: typeof payload.picture === 'string' ? payload.picture : undefined, sub: String(payload.sub ?? '') };
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
        if (profile.sub) localStorage.setItem(USER_ID_KEY, profile.sub);
        shell.setStatus('تم تسجيل الدخول بنجاح.', 'success');
        render();
      } catch { shell.setStatus('تعذر قراءة بيانات تسجيل الدخول.', 'error'); }
    } });
    google.accounts.id.prompt();
  } catch (error) { shell.setStatus(error instanceof Error ? error.message : 'تعذر فتح تسجيل الدخول.', 'error'); }
}
function loadGoogle(): Promise<void> { return new Promise((resolve, reject) => { if ((window as Window & { google?: unknown }).google) { resolve(); return; } const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('تعذر تحميل خدمة Google. تحقق من الاتصال.')); document.head.append(script); }); }
function decodeJwt(token: string): Record<string, unknown> { const raw = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/'); if (!raw) throw new Error('رمز دخول غير صالح.'); return JSON.parse(decodeURIComponent(atob(raw).split('').map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))) as Record<string, unknown>; }
function logout(): void { localStorage.removeItem(USER_KEY); localStorage.removeItem(USER_ID_KEY); const google = (window as Window & { google?: any }).google; google?.accounts?.id?.disableAutoSelect?.(); shell.setStatus('تم تسجيل الخروج من هذا الجهاز.', 'success'); render(); }

async function cacheOffline(): Promise<void> {
  const button = shell.content.querySelector<HTMLButtonElement>('#offline-cache');
  const progress = shell.content.querySelector<HTMLElement>('#offline-progress');
  const label = shell.content.querySelector<HTMLElement>('#offline-progress-label');
  const value = shell.content.querySelector<HTMLElement>('#offline-progress-value');
  const fill = shell.content.querySelector<HTMLElement>('#offline-progress-fill');
  const description = shell.content.querySelector<HTMLElement>('#offline-description');
  if (!button || !progress || !label || !value || !fill) return;

  progress.hidden = false;
  if (!supportsOffline()) {
    label.textContent = t('يتطلب العمل دون اتصال متصفحاً يدعم التخزين المحلي عبر HTTPS أو localhost.');
    value.textContent = '0%';
    fill.style.width = '0%';
    return;
  }

  button.disabled = true;
  label.textContent = t('جاري إعداد النسخة المحفوظة…');
  value.textContent = '0%';
  fill.style.width = '0%';
  try {
    const { total } = await cachePlatformOffline(({ completed, total: count }) => {
      const percent = count ? Math.round(completed / count * 100) : 0;
      label.textContent = t('جارِ حفظ صفحات وأصول المنصة…');
      value.textContent = `${percent}%`;
      fill.style.width = `${percent}%`;
    });
    label.textContent = t('اكتمل حفظ المنصة للعمل دون اتصال.');
    value.textContent = '100%';
    fill.style.width = '100%';
    if (description) description.textContent = `${t('اكتمل حفظ المنصة للعمل دون اتصال.')} (${total})`;
  } catch (error) {
    const message = error instanceof Error && error.message === 'PWA_UNSUPPORTED'
      ? 'يتطلب العمل دون اتصال متصفحاً يدعم التخزين المحلي عبر HTTPS أو localhost.'
      : 'تعذر إكمال التخزين المحلي. تحقق من الاتصال ثم حاول مرة أخرى.';
    label.textContent = t(message);
    if (description) description.textContent = t(message);
  } finally {
    button.disabled = false;
  }
}

async function submitFeedback(): Promise<void> {
  const profile = user(); const message = shell.content.querySelector<HTMLTextAreaElement>('#feedback-message'); const status = shell.content.querySelector<HTMLElement>('#feedback-status'); const button = shell.content.querySelector<HTMLButtonElement>('#submit-feedback');
  if (!profile || !message || !status || !button) return;
  if (!message.value.trim()) { status.textContent = 'اكتب رسالتك أولاً.'; status.dataset.kind = 'error'; message.focus(); return; }
  if (!feedbackRating) { status.textContent = 'اختر تقييماً بالنجوم قبل الإرسال.'; status.dataset.kind = 'error'; return; }
  button.disabled = true; status.textContent = 'جاري إرسال الفيدباك…'; status.dataset.kind = 'info';
  const payload = { fields: { name: { stringValue: profile.name }, email: { stringValue: profile.email }, type: { stringValue: feedbackKind }, rating: { integerValue: String(feedbackRating) }, message: { stringValue: message.value.trim() }, lang: { stringValue: language() }, createdAt: { timestampValue: new Date().toISOString() } } };
  try { const response = await fetch(FEEDBACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(); status.textContent = 'شكراً لك، تم إرسال رأيك بنجاح.'; status.dataset.kind = 'success'; message.value = ''; feedbackRating = 0; } catch { const local = JSON.parse(localStorage.getItem('arsenal_feedback_outbox') ?? '[]') as unknown[]; local.push({ ...payload, queuedAt: new Date().toISOString() }); localStorage.setItem('arsenal_feedback_outbox', JSON.stringify(local)); status.textContent = 'تعذر الاتصال بالخدمة؛ حُفظ رأيك محلياً على هذا الجهاز.'; status.dataset.kind = 'info'; } finally { button.disabled = false; }
}

function openPayment(plan: 'monthly' | 'yearly'): void {
  const profile = user(); if (!profile?.sub) { shell.setStatus('سجّل دخولك عبر Google أولاً قبل بدء الاشتراك.', 'error'); return; }
  currentPlan = plan; document.body.insertAdjacentHTML('beforeend', paymentModal());
  const modal = document.querySelector<HTMLElement>('#payment-modal')!; const info = modal.querySelector<HTMLElement>('#payment-info')!; const planName = plan === 'monthly' ? 'VIP شهري — 5$' : 'VIP سنوي — 50$'; info.innerHTML = `<b>${planName}</b><small>لن يتم إرسال أي طلب إلى مزود الدفع قبل ضغط زر التأكيد.</small>`; modal.hidden = false;
  modal.querySelectorAll<HTMLElement>('[data-close-payment]').forEach((button) => button.addEventListener('click', closePayment));
  modal.querySelector<HTMLButtonElement>('#payment-confirm')?.addEventListener('click', () => void createPayment(profile.sub!));
}
function closePayment(): void { if (paymentPoll) window.clearInterval(paymentPoll); document.querySelector('#payment-modal')?.remove(); }
async function createPayment(userId: string): Promise<void> {
  const modal = document.querySelector<HTMLElement>('#payment-modal'); const info = modal?.querySelector<HTMLElement>('#payment-info'); const button = modal?.querySelector<HTMLButtonElement>('#payment-confirm'); const status = modal?.querySelector<HTMLElement>('#payment-status'); if (!info || !button || !status) return;
  button.disabled = true; status.textContent = 'جاري إنشاء معلومات الدفع…';
  try { const response = await fetch(`${PAYMENT_WORKER}/create-payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: currentPlan, userId }) }); const data = await response.json() as { pay_address?: string; pay_amount?: string; message?: string }; if (!data.pay_address || !data.pay_amount) throw new Error(data.message ?? 'تعذر إنشاء طلب الدفع.'); info.innerHTML = `<small>عنوان الدفع — USDT BEP20</small><code>${escapeHtml(data.pay_address)}</code><b>${escapeHtml(data.pay_amount)} USDT</b><button id="copy-payment-address" class="settings-mini-button" type="button">${iconSvg('copy')} نسخ العنوان</button><p>تأكد من اختيار شبكة BSC (BEP20) فقط.</p>`; modal?.querySelector<HTMLButtonElement>('#copy-payment-address')?.addEventListener('click', async () => { await navigator.clipboard.writeText(data.pay_address!); status.textContent = 'تم نسخ عنوان الدفع.'; status.dataset.kind = 'success'; }); status.textContent = 'أُنشئت معلومات الدفع. سيجري فحص التفعيل تلقائياً.'; status.dataset.kind = 'info'; startPaymentPolling(userId); } catch (error) { status.textContent = error instanceof Error ? error.message : 'تعذر إنشاء معلومات الدفع.'; status.dataset.kind = 'error'; button.disabled = false; }
}
function startPaymentPolling(userId: string): void { if (paymentPoll) window.clearInterval(paymentPoll); let attempts = 0; paymentPoll = window.setInterval(async () => { attempts += 1; if (attempts > 36) { if (paymentPoll) window.clearInterval(paymentPoll); return; } try { const response = await fetch(`${PAYMENT_WORKER}/check-subscription?userId=${encodeURIComponent(userId)}`); const data = await response.json() as { active?: boolean; plan?: string; expiryDate?: string }; if (data.active) { localStorage.setItem('arsenal_sub_active', 'true'); localStorage.setItem('arsenal_sub_plan', data.plan ?? currentPlan); localStorage.setItem('arsenal_sub_expiry', data.expiryDate ?? ''); closePayment(); shell.setStatus('تم تفعيل اشتراكك بنجاح.', 'success'); render(); } } catch { /* تتابع المحاولة التالية ما دام الطلب مفتوحاً */ } }, 10_000); }
function escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character)); }

render();
