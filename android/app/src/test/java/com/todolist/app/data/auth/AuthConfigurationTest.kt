package com.todolist.app.data.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthConfigurationTest {
    @Test
    fun `accepts a usable Supabase client configuration`() {
        assertTrue(
            AuthConfiguration.isValid(
                "https://project-ref.supabase.co",
                "sb_publishable_example_key",
            ),
        )
    }

    @Test
    fun `normalizes harmless surrounding whitespace and quotes before validation`() {
        val configuration = AuthConfiguration.resolve(
            "  \"https://project-ref.supabase.co\"  ",
            "  'sb_publishable_example_key'  ",
        )

        assertNotNull(configuration)
        assertEquals("https://project-ref.supabase.co", configuration?.url)
        assertEquals("sb_publishable_example_key", configuration?.publishableKey)
    }

    @Test
    fun `rejects missing malformed and example configuration`() {
        assertFalse(AuthConfiguration.isValid("", "key"))
        assertFalse(AuthConfiguration.isValid("  \"\"  ", "key"))
        assertFalse(AuthConfiguration.isValid("http://project-ref.supabase.co", "key"))
        assertFalse(AuthConfiguration.isValid("https://your-project.supabase.co", "key"))
        assertFalse(AuthConfiguration.isValid("https://project-ref.supabase.co", "your-client-safe-publishable-key"))
    }

    @Test
    fun `accepts only the Android auth callback`() {
        assertEquals("com.todolist.app://auth", AuthConfiguration.magicLinkRedirectUri)
        assertTrue(AuthConfiguration.isExpectedRedirectUri("${AuthConfiguration.magicLinkRedirectUri}?code=pkce-code"))
        assertFalse(AuthConfiguration.isExpectedRedirectUri("com.todolist.app://other?code=pkce-code"))
        assertFalse(AuthConfiguration.isExpectedRedirectUri("https://example.com/auth?code=pkce-code"))
    }
}
