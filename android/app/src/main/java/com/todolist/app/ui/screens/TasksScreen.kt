package com.todolist.app.ui.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable

@Composable
fun TasksScreen(contentPadding: PaddingValues) {
    PlaceholderScreen(
        title = "Tasks",
        description = "Task creation and shared Supabase data are planned for Phase 4.",
        contentPadding = contentPadding,
    )
}

