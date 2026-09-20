package com.todolist.app.data.auth

import io.github.jan.supabase.auth.CodeVerifierCache
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.exception.NoSessionFoundException
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class SecureSessionManager(
    private val storage: AndroidKeystoreSecureStorage,
    private val json: Json = Json { ignoreUnknownKeys = true },
) : SessionManager {
    override suspend fun saveSession(session: UserSession) {
        storage.write(SESSION_KEY, json.encodeToString(session))
    }

    override suspend fun loadSession(): UserSession {
        val savedSession = storage.read(SESSION_KEY) ?: throw NoSessionFoundException()
        return runCatching { json.decodeFromString<UserSession>(savedSession) }
            .getOrElse {
                storage.remove(SESSION_KEY)
                throw NoSessionFoundException()
            }
    }

    override suspend fun deleteSession() {
        storage.remove(SESSION_KEY)
    }

    private companion object {
        const val SESSION_KEY = "session"
    }
}

class SecureCodeVerifierCache(
    private val storage: AndroidKeystoreSecureStorage,
) : CodeVerifierCache {
    override suspend fun saveCodeVerifier(codeVerifier: String) {
        storage.write(CODE_VERIFIER_KEY, codeVerifier)
    }

    override suspend fun loadCodeVerifier(): String? = storage.read(CODE_VERIFIER_KEY)

    override suspend fun deleteCodeVerifier() {
        storage.remove(CODE_VERIFIER_KEY)
    }

    private companion object {
        const val CODE_VERIFIER_KEY = "pkce_code_verifier"
    }
}
