/*
 * Profile page: loads the profile using the token from localStorage, switches between
 * the read-only view and the edit form, saves changes and handles logout.
 */

const HTTP_UNAUTHORIZED = 401;
const EMPTY_VALUE_TEXT = 'Not provided';

$(function () {
    // Not logged in: this page needs a session token.
    const session = getStoredSession();
    if (!session) {
        window.location.replace('login.html');
        return;
    }

    const $profileAlert = $('#profileAlert');
    const $profileLoading = $('#profileLoading');
    const $profileContent = $('#profileContent');
    const $profileView = $('#profileView');
    const $profileEditSection = $('#profileEditSection');
    const $profileForm = $('#profileForm');
    const $editProfileButton = $('#editProfileButton');
    const $cancelEditButton = $('#cancelEditButton');
    const $saveProfileButton = $('#saveProfileButton');
    const $logoutButton = $('#logoutButton');
    const $dob = $('#dob');

    // Last profile loaded from the server; used to refill the form when editing starts.
    let currentProfile = null;

    // Age is also checked against the date of birth, so it is re-validated whenever dob changes.
    const profileValidator = createFormValidator({
        age: function (ageInput) {
            return validateAge(ageInput) || validateAgeMatchesDateOfBirth(ageInput, $dob.val());
        },
        dob: validateDateOfBirth,
        contact: validateContact,
        address: validateAddress
    });

    $dob.attr('max', toIsoDate(getToday())).on('input change', function () {
        profileValidator.revalidateIfTouched('age');
    });

    function redirectToLogin() {
        clearSession();
        window.location.replace('login.html');
    }

    // Every profile.php call sends the action plus the session token for Redis to verify.
    function requestProfile(action, extraFields) {
        return $.ajax({
            url: 'php/profile.php',
            method: 'POST',
            dataType: 'json',
            data: $.extend({ action: action, token: session.token }, extraFields)
        });
    }

    // 401 means the Redis session expired or was deleted, so the stale local token is cleared.
    function handleRequestFailure(jqXHR) {
        if (jqXHR.status === HTTP_UNAUTHORIZED) {
            redirectToLogin();
            return;
        }
        showAlert($profileAlert, getAjaxErrorMessage(jqXHR), 'danger');
    }

    function formatDateOfBirth(isoDate) {
        return parseIsoDate(isoDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function renderDetailValue($detail, displayValue) {
        const hasValue = displayValue !== null && displayValue !== '';
        $detail.text(hasValue ? displayValue : EMPTY_VALUE_TEXT).toggleClass('text-muted', !hasValue);
    }

    function fillProfileForm(profile) {
        $('#age').val(profile.age === null ? '' : profile.age);
        $dob.val(profile.dob || '');
        $('#contact').val(profile.contact || '');
        $('#address').val(profile.address || '');
        profileValidator.reset();
    }

    function renderProfile(profile) {
        currentProfile = profile;
        $('#profileAvatar').text(profile.fullName.charAt(0).toUpperCase());
        $('#profileName').text(profile.fullName);
        $('#profileEmail').text(profile.email);
        renderDetailValue($('#viewAge'), profile.age === null ? null : String(profile.age));
        renderDetailValue($('#viewDob'), profile.dob ? formatDateOfBirth(profile.dob) : null);
        renderDetailValue($('#viewContact'), profile.contact);
        renderDetailValue($('#viewAddress'), profile.address);
    }

    function showProfileView() {
        $profileEditSection.addClass('d-none');
        $profileView.removeClass('d-none');
        $editProfileButton.trigger('focus');
    }

    function showEditForm() {
        hideAlert($profileAlert);
        fillProfileForm(currentProfile);
        $profileView.addClass('d-none');
        $profileEditSection.removeClass('d-none');
        $('#age').trigger('focus');
    }

    requestProfile('fetch', {})
        .done(function (response) {
            renderProfile(response.data);
            $profileContent.removeClass('d-none');
        })
        .fail(handleRequestFailure)
        .always(function () {
            $profileLoading.addClass('d-none');
        });

    $editProfileButton.on('click', showEditForm);

    $cancelEditButton.on('click', function () {
        hideAlert($profileAlert);
        showProfileView();
    });

    // Handles both the button click and the Enter key; preventDefault stops the browser's
    // own form submission, so data is only ever sent through $.ajax.
    $profileForm.on('submit', function (event) {
        event.preventDefault();
        hideAlert($profileAlert);

        if (!profileValidator.validateAll()) {
            return;
        }

        setButtonLoading($saveProfileButton, true, 'Saving...');
        $cancelEditButton.prop('disabled', true);

        requestProfile('update', {
            age: $('#age').val().trim(),
            dob: $dob.val(),
            contact: $('#contact').val().trim(),
            address: $('#address').val().trim()
        })
            .done(function (response) {
                renderProfile(response.data);
                showProfileView();
                showAlert($profileAlert, response.message, 'success');
            })
            .fail(handleRequestFailure)
            .always(function () {
                setButtonLoading($saveProfileButton, false);
                $cancelEditButton.prop('disabled', false);
            });
    });

    // The local session is cleared even if the request fails, so the user is never stuck logged in.
    $logoutButton.on('click', function () {
        setButtonLoading($logoutButton, true, 'Logging out...');
        requestProfile('logout', {}).always(redirectToLogin);
    });
});
