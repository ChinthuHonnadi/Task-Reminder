package com.todolist.app.data.auth

/** Lightweight client-side feedback; Supabase remains the authority for account validity. */
object EmailAddressValidator {
    private val emailPattern = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

    fun isValid(value: String): Boolean = emailPattern.matches(value.trim())
}
