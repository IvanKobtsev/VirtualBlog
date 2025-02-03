import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as elementConstructors from "./elements.js";
import * as createPost from "./create-post.js";
import * as structs from "../exports/structs.js";

let authorElement, authors, authorsActions, topAuthors;

function sortByNameAsc(a, b) {
    return a.fullName > b.fullName;
}

function sortByNameDesc(a, b) {
    return a.fullName < b.fullName;
}

function sortByRatingFormulaAsc(a, b) {
    return a.likes / Math.ceil(a.posts * 0.5) < b.likes / Math.ceil(b.posts * 0.5);
}

function sortByRatingFormulaDesc(a, b) {
    return a.likes / Math.ceil(a.posts * 0.5) > b.likes / Math.ceil(b.posts * 0.5);
}

function sortByRatingAsc(a, b) {
    if (a.posts === b.posts) {
        return a.likes < b.likes;
    }
    else {
        return a.posts < b.posts;
    }    
}

function sortByRatingDesc(a, b) {
    if (a.posts === b.posts) {
        return a.likes > b.likes;
    }
    else {
        return a.posts > b.posts;
    }
}

function sortAuthors(sorting) {

    switch (sorting) {
        case 'alphabeticallyAsc':
            authors.sort(sortByNameAsc);
        break;
        case 'alphabeticallyDesc':
            authors.sort(sortByNameDesc);
        break;
        case 'ratingAsc':
            authors.sort(sortByRatingAsc);
        break;
        case 'ratingDesc':
            authors.sort(sortByRatingDesc);
        break;
    }
}

async function loadSubMenu() {
    
    const response = await fetch("/pages/authors/sub-block.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    authorsActions = parser.parseFromString(post, 'text/html').querySelector('.authors-actions');
    authorsActions.querySelector('#authorSort').addEventListener('change', (e) => { sortAuthors(e.target.selectedOptions[0].value); appendAuthors(); });
    authorsActions.querySelector('#filterHasLikes').parentNode.addEventListener('click', (e) => { functions.toggleCheckBox(e.target); appendAuthors(); });
    authorsActions.querySelector('#filterUsername').addEventListener('input', appendAuthors);

    mainDOMElements.subBlock.appendChild(authorsActions);
}

async function load() {

    functions.abortAll();
    document.title = "Авторы";
    window.history.replaceState({}, '', "/authors");

    const delayPromise = new Promise(resolve => setTimeout(resolve, 500));

    const fetchPromise = fetch("/pages/elements/author.html", { signal: functions.abortController.signal })
        .then(response => response.text())
        .then(htmlString => { return htmlString });

    Promise.all([fetchPromise, delayPromise]).then(([htmlString]) => {

        functions.cleanUp();

        const parser = new DOMParser();
        authorElement = parser.parseFromString(htmlString, 'text/html').querySelector(".author");   
        
        loadSubMenu();
        loadAuthors({});
        
    })
    .catch(error => console.error('Error loading content:', error));

}

async function appendAuthors() {

    mainDOMElements.mainBlock.replaceChildren();

    for (const newAuthor of authors) {

        const userNameFilter = authorsActions.querySelector('#filterUsername');
        if (userNameFilter.value !== '' && !newAuthor.fullName.toLowerCase().includes(userNameFilter.value.toLowerCase()) || 
            authorsActions.querySelector('#filterHasLikes').checked && newAuthor.likes === 0) {
            continue;
        }

        const newAuthorEl = authorElement.cloneNode(true);
        const authorNameEl = newAuthorEl.querySelector('.author__name');
        functions.setTrimmedText(authorNameEl, newAuthor.fullName, 18);

        authorNameEl.title = newAuthor.fullName + " | На VB с " + functions.getDateString(newAuthor.created);
        authorNameEl.fullName = newAuthor.fullName;
        authorNameEl.addEventListener('click', toAuthor);

        if (newAuthor.gender === 'Female') {
            authorNameEl.classList.add('author__name_female');
        }
        else {
            authorNameEl.classList.add('author__name_male');
        }

        newAuthorEl.querySelector('.author__birth-date-value').innerText = functions.getDateString(newAuthor.birthDate);
        newAuthorEl.querySelector('.author__posts-count').innerText = newAuthor.posts;
        newAuthorEl.querySelector('.author__likes-count').innerText = newAuthor.likes;

        mainDOMElements.mainBlock.appendChild(newAuthorEl);

        functions.setIconStyle(mainDOMElements.mainBlock.lastChild.querySelector('.profile-icon'), newAuthor.fullName);

        if (topAuthors[0].created === newAuthor.created) {
            mainDOMElements.mainBlock.lastChild.querySelector('.profile-icon').classList.add('first-place');
        } 
        else if (topAuthors[1].created === newAuthor.created) {
            mainDOMElements.mainBlock.lastChild.querySelector('.profile-icon').classList.add('second-place');
        }
        else if (topAuthors[2].created === newAuthor.created) {
            mainDOMElements.mainBlock.lastChild.querySelector('.profile-icon').classList.add('third-place');
        }
    }
}

async function loadAuthors(params) {
    
    const response = await fetch(links.apiURL + 'author/list', { signal: functions.abortController.signal });
    
    if (response.ok) {
        const results = await response.json();    

        authors = results;

        topAuthors = results.slice();
        topAuthors.sort(sortByRatingAsc);
        
        sortAuthors('alphabeticallyAsc');

        appendAuthors();

        functions.finishedLoadingPage();
    }
    else {
        functions.resolveError(response.status);
    }
}

function toAuthor(e) {

    window.history.replaceState({}, '', `/post?author=${e.target.fullName}&page=1&size=5`);
    functions.moveAccordingToHref();
}

export { load, toAuthor }