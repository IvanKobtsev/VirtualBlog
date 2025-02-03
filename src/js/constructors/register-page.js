import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as structs from "../exports/structs.js";
import * as profilePage from "./login-profile-page.js";

let register;

async function submitRegister(event) {
    event.preventDefault();

    let bIsValid = true;

    // Validating username
    bIsValid = functions.validateRangeOfCharacters(register.querySelector('#username'), 1, 1000);

    // Validating birthdate
    bIsValid = functions.validateBirthDate(register.querySelector('#birthDate')) && bIsValid;
    
    // Validating phone number
    bIsValid = functions.validatePhoneNumber(register.querySelector('#phoneNumber')) && bIsValid;

    // Validating email
    bIsValid = functions.validateEmail(register.querySelector('#email')) && bIsValid;

    // Validating password
    bIsValid = functions.validatePassword(register.querySelector('#password')) && bIsValid;

    if (!bIsValid) return;
    
    const registerData = new structs.registerDto(
        register.querySelector('#username').value,
        register.querySelector('#birthDate').value !== '' ? 
        register.querySelector('#birthDate').value : null,
        functions.getGenderEnum(register.querySelector('#gender').value),
        register.querySelector('#phoneNumber').value.length > 0 ? 
        register.querySelector('#phoneNumber').value : null,
        register.querySelector('#email').value,
        register.querySelector('#password').value);

    event.target.querySelector('#registerSubmit').classList.add('processing');

    const response = await fetch(links.apiURL + 'account/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(registerData)
    });

    event.target.querySelector('#registerSubmit').classList.remove('processing');

    if (response.ok) {

        const result = await response.json();

        localStorage.setItem('token', result.token);
        profilePage.load();
    }
    else {
        const error = await response.json();
        functions.resolveError(response.status, error);
    }
}

async function load() {

    functions.abortAll();

    document.title = "Регистрация";
    window.history.replaceState({}, '', "/register");

    const delayPromise = new Promise(resolve => setTimeout(resolve, 500));

    const fetchPromise = fetch("/pages/register/main-block.html", { signal: functions.abortController.signal })
        .then(response => response.text())
        .then(htmlString => { return htmlString });
    
    Promise.all([fetchPromise, delayPromise]).then(([htmlString]) => {

        functions.cleanUp();

        const parser = new DOMParser();
        register = parser.parseFromString(htmlString, 'text/html').querySelector(".register");
        register.querySelector('#registerForm').addEventListener('submit', submitRegister);
        register.querySelectorAll('.form-input__input').forEach(el => el.addEventListener('focus', functions.removeErrorHighlight));
    
        mainDOMElements.mainBlock.appendChild(register);

        functions.finishedLoadingPage();
    });
}

export { load }