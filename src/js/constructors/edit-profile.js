import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as structs from "../exports/structs.js";
import * as profilePage from "./login-profile-page.js";

let editProfile;

async function submitUpdatedProfile(event) {
    event.preventDefault();

    let bIsValid = true;

    // Validating username
    bIsValid = functions.validateRangeOfCharacters(editProfile.querySelector('#profileUsername'), 1, 1000);

    // Validating email
    bIsValid = functions.validateEmail(editProfile.querySelector('#profileEmail')) && bIsValid;

    // Validating birthdate
    bIsValid = functions.validateBirthDate(editProfile.querySelector('#profileBirthDate')) && bIsValid;

    // Validating phone number
    bIsValid = functions.validatePhoneNumber(editProfile.querySelector('#profilePhoneNumber')) && bIsValid;

    if (!bIsValid) return;

    const profileData = new structs.profileDto(
        editProfile.querySelector('#profileUsername').value,
        editProfile.querySelector('#profileEmail').value,
        editProfile.querySelector('#profileBirthDate').value !== '' ?
        editProfile.querySelector('#profileBirthDate').value : null,
        editProfile.querySelector('#profileGender').selectedOptions[0].value,
        editProfile.querySelector('#profilePhoneNumber').value.length > 0 ? 
        editProfile.querySelector('#profilePhoneNumber').value : null,
    );

    const response = await fetch(links.apiURL + 'account/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
            Authorization: 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(profileData)
    });

    if (response.ok) {
        // Go to main page with filtering by author 
        mainDOMElements.profileNav.click();
    }
    else {
        functions.resolveError(response.status);
    }

}

async function load() {

    functions.abortAll();

    document.title = "Редактирование профиля";
    window.history.replaceState({}, '', "/profile/edit");

    const delayPromise = new Promise(resolve => setTimeout(resolve, 500));

    const fetchPromise = fetch("/pages/edit-profile/main-block.html", { signal: functions.abortController.signal })
        .then(response => response.text())
        .then(htmlString => { return htmlString });
    
    const profileDataPromise = fetch(links.apiURL + 'account/profile', { 
        signal: functions.abortController.signal,
        headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token')
        }
    }).then(response => response.json());
    
    Promise.all([fetchPromise, profileDataPromise, delayPromise]).then(([htmlString, profileData]) => {

        functions.cleanUp();

        const parser = new DOMParser();
        editProfile = parser.parseFromString(htmlString, 'text/html').querySelector(".edit-profile");
        
        // Creating "Сохранить" button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';
        const saveButton = document.createElement('div');
        saveButton.innerText = 'Сохранить';
        saveButton.className = 'clickable button form-submit';
        saveButton.addEventListener('click', submitUpdatedProfile);
        actionsDiv.appendChild(saveButton);
        
        editProfile.querySelectorAll('.form-input__input').forEach(el => el.addEventListener('focus', functions.removeErrorHighlight));

        mainDOMElements.subBlock.appendChild(actionsDiv);
        mainDOMElements.mainBlock.appendChild(editProfile);

        editProfile.querySelector('#profileUsername').value = profileData.fullName;
        editProfile.querySelector('#profileEmail').value = profileData.email;
        editProfile.querySelector('#profileBirthDate').value = functions.getDateStringForInput(profileData.birthDate);
        editProfile.querySelector('#profileGender').value = profileData.gender;
        editProfile.querySelector('#profilePhoneNumber').value = profileData.phoneNumber;

        functions.finishedLoadingPage();
    });
}

export { load }