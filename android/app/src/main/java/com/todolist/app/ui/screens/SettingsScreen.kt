package com.todolist.app.ui.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SettingsScreen(
    contentPadding: PaddingValues,
    userEmail: String?,
    onSignOut: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.Start,
    ) {
        Text(text = "Settings", style = MaterialTheme.typography.headlineMedium)
        Text(
            modifier = Modifier.padding(top = 16.dp),
            text = "Signed in as ${userEmail ?: "your Todo List account"}",
            style = MaterialTheme.typography.bodyLarge,
        )
        Button(
            modifier = Modifier.padding(top = 20.dp),
            onClick = onSignOut,
        ) {
            Text("Sign out")
        }
    }
}
