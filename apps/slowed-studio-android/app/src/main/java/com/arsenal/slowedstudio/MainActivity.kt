package com.arsenal.slowedstudio

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RectangleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AudioFile
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.SettingsVoice
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.util.UnstableApi
import com.arsenal.slowedstudio.audio.AudioExportEngine
import com.arsenal.slowedstudio.audio.AudioPreviewController
import com.arsenal.slowedstudio.download.MediaSourceResolver
import com.arsenal.slowedstudio.download.YoutubeResolver
import kotlinx.coroutines.launch
import java.io.File
import java.util.Locale

class MainActivity : ComponentActivity() {
    @OptIn(UnstableApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { SlowedStudioApp() }
    }
}

private val WindowBlue = Color(0xFF0078D4)
private val WindowBlueDark = Color(0xFF005A9E)
private val Canvas = Color(0xFFF3F3F3)
private val SurfaceWhite = Color.White
private val Ink = Color(0xFF1F1F1F)
private val Muted = Color(0xFF616161)
private val Border = Color(0xFFD6D6D6)

@Composable
private fun SlowedStudioApp() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val preview = remember { AudioPreviewController(context) }
    val exporter = remember { AudioExportEngine(context) }
    val resolver = remember { MediaSourceResolver(context) }
    val youtubeResolver = remember { YoutubeResolver(context) }

    var sourceUri by remember { mutableStateOf<Uri?>(null) }
    var sourceName by remember { mutableStateOf("لم يتم اختيار ملف") }
    var url by remember { mutableStateOf("") }
    var speed by remember { mutableFloatStateOf(1f) }
    var reverb by remember { mutableStateOf(false) }
    var decay by remember { mutableFloatStateOf(1.5f) }
    var mix by remember { mutableFloatStateOf(.3f) }
    var cutStart by remember { mutableFloatStateOf(0f) }
    var cutEnd by remember { mutableFloatStateOf(1f) }
    var duration by remember { mutableFloatStateOf(0f) }
    var playing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }
    var pendingExport by remember { mutableStateOf<File?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        sourceUri = uri
        sourceName = uri.lastPathSegment?.substringAfterLast('/') ?: "ملف صوتي"
        preview.load(uri)
        duration = 0f
        cutStart = 0f
        cutEnd = 1f
        notice = "تم تحميل الملف."
    }
    val savePicker = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument()) { uri ->
        val file = pendingExport ?: return@rememberLauncherForActivityResult
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            context.contentResolver.openOutputStream(uri)?.use { output -> file.inputStream().use { input -> input.copyTo(output) } }
            notice = "تم حفظ الملف بنجاح."
            pendingExport = null
        }
    }

    DisposableEffect(Unit) { onDispose { preview.release() } }
    LaunchedEffect(sourceUri) {
        if (sourceUri != null) {
            while (true) {
                val seconds = preview.durationMs() / 1000f
                if (seconds > 0f) { duration = seconds; break }
                kotlinx.coroutines.delay(250)
            }
        }
    }

    MaterialTheme(colorScheme = androidx.compose.material3.lightColorScheme(primary = WindowBlue, background = Canvas, surface = SurfaceWhite, onSurface = Ink)) {
        Surface(modifier = Modifier.fillMaxSize(), color = Canvas) {
            Column(modifier = Modifier.fillMaxSize()) {
                AppHeader()
                Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SourcePanel(url, { url = it }, sourceName, onOpen = { picker.launch(arrayOf("audio/*", "video/*")) }, onDownload = {
                        if (url.isBlank()) { notice = "أدخل رابطاً أولاً."; return@SourcePanel }
                        busy = true
                        scope.launch {
                            val result = when {
                                resolver.isDirectMediaUrl(url) -> resolver.downloadDirect(url)
                                isYoutubeUrl(url) -> youtubeResolver.download(url)
                                else -> Result.failure(IllegalArgumentException("أدخل رابط وسائط مباشر أو رابط YouTube."))
                            }
                            result.onSuccess { uri -> sourceUri = uri; sourceName = "وسائط من الرابط"; preview.load(uri); notice = "تم تنزيل الوسائط." }.onFailure { notice = it.message ?: "تعذر تنزيل الرابط." }
                            busy = false
                        }
                    }, busy)
                    if (notice != null) Text(notice!!, color = if (notice!!.contains("تعذر")) Color(0xFFB00020) else WindowBlueDark, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 4.dp))

                    AudioCard(sourceName, sourceUri != null, playing, onPlay = {
                        if (playing) preview.pause() else { preview.setSpeed(speed); preview.play() }
                        playing = !playing
                    }, onOpen = { picker.launch(arrayOf("audio/*", "video/*")) })

                    ControlCard("السرعة والطبقة") {
                        ValueRow("السرعة", "${speed.format()}x")
                        Slider(value = speed, onValueChange = { speed = it; preview.setSpeed(it) }, valueRange = .5f..1.5f, enabled = sourceUri != null)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("0.50x", fontSize = 12.sp, color = Muted); Text("1.00x", fontSize = 12.sp, color = Muted); Text("1.50x", fontSize = 12.sp, color = Muted) }
                    }

                    ControlCard("قص المقطع") {
                        ValueRow("البداية", formatTime(cutStart * duration))
                        Slider(value = cutStart, onValueChange = { cutStart = it.coerceAtMost(cutEnd - .01f) }, valueRange = 0f..1f, enabled = sourceUri != null && duration > 0f)
                        ValueRow("النهاية", formatTime(cutEnd * duration))
                        Slider(value = cutEnd, onValueChange = { cutEnd = it.coerceAtLeast(cutStart + .01f) }, valueRange = 0f..1f, enabled = sourceUri != null && duration > 0f)
                        Text("المدة: ${formatTime((cutEnd - cutStart) * duration)}", fontSize = 13.sp, color = Muted)
                    }

                    ControlCard("تأثير البيئة المحيطية (Reverb)") {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = reverb, onCheckedChange = { reverb = it }, enabled = sourceUri != null)
                            Text("تفعيل الصدى", fontWeight = FontWeight.Medium)
                        }
                        ValueRow("Decay", "${decay.format()}s")
                        Slider(value = decay, onValueChange = { decay = it }, valueRange = .5f..8f, enabled = reverb && sourceUri != null)
                        ValueRow("Mix", "${(mix * 100).toInt()}%")
                        Slider(value = mix, onValueChange = { mix = it }, valueRange = 0f..1f, enabled = reverb && sourceUri != null)
                    }

                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ExportButton("تصدير WAV", modifier = Modifier.weight(1f), enabled = sourceUri != null && !busy, icon = Icons.Default.Save) {
                            export(AudioExportEngine.Format.WAV, sourceUri, exporter, speed, reverb, decay, mix, cutStart, cutEnd, duration, scope, { busy = it }, { notice = it }) { file -> pendingExport = file; savePicker.launch("slowed_studio.wav") }
                        }
                        ExportButton("تصدير MP3", modifier = Modifier.weight(1f), enabled = sourceUri != null && !busy, icon = Icons.Default.Save) {
                            export(AudioExportEngine.Format.MP3, sourceUri, exporter, speed, reverb, decay, mix, cutStart, cutEnd, duration, scope, { busy = it }, { notice = it }) { file -> pendingExport = file; savePicker.launch("slowed_studio.mp3") }
                        }
                    }

                    Text("المعالجة محلية على جهازك. استخدم روابط وملفات تملك حق تنزيلها.", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }
    }
}

@Composable private fun AppHeader() { Row(Modifier.fillMaxWidth().background(WindowBlue).padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.SettingsVoice, null, tint = Color.White); Spacer(Modifier.width(10.dp)); Column { Text("Slowed Studio", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold); Text("معالجة صوت محلية", color = Color.White.copy(alpha = .86f), fontSize = 12.sp) } } }

@Composable private fun SourcePanel(url: String, onUrlChange: (String) -> Unit, sourceName: String, onOpen: () -> Unit, onDownload: () -> Unit, busy: Boolean) { ControlCard("مصدر الصوت") { OutlinedButton(onClick = onOpen, modifier = Modifier.fillMaxWidth(), shape = RectangleShape, colors = ButtonDefaults.outlinedButtonColors(contentColor = WindowBlue)) { Icon(Icons.Default.FileOpen, null); Spacer(Modifier.width(8.dp)); Text("اختيار ملف من الجهاز") }; Text(sourceName, maxLines = 1, overflow = TextOverflow.Ellipsis, color = Muted, fontSize = 13.sp); Row(verticalAlignment = Alignment.CenterVertically) { OutlinedTextField(value = url, onValueChange = onUrlChange, modifier = Modifier.weight(1f), label = { Text("رابط مباشر للوسائط") }, singleLine = true, shape = RectangleShape); Spacer(Modifier.width(8.dp)); Button(onClick = onDownload, enabled = !busy, shape = RectangleShape, colors = ButtonDefaults.buttonColors(containerColor = WindowBlue)) { Icon(Icons.Default.CloudDownload, null); Spacer(Modifier.width(4.dp)); Text(if (busy) "..." else "تنزيل") } } } }

@Composable private fun AudioCard(name: String, loaded: Boolean, playing: Boolean, onPlay: () -> Unit, onOpen: () -> Unit) { ControlCard("المعاينة") { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.AudioFile, null, tint = WindowBlue); Spacer(Modifier.width(10.dp)); Text(name, Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Medium); IconButton(onClick = onPlay, enabled = loaded) { Icon(if (playing) Icons.Default.Pause else Icons.Default.PlayArrow, null, tint = WindowBlue) } }; if (!loaded) TextButton(onClick = onOpen) { Text("افتح ملفاً للبدء", color = WindowBlue) } } }

@Composable private fun ControlCard(title: String, content: @Composable () -> Unit) { Column(Modifier.fillMaxWidth().background(SurfaceWhite).border(1.dp, Border, RectangleShape).padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(title, color = Ink, fontWeight = FontWeight.Bold, fontSize = 15.sp); content() } }
@Composable private fun ValueRow(label: String, value: String) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, color = Muted, fontSize = 13.sp); Text(value, color = WindowBlueDark, fontWeight = FontWeight.Bold, fontSize = 13.sp) } }
@Composable private fun ExportButton(label: String, modifier: Modifier = Modifier, enabled: Boolean, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) { Button(onClick = onClick, enabled = enabled, modifier = modifier, shape = RectangleShape, colors = ButtonDefaults.buttonColors(containerColor = WindowBlue)) { Icon(icon, null); Spacer(Modifier.width(5.dp)); Text(label, fontSize = 12.sp) } }

private fun export(format: AudioExportEngine.Format, uri: Uri?, engine: AudioExportEngine, speed: Float, reverb: Boolean, decay: Float, mix: Float, start: Float, end: Float, duration: Float, scope: kotlinx.coroutines.CoroutineScope, setBusy: (Boolean) -> Unit, setNotice: (String) -> Unit, onReady: (File) -> Unit) { val source = uri ?: return; setBusy(true); setNotice("جاري تجهيز الملف…"); scope.launch { val result = engine.export(source, AudioExportEngine.Settings(speed, reverb, decay, mix, start * duration, end * duration), format); result.onSuccess { file -> setNotice("تم تجهيز الملف."); onReady(file) }.onFailure { setNotice("تعذر التصدير: ${it.message ?: "خطأ غير معروف"}") }; setBusy(false) } }
private fun isYoutubeUrl(value: String): Boolean { val host = Uri.parse(value.trim()).host?.lowercase() ?: return false; return host == "youtube.com" || host.endsWith(".youtube.com") || host == "youtu.be" }
private fun Float.format() = String.format(Locale.US, "%.2f", this)
private fun formatTime(seconds: Float): String { val total = seconds.toInt().coerceAtLeast(0); return "%02d:%02d".format(total / 60, total % 60) }
