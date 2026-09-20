package com.todolist.app.data.auth

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EmailAddressValidatorTest {
    @Test
    fun `accepts a valid submitted email`() {
        assertTrue(EmailAddressValidator.isValid(" person@example.com "))
    }

    @Test
    fun `rejects invalid submitted email values before a magic-link request`() {
        assertFalse(EmailAddressValidator.isValid(""))
        assertFalse(EmailAddressValidator.isValid("person"))
        assertFalse(EmailAddressValidator.isValid("person@example"))
        assertFalse(EmailAddressValidator.isValid("person @example.com"))
    }
}
