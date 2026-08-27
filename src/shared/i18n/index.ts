import generatedCatalog from './catalog.generated.json';
import extraGeneratedCatalog from './catalog.extra.generated.json';
import reviewedLegalCatalog from './reviewed-legal.generated.json';
import { reviewedToolText } from './reviewed-tools';
import { reviewedGuideText } from './reviewed-guide';
import { reviewedSettingsText } from './reviewed-settings';
import { reviewedSettingsInteractionText } from './reviewed-settings-interactions';
import { reviewedGifText } from './reviewed-gif';
import { reviewedVideoCompressorText } from './reviewed-video-compressor';
import { reviewedVideoToAudioText } from './reviewed-video-to-audio';
import { reviewedAudioConverterText } from './reviewed-audio-converter';
import { reviewedNoiseRemoverText } from './reviewed-noise-remover';
import { reviewedAudioRateText } from './reviewed-audio-rate';
import { reviewedImageEditorText } from './reviewed-image-editor';
import { reviewedBackgroundRemoverText } from './reviewed-background-remover';
import { reviewedImageCompressorText } from './reviewed-image-compressor';
import { reviewedPdfCreateText } from './reviewed-pdf-create';
import { reviewedPdfCompressorText } from './reviewed-pdf-compressor';
import { reviewedPdfEditorText } from './reviewed-pdf-editor';
import { reviewedTextEncryptionText } from './reviewed-text-encryption';
import { reviewedTextFilterText } from './reviewed-text-filter';
import { reviewedTextComparisonText } from './reviewed-text-comparison';
import { reviewedQrGeneratorText } from './reviewed-qr-generator';
import { reviewedArchiveEncryptionText } from './reviewed-archive-encryption';
import { reviewedLocalShareText } from './reviewed-local-share';

export const LOCALES = ['ar', 'en', 'es', 'fr', 'de', 'tr', 'ru', 'hi', 'zh'] as const;
export type Locale = typeof LOCALES[number];
export type TextDirection = 'rtl' | 'ltr';

type LocaleMeta = {
  label: string;
  nativeLabel: string;
  direction: TextDirection;
};

type TranslationRow = Partial<Record<Locale, string>>;
type GeneratedCatalog = { translations: Record<string, TranslationRow> };
type TranslationVariables = Record<string, string | number>;

const storageKey = 'arsenal_lang';
const fallbackLocale: Locale = 'ar';
const catalog = generatedCatalog as GeneratedCatalog;
const extraCatalog = extraGeneratedCatalog as GeneratedCatalog;
const legalCatalog = reviewedLegalCatalog as GeneratedCatalog;

/** أسماء اللغات التي تظهر للمستخدم؛ تبقى مكتوبة بلغتها الأم لتسهيل الاختيار. */
export const localeMeta: Record<Locale, LocaleMeta> = {
  ar: { label: 'العربية', nativeLabel: 'العربية', direction: 'rtl' },
  en: { label: 'English', nativeLabel: 'English', direction: 'ltr' },
  es: { label: 'Spanish', nativeLabel: 'Español', direction: 'ltr' },
  fr: { label: 'French', nativeLabel: 'Français', direction: 'ltr' },
  de: { label: 'German', nativeLabel: 'Deutsch', direction: 'ltr' },
  tr: { label: 'Turkish', nativeLabel: 'Türkçe', direction: 'ltr' },
  ru: { label: 'Russian', nativeLabel: 'Русский', direction: 'ltr' },
  hi: { label: 'Hindi', nativeLabel: 'हिन्दी', direction: 'ltr' },
  zh: { label: 'Chinese', nativeLabel: '中文', direction: 'ltr' }
};

/**
 * مراجعات يدوية للنصوص ذات الظهور العالي. يُستخدم القاموس المحلي الموسّع
 * فقط كاحتياط للعبارات الأقل تكراراً، ولا يوجد مترجم شبكي في وقت التشغيل.
 */
const reviewed: Record<string, TranslationRow> = {
  'الترسانة': { en: 'Arsenal', es: 'Arsenal', fr: 'Arsenal', de: 'Arsenal', tr: 'Arsenal', ru: 'Арсенал', hi: 'आर्सेनल', zh: 'Arsenal' },
  'العودة إلى الرئيسية': { en: 'Back to home', es: 'Volver al inicio', fr: "Retour à l’accueil", de: 'Zur Startseite', tr: 'Ana sayfaya dön', ru: 'На главную', hi: 'होम पर वापस जाएँ', zh: '返回首页' },
  'ابحث عن أداة': { en: 'Search for a tool', es: 'Buscar una herramienta', fr: 'Rechercher un outil', de: 'Nach einem Tool suchen', tr: 'Araç ara', ru: 'Найти инструмент', hi: 'टूल खोजें', zh: '搜索工具' },
  'ابحث عن أداة…': { en: 'Search for a tool…', es: 'Buscar una herramienta…', fr: 'Rechercher un outil…', de: 'Nach einem Tool suchen…', tr: 'Araç ara…', ru: 'Найти инструмент…', hi: 'टूल खोजें…', zh: '搜索工具…' },
  'تبديل المظهر': { en: 'Toggle theme', es: 'Cambiar tema', fr: 'Changer le thème', de: 'Erscheinungsbild wechseln', tr: 'Temayı değiştir', ru: 'Сменить тему', hi: 'थीम बदलें', zh: '切换主题' },
  'فتح القائمة': { en: 'Open menu', es: 'Abrir menú', fr: 'Ouvrir le menu', de: 'Menü öffnen', tr: 'Menüyü aç', ru: 'Открыть меню', hi: 'मेनू खोलें', zh: '打开菜单' },
  'إغلاق القائمة': { en: 'Close menu', es: 'Cerrar menú', fr: 'Fermer le menu', de: 'Menü schließen', tr: 'Menüyü kapat', ru: 'Закрыть меню', hi: 'मेनू बंद करें', zh: '关闭菜单' },
  'قائمة الأدوات': { en: 'Tools menu', es: 'Menú de herramientas', fr: 'Menu des outils', de: 'Werkzeugmenü', tr: 'Araçlar menüsü', ru: 'Меню инструментов', hi: 'टूल मेनू', zh: '工具菜单' },
  'التنقل': { en: 'Navigation', es: 'Navegación', fr: 'Navigation', de: 'Navigation', tr: 'Gezinme', ru: 'Навигация', hi: 'नेविगेशन', zh: '导航' },
  'الرئيسية': { en: 'Home', es: 'Inicio', fr: 'Accueil', de: 'Startseite', tr: 'Ana sayfa', ru: 'Главная', hi: 'होम', zh: '首页' },
  'دليل الأدوات': { en: 'Tools guide', es: 'Guía de herramientas', fr: 'Guide des outils', de: 'Tool-Leitfaden', tr: 'Araç rehberi', ru: 'Гид по инструментам', hi: 'टूल गाइड', zh: '工具指南' },
  'ترسانة الأدوات': { en: 'Arsenal tools', es: 'Herramientas de Arsenal', fr: 'Outils Arsenal', de: 'Arsenal-Tools', tr: 'Arsenal araçları', ru: 'Инструменты Arsenal', hi: 'Arsenal टूल', zh: 'Arsenal 工具' },
  'الإعدادات': { en: 'Settings', es: 'Configuración', fr: 'Paramètres', de: 'Einstellungen', tr: 'Ayarlar', ru: 'Настройки', hi: 'सेटिंग्स', zh: '设置' },
  'لا توجد أداة مطابقة. جرّب كلمة أخرى.': { en: 'No matching tool. Try another term.', es: 'No hay herramientas coincidentes. Prueba con otro término.', fr: 'Aucun outil correspondant. Essayez un autre terme.', de: 'Kein passendes Tool. Versuchen Sie einen anderen Begriff.', tr: 'Eşleşen araç yok. Başka bir terim deneyin.', ru: 'Подходящий инструмент не найден. Попробуйте другой запрос.', hi: 'कोई मिलान करने वाला टूल नहीं मिला। कोई अन्य शब्द आज़माएँ।', zh: '未找到匹配工具。请尝试其他关键词。' },
  'أدوات الفيديو': { en: 'Video tools', es: 'Herramientas de vídeo', fr: 'Outils vidéo', de: 'Video-Tools', tr: 'Video araçları', ru: 'Видеоинструменты', hi: 'वीडियो टूल', zh: '视频工具' },
  'أدوات الصوت': { en: 'Audio tools', es: 'Herramientas de audio', fr: 'Outils audio', de: 'Audio-Tools', tr: 'Ses araçları', ru: 'Аудиоинструменты', hi: 'ऑडियो टूल', zh: '音频工具' },
  'أدوات الصور': { en: 'Image tools', es: 'Herramientas de imagen', fr: 'Outils d’image', de: 'Bild-Tools', tr: 'Görsel araçları', ru: 'Инструменты изображений', hi: 'इमेज टूल', zh: '图像工具' },
  'أدوات الـ PDF': { en: 'PDF tools', es: 'Herramientas PDF', fr: 'Outils PDF', de: 'PDF-Tools', tr: 'PDF araçları', ru: 'Инструменты PDF', hi: 'PDF टूल', zh: 'PDF 工具' },
  'أدوات النصوص': { en: 'Text tools', es: 'Herramientas de texto', fr: 'Outils de texte', de: 'Text-Tools', tr: 'Metin araçları', ru: 'Текстовые инструменты', hi: 'टेक्स्ट टूल', zh: '文本工具' },
  'مكتبة متعددة الأدوات': { en: 'Multi-tool library', es: 'Biblioteca multi-herramienta', fr: 'Bibliothèque multi-outils', de: 'Multitool-Bibliothek', tr: 'Çok amaçlı araç kütüphanesi', ru: 'Библиотека мультиинструментов', hi: 'मल्टी-टूल लाइब्रेरी', zh: '多功能工具库' },
  'كل أدواتك في مكان واحد': { en: 'All your tools in one place', es: 'Todas tus herramientas en un solo lugar', fr: 'Tous vos outils au même endroit', de: 'Alle deine Tools an einem Ort', tr: 'Tüm araçlarınız tek yerde', ru: 'Все ваши инструменты в одном месте', hi: 'आपके सभी टूल एक ही जगह', zh: '所有工具，尽在一处' },
  'Arsenal | أدواتك الرقمية في مكان واحد': { en: 'Arsenal | Your digital tools in one place', es: 'Arsenal | Tus herramientas digitales en un solo lugar', fr: 'Arsenal | Vos outils numériques au même endroit', de: 'Arsenal | Deine digitalen Tools an einem Ort', tr: 'Arsenal | Dijital araçlarınız tek yerde', ru: 'Arsenal | Ваши цифровые инструменты в одном месте', hi: 'Arsenal | आपके डिजिटल टूल एक ही जगह', zh: 'Arsenal | 您的一站式数字工具' },
  'الصفحة الرئيسية': { en: 'Home page', es: 'Página de inicio', fr: "Page d’accueil", de: 'Startseite', tr: 'Ana sayfa', ru: 'Главная страница', hi: 'होम पेज', zh: '首页' },
  'مجموعة أدوات احترافية تعمل مباشرة في متصفحك — بدون سيرفرات، بدون قيود، بخصوصية تامة وقوة هائلة.': { en: 'A professional toolkit that runs directly in your browser — no servers, no limits, complete privacy, and real power.', es: 'Un conjunto de herramientas profesional que funciona directamente en tu navegador: sin servidores, sin límites y con privacidad total.', fr: 'Une suite d’outils professionnelle qui fonctionne directement dans votre navigateur — sans serveur, sans limite et avec une confidentialité totale.', de: 'Ein professionelles Toolkit, das direkt in deinem Browser läuft — ohne Server, ohne Grenzen und mit vollständiger Privatsphäre.', tr: 'Doğrudan tarayıcınızda çalışan profesyonel bir araç seti — sunucu yok, sınır yok, tam gizlilik ve gerçek güç.', ru: 'Профессиональный набор инструментов, работающий прямо в браузере: без серверов, без ограничений и с полной конфиденциальностью.', hi: 'एक पेशेवर टूलकिट जो सीधे आपके ब्राउज़र में चलता है — बिना सर्वर, बिना सीमा और पूरी गोपनीयता के साथ।', zh: '专业工具集直接在浏览器中运行——无需服务器、没有限制，并提供完整隐私保护。' },
  'استعرض الأدوات': { en: 'Explore tools', es: 'Explorar herramientas', fr: 'Découvrir les outils', de: 'Tools entdecken', tr: 'Araçları keşfet', ru: 'Открыть инструменты', hi: 'टूल एक्सप्लोर करें', zh: '探索工具' },
  'مزايا الترسانة': { en: 'Arsenal advantages', es: 'Ventajas de Arsenal', fr: 'Atouts d’Arsenal', de: 'Vorteile von Arsenal', tr: 'Arsenal avantajları', ru: 'Преимущества Arsenal', hi: 'Arsenal के लाभ', zh: 'Arsenal 优势' },
  'فورية 100%': { en: '100% instant', es: '100 % instantáneo', fr: '100 % instantané', de: '100 % sofort', tr: '%100 anında', ru: '100 % мгновенно', hi: '100% तुरंत', zh: '100% 即时' },
  'الأدوات تعمل محلياً في متصفحك بمعالجة فورية لا تعتمد على سرعة الإنترنت.': { en: 'Tools run locally in your browser with instant processing that does not depend on internet speed.', es: 'Las herramientas se ejecutan localmente en tu navegador con procesamiento instantáneo que no depende de la velocidad de internet.', fr: 'Les outils s’exécutent localement dans votre navigateur, avec un traitement instantané qui ne dépend pas de la vitesse de connexion.', de: 'Die Tools laufen lokal in deinem Browser und verarbeiten Inhalte sofort, unabhängig von der Internetgeschwindigkeit.', tr: 'Araçlar tarayıcınızda yerel olarak çalışır; anlık işleme internet hızına bağlı değildir.', ru: 'Инструменты работают локально в браузере, а мгновенная обработка не зависит от скорости интернета.', hi: 'टूल आपके ब्राउज़र में स्थानीय रूप से चलते हैं और उनकी तुरंत प्रोसेसिंग इंटरनेट की गति पर निर्भर नहीं करती।', zh: '工具在您的浏览器中本地运行，即时处理不依赖网络速度。' },
  'خصوصية تامة': { en: 'Total privacy', es: 'Privacidad total', fr: 'Confidentialité totale', de: 'Vollständige Privatsphäre', tr: 'Tam gizlilik', ru: 'Полная конфиденциальность', hi: 'पूर्ण गोपनीयता', zh: '完整隐私' },
  'ملفاتك لا تغادر جهازك أبداً؛ خصوصيتك خط أحمر.': { en: 'Your files never leave your device; your privacy is non-negotiable.', es: 'Tus archivos nunca salen de tu dispositivo; tu privacidad no se negocia.', fr: 'Vos fichiers ne quittent jamais votre appareil ; votre confidentialité est non négociable.', de: 'Deine Dateien verlassen dein Gerät nie; deine Privatsphäre ist nicht verhandelbar.', tr: 'Dosyalarınız cihazınızdan asla ayrılmaz; gizliliğiniz tartışılmazdır.', ru: 'Ваши файлы никогда не покидают устройство; конфиденциальность для нас принципиальна.', hi: 'आपकी फ़ाइलें कभी आपके डिवाइस से बाहर नहीं जातीं; आपकी गोपनीयता से कोई समझौता नहीं होता।', zh: '您的文件永不离开设备；您的隐私不容妥协。' },
  'أدوات متكاملة': { en: 'Integrated tools', es: 'Herramientas integradas', fr: 'Outils intégrés', de: 'Integrierte Tools', tr: 'Entegre araçlar', ru: 'Интегрированные инструменты', hi: 'एकीकृत टूल', zh: '一体化工具' },
  'فيديو، صوت، صور، PDF، ونصوص. كل ما تحتاجه لإنجاز عملك الاحترافي.': { en: 'Video, audio, images, PDF, and text. Everything you need for professional work.', es: 'Vídeo, audio, imágenes, PDF y texto. Todo lo que necesitas para trabajar de forma profesional.', fr: 'Vidéo, audio, images, PDF et texte. Tout ce dont vous avez besoin pour un travail professionnel.', de: 'Video, Audio, Bilder, PDF und Text. Alles, was du für professionelle Arbeit brauchst.', tr: 'Video, ses, görseller, PDF ve metin. Profesyonel iş için ihtiyacınız olan her şey.', ru: 'Видео, аудио, изображения, PDF и текст. Всё для профессиональной работы.', hi: 'वीडियो, ऑडियो, इमेज, PDF और टेक्स्ट। पेशेवर काम के लिए आपकी हर ज़रूरत।', zh: '视频、音频、图像、PDF 和文本。专业工作所需的一切。' },
  'ثقتكم وجودنا': { en: 'Your trust is our purpose', es: 'Tu confianza es nuestro propósito', fr: 'Votre confiance est notre raison d’être', de: 'Dein Vertrauen ist unser Antrieb', tr: 'Güveniniz varlık sebebimizdir', ru: 'Ваше доверие — наша цель', hi: 'आपका भरोसा हमारा उद्देश्य है', zh: '您的信任是我们的使命' },
  'جميع الأدوات تعمل محلياً — © 2026': { en: 'All tools run locally — © 2026', es: 'Todas las herramientas funcionan localmente — © 2026', fr: 'Tous les outils fonctionnent localement — © 2026', de: 'Alle Tools laufen lokal — © 2026', tr: 'Tüm araçlar yerel olarak çalışır — © 2026', ru: 'Все инструменты работают локально — © 2026', hi: 'सभी टूल स्थानीय रूप से चलते हैं — © 2026', zh: '所有工具均在本地运行 — © 2026' },
  'منشئ GIF': { en: 'GIF Maker', es: 'Creador de GIF', fr: 'Créateur de GIF', de: 'GIF-Ersteller', tr: 'GIF Oluşturucu', ru: 'Создатель GIF', hi: 'GIF निर्माता', zh: 'GIF 制作器' },
  'ضاغط الفيديو': { en: 'Video Compressor', es: 'Compresor de vídeo', fr: 'Compresseur vidéo', de: 'Videokompressor', tr: 'Video Sıkıştırıcı', ru: 'Сжатие видео', hi: 'वीडियो कंप्रेसर', zh: '视频压缩器' },
  'فيديو إلى صوت': { en: 'Video to Audio', es: 'Vídeo a audio', fr: 'Vidéo en audio', de: 'Video in Audio', tr: 'Videodan Sese', ru: 'Видео в аудио', hi: 'वीडियो से ऑडियो', zh: '视频转音频' },
  'محول الصوت': { en: 'Audio Converter', es: 'Convertidor de audio', fr: 'Convertisseur audio', de: 'Audiokonverter', tr: 'Ses Dönüştürücü', ru: 'Аудиоконвертер', hi: 'ऑडियो कनवर्टर', zh: '音频转换器' },
  'مزيل الضوضاء': { en: 'Noise Remover', es: 'Eliminador de ruido', fr: 'Suppresseur de bruit', de: 'Rauschunterdrückung', tr: 'Gürültü Giderici', ru: 'Удаление шума', hi: 'शोर हटाने वाला', zh: '降噪工具' },
  'معدل الصوت': { en: 'Audio Speed', es: 'Velocidad de audio', fr: 'Vitesse audio', de: 'Audiogeschwindigkeit', tr: 'Ses Hızı', ru: 'Скорость аудио', hi: 'ऑडियो गति', zh: '音频速度' },
  'محرر الصور': { en: 'Image Editor', es: 'Editor de imágenes', fr: 'Éditeur d’images', de: 'Bildeditor', tr: 'Görsel Düzenleyici', ru: 'Редактор изображений', hi: 'इमेज एडिटर', zh: '图像编辑器' },
  'مزيل الخلفية': { en: 'Background Remover', es: 'Eliminador de fondo', fr: 'Suppresseur d’arrière-plan', de: 'Hintergrundentferner', tr: 'Arka Plan Silici', ru: 'Удаление фона', hi: 'बैकग्राउंड रिमूवर', zh: '背景移除器' },
  'ضاغط الصور': { en: 'Image Compressor', es: 'Compresor de imágenes', fr: 'Compresseur d’images', de: 'Bildkompressor', tr: 'Görsel Sıkıştırıcı', ru: 'Сжатие изображений', hi: 'इमेज कंप्रेसर', zh: '图像压缩器' },
  'إنشاء PDF': { en: 'Create PDF', es: 'Crear PDF', fr: 'Créer un PDF', de: 'PDF erstellen', tr: 'PDF Oluştur', ru: 'Создать PDF', hi: 'PDF बनाएँ', zh: '创建 PDF' },
  'ضاغط PDF': { en: 'PDF Compressor', es: 'Compresor PDF', fr: 'Compresseur PDF', de: 'PDF-Kompressor', tr: 'PDF Sıkıştırıcı', ru: 'Сжатие PDF', hi: 'PDF कंप्रेसर', zh: 'PDF 压缩器' },
  'محرر PDF': { en: 'PDF Editor', es: 'Editor PDF', fr: 'Éditeur PDF', de: 'PDF-Editor', tr: 'PDF Düzenleyici', ru: 'Редактор PDF', hi: 'PDF एडिटर', zh: 'PDF 编辑器' },
  'تشفير النصوص': { en: 'Text Encryption', es: 'Cifrado de texto', fr: 'Chiffrement de texte', de: 'Textverschlüsselung', tr: 'Metin Şifreleme', ru: 'Шифрование текста', hi: 'टेक्स्ट एन्क्रिप्शन', zh: '文本加密' },
  'مِصفاة النصوص': { en: 'Text Filter', es: 'Filtro de texto', fr: 'Filtre de texte', de: 'Textfilter', tr: 'Metin Filtresi', ru: 'Текстовый фильтр', hi: 'टेक्स्ट फ़िल्टर', zh: '文本筛选器' },
  'مقارنة النصوص': { en: 'Text Comparison', es: 'Comparación de textos', fr: 'Comparaison de textes', de: 'Textvergleich', tr: 'Metin Karşılaştırma', ru: 'Сравнение текстов', hi: 'टेक्स्ट तुलना', zh: '文本比较' },
  'مولد QR': { en: 'QR Generator', es: 'Generador QR', fr: 'Générateur de QR', de: 'QR-Generator', tr: 'QR Oluşturucu', ru: 'Генератор QR', hi: 'QR जनरेटर', zh: '二维码生成器' },
  'الأرشفة والتشفير': { en: 'Archive & Encrypt', es: 'Archivar y cifrar', fr: 'Archiver et chiffrer', de: 'Archivieren und verschlüsseln', tr: 'Arşivle ve Şifrele', ru: 'Архивировать и шифровать', hi: 'संग्रह और एन्क्रिप्ट', zh: '归档与加密' },
  'المشاركة المحلية': { en: 'Local Sharing', es: 'Compartir localmente', fr: 'Partage local', de: 'Lokales Teilen', tr: 'Yerel Paylaşım', ru: 'Локальный обмен', hi: 'लोकल शेयरिंग', zh: '本地共享' },
  'سياسة الخصوصية': { en: 'Privacy Policy', es: 'Política de privacidad', fr: 'Politique de confidentialité', de: 'Datenschutzerklärung', tr: 'Gizlilik Politikası', ru: 'Политика конфиденциальности', hi: 'गोपनीयता नीति', zh: '隐私政策' },
  'شروط الاستخدام': { en: 'Terms of Use', es: 'Términos de uso', fr: 'Conditions d’utilisation', de: 'Nutzungsbedingungen', tr: 'Kullanım Koşulları', ru: 'Условия использования', hi: 'उपयोग की शर्तें', zh: '使用条款' },
  'تسجيل الدخول': { en: 'Sign in', es: 'Iniciar sesión', fr: 'Se connecter', de: 'Anmelden', tr: 'Oturum aç', ru: 'Войти', hi: 'साइन इन करें', zh: '登录' },
  'اللغة': { en: 'Language', es: 'Idioma', fr: 'Langue', de: 'Sprache', tr: 'Dil', ru: 'Язык', hi: 'भाषा', zh: '语言' },
  'اختر اللغة': { en: 'Choose language', es: 'Elige un idioma', fr: 'Choisissez une langue', de: 'Sprache auswählen', tr: 'Dil seçin', ru: 'Выберите язык', hi: 'भाषा चुनें', zh: '选择语言' },
  'مساحة العمل': { en: 'Workspace', es: 'Área de trabajo', fr: 'Espace de travail', de: 'Arbeitsbereich', tr: 'Çalışma alanı', ru: 'Рабочая область', hi: 'कार्यस्थान', zh: '工作区' },
  'اللغة الافتراضية': { en: 'default language', es: 'idioma predeterminado', fr: 'langue par défaut', de: 'Standardsprache', tr: 'varsayılan dil', ru: 'язык по умолчанию', hi: 'डिफ़ॉल्ट भाषा', zh: '默认语言' },
  'لغة المنصة': { en: 'Platform language', es: 'Idioma de la plataforma', fr: 'Langue de la plateforme', de: 'Plattformsprache', tr: 'Platform dili', ru: 'Язык платформы', hi: 'प्लेटफ़ॉर्म भाषा', zh: '平台语言' },
  'اختر لغة واجهة المنصة على هذا الجهاز.': { en: 'Choose the platform interface language for this device.', es: 'Elige el idioma de la interfaz de la plataforma para este dispositivo.', fr: 'Choisissez la langue de l’interface de la plateforme pour cet appareil.', de: 'Wähle die Sprache der Plattformoberfläche für dieses Gerät.', tr: 'Bu cihaz için platform arayüz dilini seçin.', ru: 'Выберите язык интерфейса платформы для этого устройства.', hi: 'इस डिवाइस के लिए प्लेटफ़ॉर्म इंटरफ़ेस भाषा चुनें।', zh: '为此设备选择平台界面语言。' },
  'اللغة المفضلة': { en: 'Preferred language', es: 'Idioma preferido', fr: 'Langue préférée', de: 'Bevorzugte Sprache', tr: 'Tercih edilen dil', ru: 'Предпочитаемый язык', hi: 'पसंदीदा भाषा', zh: '首选语言' },
  'سيُستخدم اختيار اللغة في صفحات المنصة المتوافقة ويحفظ على هذا الجهاز.': { en: 'Your language choice is used across compatible platform pages and saved on this device.', es: 'Tu elección de idioma se usa en las páginas compatibles de la plataforma y se guarda en este dispositivo.', fr: 'Votre choix de langue est utilisé sur les pages compatibles de la plateforme et enregistré sur cet appareil.', de: 'Deine Sprachauswahl wird auf kompatiblen Plattformseiten verwendet und auf diesem Gerät gespeichert.', tr: 'Dil seçiminiz uyumlu platform sayfalarında kullanılır ve bu cihazda kaydedilir.', ru: 'Выбранный язык используется на совместимых страницах платформы и сохраняется на этом устройстве.', hi: 'आपकी भाषा पसंद संगत प्लेटफ़ॉर्म पृष्ठों में उपयोग होती है और इस डिवाइस पर सहेजी जाती है।', zh: '您的语言选择会用于兼容的平台页面，并保存在此设备上。' },
  'اختر ملفاً': { en: 'Choose a file', es: 'Elige un archivo', fr: 'Choisissez un fichier', de: 'Datei auswählen', tr: 'Dosya seçin', ru: 'Выберите файл', hi: 'फ़ाइल चुनें', zh: '选择文件' },
  'اختيار الملفات': { en: 'Select files', es: 'Seleccionar archivos', fr: 'Sélectionner des fichiers', de: 'Dateien auswählen', tr: 'Dosyaları seçin', ru: 'Выбрать файлы', hi: 'फ़ाइलें चुनें', zh: '选择文件' },
  'تصدير GIF': { en: 'Export GIF', es: 'Exportar GIF', fr: 'Exporter le GIF', de: 'GIF exportieren', tr: 'GIF dışa aktar', ru: 'Экспортировать GIF', hi: 'GIF निर्यात करें', zh: '导出 GIF' },
  'تحسين بنقرة واحدة': { en: 'One-click optimize', es: 'Optimizar con un clic', fr: 'Optimiser en un clic', de: 'Mit einem Klick optimieren', tr: 'Tek tıkla optimize et', ru: 'Оптимизировать в один клик', hi: 'एक क्लिक में ऑप्टिमाइज़ करें', zh: '一键优化' }
};

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : fallbackLocale;
}

export function getLocale(): Locale {
  try {
    return normalizeLocale(window.localStorage.getItem(storageKey));
  } catch {
    return fallbackLocale;
  }
}

export function applyDocumentLocale(locale = getLocale()): Locale {
  const normalized = normalizeLocale(locale);
  const root = document.documentElement;
  root.lang = normalized;
  root.dir = localeMeta[normalized].direction;
  root.dataset.locale = normalized;
  root.classList.toggle('arsenal-is-rtl', localeMeta[normalized].direction === 'rtl');
  root.classList.toggle('arsenal-is-ltr', localeMeta[normalized].direction === 'ltr');
  return normalized;
}

export function setLocale(locale: string): Locale {
  const normalized = normalizeLocale(locale);
  try {
    window.localStorage.setItem(storageKey, normalized);
  } catch {
    // التخزين اختيار إضافي؛ الواجهة تبقى صالحة في وضع الخصوصية أيضاً.
  }
  return applyDocumentLocale(normalized);
}

/** ترجمة نص واجهة ثابت مع دعم متغيرات آمن مثل {count} و{name}. */
export function t(source: string, variables: TranslationVariables = {}, locale = getLocale()): string {
  const normalized = normalizeLocale(locale);
  const translated = reviewed[source]?.[normalized] ?? reviewedToolText[source]?.[normalized] ?? reviewedGuideText[source]?.[normalized] ?? reviewedSettingsText[source]?.[normalized] ?? reviewedSettingsInteractionText[source]?.[normalized] ?? reviewedGifText[source]?.[normalized] ?? reviewedVideoCompressorText[source]?.[normalized] ?? reviewedVideoToAudioText[source]?.[normalized] ?? reviewedAudioConverterText[source]?.[normalized] ?? reviewedNoiseRemoverText[source]?.[normalized] ?? reviewedAudioRateText[source]?.[normalized] ?? reviewedImageEditorText[source]?.[normalized] ?? reviewedBackgroundRemoverText[source]?.[normalized] ?? reviewedImageCompressorText[source]?.[normalized] ?? reviewedPdfCreateText[source]?.[normalized] ?? reviewedPdfCompressorText[source]?.[normalized] ?? reviewedPdfEditorText[source]?.[normalized] ?? reviewedTextEncryptionText[source]?.[normalized] ?? reviewedTextFilterText[source]?.[normalized] ?? reviewedTextComparisonText[source]?.[normalized] ?? reviewedQrGeneratorText[source]?.[normalized] ?? reviewedArchiveEncryptionText[source]?.[normalized] ?? reviewedLocalShareText[source]?.[normalized] ?? legalCatalog.translations[source]?.[normalized] ?? catalog.translations[source]?.[normalized] ?? extraCatalog.translations[source]?.[normalized] ?? source;
  return translated.replace(/\{([\w-]+)\}/g, (token, key: string) => String(variables[key] ?? token));
}

export function localizeToolText(source: string, locale = getLocale()): string {
  return t(source, {}, locale);
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (element.closest('[data-i18n-skip], textarea, input, select, option, pre, code, script, style, [contenteditable="true"]')) return true;
  return false;
}

function localizeTextNode(node: Text, locale: Locale): void {
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;
  const source = node.data;
  const trimmed = source.trim();
  if (!trimmed) return;
  const translated = t(trimmed, {}, locale);
  if (translated !== trimmed) node.data = source.replace(trimmed, translated);
}

function localizeElementAttributes(element: Element, locale: Locale): void {
  if (shouldSkipElement(element)) return;
  for (const attribute of ['placeholder', 'title', 'aria-label', 'aria-description']) {
    const source = element.getAttribute(attribute);
    if (!source) continue;
    const translated = t(source, {}, locale);
    if (translated !== source) element.setAttribute(attribute, translated);
  }
}

/**
 * يترجم النصوص الثابتة بعد كل render من دون لمس قيم إدخال المستخدم أو نواتج
 * المعالجة. يلزم أن تبقى العبارات المصدرية العربية مفاتيح مستقرة في القاموس.
 */
export function translateRenderedUi(root: ParentNode = document, locale = applyDocumentLocale()): void {
  const normalized = normalizeLocale(locale);
  if (root instanceof Element) localizeElementAttributes(root, normalized);
  root.querySelectorAll?.('*').forEach((element) => localizeElementAttributes(element, normalized));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => localizeTextNode(node, normalized));
  document.title = t(document.title, {}, normalized);
}

/** يراقب النصوص التي تضيفها الأدوات لاحقاً ليظل الانتقال اللغوي شاملاً. */
export function watchRenderedUi(root: HTMLElement, locale = getLocale()): () => void {
  const normalized = normalizeLocale(locale);
  translateRenderedUi(root, normalized);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        localizeTextNode(record.target as Text, normalized);
        continue;
      }
      if (record.type === 'attributes' && record.target instanceof Element) {
        localizeElementAttributes(record.target, normalized);
        continue;
      }
      record.addedNodes.forEach((node) => {
        if (node instanceof Text) localizeTextNode(node, normalized);
        if (node instanceof HTMLElement) translateRenderedUi(node, normalized);
      });
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'aria-description'] });
  return () => observer.disconnect();
}
