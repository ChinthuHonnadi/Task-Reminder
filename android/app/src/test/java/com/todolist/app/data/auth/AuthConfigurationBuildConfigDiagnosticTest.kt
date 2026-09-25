package com.todolist.app.data.auth

import com.todolist.app.BuildConfig
import org.junit.Test
import java.net.URI

class AuthConfigurationBuildConfigDiagnosticTest {
    @Test
    fun reportsSupabaseConfigurationMetadata() {
        val parsedUrl = runCatching {
            URI(BuildConfig.SUPABASE_URL.trim())
        }.getOrNull()

        println(
            "SUPABASE_URL Gradle environment present: " +
                !System.getenv("SUPABASE_URL").isNullOrBlank(),
        )
        println("SUPABASE_URL BuildConfig value present: ${BuildConfig.SUPABASE_URL.isNotBlank()}")
        println("SUPABASE_URL parses as URI: ${parsedUrl != null}")
        println(
            "SUPABASE_URL scheme is HTTPS: " +
                parsedUrl?.scheme.equals("https", ignoreCase = true),
        )
        println("SUPABASE_URL host is present: ${!parsedUrl?.host.isNullOrBlank()}")
        println(
            "SUPABASE_URL host is not the example placeholder: " +
                (parsedUrl?.host?.equals("your-project.supabase.co", ignoreCase = true) == false),
        )
        println(
            "SUPABASE_PUBLISHABLE_KEY Gradle environment present: " +
                !System.getenv("SUPABASE_PUBLISHABLE_KEY").isNullOrBlank(),
        )
        println(
            "SUPABASE_PUBLISHABLE_KEY BuildConfig value present: " +
                BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank(),
        )
        println(
            "SUPABASE_PUBLISHABLE_KEY is not the example placeholder: " +
                !BuildConfig.SUPABASE_PUBLISHABLE_KEY.contains(
                    "your-client-safe-publishable-key",
                    ignoreCase = true,
                ),
        )
        println("AuthConfiguration.isConfigured: ${AuthConfiguration.isConfigured}")
    }
}
