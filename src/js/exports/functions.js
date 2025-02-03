import * as mainDOMElements from "./dom.js";
import * as classNames from "./classNames.js";
import * as colors from "./colors.js";
import * as newPostPage from "../constructors/create-post.js";
import * as loginPage from "../constructors/login-profile-page.js";
import * as mainPage from "../constructors/main-page.js";
import * as registerPage from "../constructors/register-page.js";
import * as createPost from "../constructors/create-post.js";
import * as communities from "../constructors/groups-page.js";
import * as regexes from "./regexes.js";
import * as links from "./links.js";
import * as errorResolvers from "./resolvers.js";

let abortController = new AbortController();
let bFinishedAnimation = false;

// Static Functions

function makeStruct(names) {
    var names = names.split(' ');
    var count = names.length;
    function constructor() {
      for (var i = 0; i < count; ++i) {
        this[names[i]] = arguments[i];
      }
    }
    return constructor;
}

// Validators

function validateEmail(emailInput) {
    
    const emailString = emailInput.value;
    if (!regexes.email.test(emailString)) {
        emailInput.classList.add('invalid');
        return false;
    }

    return true;
}

function validatePassword(passwordInput) {

    const passwordString = passwordInput.value;
    if (!(passwordString.length > 5 && 
        regexes.capitalLetter.test(passwordString) && 
        regexes.digit.test(passwordString) &&
        regexes.specialSymbol.test(passwordString))) {

        passwordInput.classList.add('invalid');
        return false;
    }
    return true;
}

function validatePhoneNumber(numberInput) {
    
    const number = numberInput.value;
    if (number !== '' && !regexes.phoneNumber.test(number)) {
        numberInput.classList.add('invalid');
        return false;
    }
    return true;
}

function validateBirthDate(birthDateInput) {
    
    if (birthDateInput.value !== '') {

        const birthDate = new Date(birthDateInput.value);
        const currentDate = new Date();
    
        const fullYearsPassed = currentDate.getFullYear() - birthDate.getFullYear() - 
        (birthDate.getMonth() * 31 + birthDate.getDate() > currentDate.getMonth() * 30 + currentDate.getDate()
        ? 1 : 0);  

        if (fullYearsPassed < 18) {
            birthDateInput.classList.add('invalid');
            return false;
        }
    }
    
    return true;   
}

function validateImageURL(imageLinkInput) {
    
    if (imageLinkInput.value.length > 1000) {
        imageLinkInput.classList.add('invalid');
        return false;
    }
    return true;
}

function validateRangeOfCharacters(input, min, max) {

    if (input.value.length < min || input.value.length > max) {
        input.classList.add('invalid');
        return false;
    }
    return true;
}

function validateReadingTime(readingTimeInput) {

    const readingTime = Number(readingTimeInput.value);
    if (isNaN(readingTime) || readingTime < 1) {
        readingTimeInput.classList.add('invalid');
        return false;
    }
    return true;
}

// DOM-related

function lockScroll() {
    mainDOMElements.body.classList.add('scroll-locked');
}

function unlockScroll() {
    mainDOMElements.body.classList.remove('scroll-locked');
}

function cleanOverlayPost() {
    mainDOMElements.overlayBlock.replaceChildren();
}

function showPost() {
    mainDOMElements.postOverlay.classList.remove('hidden');
    lockScroll();
}

let closePostTimer;
function hidePost() {

    unlockScroll();

    if (!mainDOMElements.postOverlay.classList.contains('hidden')) {

        if (localStorage.getItem('beforeOpeningPostUrl') !== null) {

            document.title = localStorage.getItem('beforeOpeningPostTitle');
            window.history.replaceState({}, '', '/' + localStorage.getItem('beforeOpeningPostUrl'));
            
            localStorage.removeItem('beforeOpeningPostTitle');
            localStorage.removeItem('beforeOpeningPostUrl');
        }

        mainDOMElements.postOverlay.classList.add('hidden');

        const likesWrapper = mainDOMElements.overlayBlock.querySelector('.post__likes-wrapper');
        const postGuid = likesWrapper.postGuid;
    
        const likesCount = likesWrapper.lastChild.innerText;
        const liked = likesWrapper.classList.contains('post__likes-wrapper_liked');
        const commentsCount = likesWrapper.parentNode.lastChild.lastChild.innerText;
        
        mainDOMElements.mainBlock.querySelectorAll('.post__likes-wrapper').forEach(el => {
            if (el.postGuid === postGuid) {
    
                el.lastChild.innerText = likesCount;
    
                if (liked) {
                    el.classList.add('post__likes-wrapper_liked');
                }
                else {
                    el.classList.remove('post__likes-wrapper_liked');
                }
    
                el.parentNode.lastChild.lastChild.innerText = commentsCount;
            }
        });    
    
        clearTimeout(closePostTimer);
        closePostTimer = setTimeout(() => mainDOMElements.overlayBlock.replaceChildren(), 500);
    }
}

function showModal() {
    mainDOMElements.modalOverlay.classList.remove('hidden');
    lockScroll();
}

let closeModalTimer;
function hideModal(forceClose = false) {
    
    if (!mainDOMElements.modalOverlay.classList.contains('hidden')) {
        if (mainDOMElements.postOverlay.classList.contains('hidden')) {
            unlockScroll();
        }
    
        if (forceClose || !mainDOMElements.modalWindow.firstChild.classList.contains('error-window')) {
            mainDOMElements.modalOverlay.classList.add('hidden');
    
            clearTimeout(closeModalTimer);
            closeModalTimer = setTimeout(() => mainDOMElements.modalWindow.replaceChildren(), 500);
        }
    }
}

function trimmTags(tagsWrapper) {
    
    if (tagsWrapper.offsetWidth > 300) {

        tagsWrapper.querySelector('.tag + .tag + .tag').remove();

        if (tagsWrapper.offsetWidth > 300) {
            tagsWrapper.querySelector('.tag + .tag').remove();

            const tagsLeft = tagsWrapper.querySelector('.post__tags-left');
            tagsLeft.innerText = tagsLeft.innerText === '' ? '+1' : '+' + (tagsLeft.innerText.substring(1) - (-1));
        }

        const tagsLeft = tagsWrapper.querySelector('.post__tags-left');
        tagsLeft.innerText = tagsLeft.innerText === '' ? '+1' : '+' + (tagsLeft.innerText.substring(1) - (-1));
    }
}

function setTrimmedText(element, text, maxCharacters) {

    if (text.length > maxCharacters) {
        text = text.substring(0, maxCharacters).trim();
        element.classList.add('shortened');
    }
    element.innerText = text;
}

function setTrimmedEmail(element, email) {

    if (email.length > 30) {
        email = email.substring(0, 22) + '...' + email.substring(email.length - 8);
    }

    element.innerText = email;
}

function profileClick(e) {

    hideModal();
    hidePost();

    if (localStorage.getItem('token') === null) {

        navigationClick(null, loginPage.load);
        mainDOMElements.profileNav.classList.add(classNames.navButtonSelected);  
    }
    else {
        
        mainDOMElements.headerBlock.classList.toggle(classNames.headerBlockProfileOpenedOptions);
    }
}

async function loadProfileButton() {

    mainDOMElements.profileLabel.innerText = "Мой профиль";

    const response = await fetch("/pages/elements/button_profile.html", { signal: abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    const profileContainer = parser.parseFromString(post, 'text/html').querySelector('.profile-container');
    
    if (localStorage.getItem('email') !== null) {
        setTrimmedEmail(profileContainer.querySelector('#profileEmail'), localStorage.getItem('email'));
        setIconStyle(profileContainer.querySelector('.profile-icon'), localStorage.getItem('username'));    
    }
    
    mainDOMElements.profileWrapper.replaceChildren(profileContainer);
}

function cleanUp() {

    mainDOMElements.mainBlock.replaceChildren();
    mainDOMElements.subBlock.replaceChildren();

    mainDOMElements.profileWrapper.classList.remove('hidden');
    if (localStorage.getItem('token') === null) {
        mainDOMElements.profileWrapper.replaceChildren('Войти');
        mainDOMElements.profileLabel.innerText = "Авторизация";
    }
    else if (mainDOMElements.profileWrapper.querySelector('.profile-container') === null) {
        loadProfileButton();
    }
    else if (localStorage.getItem('email') !== null) {
        setTrimmedEmail(mainDOMElements.profileWrapper.querySelector('.profile-container').querySelector('#profileEmail'), localStorage.getItem('email'));
        setIconStyle(mainDOMElements.profileWrapper.querySelector('.profile-container').querySelector('.profile-icon'), localStorage.getItem('username'));
    }
}

function startedLoadingPage() {

    mainDOMElements.loadingCircle.classList.add('show');
    mainDOMElements.mainBlock.classList.add('hidden');
    mainDOMElements.subBlock.classList.add('hidden');

    bFinishedAnimation = false;
    setTimeout(() => bFinishedAnimation = true, 500);

}

function finishedLoadingPage() {
    
    setTimeout(() => {
        mainDOMElements.loadingCircle.classList.remove('show');
        mainDOMElements.mainBlock.classList.remove('hidden');
        mainDOMElements.subBlock.classList.remove('hidden');
    }, 200);

}

function resizeTextArea(e) {
    e.target.style.height = ""; 
    e.target.style.height = e.target.scrollHeight + 10 + "px";
}

function toggleTagsSelection(togglerElement, selectBlock) {
    togglerElement.classList.toggle(classNames.tagSelectTogglerClicked);
    selectBlock.classList.toggle(classNames.tagSelecterHidden);
}

function insertNoTags(selectedTagsContainer) {

    const noTagsElement = document.createElement('div');
    noTagsElement.className = 'no-tags';
    noTagsElement.innerText = '[пусто]';
    
    selectedTagsContainer.appendChild(noTagsElement);
}

function clickOnTag(tagElement, selectedTagsContainer) {

    if (tagElement.classList.contains(classNames.selectedTag)) {
        removeTagFromSelection(selectedTagsContainer.querySelector('#s' + tagElement.id), tagElement.parentNode);
    }
    else {
        
        const noTagsElement = selectedTagsContainer.querySelector('.no-tags');
        if (noTagsElement !== null) {
            noTagsElement.remove();
        }
        
        tagElement.classList.add(classNames.selectedTag);
        
        const newSelectedTag = document.createElement('div');
        newSelectedTag.className = 'tag clickable';
        newSelectedTag.id = 's' + tagElement.id;
        newSelectedTag.innerText = tagElement.innerText;
        newSelectedTag.addEventListener('click', (e) => removeTagFromSelection(e.target, tagElement.parentNode));

        selectedTagsContainer.appendChild(newSelectedTag);
    }
}

function removeTagFromSelection(selectedTagElement, tagsContainer) {

    const escapedGuid = CSS.escape(selectedTagElement.id.slice(1));

    tagsContainer.querySelector(`#${escapedGuid}`).classList.remove(classNames.selectedTag);

    if (selectedTagElement.parentNode.children.length == 2 && selectedTagElement.parentNode.querySelector('.no-tags') === null) {
        insertNoTags(selectedTagElement.parentNode);
    }

    selectedTagElement.remove();
}

function addOptionsToSelect(selectElement, options) {

    for (const element of options) {

        const newOptionElement = document.createElement('option');
        newOptionElement.innerText = element.name;
        newOptionElement.value = element.id;
        selectElement.add(newOptionElement, null);
    }
}

async function prepareTagSelector(tagsList, tagsContainer, selectedTagsContainer, selectedTags = null) {

    const response = await fetch(links.apiURL + 'tag', {
        signal: abortController.signal
    });

    if (response.ok) {
        
        const result = await response.json();

        tagsContainer.classList.remove('loading');

        const tagElement = document.createElement('div');
        tagElement.className = 'tag clickable';

        for (const tag of result) {
            tagsList.push(tag);

            const newTagElement = tagElement.cloneNode();
            newTagElement.id = tag.id;
            newTagElement.innerText = tag.name;
            newTagElement.addEventListener('click', (e) => clickOnTag(e.target, selectedTagsContainer));

            tagsContainer.appendChild(newTagElement);

            if (selectedTags !== null && selectedTags.includes(tag.id)) {
                newTagElement.click();
            }
        }
    }
    else {
        resolveError(response.status);
    }
}

function removeErrorHighlight(e) {
    e.target.classList.remove(classNames.errorHighlight);
}

// Fetch-related

function abortAll() {

    abortController.abort();
    abortController = new AbortController();
}

async function logout() {

    const response = await fetch(links.apiURL + 'account/logout', { 
        signal: abortController.signal,
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token')
        }
    });

    if (response.ok) {
        localStorage.clear();
        mainDOMElements.profileNav.click();
    }
    else {
        functions.resolveError(response.status);
    }
}

async function checkIfLoggedIn() {

    if (localStorage.getItem('token') !== null) {
        
        const response = await fetch(links.apiURL + 'account/profile', { 
            signal: abortController.signal,
            headers: {
                Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            return true;
        }
    }

    return false;
}

async function checkAuthorization() {

    const bLoggedIn = await checkIfLoggedIn();

    if (!bLoggedIn && localStorage.getItem('token') !== null) {
        errorResolvers.unauthorized();
        localStorage.clear();
        mainDOMElements.profileNav.click();
    }
}

function resolveError(errorCode, errorDetails = null) {

    switch (errorCode) {
        case 400:
            errorResolvers.badRequest(errorDetails);
            break;
        case 401:
            errorResolvers.unauthorized();
        break;
        case 403:
            errorResolvers.forbidden();
        break;
        case 404:
            errorResolvers.notFound();
            break;
        case 500:
            errorResolvers.internalServerError();
            break;
        default:
            errorResolvers.unknownError(errorCode);
        break;
    }
}

// Event-listeners

function navigationClick(buttonToActivate, callback) {

    for (const navEl of mainDOMElements.navigationElems)
        navEl.classList.remove(classNames.navButtonSelected);

    if (buttonToActivate !== null) 
        buttonToActivate.classList.add(classNames.navButtonSelected);
     
    startedLoadingPage();

    callback();
}

function clickAnywhere(e) {
    if (e.target.id !== 'profileWrapper') {
        mainDOMElements.headerBlock.classList.remove(classNames.headerBlockProfileOpenedOptions);
    }
}

function openFullText(e) {
    e.target.parentNode.classList.remove('post__content_closed');
    e.target.remove();
}

function toggleCheckBox(checkbox) {
    checkbox.classList.toggle('checkbox-wrapper_checked');
    checkbox.querySelector('.checkbox').checked = checkbox.classList.contains('checkbox-wrapper_checked');
}

// Other

function moveAccordingToHref() {
    
    const cutHref = window.location.href.replace('://', '');
    let currentURL = cutHref.slice(cutHref.indexOf("/") + 1);
    let URLtoCheck;

    if (currentURL.includes('/')) {
        URLtoCheck = currentURL.slice(0, currentURL.indexOf("/"));
    }
    else if (currentURL.includes('?')) {
        URLtoCheck = currentURL.slice(0, currentURL.indexOf("?"));
    }
    else {
        URLtoCheck = currentURL;
    }

    switch (URLtoCheck) {
        case "login":
        case "profile":
            mainDOMElements.profileNav.click();
        break;
        case "register":
            navigationClick(null, registerPage.load);
        break;
        case "post":
            mainPage.move(currentURL);
        break;
        case "authors":
            mainDOMElements.authorsNav.click();
        break;
        case "communities":
            communities.move(currentURL);
        break;
        // At root
        case "":
            mainDOMElements.mainPageNav.click();
        break;
        // Invalid URL
        default:
            errorResolvers.notFound();
        break;
    }
}

function getInitials(username) {

    const re = /(.[A-ZА-Я])|([ \d][^\d])/g;

    const match = username.slice(1).search(re);

    if (match == -1) 
        return username.slice(0, 2).toUpperCase();
      
    return (username[0] + username[match + 2]).toUpperCase();
}

function getContrastColor(hexColor) {

    let r = parseInt(hexColor.substring(0, 1), 16) / 16;
    let g = parseInt(hexColor.substring(1, 2), 16) / 16;
    let b = parseInt(hexColor.substring(2, 3), 16) / 16;

    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance > 0.5 ? colors.dark : colors.light;
}

function getMonthString(monthNum) {

    switch (monthNum) {
        case 0:
            return 'янв';
        case 1:
            return 'фев';
        case 2:
            return 'мар';
        case 3:
            return 'апр';
        case 4:
            return 'мая';
        case 5:
            return 'июн';
        case 6:
            return 'июл';
        case 7:
            return 'авг';
        case 8:
            return 'сен';
        case 9:
            return 'окт';
        case 10:
            return 'ноя';
        case 11:
            return 'дек';
    }
}

function getGenderString(gender) {

    switch (gender) {
        case 'Male':
            return 'Мужской';
        case 'Female':
            return 'Женский';
    }
}

function getGenderEnum(gender) {

    switch (gender) {
        case 'Мужской':
            return 'Male';
        case 'Женский':
            return 'Female';
    }
}

function getDateString(date) {

    const estDate = new Date(date);

    return (estDate.getDate() < 10 ? "0" : "") + estDate.getDate() + '.' + (estDate.getMonth() < 9 ? "0" : "") + (estDate.getMonth() + 1) + '.' + estDate.getFullYear();
}

function getDateStringForInput(date) {
    const estDate = new Date(date);

    return estDate.getFullYear() + '-' + (estDate.getMonth() < 9 ? "0" : "") + (estDate.getMonth() + 1) + '-' + (estDate.getDate() < 10 ? "0" : "") + estDate.getDate();
}

function dateToString(date) {

    const currentDateTime = new Date();
    currentDateTime.setHours(0, 0, 0, 0);
    
    const dateTimeToCheck = new Date(date);
    const time = ' в ' + (dateTimeToCheck.getHours() < 10 ? "0" : "") + dateTimeToCheck.getHours() + ':' + (dateTimeToCheck.getMinutes() < 10 ? "0" : "") + dateTimeToCheck.getMinutes();
    dateTimeToCheck.setHours(0, 0, 0, 0);

    const dayDifference = (currentDateTime - dateTimeToCheck) / 86400000;

    let day = 'сегодня';
    
    if (dayDifference === 1) {
        day = 'вчера'
    }
    else if (dayDifference !== 0) {
        day = dateTimeToCheck.getDate() + ' ' + getMonthString(dateTimeToCheck.getMonth());
    }

    if (currentDateTime.getFullYear() != dateTimeToCheck.getFullYear()) {
        day += ' ' + dateTimeToCheck.getFullYear();
    }

    return day + time;
}

function leadingZeros(string, numberOfChars) {

    while (string.length < numberOfChars) {
        string = '0' + string;
    }

    return string;
}

function setIconStyle(icon, username) {
    
    icon.innerText = getInitials(username);

    let charSum = 0;
    for (const letter of username) {
        charSum += letter.charCodeAt(0);
    }

    charSum = (charSum % 4095).toString(16);
    icon.style = 'background: #' + leadingZeros(charSum, 3) + ';color:' + getContrastColor(charSum);
}

export { makeStruct, cleanUp, abortController, bFinishedAnimation, startedLoadingPage, finishedLoadingPage, 
    abortAll, getInitials, getContrastColor, getMonthString, dateToString, navigationClick, moveAccordingToHref, 
    getGenderString, getDateString, setIconStyle, validateEmail, validatePassword, validateImageURL, validateBirthDate,
    validatePhoneNumber, validateRangeOfCharacters, validateReadingTime, getGenderEnum, profileClick, logout,
    clickAnywhere, resizeTextArea, toggleTagsSelection, prepareTagSelector, clickOnTag, removeTagFromSelection,
    addOptionsToSelect, removeErrorHighlight, openFullText, toggleCheckBox, checkAuthorization, getDateStringForInput,
    setTrimmedText, trimmTags, cleanOverlayPost, showPost, hidePost, showModal, hideModal, lockScroll, unlockScroll, setTrimmedEmail,
    resolveError };