package com.todolist.app.data.auth

import com.todolist.app.BuildConfig
import org.junit.Test

class AuthConfigurationBuildConfigDiagnosticTest {
    @Test
    fun reportsSupabaseConfigurationMetadata() {
        println(
            "SUPABASE_URL Gradle environment present: " +
                !System.getenv("SUPABASE_URL").isNullOrBlank(),
        )
        println("SUPABASE_URL BuildConfig value present: ${BuildConfig.SUPABASE_URL.isNotBlank()}")
        println(
            "SUPABASE_PUBLISHABLE_KEY Gradle environment present: " +
                !System.getenv("SUPABASE_PUBLISHABLE_KEY").isNullOrBlank(),
        )
        println(
            "SUPABASE_PUBLISHABLE_KEY BuildConfig value present: " +
                BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank(),
        )
        println("AuthConfiguration.isConfigured: ${AuthConfiguration.isConfigured}")
    }
}
