export type SeoPageKind = 'home' | 'guide' | 'settings' | 'tool';

export interface SeoPage {
  path: string;
  name: string;
  title: string;
  description: string;
  kind: SeoPageKind;
  applicationCategory?: 'MultimediaApplication' | 'UtilitiesApplication' | 'BusinessApplication';
  noIndex?: boolean;
}

export const SEO_LAST_MODIFIED = '2026-08-27';
export const SEO_SITE_ORIGIN = 'https://arsenal-atl.pages.dev';
export const SEO_IMAGE_PATH = '/assets/arsenal-reference-logo.png';

export const SEO_PAGES: readonly SeoPage[] = [
  {
    path: '/',
    name: 'Arsenal ATL',
    title: 'Arsenal | 18 أداة رقمية تعمل محلياً في متصفحك',
    description: 'Arsenal منصة تضم 18 أداة للفيديو والصوت والصور وPDF والنصوص. عالج ملفاتك وأنشئ GIF وQR محلياً من دون رفعها إلى خادم.',
    kind: 'home'
  },
  {
    path: '/guide/',
    name: 'دليل أدوات Arsenal',
    title: 'دليل أدوات Arsenal | 18 أداة للوسائط وPDF والنصوص',
    description: 'تعرّف إلى أدوات Arsenal للفيديو والصوت والصور وPDF والنصوص، واختر الأداة المناسبة لمعالجة ملفاتك محلياً داخل المتصفح.',
    kind: 'guide'
  },
  {
    path: '/settings/',
    name: 'إعدادات Arsenal',
    title: 'إعدادات Arsenal | اللغة والمظهر والعمل دون اتصال',
    description: 'إعدادات Arsenal للغة والمظهر والتنبيهات والاستخدام دون اتصال والخصوصية.',
    kind: 'settings',
    noIndex: true
  },
  {
    path: '/tools/video-editor/',
    name: 'منشئ GIF',
    title: 'منشئ GIF من الفيديو محلياً | Arsenal ATL',
    description: 'حوّل مقطع فيديو إلى GIF داخل المتصفح: اختر بداية ونهاية المقطع واضبط FPS والأبعاد، ثم نزّل GIF من دون رفع الفيديو إلى خادم.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/video-compressor/',
    name: 'ضاغط الفيديو',
    title: 'ضاغط فيديو محلياً مع ضبط الجودة والدقة | Arsenal ATL',
    description: 'اضغط ملفات الفيديو داخل المتصفح مع التحكم في الدقة والجودة والأداء، ثم نزّل النتيجة مع بقاء ملفك على جهازك.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/video-to-audio/',
    name: 'فيديو إلى صوت',
    title: 'تحويل الفيديو إلى صوت محلياً | Arsenal ATL',
    description: 'استخرج المسار الصوتي من فيديو داخل المتصفح واختر صيغة التصدير المناسبة، من دون رفع ملف الفيديو إلى خادم.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/audio-converter/',
    name: 'محول الصوت',
    title: 'محول صيغ الصوت محلياً | Arsenal ATL',
    description: 'حوّل ملفات الصوت بين الصيغ المدعومة محلياً داخل المتصفح، مع تنزيل الملف الناتج وحماية خصوصية ملفاتك.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/noise-remover/',
    name: 'مزيل الضوضاء',
    title: 'مزيل ضوضاء الصوت بالذكاء الاصطناعي | Arsenal ATL',
    description: 'نقِّ التسجيلات الصوتية من الضوضاء داخل المتصفح باستخدام المعالجة المحلية، ثم استمع إلى النتيجة ونزّلها.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/audio-rate/',
    name: 'تغيير سرعة الصوت',
    title: 'تغيير سرعة الصوت محلياً | Arsenal ATL',
    description: 'سرّع ملفاً صوتياً أو أبطئه داخل المتصفح واستمع إلى المعاينة قبل تنزيل نسخة جديدة من الملف.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/image-editor/',
    name: 'محرر الصور',
    title: 'محرر صور محلي داخل المتصفح | Arsenal ATL',
    description: 'حرر الصور محلياً عبر أدوات القص والضبط والألوان وغيرها، ثم صدّر الصورة الناتجة من جهازك.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/background-remover/',
    name: 'مزيل الخلفية',
    title: 'إزالة خلفية الصور محلياً | Arsenal ATL',
    description: 'اعزل خلفية الصورة داخل المتصفح وأنشئ نسخة PNG بخلفية شفافة، مع معالجة محلية تحافظ على ملفك على جهازك.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/image-compressor/',
    name: 'ضاغط الصور',
    title: 'ضاغط صور محلي مع تنزيل ZIP | Arsenal ATL',
    description: 'اضغط عدة صور داخل المتصفح ووازن بين الحجم والجودة، ثم نزّل الصور الناتجة أو ملف ZIP محلياً.',
    kind: 'tool',
    applicationCategory: 'MultimediaApplication'
  },
  {
    path: '/tools/pdf-create/',
    name: 'إنشاء PDF',
    title: 'إنشاء PDF محلياً داخل المتصفح | Arsenal ATL',
    description: 'أنشئ مستند PDF من النصوص والعناصر داخل المتصفح ثم نزّل المستند الناتج من دون رفع المحتوى إلى خادم.',
    kind: 'tool',
    applicationCategory: 'BusinessApplication'
  },
  {
    path: '/tools/pdf-compressor/',
    name: 'ضاغط PDF',
    title: 'ضاغط PDF محلياً لتقليل حجم الملف | Arsenal ATL',
    description: 'قلّل حجم مستند PDF داخل المتصفح مع الحفاظ على نسخة قابلة للتنزيل ومعالجة الملف محلياً على جهازك.',
    kind: 'tool',
    applicationCategory: 'BusinessApplication'
  },
  {
    path: '/tools/pdf-editor/',
    name: 'محرر PDF',
    title: 'محرر PDF محلي للعرض والتعديل | Arsenal ATL',
    description: 'افتح مستند PDF واستعرض صفحاته وعدّلها داخل المتصفح، ثم احفظ نسخة جديدة محلياً.',
    kind: 'tool',
    applicationCategory: 'BusinessApplication'
  },
  {
    path: '/tools/text-encryption/',
    name: 'تشفير النصوص',
    title: 'تشفير وفك تشفير النصوص محلياً | Arsenal ATL',
    description: 'شفّر النصوص أو فك تشفيرها محلياً داخل المتصفح، مع إنشاء مفتاح وحفظ بياناتك النصية على جهازك.',
    kind: 'tool',
    applicationCategory: 'UtilitiesApplication'
  },
  {
    path: '/tools/text-filter/',
    name: 'مصفاة النصوص',
    title: 'تنسيق وتنظيف وترميز النصوص محلياً | Arsenal ATL',
    description: 'نظّف النصوص واستخرج البيانات ونسّق المحتوى وحوّله أو رمّزه داخل المتصفح.',
    kind: 'tool',
    applicationCategory: 'UtilitiesApplication'
  },
  {
    path: '/tools/text-comparison/',
    name: 'مقارنة النصوص',
    title: 'مقارنة نصين وإظهار الفروقات محلياً | Arsenal ATL',
    description: 'قارن بين نصين داخل المتصفح وشاهد الأسطر المضافة والمحذوفة والفروقات بوضوح من دون إرسال المحتوى إلى خادم.',
    kind: 'tool',
    applicationCategory: 'UtilitiesApplication'
  },
  {
    path: '/tools/qr-generator/',
    name: 'مولد وقارئ QR',
    title: 'مولد وقارئ QR محلياً | Arsenal ATL',
    description: 'أنشئ رمز QR لرابط أو نص ثم نزّله كصورة PNG، أو اقرأ رمز QR من صورة محلياً داخل المتصفح.',
    kind: 'tool',
    applicationCategory: 'UtilitiesApplication'
  },
  {
    path: '/tools/archive-encryption/',
    name: 'الأرشفة والتشفير',
    title: 'إنشاء أرشيف ZIP وتشفيره محلياً | Arsenal ATL',
    description: 'اجمع الملفات في أرشيف ZIP واضبط مستوى الضغط أو الحماية داخل المتصفح، ثم نزّل الأرشيف الناتج محلياً.',
    kind: 'tool',
    applicationCategory: 'UtilitiesApplication'
  },
  {
    path: '/tools/local-share/',
    name: 'المشاركة المحلية',
    title: 'مشاركة الملفات على الشبكة المحلية | Arsenal ATL',
    description: 'شارك الملفات بين الأجهزة القريبة على الشبكة المحلية من خلال المتصفح، مع إبقاء النقل ضمن بيئتك المحلية.',
    kind: 'tool',
    applicationCategory: 'UtilitiesApplication'
  }
] as const;

export const SEO_BY_PATH: ReadonlyMap<string, SeoPage> = new Map(SEO_PAGES.map((page) => [page.path, page]));
export const INDEXABLE_SEO_PAGES: readonly SeoPage[] = SEO_PAGES.filter((page) => !page.noIndex);
