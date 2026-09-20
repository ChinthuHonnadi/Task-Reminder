package com.todolist.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF3559C7),
    secondary = Color(0xFF525E7D),
    tertiary = Color(0xFF705574),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFB7C4FF),
    secondary = Color(0xFFBBC6EA),
    tertiary = Color(0xFFE0BCE0),
)

@Composable
fun TodoListTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
