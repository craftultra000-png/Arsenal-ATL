import '@shared/ui/tool-shell.css';
import '@pages/guide/styles.css';
import { TOOLS } from '@shared/tools';
import { iconSvg } from '@shared/ui/icons';
import { mountPlatformShell } from '@shared/ui/tool-shell';
import { localizeToolText, t } from '@shared/i18n';
import type { ToolDefinition } from '@shared/types/tool';

const mount = document.querySelector<HTMLElement>('#app');
if (!mount) throw new Error('لم يتم العثور على نقطة تحميل دليل الأدوات.');

const categoryLabel: Record<ToolDefinition['category'], string> = {
  video: 'فيديو', audio: 'صوت', image: 'صور', pdf: 'مستندات', text: 'نصوص', utility: 'متنوعة'
};
const quickStep: Record<ToolDefinition['category'], string> = {
  video: 'أضف الفيديو، اضبط الإعدادات، ثم صدّر النتيجة.',
  audio: 'أضف الملف الصوتي، اختر المعالجة، ثم احفظ الناتج.',
  image: 'ارفع الصورة، عدّل أو عالجها، ثم نزّل النسخة النهائية.',
  pdf: 'اختر المستند أو الملفات، رتّب الإعدادات، ثم صدّر الملف.',
  text: 'أدخل النص، اختر العملية، وانسخ أو نزّل النتيجة.',
  utility: 'أدخل المحتوى أو الملفات، أكمل الإجراء، ثم شارك النتيجة.'
};

mount.dataset.page = 'guide';
document.title = `${t('دليل الأدوات')} | Arsenal ATL`;
const shell = mountPlatformShell(mount, undefined, t('دليل الأدوات'));
shell.content.classList.add('guide-workspace');
shell.content.innerHTML = `
  <section class="arsenal-guide" aria-labelledby="guide-title">
    <header class="arsenal-guide__hero">
      <p class="arsenal-guide__eyebrow">${iconSvg('file')} ${t('دليل الأدوات المستقلة')}</p>
      <h1 id="guide-title">${t('كل أداة في صفحة مستقلة، وكل مهمة بخطوات واضحة.')}</h1>
      <p>${t('اختر أداتك مباشرة. تعمل المعالجة داخل المتصفح مع الحفاظ على الخصوصية، وتبقى كل صفحة قابلة للوصول والاختبار دون طبقات تشغيل وسيطة.')}</p>
    </header>
    <div class="arsenal-guide__grid">
      ${TOOLS.map((tool) => guideCard(tool)).join('')}
    </div>
    <footer class="arsenal-guide__footer">${t('ابدأ من الأداة التي تحتاجها؛')} <b>${t('الملفات لا تغادر جهازك')}</b> ${t('إلا إذا اخترت أنت خلاف ذلك.')}</footer>
  </section>
`;

function guideCard(tool: ToolDefinition): string {
  return `<a class="guide-tool-card" href="/tools/${tool.slug}/" style="--tool-accent:${tool.accent}">
    <div class="guide-tool-card__top"><span class="guide-tool-card__icon" aria-hidden="true">${iconSvg(tool.icon)}</span><span class="guide-tool-card__category">${t(categoryLabel[tool.category])}</span></div>
    <div class="guide-tool-card__content">
      <h2>${localizeToolText(tool.title)}</h2>
      <p class="guide-tool-card__description">${localizeToolText(tool.description)}</p>
      <div class="guide-tool-card__facts"><span>${t('محلي في المتصفح')}</span><span>${t('رابط مباشر')}</span></div>
      <p class="guide-tool-card__step"><b>${t('استخدام سريع:')}</b> ${t(quickStep[tool.category])}</p>
    </div>
    <span class="guide-tool-card__footer"><b>${t('فتح الأداة')}</b>${iconSvg('arrow-left', 'guide-tool-card__arrow')}</span>
  </a>`;
}
