package com.todolist.app.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.NoteAlt
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.todolist.app.domain.model.AppDestination
import com.todolist.app.ui.screens.AuthenticationScreen
import com.todolist.app.ui.screens.CalendarScreen
import com.todolist.app.ui.screens.HomeScreen
import com.todolist.app.ui.screens.NotesScreen
import com.todolist.app.ui.screens.SettingsScreen
import com.todolist.app.ui.screens.StartupScreen
import com.todolist.app.ui.screens.TasksScreen

@Composable
fun TodoListApp(viewModel: TodoListViewModel) {
    val selectedDestination by viewModel.selectedDestination.collectAsState()
    val authUiState by viewModel.authUiState.collectAsState()

    when {
        authUiState.isRestoringSession -> StartupScreen()
        authUiState.user == null -> AuthenticationScreen(
            state = authUiState,
            onEmailChanged = viewModel::updateEmail,
            onSendMagicLink = viewModel::sendMagicLink,
        )
        else -> AuthenticatedApp(
            selectedDestination = selectedDestination,
            userEmail = authUiState.user?.email,
            onDestinationSelected = viewModel::selectDestination,
            onSignOut = viewModel::signOut,
        )
    }
}

@Composable
private fun AuthenticatedApp(
    selectedDestination: AppDestination,
    userEmail: String?,
    onDestinationSelected: (AppDestination) -> Unit,
    onSignOut: () -> Unit,
) {
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            TodoListBottomNavigation(
                selectedDestination = selectedDestination,
                onDestinationSelected = onDestinationSelected,
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    // Task creation is intentionally introduced in Phase 4.
                },
            ) {
                Icon(
                    imageVector = Icons.Outlined.Add,
                    contentDescription = "Quick add task",
                )
            }
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
    ) { contentPadding ->
        TodoListDestination(
            destination = selectedDestination,
            contentPadding = contentPadding,
            userEmail = userEmail,
            onSignOut = onSignOut,
        )
    }
}

@Composable
private fun TodoListDestination(
    destination: AppDestination,
    contentPadding: PaddingValues,
    userEmail: String?,
    onSignOut: () -> Unit,
) {
    when (destination) {
        AppDestination.HOME -> HomeScreen(contentPadding)
        AppDestination.TASKS -> TasksScreen(contentPadding)
        AppDestination.NOTES -> NotesScreen(contentPadding)
        AppDestination.CALENDAR -> CalendarScreen(contentPadding)
        AppDestination.SETTINGS -> SettingsScreen(contentPadding, userEmail, onSignOut)
    }
}

@Composable
private fun TodoListBottomNavigation(
    selectedDestination: AppDestination,
    onDestinationSelected: (AppDestination) -> Unit,
) {
    NavigationBar {
        navigationItems.forEach { item ->
            NavigationBarItem(
                selected = item.destination == selectedDestination,
                onClick = { onDestinationSelected(item.destination) },
                icon = { Icon(imageVector = item.icon, contentDescription = item.destination.label) },
                label = { Text(item.destination.label) },
            )
        }
    }
}

private data class NavigationItem(
    val destination: AppDestination,
    val icon: ImageVector,
)

private val navigationItems = listOf(
    NavigationItem(AppDestination.HOME, Icons.Outlined.Home),
    NavigationItem(AppDestination.TASKS, Icons.Outlined.CheckCircle),
    NavigationItem(AppDestination.NOTES, Icons.Outlined.NoteAlt),
    NavigationItem(AppDestination.CALENDAR, Icons.Outlined.CalendarMonth),
    NavigationItem(AppDestination.SETTINGS, Icons.Outlined.Settings),
)
