package com.todolist.app.data.auth

import android.content.Context
import android.content.Intent
import com.todolist.app.BuildConfig
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.FlowType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.handleDeeplinks
import io.github.jan.supabase.auth.providers.builtin.OTP
import io.github.jan.supabase.createSupabaseClient

data class SignedInUser(val email: String?)

class AuthRepository(context: Context) {
    private val storage = AndroidKeystoreSecureStorage(context.applicationContext)

    private val client by lazy {
        check(AuthConfiguration.isConfigured) { "Supabase isn't configured for this app." }
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY,
        ) {
            install(Auth) {
                scheme = AuthConfiguration.deepLinkScheme
                host = AuthConfiguration.deepLinkHost
                flowType = FlowType.PKCE
                sessionManager = SecureSessionManager(storage)
                codeVerifierCache = SecureCodeVerifierCache(storage)
            }
        }
    }

    val isConfigured: Boolean
        get() = AuthConfiguration.isConfigured

    suspend fun restoreSignedInUser(): SignedInUser? {
        if (!isConfigured) return null
        client.auth.awaitInitialization()
        return client.auth.currentUserOrNull()?.let { SignedInUser(it.email) }
    }

    suspend fun sendMagicLink(email: String) {
        require(isConfigured) { "Supabase isn't configured for this app." }
        client.auth.signInWith(OTP, redirectUrl = AuthConfiguration.deepLinkUrl) {
            this.email = email
        }
    }

    suspend fun signOut() {
        if (!isConfigured) return
        try {
            client.auth.signOut()
        } finally {
            // A network failure must not leave a reusable local session behind.
            storage.clearAuthenticationState()
        }
    }

    fun isAuthCallback(intent: Intent): Boolean =
        AuthConfiguration.isExpectedRedirectUri(intent.data?.toString())

    fun handleDeepLink(
        intent: Intent,
        onSuccess: (SignedInUser) -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        if (!isConfigured || !isAuthCallback(intent)) return
        client.handleDeeplinks(
            intent = intent,
            onSessionSuccess = { session -> onSuccess(SignedInUser(session.user?.email)) },
            onError = onError,
        )
    }
}
