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
import * as functions from "./functions.js";

async function unauthorized() {

    if (localStorage.getItem('token') === null) {

        mainDOMElements.modalWindow.replaceChildren();

        console.log('oidhfsodih');

        const response = await fetch("/pages/modals/login.html", { signal: functions.abortController.signal });
        const post = await response.text();
        const parser = new DOMParser();
        const loginSuggestion = parser.parseFromString(post, 'text/html').querySelector('.login-window');

        loginSuggestion.querySelector('.login-window__login').addEventListener('click', () => { 
            functions.hideModal(); 
            functions.hidePost();
            functions.navigationClick(mainDOMElements.profileNav, loginPage.load);
        });

        loginSuggestion.querySelector('.login-window__back').addEventListener('click', functions.hideModal);

        mainDOMElements.modalWindow.appendChild(loginSuggestion);
        functions.showModal(false);
    }
    else {
        mainDOMElements.modalWindow.replaceChildren();

        const response = await fetch("/pages/modals/error.html", { signal: functions.abortController.signal });
        const post = await response.text();
        const parser = new DOMParser();
        const sessionOver = parser.parseFromString(post, 'text/html').querySelector('.error-window');

        sessionOver.querySelector('.error-window__error-code').innerText = '401';
        sessionOver.querySelector('.error-window__error-text').innerText = 'Срок вашей сессии истёк. Необходима повторная авторизация.'
        sessionOver.querySelector('.error-window__to-main-page-button').innerText = 'Войти';
        sessionOver.querySelector('.error-window__to-main-page-button').addEventListener('click', () => { 
            functions.hideModal(true);
            mainDOMElements.profileNav.click();
        });
        sessionOver.querySelector('.error-window__second-action-button').innerText = 'На главную';
        sessionOver.querySelector('.error-window__second-action-button').addEventListener('click', () => {
            functions.hideModal(true);
            mainDOMElements.mainPageNav.click();
        });

        mainDOMElements.modalWindow.appendChild(sessionOver);
        functions.showModal();
    }
}

async function forbidden() {

    mainDOMElements.modalWindow.replaceChildren();

    const response = await fetch("/pages/modals/error.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    const forbiddenModal = parser.parseFromString(post, 'text/html').querySelector('.error-window');

    forbiddenModal.querySelector('.error-window__error-code').innerText = '400';
    forbiddenModal.querySelector('.error-window__error-text').innerText = 'Ошибка запроса! Кажется, кто-то доигрался с query...';
    forbiddenModal.querySelector('.error-window__to-main-page-button').addEventListener('click', () => {
            functions.hideModal(true);
            functions.navigationClick(mainDOMElements.mainPageNav, mainPage.load);
        }
    );
    setBackButton(forbiddenModal.querySelector('.error-window__second-action-button'));


    mainDOMElements.modalWindow.appendChild(forbiddenModal);
    functions.showModal();
}

async function internalServerError() {
    
    mainDOMElements.modalWindow.replaceChildren();

    const response = await fetch("/pages/modals/error.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    const internalServerModal = parser.parseFromString(post, 'text/html').querySelector('.error-window');

    internalServerModal.querySelector('.error-window__error-code').innerText = '5XX';
    internalServerModal.querySelector('.error-window__error-text').innerText = 'Ошибка сервера! Попробуйте воспользоваться VirtualBlog позже.';
    internalServerModal.querySelector('.error-window__to-main-page-button').addEventListener('click', () => {
            functions.hideModal(true);
            functions.navigationClick(mainDOMElements.mainPageNav, mainPage.load);
        }
    );
    internalServerModal.querySelector('.error-window__second-action-button').addEventListener('click', () => {
        window.location.reload();
    });

    mainDOMElements.modalWindow.appendChild(internalServerModal);
    functions.showModal();

}

async function badRequest(response = null) {
    
    mainDOMElements.modalWindow.replaceChildren();

    const htmlResponse = await fetch("/pages/modals/error.html", { signal: functions.abortController.signal });
    const post = await htmlResponse.text();
    const parser = new DOMParser();
    const badRequestModal = parser.parseFromString(post, 'text/html').querySelector('.error-window');

    let errorText = 'Ошибка запроса! Что-то пошло не так...';

    if (response !== null) { 
        if (response.errors !== undefined && response.errors.Image !== undefined) {
            errorText = 'Ссылка на картинку не валидна!';
        }
        else if (response.DuplicateUserName !== undefined) {
            errorText = 'Пользователь с таким именем уже существует!';
        }
    }
    
    badRequestModal.querySelector('.error-window__second-action-button').innerText = 'Закрыть';
    badRequestModal.querySelector('.error-window__second-action-button').addEventListener('click', () => functions.hideModal(true));

    badRequestModal.querySelector('.error-window__error-code').innerText = '400';
    badRequestModal.querySelector('.error-window__error-text').innerText = errorText;
    badRequestModal.querySelector('.error-window__to-main-page-button').addEventListener('click', () => {
            mainPage.clearFilters();
            functions.hideModal(true);
            functions.navigationClick(mainDOMElements.mainPageNav, mainPage.load);
        }
    );
    
    mainDOMElements.modalWindow.appendChild(badRequestModal);
    functions.showModal();

}

async function notFound() {
    
    mainDOMElements.modalWindow.replaceChildren();

    const response = await fetch("/pages/modals/error.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    const notFoundModal = parser.parseFromString(post, 'text/html').querySelector('.error-window');

    notFoundModal.querySelector('.error-window__error-code').innerText = '404';
    notFoundModal.querySelector('.error-window__error-text').innerText = 'Страница не найдена!'
    notFoundModal.querySelector('.error-window__to-main-page-button').addEventListener('click', () => {
        functions.hideModal(true);
        functions.navigationClick(mainDOMElements.mainPageNav, mainPage.load);
    });
    setBackButton(notFoundModal.querySelector('.error-window__second-action-button'));

    mainDOMElements.modalWindow.appendChild(notFoundModal);
    functions.showModal();

}

async function unknownError(code) {
    
    mainDOMElements.modalWindow.replaceChildren();

    const response = await fetch("/pages/modals/error.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    const unknownModal = parser.parseFromString(post, 'text/html').querySelector('.error-window');

    unknownModal.querySelector('.error-window__error-code').innerText = code;
    unknownModal.querySelector('.error-window__error-text').innerText = 'Неизвестная ошибка! Попробуйте воспользоваться VirtualBlog позже.';
    unknownModal.querySelector('.error-window__to-main-page-button').addEventListener('click', () => {
            functions.hideModal(true);
            functions.navigationClick(mainDOMElements.mainPageNav, mainPage.load);
        }
    );

    mainDOMElements.modalWindow.appendChild(unknownModal);
    functions.showModal();

}

function setBackButton(button) {
    button.innerText = 'Назад';
    button.addEventListener('click', () => {
        history.back();
    });
}

async function loginFailed() {

    mainDOMElements.modalWindow.replaceChildren();

    const response = await fetch("/pages/modals/error.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    const loginFailedModal = parser.parseFromString(post, 'text/html').querySelector('.error-window');

    loginFailedModal.classList.add('login-failed-window');
    loginFailedModal.querySelector('.error-window__error').innerText = 'Не удалось войти!' 
    loginFailedModal.querySelector('.error-window__error-text').innerText  = 'Неправильные логин/пароль.';
    loginFailedModal.querySelector('.error-window__to-main-page-button').remove();
    loginFailedModal.querySelector('.error-window__second-action-button').innerText = 'Ok';
    loginFailedModal.querySelector('.error-window__second-action-button').addEventListener('click', () => {
            functions.hideModal(true);
        }
    );

    mainDOMElements.modalWindow.appendChild(loginFailedModal);
    functions.showModal();

}

export { unauthorized, forbidden, internalServerError, notFound, badRequest, unknownError, loginFailed }