package com.arsenal.slowedstudio.download

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

class MediaSourceResolver(private val context: Context) {
    private val client = OkHttpClient()

    suspend fun downloadDirect(url: String): Result<Uri> = withContext(Dispatchers.IO) {
        runCatching {
            val parsed = Uri.parse(url.trim())
            require(parsed.scheme == "https" || parsed.scheme == "http") { "أدخل رابطاً صالحاً." }
            require(parsed.host != null) { "الرابط غير مكتمل." }
            val request = Request.Builder().url(parsed.toString()).header("User-Agent", USER_AGENT).build()
            client.newCall(request).execute().use { response ->
                check(response.isSuccessful) { "فشل تنزيل الوسائط: HTTP ${response.code}" }
                val extension = guessExtension(response.header("Content-Type"), parsed.lastPathSegment)
                val output = File(context.cacheDir, "download_${System.currentTimeMillis()}.$extension")
                val body = requireNotNull(response.body) { "الاستجابة فارغة." }
                body.byteStream().use { input -> output.outputStream().use { out -> input.copyTo(out) } }
                Uri.fromFile(output)
            }
        }
    }

    fun isDirectMediaUrl(url: String): Boolean {
        val path = Uri.parse(url.trim()).path?.lowercase() ?: return false
        return listOf(".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus", ".mp4", ".webm").any(path::endsWith)
    }

    private fun guessExtension(contentType: String?, path: String?): String = when {
        contentType?.contains("mpeg") == true -> "mp3"
        contentType?.contains("wav") == true -> "wav"
        contentType?.contains("mp4") == true -> "mp4"
        contentType?.contains("ogg") == true -> "ogg"
        else -> path?.substringAfterLast('.', "bin")?.takeIf { it.length in 2..5 } ?: "bin"
    }

    private companion object { const val USER_AGENT = "SlowedStudio/0.1 (Android)" }
}
