/*
 * Login page: validates the form, sends the credentials with jQuery AJAX
 * and stores the returned session token in localStorage.
 */

$(function () {
    // Already logged in: skip straight to the profile page.
    if (getStoredSession()) {
        window.location.replace('profile.html');
        return;
    }

    const $loginForm = $('#loginForm');
    const $loginAlert = $('#loginAlert');
    const $loginButton = $('#loginButton');

    const loginValidator = createFormValidator({
        email: validateEmail,
        password: validatePasswordLength
    });

    // Handles both the button click and the Enter key; preventDefault stops the browser's
    // own form submission, so data is only ever sent through $.ajax.
    $loginForm.on('submit', function (event) {
        event.preventDefault();
        hideAlert($loginAlert);

        if (!loginValidator.validateAll()) {
            return;
        }

        setButtonLoading($loginButton, true, 'Logging in...');

        $.ajax({
            url: 'php/login.php',
            method: 'POST',
            dataType: 'json',
            data: {
                email: $('#email').val().trim(),
                password: $('#password').val()
            }
        })
            .done(function (response) {
                saveSession(response.data);
                window.location.replace('profile.html');
            })
            .fail(function (jqXHR) {
                showAlert($loginAlert, getAjaxErrorMessage(jqXHR), 'danger');
                setButtonLoading($loginButton, false);
            });
    });
});
