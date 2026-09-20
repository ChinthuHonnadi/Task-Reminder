package com.todolist.app

import android.os.Bundle
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.todolist.app.ui.TodoListApp
import com.todolist.app.ui.TodoListViewModel
import com.todolist.app.ui.theme.TodoListTheme

class MainActivity : ComponentActivity() {
    private val viewModel: TodoListViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        viewModel.initialize(intent)
        setContent {
            TodoListTheme {
                TodoListApp(viewModel = viewModel)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        viewModel.handleAuthIntent(intent)
    }
}
