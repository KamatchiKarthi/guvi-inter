const SESSION_STORAGE_KEY = 'guviSession';
const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Please try again.';

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

function getAjaxErrorMessage(jqXHR) {
    return (jqXHR.responseJSON && jqXHR.responseJSON.message) || NETWORK_ERROR_MESSAGE;
}

function setButtonLoading($button, isLoading, loadingText) {
    if (isLoading) {
        $button.data('defaultText', $button.text().trim());
        $button.prop('disabled', true).text(loadingText);
        return;
    }

    $button.prop('disabled', false).text($button.data('defaultText'));
}
