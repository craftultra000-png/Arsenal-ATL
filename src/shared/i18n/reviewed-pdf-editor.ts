type PdfEditorTranslationRow = Record<string, string>;

/** مفاتيح محرر PDF الجديدة؛ تغطي العبارة المحررة التي لا تطابق نص القاموس القديم. */
export const reviewedPdfEditorText: Record<string, PdfEditorTranslationRow> = {
  'محرر PDF الشامل': { en: 'Complete PDF Editor', es: 'Editor PDF completo', fr: 'Éditeur PDF complet', de: 'Umfassender PDF-Editor', tr: 'Kapsamlı PDF Düzenleyici', ru: 'Полный PDF-редактор', hi: 'संपूर्ण PDF एडिटर', zh: '全能 PDF 编辑器' },
  'ادمج واحذف وأعد ترتيب ودوّر وقسّم الصفحات محلياً وبأمان تام.': { en: 'Merge, delete, reorder, rotate, and split pages locally with complete privacy.', es: 'Combina, elimina, reordena, rota y divide páginas de forma local con total privacidad.', fr: 'Fusionnez, supprimez, réorganisez, faites pivoter et divisez des pages localement en toute confidentialité.', de: 'Seiten lokal und vertraulich zusammenführen, löschen, neu anordnen, drehen und teilen.', tr: 'Sayfaları tamamen gizli biçimde yerel olarak birleştirin, silin, yeniden sıralayın, döndürün ve bölün.', ru: 'Локально и конфиденциально объединяйте, удаляйте, меняйте порядок, поворачивайте и разделяйте страницы.', hi: 'पेज को पूरी गोपनीयता के साथ स्थानीय रूप से मर्ज, डिलीट, रीऑर्डर, रोटेट और स्प्लिट करें।', zh: '在本地安全地合并、删除、重排、旋转和拆分页面。' },
  'كل صفحة في ملف منفصل': { en: 'Each page in a separate file', es: 'Cada página en un archivo separado', fr: 'Chaque page dans un fichier séparé', de: 'Jede Seite in einer separaten Datei', tr: 'Her sayfa ayrı bir dosyada', ru: 'Каждая страница в отдельном файле', hi: 'हर पेज अलग फ़ाइल में', zh: '每页单独保存为文件' },
  'صفحة {count}': { en: 'Page {count}', es: 'Página {count}', fr: 'Page {count}', de: 'Seite {count}', tr: 'Sayfa {count}', ru: 'Страница {count}', hi: 'पेज {count}', zh: '第 {count} 页' }
};
