package com.todolist.app

import android.app.Application
import com.todolist.app.data.auth.AuthRepository

class TodoListApplication : Application() {
    val authRepository: AuthRepository by lazy { AuthRepository(applicationContext) }
}
