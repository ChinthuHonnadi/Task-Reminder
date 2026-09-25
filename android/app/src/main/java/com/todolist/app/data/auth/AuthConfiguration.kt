package com.todolist.app.data.auth

import com.todolist.app.BuildConfig
import java.net.URI

data class SupabaseClientConfiguration(
    val url: String,
    val publishableKey: String,
)

object AuthConfiguration {
    const val magicLinkRedirectUri = "com.todolist.app://auth"
    private val callbackUri = URI(magicLinkRedirectUri)

    val deepLinkScheme: String
        get() = callbackUri.scheme

    val deepLinkHost: String
        get() = checkNotNull(callbackUri.host)

    val isConfigured: Boolean
        get() = clientConfiguration != null

    /** The normalized client-safe values used for both validation and Supabase client creation. */
    val clientConfiguration: SupabaseClientConfiguration?
        get() = resolve(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_PUBLISHABLE_KEY)

    /**
     * Removes whitespace and one pair of harmless surrounding single or double quotes that can be
     * introduced when CI secrets are copied from shell or environment-file syntax.
     */
    fun normalize(value: String): String {
        val trimmed = value.trim()
        val hasMatchingQuotes = trimmed.length >= 2 &&
            trimmed.first() == trimmed.last() &&
            trimmed.first() in setOf('\'', '"')
        return if (hasMatchingQuotes) trimmed.substring(1, trimmed.lastIndex).trim() else trimmed
    }

    /** Returns normalized values only when they are safe to use as a Supabase public client config. */
    fun resolve(supabaseUrl: String, publishableKey: String): SupabaseClientConfiguration? {
        val normalizedUrl = normalize(supabaseUrl)
        val normalizedKey = normalize(publishableKey)
        val uri = runCatching { URI(normalizedUrl) }.getOrNull() ?: return null
        val usableUrl = uri.scheme.equals("https", ignoreCase = true) &&
            !uri.host.isNullOrBlank() &&
            !uri.host.equals("your-project.supabase.co", ignoreCase = true)
        val usableKey = normalizedKey.isNotBlank() &&
            !normalizedKey.contains("your-client-safe-publishable-key", ignoreCase = true)
        return if (usableUrl && usableKey) {
            SupabaseClientConfiguration(normalizedUrl, normalizedKey)
        } else {
            null
        }
    }

    /** Keeps malformed or example-only values from producing confusing network failures. */
    fun isValid(supabaseUrl: String, publishableKey: String): Boolean {
        return resolve(supabaseUrl, publishableKey) != null
    }

    /** Only this exact callback is handed to the Supabase SDK for PKCE verification. */
    fun isExpectedRedirectUri(uri: String?): Boolean {
        val parsed = uri?.let { runCatching { URI(it) }.getOrNull() } ?: return false
        return parsed.scheme.equals(callbackUri.scheme, ignoreCase = true) &&
            parsed.host.equals(callbackUri.host, ignoreCase = true) &&
            parsed.path.orEmpty() == callbackUri.path.orEmpty()
    }
}
