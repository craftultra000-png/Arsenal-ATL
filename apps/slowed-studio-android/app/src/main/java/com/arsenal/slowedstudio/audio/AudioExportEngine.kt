package com.arsenal.slowedstudio.audio

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale

class AudioExportEngine(private val context: Context) {
    data class Settings(
        val speed: Float,
        val reverbEnabled: Boolean,
        val decaySeconds: Float,
        val mix: Float,
        val startSeconds: Float,
        val endSeconds: Float,
    )

    suspend fun export(uri: Uri, settings: Settings, format: Format): Result<File> = withContext(Dispatchers.IO) {
        runCatching {
            val input = copyToCache(uri, "source")
            val output = File(context.cacheDir, "slowed_${System.currentTimeMillis()}.${format.extension}")
            val filter = buildAudioFilter(settings)
            val command = buildString {
                append("-y -i ${quote(input.absolutePath)} ")
                append("-ss ${settings.startSeconds.coerceAtLeast(0f).format()} ")
                append("-to ${settings.endSeconds.coerceAtLeast(settings.startSeconds).format()} ")
                append("-filter:a ${quote(filter)} ")
                when (format) {
                    Format.WAV -> append("-c:a pcm_s16le -ar 44100 -ac 2 ${quote(output.absolutePath)}")
                    Format.MP3 -> append("-c:a libmp3lame -q:a 2 ${quote(output.absolutePath)}")
                }
            }
            val session = FFmpegKit.execute(command)
            check(ReturnCode.isSuccess(session.returnCode)) {
                session.failStackTrace ?: session.allLogsAsString ?: "تعذر تصدير الملف الصوتي."
            }
            output
        }
    }

    enum class Format(val extension: String) { WAV("wav"), MP3("mp3") }

    private fun buildAudioFilter(settings: Settings): String {
        val atempo = settings.speed.coerceIn(0.5f, 2f).format(Locale.US)
        if (!settings.reverbEnabled) return "atempo=$atempo"
        val delay = (settings.decaySeconds.coerceIn(0.5f, 8f) * 1000).toInt()
        val wet = settings.mix.coerceIn(0f, 1f).format(Locale.US)
        return "atempo=$atempo,aecho=0.8:0.9:$delay:$wet"
    }

    private fun copyToCache(uri: Uri, prefix: String): File {
        val file = File.createTempFile(prefix, ".input", context.cacheDir)
        val resolver: ContentResolver = context.contentResolver
        resolver.openInputStream(uri).use { input ->
            requireNotNull(input) { "تعذر فتح الملف المحدد." }
            file.outputStream().use { output -> input.copyTo(output) }
        }
        return file
    }

    private fun quote(value: String): String = "'${value.replace("'", "'\\''")}'"
    private fun Float.format(): String = String.format(Locale.US, "%.3f", this)
}
