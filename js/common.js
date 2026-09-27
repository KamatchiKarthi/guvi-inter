/*
 * Helpers shared by every page: the localStorage login session,
 * Bootstrap alerts and button loading states.
 */

// localStorage holds { token, fullName }; PHP sessions are not used anywhere.
const SESSION_STORAGE_KEY = 'guviSession';
const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Please try again.';

/**
 * Returns the stored session or null. A corrupted value is removed,
 * so the user is simply sent to the login page instead of hitting an error.
 */
function getStoredSession() {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
        return null;
    }

    try {
        const session = JSON.parse(rawSession);
        return session && typeof session.token === 'string' ? session : null;
    } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
    }
}

function saveSession(session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

function showAlert($alert, message, alertType) {
    $alert
        .removeClass('d-none alert-success alert-danger')
        .addClass('alert-' + alertType)
        .text(message);
}

function hideAlert($alert) {
    $alert.addClass('d-none').text('');
}

// Prefers the message sent by PHP; falls back when the server could not be reached at all.
function getAjaxErrorMessage(jqXHR) {
    return (jqXHR.responseJSON && jqXHR.responseJSON.message) || NETWORK_ERROR_MESSAGE;
}

// Disabling the button while a request runs prevents duplicate submissions; the original label is restored afterwards.
function setButtonLoading($button, isLoading, loadingText) {
    if (isLoading) {
        $button.data('defaultText', $button.text().trim());
        $button.prop('disabled', true).text(loadingText);
        return;
    }

    $button.prop('disabled', false).text($button.data('defaultText'));
}
