package com.arsenal.slowedstudio.audio

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.common.PlaybackParameters

class AudioPreviewController(context: Context) {
    private val player = ExoPlayer.Builder(context).build()

    fun load(uri: Uri) {
        player.setMediaItem(MediaItem.fromUri(uri))
        player.prepare()
        player.seekTo(0)
    }

    fun setSpeed(speed: Float) {
        player.playbackParameters = PlaybackParameters(speed.coerceIn(0.5f, 1.5f), 1f)
    }

    fun play() = player.play()
    fun pause() = player.pause()
    fun isPlaying(): Boolean = player.isPlaying
    fun positionMs(): Long = player.currentPosition
    fun durationMs(): Long = player.duration.coerceAtLeast(0L)
    fun release() = player.release()
}
