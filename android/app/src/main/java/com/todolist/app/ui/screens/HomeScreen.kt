package com.todolist.app.ui.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable

@Composable
fun HomeScreen(contentPadding: PaddingValues) {
    PlaceholderScreen(
        title = "Todo List",
        description = "Your dashboard will appear here after account and task synchronization are added.",
        contentPadding = contentPadding,
    )
}

