package com.todolist.app.ui

import com.todolist.app.data.auth.SignedInUser

data class AuthUiState(
    val email: String = "",
    val user: SignedInUser? = null,
    val isRestoringSession: Boolean = true,
    val isSendingMagicLink: Boolean = false,
    val message: String? = null,
    val isError: Boolean = false,
    val isConfigurationMissing: Boolean = false,
)
