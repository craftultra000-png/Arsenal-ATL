# Library decisions

- Jetpack Compose is Android's recommended modern toolkit for native UI: https://developer.android.com/develop/ui/compose
- Android Media3 Transformer is the official Android media editing API, supports API 23+, transcoding, trimming, and custom effects: https://developer.android.com/media/media3/transformer
- Android Storage Access Framework uses `ACTION_OPEN_DOCUMENT` for user-selected files and persistable URI permissions: https://developer.android.com/training/data-storage/shared/documents-files
- TarsosDSP provides time stretching, pitch shifting, filters, and audio effects, but is GPL-3.0: https://github.com/JorenSix/TarsosDSP
- NewPipe Extractor supports YouTube, SoundCloud, media.ccc.de, PeerTube, and Bandcamp, and is GPLv3. It does not provide a general Instagram connector: https://github.com/TeamNewPipe/NewPipeExtractor

The first Android version uses Media3 for preview, FFmpegKit for deterministic local WAV/MP3 export with atempo/aecho filters, OkHttp for direct media URLs, and NewPipe Extractor for public YouTube URLs. Instagram is intentionally limited to direct media URLs until a stable and permitted connector is selected.
