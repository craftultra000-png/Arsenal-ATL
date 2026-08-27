type ToolTranslationRow = Record<string, string>;

/** أوصاف الأدوات المراجَعة يدوياً؛ مفاتيحها هي النصوص العربية المصدرية. */
export const reviewedToolText: Record<string, ToolTranslationRow> = {
  'اقتطاع وتحويل الفيديوهات إلى GIF فورياً من المتصفح.': {
    en: 'Trim videos and convert them to GIF instantly in your browser.', es: 'Recorta vídeos y conviértelos en GIF al instante desde tu navegador.', fr: 'Découpez des vidéos et convertissez-les instantanément en GIF dans votre navigateur.', de: 'Videos zuschneiden und direkt im Browser in GIFs umwandeln.', tr: 'Videoları kırpın ve tarayıcınızda anında GIF’e dönüştürün.', ru: 'Обрезайте видео и мгновенно конвертируйте его в GIF прямо в браузере.', hi: 'वीडियो ट्रिम करें और उन्हें अपने ब्राउज़र में तुरंत GIF में बदलें।', zh: '在浏览器中即时裁剪视频并转换为 GIF。'
  },
  'ضغط الفيديو بإعدادات جودة ودقة وأداء قابلة للتحكم.': {
    en: 'Compress video with controllable quality, resolution, and performance settings.', es: 'Comprime vídeo con ajustes controlables de calidad, resolución y rendimiento.', fr: 'Compressez vos vidéos avec des réglages de qualité, de résolution et de performances.', de: 'Videos mit steuerbaren Einstellungen für Qualität, Auflösung und Leistung komprimieren.', tr: 'Videoyu kontrol edilebilir kalite, çözünürlük ve performans ayarlarıyla sıkıştırın.', ru: 'Сжимайте видео с гибкими настройками качества, разрешения и производительности.', hi: 'कंट्रोल किए जा सकने वाले गुणवत्ता, रेज़ॉल्यूशन और प्रदर्शन विकल्पों के साथ वीडियो कंप्रेस करें।', zh: '使用可控的质量、分辨率和性能设置压缩视频。'
  },
  'استخراج المسار الصوتي من ملف فيديو محلياً.': {
    en: 'Extract the audio track from a video file locally.', es: 'Extrae la pista de audio de un archivo de vídeo de forma local.', fr: 'Extrayez localement la piste audio d’un fichier vidéo.', de: 'Die Audiospur lokal aus einer Videodatei extrahieren.', tr: 'Bir video dosyasındaki ses parçasını yerel olarak çıkarın.', ru: 'Локально извлекайте аудиодорожку из видеофайла.', hi: 'वीडियो फ़ाइल से ऑडियो ट्रैक स्थानीय रूप से निकालें।', zh: '在本地从视频文件中提取音轨。'
  },
  'تحويل صيغ الملفات الصوتية بصورة مستقلة.': {
    en: 'Convert audio file formats independently and locally.', es: 'Convierte formatos de archivos de audio de forma independiente y local.', fr: 'Convertissez des formats de fichiers audio de manière autonome et locale.', de: 'Audio-Dateiformate unabhängig und lokal konvertieren.', tr: 'Ses dosyası biçimlerini bağımsız ve yerel olarak dönüştürün.', ru: 'Конвертируйте аудиоформаты автономно и локально.', hi: 'ऑडियो फ़ाइल फ़ॉर्मेट को स्वतंत्र रूप से और स्थानीय रूप से बदलें।', zh: '独立地在本地转换音频文件格式。'
  },
  'تنقية الصوت بالذكاء الاصطناعي داخل المتصفح.': {
    en: 'Clean up audio with AI directly in your browser.', es: 'Limpia el audio con IA directamente en tu navegador.', fr: 'Nettoyez l’audio avec l’IA directement dans votre navigateur.', de: 'Audio direkt im Browser mit KI bereinigen.', tr: 'Sesi doğrudan tarayıcınızda yapay zekâ ile temizleyin.', ru: 'Очищайте аудио с помощью ИИ прямо в браузере.', hi: 'अपने ब्राउज़र में सीधे AI से ऑडियो साफ़ करें।', zh: '直接在浏览器中使用 AI 净化音频。'
  },
  'تغيير سرعة الصوت وتصديره كملف جديد.': {
    en: 'Change audio speed and export it as a new file.', es: 'Cambia la velocidad del audio y expórtalo como un archivo nuevo.', fr: 'Modifiez la vitesse audio et exportez-la dans un nouveau fichier.', de: 'Audiogeschwindigkeit ändern und als neue Datei exportieren.', tr: 'Ses hızını değiştirin ve yeni bir dosya olarak dışa aktarın.', ru: 'Меняйте скорость аудио и экспортируйте его как новый файл.', hi: 'ऑडियो की गति बदलें और उसे नई फ़ाइल के रूप में निर्यात करें।', zh: '调整音频速度并导出为新文件。'
  },
  'تعديلات أساسية للصور عبر مساحة عمل محلية.': {
    en: 'Make essential image edits in a local workspace.', es: 'Realiza ediciones esenciales de imagen en un espacio de trabajo local.', fr: 'Effectuez les retouches essentielles de vos images dans un espace de travail local.', de: 'Grundlegende Bildbearbeitungen in einem lokalen Arbeitsbereich ausführen.', tr: 'Yerel çalışma alanında temel görüntü düzenlemeleri yapın.', ru: 'Выполняйте основные правки изображений в локальном рабочем пространстве.', hi: 'स्थानीय कार्यस्थान में इमेज के ज़रूरी संपादन करें।', zh: '在本地工作区完成基础图像编辑。'
  },
  'عزل الخلفية ومعالجة الصورة محلياً.': {
    en: 'Remove the background and process your image locally.', es: 'Elimina el fondo y procesa tu imagen de forma local.', fr: 'Supprimez l’arrière-plan et traitez votre image localement.', de: 'Hintergrund entfernen und Bild lokal bearbeiten.', tr: 'Arka planı kaldırın ve görselinizi yerel olarak işleyin.', ru: 'Удаляйте фон и обрабатывайте изображение локально.', hi: 'बैकग्राउंड हटाएँ और अपनी इमेज को स्थानीय रूप से प्रोसेस करें।', zh: '在本地移除背景并处理图像。'
  },
  'ضغط صور متعددة مع تنزيل النتيجة.': {
    en: 'Compress multiple images and download the result.', es: 'Comprime varias imágenes y descarga el resultado.', fr: 'Compressez plusieurs images et téléchargez le résultat.', de: 'Mehrere Bilder komprimieren und Ergebnis herunterladen.', tr: 'Birden çok görseli sıkıştırın ve sonucu indirin.', ru: 'Сжимайте несколько изображений и скачивайте результат.', hi: 'कई इमेज कंप्रेस करें और परिणाम डाउनलोड करें।', zh: '压缩多张图像并下载结果。'
  },
  'تكوين مستند PDF من عناصر ومحتوى محلي.': {
    en: 'Create a PDF document from local elements and content.', es: 'Crea un documento PDF a partir de elementos y contenido locales.', fr: 'Créez un document PDF à partir d’éléments et de contenus locaux.', de: 'Ein PDF-Dokument aus lokalen Elementen und Inhalten erstellen.', tr: 'Yerel öğe ve içeriklerden PDF belgesi oluşturun.', ru: 'Создавайте PDF-документы из локальных элементов и материалов.', hi: 'स्थानीय एलिमेंट और सामग्री से PDF दस्तावेज़ बनाएँ।', zh: '使用本地元素和内容创建 PDF 文档。'
  },
  'تقليل حجم مستند PDF محلياً.': {
    en: 'Reduce the size of a PDF document locally.', es: 'Reduce el tamaño de un documento PDF de forma local.', fr: 'Réduisez localement la taille d’un document PDF.', de: 'Die Größe eines PDF-Dokuments lokal reduzieren.', tr: 'PDF belgesinin boyutunu yerel olarak küçültün.', ru: 'Уменьшайте размер PDF-документа локально.', hi: 'PDF दस्तावेज़ का आकार स्थानीय रूप से कम करें।', zh: '在本地减小 PDF 文档大小。'
  },
  'تحميل واستعراض وتعديل مستندات PDF.': {
    en: 'Upload, review, and edit PDF documents.', es: 'Carga, revisa y edita documentos PDF.', fr: 'Importez, consultez et modifiez des documents PDF.', de: 'PDF-Dokumente hochladen, ansehen und bearbeiten.', tr: 'PDF belgelerini yükleyin, görüntüleyin ve düzenleyin.', ru: 'Загружайте, просматривайте и редактируйте PDF-документы.', hi: 'PDF दस्तावेज़ अपलोड, देखें और संपादित करें।', zh: '上传、查看和编辑 PDF 文档。'
  },
  'تشفير وفك تشفير النصوص محلياً.': {
    en: 'Encrypt and decrypt text locally.', es: 'Cifra y descifra texto de forma local.', fr: 'Chiffrez et déchiffrez du texte localement.', de: 'Text lokal ver- und entschlüsseln.', tr: 'Metni yerel olarak şifreleyin ve şifresini çözün.', ru: 'Локально шифруйте и расшифровывайте текст.', hi: 'टेक्स्ट को स्थानीय रूप से एन्क्रिप्ट और डिक्रिप्ट करें।', zh: '在本地加密和解密文本。'
  },
  'تنسيق وترميز وتحويل النصوص.': {
    en: 'Format, encode, and transform text.', es: 'Da formato, codifica y transforma texto.', fr: 'Formatez, encodez et transformez du texte.', de: 'Text formatieren, kodieren und umwandeln.', tr: 'Metni biçimlendirin, kodlayın ve dönüştürün.', ru: 'Форматируйте, кодируйте и преобразуйте текст.', hi: 'टेक्स्ट को फ़ॉर्मैट, एन्कोड और रूपांतरित करें।', zh: '格式化、编码和转换文本。'
  },
  'إظهار الفروقات بين نصين محلياً.': {
    en: 'Compare two texts locally and show the differences.', es: 'Compara dos textos de forma local y muestra las diferencias.', fr: 'Comparez localement deux textes et affichez leurs différences.', de: 'Zwei Texte lokal vergleichen und Unterschiede anzeigen.', tr: 'İki metni yerel olarak karşılaştırın ve farkları gösterin.', ru: 'Локально сравнивайте два текста и показывайте различия.', hi: 'दो टेक्स्ट की स्थानीय रूप से तुलना करें और अंतर दिखाएँ।', zh: '在本地比较两段文本并显示差异。'
  },
  'إنشاء رمز QR قابل للتنزيل.': {
    en: 'Create a downloadable QR code.', es: 'Crea un código QR descargable.', fr: 'Créez un code QR téléchargeable.', de: 'Einen herunterladbaren QR-Code erstellen.', tr: 'İndirilebilir QR kodu oluşturun.', ru: 'Создавайте QR-код для скачивания.', hi: 'डाउनलोड करने योग्य QR कोड बनाएँ।', zh: '创建可下载的二维码。'
  },
  'إنشاء أرشيفات ZIP وتشفيرها محلياً.': {
    en: 'Create ZIP archives and encrypt them locally.', es: 'Crea archivos ZIP y cífralos de forma local.', fr: 'Créez des archives ZIP et chiffrez-les localement.', de: 'ZIP-Archive erstellen und lokal verschlüsseln.', tr: 'ZIP arşivleri oluşturun ve yerel olarak şifreleyin.', ru: 'Создавайте ZIP-архивы и шифруйте их локально.', hi: 'ZIP आर्काइव बनाएँ और उन्हें स्थानीय रूप से एन्क्रिप्ट करें।', zh: '创建 ZIP 压缩包并在本地加密。'
  },
  'مشاركة الملفات بين الأجهزة على الشبكة المحلية.': {
    en: 'Share files between devices on your local network.', es: 'Comparte archivos entre dispositivos de tu red local.', fr: 'Partagez des fichiers entre appareils sur votre réseau local.', de: 'Dateien zwischen Geräten im lokalen Netzwerk teilen.', tr: 'Yerel ağınızdaki cihazlar arasında dosya paylaşın.', ru: 'Обменивайтесь файлами между устройствами в локальной сети.', hi: 'अपने लोकल नेटवर्क पर डिवाइसों के बीच फ़ाइलें साझा करें।', zh: '在本地网络中的设备之间共享文件。'
  }
};
