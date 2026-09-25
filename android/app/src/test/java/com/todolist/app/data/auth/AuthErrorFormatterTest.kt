package com.todolist.app.data.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class AuthErrorFormatterTest {

    @Test
    fun `formatSendMagicLinkError returns network message on network or timeout failure`() {
        val error = IOException("Network connection timeout occurred")
        assertEquals(
            "Couldn't reach Supabase. Check your connection and try again.",
            AuthErrorFormatter.formatSendMagicLinkError(error),
        )
    }

    @Test
    fun `formatSendMagicLinkError does not use deep-link-specific wording even if error mentions redirect`() {
        val error = IllegalStateException("redirect_to is not allowed")
        val formatted = AuthErrorFormatter.formatSendMagicLinkError(error)

        assertTrue(formatted.startsWith("Couldn't send the magic link. Please try again."))
        assertTrue(formatted.contains("redirect_to is not allowed"))
        assertFalse(formatted.contains("This sign-in link isn't configured"))
        assertFalse(formatted.contains("Check the Supabase redirect URL"))
    }

    @Test
    fun `formatSendMagicLinkError sanitizes sensitive tokens, keys, verifiers, and passwords`() {
        val errorWithKey = RuntimeException("Failed with apikey=sb_publishable_secret_12345")
        val formattedWithKey = AuthErrorFormatter.formatSendMagicLinkError(errorWithKey)

        assertFalse(formattedWithKey.contains("12345"))
        assertFalse(formattedWithKey.contains("apikey"))
        assertTrue(formattedWithKey.contains("RuntimeException"))

        val errorWithToken = RuntimeException("access_token expired or invalid: token_xyz")
        val formattedWithToken = AuthErrorFormatter.formatSendMagicLinkError(errorWithToken)

        assertFalse(formattedWithToken.contains("token_xyz"))
        assertTrue(formattedWithToken.contains("RuntimeException"))

        val errorWithVerifier = RuntimeException("pkce code_verifier mismatch: verifier_abc")
        val formattedWithVerifier = AuthErrorFormatter.formatSendMagicLinkError(errorWithVerifier)

        assertFalse(formattedWithVerifier.contains("verifier_abc"))
        assertTrue(formattedWithVerifier.contains("RuntimeException"))
    }

    @Test
    fun `formatSendMagicLinkError provides fallback when message is blank`() {
        val error = Exception("   ")
        assertEquals(
            "Couldn't send the magic link. Please try again. (Exception)",
            AuthErrorFormatter.formatSendMagicLinkError(error),
        )
    }

    @Test
    fun `formatDeepLinkError uses deep link wording on redirect mismatch during deep link handling`() {
        val error = IllegalArgumentException("deeplink redirect url mismatch")
        val formatted = AuthErrorFormatter.formatDeepLinkError(error)

        assertTrue(formatted.startsWith("This sign-in link isn't configured for the app. Check the Supabase redirect URL."))
        assertTrue(formatted.contains("deeplink redirect url mismatch"))
    }

    @Test
    fun `formatDeepLinkError returns network message on network timeout during deep link handling`() {
        val error = IOException("Timeout connecting to server")
        assertEquals(
            "Couldn't reach Supabase. Check your connection and try again.",
            AuthErrorFormatter.formatDeepLinkError(error),
        )
    }

    @Test
    fun `formatDeepLinkError handles other errors safely without exposing secrets`() {
        val errorWithVerifier = RuntimeException("PKCE code_verifier is invalid: secret_verifier_data")
        val formatted = AuthErrorFormatter.formatDeepLinkError(errorWithVerifier)

        assertFalse(formatted.contains("secret_verifier_data"))
        assertFalse(formatted.contains("code_verifier"))
        assertTrue(formatted.startsWith("Couldn't complete sign-in. Request a new magic link and try again."))
        assertTrue(formatted.contains("RuntimeException"))
    }
}
