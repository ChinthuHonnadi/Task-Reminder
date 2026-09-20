package com.todolist.app.data.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Stores ciphertext only; the AES key is non-exportable and held by Android Keystore. */
class AndroidKeystoreSecureStorage(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun read(key: String): String? {
        val encoded = preferences.getString(key, null) ?: return null
        return runCatching { decrypt(encoded) }
            .getOrElse {
                preferences.edit().remove(key).commit()
                null
            }
    }

    fun write(key: String, value: String) {
        check(preferences.edit().putString(key, encrypt(value)).commit()) {
            "Couldn't securely save the sign-in session."
        }
    }

    fun remove(key: String) {
        preferences.edit().remove(key).commit()
    }

    /** Removes only authentication ciphertext; the Android Keystore key remains non-exportable. */
    fun clearAuthenticationState() {
        preferences.edit()
            .remove(SESSION_KEY)
            .remove(CODE_VERIFIER_KEY)
            .commit()
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val encrypted = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        return Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)
    }

    private fun decrypt(encoded: String): String {
        val encrypted = Base64.decode(encoded, Base64.NO_WRAP)
        require(encrypted.size > IV_SIZE_BYTES) { "Encrypted value is invalid." }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.DECRYPT_MODE,
            secretKey(),
            GCMParameterSpec(TAG_SIZE_BITS, encrypted.copyOfRange(0, IV_SIZE_BYTES)),
        )
        return String(cipher.doFinal(encrypted.copyOfRange(IV_SIZE_BYTES, encrypted.size)), StandardCharsets.UTF_8)
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE).apply {
            init(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build(),
            )
        }.generateKey()
    }

    private companion object {
        const val PREFERENCES_NAME = "todo_list_secure_auth"
        const val KEY_ALIAS = "todo_list_auth_aes_v1"
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_SIZE_BYTES = 12
        const val TAG_SIZE_BITS = 128
        const val SESSION_KEY = "session"
        const val CODE_VERIFIER_KEY = "pkce_code_verifier"
    }
}
