package com.todolist.app.ui.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable

@Composable
fun NotesScreen(contentPadding: PaddingValues) {
    PlaceholderScreen(
        title = "Notes",
        description = "Notes will be connected to the existing Todo List system in a later phase.",
        contentPadding = contentPadding,
    )
}

