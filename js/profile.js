const HTTP_UNAUTHORIZED = 401;
const EMPTY_VALUE_TEXT = 'Not provided';

$(function () {
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

    let currentProfile = null;

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

    function requestProfile(action, extraFields) {
        return $.ajax({
            url: 'php/profile.php',
            method: 'POST',
            dataType: 'json',
            data: $.extend({ action: action, token: session.token }, extraFields)
        });
    }

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

    $logoutButton.on('click', function () {
        setButtonLoading($logoutButton, true, 'Logging out...');
        requestProfile('logout', {}).always(redirectToLogin);
    });
});
