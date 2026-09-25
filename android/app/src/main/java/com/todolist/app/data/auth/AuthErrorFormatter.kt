package com.todolist.app.data.auth

object AuthErrorFormatter {
    private const val GENERIC_SEND_MAGIC_LINK_ERROR = "Couldn't send the magic link. Please try again."
    private const val GENERIC_DEEP_LINK_ERROR = "Couldn't complete sign-in. Request a new magic link and try again."
    private const val NETWORK_ERROR_MESSAGE = "Couldn't reach Supabase. Check your connection and try again."
    private const val DEEP_LINK_REDIRECT_ERROR = "This sign-in link isn't configured for the app. Check the Supabase redirect URL."

    private val SENSITIVE_KEYWORDS = listOf(
        "key",
        "token",
        "secret",
        "verifier",
        "password",
        "credential",
        "bearer",
        "authorization",
        "jwt",
    )

    fun formatSendMagicLinkError(error: Throwable): String {
        val detail = error.message.orEmpty().lowercase()
        if (detail.contains("network") || detail.contains("timeout")) {
            return NETWORK_ERROR_MESSAGE
        }

        val safeDetail = sanitizeDiagnosticDetail(error)
        return if (safeDetail != null) {
            "$GENERIC_SEND_MAGIC_LINK_ERROR ($safeDetail)"
        } else {
            GENERIC_SEND_MAGIC_LINK_ERROR
        }
    }

    fun formatDeepLinkError(error: Throwable): String {
        val detail = error.message.orEmpty().lowercase()
        if (detail.contains("network") || detail.contains("timeout")) {
            return NETWORK_ERROR_MESSAGE
        }

        val safeDetail = sanitizeDiagnosticDetail(error)
        if (detail.contains("redirect") || detail.contains("deeplink")) {
            return if (safeDetail != null) {
                "$DEEP_LINK_REDIRECT_ERROR ($safeDetail)"
            } else {
                DEEP_LINK_REDIRECT_ERROR
            }
        }

        return if (safeDetail != null) {
            "$GENERIC_DEEP_LINK_ERROR ($safeDetail)"
        } else {
            GENERIC_DEEP_LINK_ERROR
        }
    }

    fun sanitizeDiagnosticDetail(error: Throwable): String? {
        val raw = error.message?.trim().orEmpty()
        val exceptionType = error::class.simpleName ?: "Exception"

        if (raw.isBlank()) {
            return exceptionType
        }

        val lower = raw.lowercase()
        val containsSensitiveKeyword = SENSITIVE_KEYWORDS.any { lower.contains(it) } ||
            lower.contains("eyj")

        if (containsSensitiveKeyword) {
            return exceptionType
        }

        val sanitized = raw.replace(Regex("\\s+"), " ").take(120).trim()
        return sanitized.ifBlank { exceptionType }
    }
}
