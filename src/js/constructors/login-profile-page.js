import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as structs from "../exports/structs.js";
import * as strings from "../exports/strings.js";
import * as registerPage from "./register-page.js"; 
import * as editProfilePage from "./edit-profile.js";
import * as resolvers from "../exports/resolvers.js";

let login, profile;

async function submitLogin(event) {
    event.preventDefault();

    let bIsValid = true;

    // Validating email
    bIsValid = functions.validateEmail(login.querySelector('#email')) && bIsValid;

    // Validating password
    bIsValid = functions.validatePassword(login.querySelector('#password')) && bIsValid;

    if (!bIsValid) return;

    const loginData = new structs.loginDto(login.querySelector('#email').value, 
                                            login.querySelector('#password').value);

    event.target.querySelector('#logInSubmit').classList.add('processing');

    const response = await fetch(links.apiURL + 'account/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(loginData)
    });

    event.target.querySelector('#logInSubmit').classList.remove('processing');

    if (response.ok) {

        const result = await response.json();

        localStorage.setItem('token', result.token);
        functions.navigationClick(mainDOMElements.profileNav, load);
    }
    else {
        if (response.status === 400) {
            resolvers.loginFailed();
        }
        else {
            functions.resolveError(response.status);
        }
    }
}

async function loadProfile() {

    const response = await fetch(links.apiURL + 'account/profile', { 
        signal: functions.abortController.signal,
        headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token')
        }
    });
    
    if (response.ok) {

        const result = await response.json();

        functions.setIconStyle(profile.querySelector('.profile__profile-icon'), result.fullName);
        functions.setTrimmedText(profile.querySelector('#username'), result.fullName, 12);
        profile.querySelector('#username').title = result.fullName;
        functions.setTrimmedEmail(profile.querySelector('#email'), result.email);
        profile.querySelector('#estDateValue').innerText = functions.getDateString(result.createTime);
        profile.querySelector('#birthDate').innerText = result.birthDate !== null ? functions.getDateString(result.birthDate) : strings.notSpecified;
        profile.querySelector('#gender').innerText = functions.getGenderString(result.gender);
        profile.querySelector('#phoneNumber').innerText = result.phoneNumber !== null ? result.phoneNumber : strings.notSpecified;
        
        localStorage.setItem('email', result.email);
        localStorage.setItem('username', result.fullName);
        localStorage.setItem('id', result.id);
    }
    else {
        localStorage.clear('token');
        functions.navigationClick(mainDOMElements.profileNav, load);
    }

    functions.finishedLoadingPage();
}

async function loadSubMenu() {
    
    const response = await fetch("pages/profile/sub-block.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(post, 'text/html');
    const profileActions = doc.querySelector('.profile-actions');

    profileActions.querySelector('#profileActionEdit').addEventListener('click', (e) => functions.navigationClick(null, editProfilePage.load));
    profileActions.querySelector('#profileActionLogout').addEventListener('click', functions.logout);

    mainDOMElements.subBlock.appendChild(profileActions);
}

async function load() {

    functions.abortAll();    

    let fetchURL = "/pages/login/main-block.html";

    if (localStorage.getItem('token') !== null) {
        fetchURL = "/pages/profile/main-block.html";
        document.title = "Мой профиль";
        window.history.replaceState({}, '', "/profile");
    }
    else {
        document.title = "Авторизация";
        window.history.replaceState({}, '', "/login");
    }

    const delayPromise = new Promise(resolve => setTimeout(resolve, 500));

    const fetchPromise = fetch(fetchURL, { signal: functions.abortController.signal })
        .then(response => response.text())
        .then(htmlString => { return htmlString });
    
    Promise.all([fetchPromise, delayPromise]).then(([htmlString]) => {

        functions.cleanUp();
        const parser = new DOMParser();

        mainDOMElements.profileWrapper.classList.add('hidden');

        if (localStorage.getItem('token') !== null) {
            
            profile = parser.parseFromString(htmlString, 'text/html').querySelector(".profile");
            mainDOMElements.mainBlock.appendChild(profile);

            loadSubMenu();
            loadProfile();
        }
        else {

            login = parser.parseFromString(htmlString, 'text/html').querySelector(".log-in");
            login.querySelector('#email').addEventListener('focus', functions.removeErrorHighlight);
            login.querySelector('#password').addEventListener('focus', functions.removeErrorHighlight);
            login.querySelector('#loginForm').addEventListener('submit', submitLogin);
            login.querySelector('.register-button').addEventListener('click', (e) => functions.navigationClick(null, registerPage.load));
            mainDOMElements.mainBlock.appendChild(login);

            functions.finishedLoadingPage();

        }
    });
}

export { load };