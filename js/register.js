/*
 * Register page: validates the form, creates the account with jQuery AJAX,
 * then sends the user to the login page.
 */

// Gives the user time to read the success message before moving to the login page.
const LOGIN_REDIRECT_DELAY_MS = 1500;

$(function () {
    // Already logged in: skip straight to the profile page.
    if (getStoredSession()) {
        window.location.replace('profile.html');
        return;
    }

    const $registerForm = $('#registerForm');
    const $registerAlert = $('#registerAlert');
    const $registerButton = $('#registerButton');
    const $password = $('#password');

    const registerValidator = createFormValidator({
        fullName: validateFullName,
        email: validateEmail,
        password: validateNewPassword,
        confirmPassword: function (confirmPassword) {
            return validateConfirmPassword($password.val(), confirmPassword);
        }
    });

    // Re-check "confirm password" when the password changes, so a stale mismatch error does not linger.
    $password.on('input', function () {
        registerValidator.revalidateIfTouched('confirmPassword');
    });

    // Handles both the button click and the Enter key; preventDefault stops the browser's
    // own form submission, so data is only ever sent through $.ajax.
    $registerForm.on('submit', function (event) {
        event.preventDefault();
        hideAlert($registerAlert);

        if (!registerValidator.validateAll()) {
            return;
        }

        setButtonLoading($registerButton, true, 'Registering...');

        $.ajax({
            url: 'php/register.php',
            method: 'POST',
            dataType: 'json',
            data: {
                fullName: $('#fullName').val().trim(),
                email: $('#email').val().trim(),
                password: $password.val()
            }
        })
            .done(function (response) {
                showAlert($registerAlert, response.message, 'success');
                $registerForm[0].reset();
                registerValidator.reset();
                setTimeout(function () {
                    window.location.href = 'login.html';
                }, LOGIN_REDIRECT_DELAY_MS);
            })
            .fail(function (jqXHR) {
                if (!registerValidator.showServerErrors(jqXHR)) {
                    showAlert($registerAlert, getAjaxErrorMessage(jqXHR), 'danger');
                }
                setButtonLoading($registerButton, false);
            });
    });
});
