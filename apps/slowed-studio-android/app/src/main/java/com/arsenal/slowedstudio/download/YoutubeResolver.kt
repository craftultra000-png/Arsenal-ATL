package com.arsenal.slowedstudio.download

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request as OkRequest
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.stream.StreamInfo
import java.util.concurrent.atomic.AtomicBoolean

class YoutubeResolver(private val context: Context) {
    private val http = OkHttpClient()

    suspend fun download(url: String): Result<Uri> = withContext(Dispatchers.IO) {
        runCatching {
            require(isYoutubeUrl(url)) { "أدخل رابط YouTube صالحاً." }
            initializeExtractor()
            val info = StreamInfo.getInfo(url)
            val stream = info.audioStreams.maxByOrNull { it.averageBitrate }
                ?: error("لم يتم العثور على مسار صوتي لهذا الفيديو.")
            MediaSourceResolver(context).downloadDirect(stream.content).getOrThrow()
        }
    }

    private fun initializeExtractor() {
        if (initialized.compareAndSet(false, true)) NewPipe.init(OkHttpExtractorDownloader(http))
    }

    private fun isYoutubeUrl(value: String): Boolean {
        val host = Uri.parse(value.trim()).host?.lowercase() ?: return false
        return host == "youtube.com" || host.endsWith(".youtube.com") || host == "youtu.be"
    }

    private class OkHttpExtractorDownloader(private val client: OkHttpClient) : Downloader() {
        override fun execute(request: Request): Response {
            val builder = OkRequest.Builder().url(request.url())
            request.headers().forEach { (key, values) -> values.forEach { builder.addHeader(key, it) } }
            val body = request.dataToSend()?.let { okhttp3.RequestBody.create(null, it) }
            when (request.httpMethod().uppercase()) {
                "POST" -> builder.post(body ?: okhttp3.RequestBody.create(null, ByteArray(0)))
                "HEAD" -> builder.head()
                else -> builder.get()
            }
            client.newCall(builder.build()).execute().use { response ->
                val headers = response.headers.toMultimap()
                val text = response.body?.string() ?: ""
                return Response(response.code, response.message, headers, text, response.request.url.toString())
            }
        }
    }

    private companion object { val initialized = AtomicBoolean(false) }
}
