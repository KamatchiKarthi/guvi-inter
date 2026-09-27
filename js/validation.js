/*
 * Form validation used by the register, login and profile pages.
 * Each validateX function takes the raw input value and returns an error message, or '' when valid.
 * Optional profile fields return '' when left empty.
 */

const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 100;
const FULL_NAME_PATTERN = /^\p{L}[\p{L} .'-]*$/u;
const EMAIL_MAX_LENGTH = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
// PHP's password_hash (bcrypt) ignores everything after 72 bytes, so longer passwords are rejected.
const PASSWORD_MAX_BYTES = 72;
const AGE_MIN = 1;
const AGE_MAX = 120;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CONTACT_PATTERN = /^\+?[0-9][0-9\s-]*$/;
const CONTACT_MIN_DIGITS = 10;
const CONTACT_MAX_DIGITS = 15;
const CONTACT_MAX_LENGTH = 20;
const ADDRESS_MIN_LENGTH = 5;
const ADDRESS_MAX_LENGTH = 255;

// Measures password length in UTF-8 bytes, the unit bcrypt uses.
const passwordEncoder = new TextEncoder();

function validateFullName(fullNameInput) {
    const fullName = fullNameInput.trim();
    if (fullName === '') {
        return 'Full name is required.';
    }
    if (fullName.length < FULL_NAME_MIN_LENGTH || fullName.length > FULL_NAME_MAX_LENGTH) {
        return 'Full name must be between 2 and 100 characters.';
    }
    if (!FULL_NAME_PATTERN.test(fullName)) {
        return 'Full name can only contain letters, spaces, apostrophes, dots and hyphens.';
    }
    return '';
}

function validateEmail(emailInput) {
    const email = emailInput.trim();
    if (email === '') {
        return 'Email is required.';
    }
    if (email.length > EMAIL_MAX_LENGTH) {
        return 'Email must be 255 characters or fewer.';
    }
    if (!EMAIL_PATTERN.test(email)) {
        return 'Please enter a valid email address.';
    }
    return '';
}

// Login only checks length; the strength rules apply when a password is created (validateNewPassword).
function validatePasswordLength(password) {
    if (password === '') {
        return 'Password is required.';
    }
    const passwordBytes = passwordEncoder.encode(password).length;
    if (passwordBytes < PASSWORD_MIN_LENGTH || passwordBytes > PASSWORD_MAX_BYTES) {
        return 'Password must be between 8 and 72 characters.';
    }
    return '';
}

function validateNewPassword(password) {
    const lengthError = validatePasswordLength(password);
    if (lengthError !== '') {
        return lengthError;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return 'Password must include an uppercase letter, a lowercase letter and a number.';
    }
    return '';
}

function validateConfirmPassword(password, confirmPassword) {
    if (confirmPassword === '') {
        return 'Please confirm your password.';
    }
    return password === confirmPassword ? '' : 'Passwords do not match.';
}

// Today at local midnight, so date comparisons ignore the current time of day.
function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toIsoDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + month + '-' + day;
}

// Returns null for impossible dates such as 2024-02-31, which new Date() would silently roll over to March.
function parseIsoDate(dateInput) {
    if (!ISO_DATE_PATTERN.test(dateInput)) {
        return null;
    }
    const [year, month, day] = dateInput.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return toIsoDate(parsedDate) === dateInput ? parsedDate : null;
}

// Age in whole years; one year less if this year's birthday has not happened yet.
function calculateAge(dateOfBirth) {
    const today = getToday();
    const hadBirthdayThisYear = today.getMonth() > dateOfBirth.getMonth()
        || (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());
    return today.getFullYear() - dateOfBirth.getFullYear() - (hadBirthdayThisYear ? 0 : 1);
}

function validateAge(ageInput) {
    const age = ageInput.trim();
    if (age === '') {
        return '';
    }
    const ageNumber = /^\d+$/.test(age) ? Number(age) : 0;
    if (ageNumber < AGE_MIN || ageNumber > AGE_MAX) {
        return 'Age must be a whole number between 1 and 120.';
    }
    return '';
}

function validateDateOfBirth(dobInput) {
    const dob = dobInput.trim();
    if (dob === '') {
        return '';
    }
    const dateOfBirth = parseIsoDate(dob);
    if (dateOfBirth === null) {
        return 'Please enter a valid date of birth.';
    }
    if (dateOfBirth > getToday()) {
        return 'Date of birth cannot be in the future.';
    }
    if (calculateAge(dateOfBirth) > AGE_MAX) {
        return 'Date of birth cannot be more than 120 years ago.';
    }
    return '';
}

// Only compared when both fields are filled in and individually valid, so the user sees one error at a time.
function validateAgeMatchesDateOfBirth(ageInput, dobInput) {
    const age = ageInput.trim();
    const dob = dobInput.trim();
    if (age === '' || dob === '' || validateAge(age) !== '' || validateDateOfBirth(dob) !== '') {
        return '';
    }
    return calculateAge(parseIsoDate(dob)) === Number(age) ? '' : 'Age does not match your date of birth.';
}

function validateContact(contactInput) {
    const contact = contactInput.trim();
    if (contact === '') {
        return '';
    }
    const digitCount = contact.replace(/\D/g, '').length;
    const isValidContact = contact.length <= CONTACT_MAX_LENGTH
        && CONTACT_PATTERN.test(contact)
        && digitCount >= CONTACT_MIN_DIGITS
        && digitCount <= CONTACT_MAX_DIGITS;
    return isValidContact ? '' : 'Contact number must have 10 to 15 digits and may start with +.';
}

function validateAddress(addressInput) {
    const address = addressInput.trim();
    if (address === '') {
        return '';
    }
    if (address.length < ADDRESS_MIN_LENGTH || address.length > ADDRESS_MAX_LENGTH) {
        return 'Address must be between 5 and 255 characters.';
    }
    return '';
}

/**
 * Wires inline Bootstrap validation to a form. fieldValidators maps input ids to validateX functions.
 * Each field needs a matching "<fieldId>Error" element to show its message.
 * A field's error first appears when the user leaves it (blur), then updates live while typing,
 * so users are not warned before they have finished entering a value.
 */
function createFormValidator(fieldValidators) {
    const fieldIds = Object.keys(fieldValidators);

    function getField(fieldId) {
        return $('#' + fieldId);
    }

    function showFieldError(fieldId, message) {
        const hasError = message !== '';
        getField(fieldId).toggleClass('is-invalid', hasError).attr('aria-invalid', String(hasError));
        $('#' + fieldId + 'Error').text(message);
    }

    function validateField(fieldId) {
        const message = fieldValidators[fieldId](getField(fieldId).val());
        showFieldError(fieldId, message);
        return message === '';
    }

    fieldIds.forEach(function (fieldId) {
        getField(fieldId)
            .on('blur', function () {
                $(this).data('touched', true);
                validateField(fieldId);
            })
            .on('input change', function () {
                if ($(this).data('touched')) {
                    validateField(fieldId);
                }
            });
    });

    return {
        validateAll: function () {
            fieldIds.forEach(function (fieldId) {
                getField(fieldId).data('touched', true);
            });
            const invalidFieldIds = fieldIds.filter(function (fieldId) {
                return !validateField(fieldId);
            });
            if (invalidFieldIds.length > 0) {
                getField(invalidFieldIds[0]).trigger('focus');
            }
            return invalidFieldIds.length === 0;
        },

        revalidateIfTouched: function (fieldId) {
            if (getField(fieldId).data('touched')) {
                validateField(fieldId);
            }
        },

        // Shows field errors returned by PHP (e.g. "email already exists"); returns false when there are none.
        showServerErrors: function (jqXHR) {
            const serverErrors = (jqXHR.responseJSON && jqXHR.responseJSON.errors) || {};
            const erroredFieldIds = Object.keys(serverErrors).filter(function (fieldId) {
                return fieldIds.includes(fieldId);
            });
            erroredFieldIds.forEach(function (fieldId) {
                showFieldError(fieldId, serverErrors[fieldId]);
            });
            if (erroredFieldIds.length > 0) {
                getField(erroredFieldIds[0]).trigger('focus');
            }
            return erroredFieldIds.length > 0;
        },

        reset: function () {
            fieldIds.forEach(function (fieldId) {
                getField(fieldId).removeData('touched');
                showFieldError(fieldId, '');
            });
        }
    };
}
