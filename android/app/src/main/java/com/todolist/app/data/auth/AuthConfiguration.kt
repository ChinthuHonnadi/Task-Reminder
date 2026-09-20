package com.todolist.app.data.auth

import com.todolist.app.BuildConfig
import java.net.URI

object AuthConfiguration {
    const val deepLinkScheme = "com.todolist.app"
    const val deepLinkHost = "auth"
    const val deepLinkUrl = "$deepLinkScheme://$deepLinkHost"

    val isConfigured: Boolean
        get() = isValid(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_PUBLISHABLE_KEY)

    /** Keeps malformed or example-only values from producing confusing network failures. */
    fun isValid(supabaseUrl: String, publishableKey: String): Boolean {
        val uri = runCatching { URI(supabaseUrl.trim()) }.getOrNull() ?: return false
        val usableUrl = uri.scheme.equals("https", ignoreCase = true) &&
            !uri.host.isNullOrBlank() &&
            !uri.host.equals("your-project.supabase.co", ignoreCase = true)
        val usableKey = publishableKey.isNotBlank() &&
            !publishableKey.contains("your-client-safe-publishable-key", ignoreCase = true)
        return usableUrl && usableKey
    }

    /** Only this exact callback is handed to the Supabase SDK for PKCE verification. */
    fun isExpectedRedirectUri(uri: String?): Boolean {
        val parsed = uri?.let { runCatching { URI(it) }.getOrNull() } ?: return false
        return parsed.scheme.equals(deepLinkScheme, ignoreCase = true) &&
            parsed.host.equals(deepLinkHost, ignoreCase = true)
    }
}
