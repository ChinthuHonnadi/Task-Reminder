package com.todolist.app.ui

import android.app.Application
import android.content.Intent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.todolist.app.TodoListApplication
import com.todolist.app.data.auth.AuthErrorFormatter
import com.todolist.app.data.auth.EmailAddressValidator
import com.todolist.app.data.auth.SignedInUser
import com.todolist.app.domain.model.AppDestination
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Owns UI state. Phase 3 adds only Supabase email magic-link authentication.
 */
class TodoListViewModel(application: Application) : AndroidViewModel(application) {
    private val authRepository = (application as TodoListApplication).authRepository
    private val _selectedDestination = MutableStateFlow(AppDestination.HOME)
    val selectedDestination: StateFlow<AppDestination> = _selectedDestination.asStateFlow()
    private val _authUiState = MutableStateFlow(AuthUiState())
    val authUiState: StateFlow<AuthUiState> = _authUiState.asStateFlow()

    /** Preserves the underlying exception internally for diagnostics without exposing raw secrets to the UI. */
    var lastAuthError: Throwable? = null
        private set

    /**
     * Called by MainActivity before Compose is displayed. A callback is handled before session
     * restoration so a stale restore result cannot overwrite a newly exchanged PKCE session.
     */
    fun initialize(intent: Intent) {
        if (!authRepository.isConfigured) {
            _authUiState.value = AuthUiState(isRestoringSession = false, isConfigurationMissing = true)
        } else if (authRepository.isAuthCallback(intent)) {
            handleAuthIntent(intent)
        } else {
            restoreSession()
        }
    }

    fun selectDestination(destination: AppDestination) {
        _selectedDestination.value = destination
    }

    fun updateEmail(email: String) {
        _authUiState.value = _authUiState.value.copy(email = email, message = null, isError = false)
    }

    fun sendMagicLink() {
        val email = _authUiState.value.email.trim()
        if (!EmailAddressValidator.isValid(email)) {
            _authUiState.value = _authUiState.value.copy(
                message = "Enter a valid email address to continue.",
                isError = true,
            )
            return
        }

        viewModelScope.launch {
            _authUiState.value = _authUiState.value.copy(isSendingMagicLink = true, message = null, isError = false)
            runCatching { authRepository.sendMagicLink(email) }
                .onSuccess {
                    lastAuthError = null
                    _authUiState.value = _authUiState.value.copy(
                        isSendingMagicLink = false,
                        message = "Check your email, then open the magic link on this device.",
                    )
                }
                .onFailure { error ->
                    lastAuthError = error
                    _authUiState.value = _authUiState.value.copy(
                        isSendingMagicLink = false,
                        message = AuthErrorFormatter.formatSendMagicLinkError(error),
                        isError = true,
                    )
                }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching { authRepository.signOut() }
            _authUiState.value = AuthUiState(
                email = _authUiState.value.email,
                isRestoringSession = false,
                message = "Signed out.",
            )
        }
    }

    fun handleAuthIntent(intent: Intent) {
        if (!authRepository.isAuthCallback(intent)) return
        authRepository.handleDeepLink(
            intent = intent,
            onSuccess = ::onAuthenticationSucceeded,
            onError = { error ->
                lastAuthError = error
                _authUiState.value = _authUiState.value.copy(
                    isRestoringSession = false,
                    message = AuthErrorFormatter.formatDeepLinkError(error),
                    isError = true,
                )
            },
        )
    }

    private fun restoreSession() {
        if (!authRepository.isConfigured) {
            _authUiState.value = AuthUiState(isRestoringSession = false, isConfigurationMissing = true)
            return
        }

        viewModelScope.launch {
            val user = runCatching { authRepository.restoreSignedInUser() }.getOrNull()
            _authUiState.value = _authUiState.value.copy(user = user, isRestoringSession = false)
        }
    }

    private fun onAuthenticationSucceeded(user: SignedInUser) {
        lastAuthError = null
        _authUiState.value = _authUiState.value.copy(
            user = user,
            isRestoringSession = false,
            isSendingMagicLink = false,
            message = "Signed in successfully.",
            isError = false,
        )
    }
}
