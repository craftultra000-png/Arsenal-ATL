import '@shared/ui/tool-shell.css';
import '@pages/home/styles.css';
import { iconSvg } from '@shared/ui/icons';
import { mountPlatformShell } from '@shared/ui/tool-shell';

const mount = document.querySelector<HTMLElement>('#app');
if (!mount) throw new Error('لم يتم العثور على نقطة تحميل الصفحة الرئيسية.');

mount.dataset.page = 'home';
const shell = mountPlatformShell(mount, undefined, 'الصفحة الرئيسية');
shell.content.classList.add('home-workspace');
shell.content.innerHTML = `
  <section class="arsenal-home" aria-labelledby="home-title">
    <div class="arsenal-home__hero">
      <h1 id="home-title" class="arsenal-home__wordmark wave-text">الترسانة</h1>
      <h3 class="arsenal-home__headline"><span class="wave-text">كل أدواتك في مكان واحد</span></h3>
      <p class="arsenal-home__lead">مجموعة أدوات احترافية تعمل مباشرة في متصفحك — بدون سيرفرات، بدون قيود، بخصوصية تامة وقوة هائلة.</p>
      <div class="arsenal-home__actions">
        <button id="home-browse-tools" class="arsenal-home__cta" type="button">${iconSvg('qr', 'arsenal-home__cta-icon')}<span>استعرض الأدوات</span></button>
        <a class="arsenal-home__guide" href="/guide/">${iconSvg('file', 'arsenal-home__guide-icon')}<span>دليل الأدوات</span></a>
      </div>
    </div>
    <section class="arsenal-home__features" aria-label="مزايا الترسانة">
      <article class="arsenal-home__feature">
        <span class="arsenal-home__feature-icon is-gold">${iconSvg('settings')}</span>
        <h2>فورية 100%</h2>
        <p>الأدوات تعمل محلياً في متصفحك بمعالجة فورية لا تعتمد على سرعة الإنترنت.</p>
      </article>
      <article class="arsenal-home__feature">
        <span class="arsenal-home__feature-icon is-mint">${iconSvg('lock')}</span>
        <h2>خصوصية تامة</h2>
        <p>ملفاتك لا تغادر جهازك أبداً؛ خصوصيتك خط أحمر.</p>
      </article>
      <article class="arsenal-home__feature">
        <span class="arsenal-home__feature-icon is-slate">${iconSvg('archive')}</span>
        <h2>أدوات متكاملة</h2>
        <p>فيديو، صوت، صور، PDF، ونصوص. كل ما تحتاجه لإنجاز عملك الاحترافي.</p>
      </article>
    </section>
  </section>
  <footer class="arsenal-home__footer"><div><i></i><span>ARSENAL · <b>ثقتكم وجودنا</b></span></div><p>جميع الأدوات تعمل محلياً — © 2026</p></footer>
`;

shell.content.querySelector<HTMLButtonElement>('#home-browse-tools')?.addEventListener('click', () => shell.openMenu());
