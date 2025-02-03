import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as structs from "../exports/structs.js";
import * as profilePage from "./login-profile-page.js";

let createPost, emptyAddressSelect, adressSelectsContainer, tags = [], groups = [], chosenGroup = null;

async function loadAddressSelect() {
    
    const response = await fetch("/pages/elements/address_select.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    emptyAddressSelect = parser.parseFromString(post, 'text/html').querySelector('.form-input__wrapper');

    loadInitialAddressOptions();
}

async function submitNewPost(event) {
    event.preventDefault();

    let bValidData = true;

    // Validating title
    bValidData = functions.validateRangeOfCharacters(createPost.querySelector('#postTitle'), 5, 1000) && bValidData;

    // Validating description
    bValidData = functions.validateRangeOfCharacters(createPost.querySelector('#postDescription'), 5, 5000) && bValidData;
    
    // Validating readingTime
    bValidData = functions.validateReadingTime(createPost.querySelector('#postReadingTime')) && bValidData;
    
    // Getting selected tags
    const selectedTags = [];
    for (const tag of createPost.querySelectorAll('.input-tags-selecter .tag_selected')) {
        selectedTags.push(tag.id);
    }

    // Validating selected tags
    if (selectedTags.length == 0) {
        createPost.querySelector('.input-tags').classList.add('invalid');
        bValidData = false;
    }

    // Getting selected address
    let selectedAddress = null;
    if (adressSelectsContainer.lastChild.querySelector('.select').selectedOptions[0].value !== 'null') {
        selectedAddress = adressSelectsContainer.lastChild.querySelector('.select').selectedOptions[0].objectGuid;
    }
    else if (adressSelectsContainer.children.length > 2) {
        selectedAddress = adressSelectsContainer.children[adressSelectsContainer.children.length - 2].querySelector('.select').selectedOptions[0].objectGuid;
    }

    // Validating image-URL
    bValidData = functions.validateImageURL(createPost.querySelector('#postImageLink')) && bValidData;

    if (!bValidData) return;

    const postData = new structs.postDto(
        createPost.querySelector('#postTitle').value,
        createPost.querySelector('#postDescription').value,
        createPost.querySelector('#postReadingTime').value,
        createPost.querySelector('#postImageLink').value.length > 0 ? 
        createPost.querySelector('#postImageLink').value : null,
        selectedAddress,
        selectedTags
    );

    let response,
    selectedGroup = createPost.querySelector('#postGroup').selectedOptions[0].value;

    if (selectedGroup === 'null') {

        response = await fetch(links.apiURL + 'post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(postData)
        });
    }
    else {

        response = await fetch(links.apiURL + 'community/' + selectedGroup + '/post', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(postData)
        });
    }

    if (response.ok) {
        chosenGroup = null;
        mainDOMElements.mainPageNav.click();
    }
    else {
        const errors = await response.json();
        functions.resolveError(response.status, errors);
    }
}

async function load() {

    functions.abortAll();

    document.title = "Новый пост";
    window.history.replaceState({}, '', "/post/create");

    const delayPromise = new Promise(resolve => setTimeout(resolve, 500));

    const fetchPromise = fetch("/pages/create-post/main-block.html", { signal: functions.abortController.signal })
        .then(response => response.text())
        .then(htmlString => { return htmlString });
    
    Promise.all([fetchPromise, delayPromise]).then(([htmlString]) => {

        functions.cleanUp();

        const parser = new DOMParser();
        createPost = parser.parseFromString(htmlString, 'text/html').querySelector(".create-post");
        adressSelectsContainer = createPost.querySelector('#addressSelects');
    
        createPost.querySelector('#postDescription').addEventListener('input', functions.resizeTextArea);
        createPost.querySelector('.input-tags__add-tag').addEventListener('click', (e) => functions.toggleTagsSelection(e.target, createPost.querySelector('.input-tags-selecter')));
        createPost.querySelector('#tagSearch').addEventListener('input', findTags);
        
        functions.prepareTagSelector(tags, createPost.querySelector('.input-tags__selectable-tags'), createPost.querySelector('.input-tags'));
        loadGroupOptions();
        loadAddressSelect();

        // Validation events
        createPost.querySelectorAll('.form-input__input').forEach(el => el.addEventListener('focus', functions.removeErrorHighlight));
        createPost.querySelector('.input-tags').addEventListener('click', () => createPost.querySelector('.input-tags').classList.remove(classNames.errorHighlight));
        createPost.querySelector('.input-tags-selecter').addEventListener('click', () => createPost.querySelector('.input-tags').classList.remove(classNames.errorHighlight));

        // Creating "Опубликовать" button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';
        const uploadPost = document.createElement('div');
        uploadPost.innerText = 'Опубликовать';
        uploadPost.className = 'clickable button form-submit';
        uploadPost.addEventListener('click', submitNewPost);
        actionsDiv.appendChild(uploadPost);

        mainDOMElements.subBlock.appendChild(actionsDiv);
        mainDOMElements.mainBlock.appendChild(createPost);

        functions.finishedLoadingPage();
    });
}

function findTags(e) {

    const tags = e.target.parentNode.parentNode.querySelectorAll('.tag');
    const request = e.target.value;

    for (const tag of tags) {

        if (!tag.innerText.includes(request)) {
            tag.classList.add('tag_hidden');
        }
        else {
            tag.classList.remove('tag_hidden');
        }
    }
}

async function loadGroupOptions() {
    
    const [myGroupsResponse, groupsResponse] = await Promise.allSettled([
        fetch(links.apiURL + 'community/my', {
            signal: functions.abortController.signal,
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        }),
        fetch(links.apiURL + 'community', {
            signal: functions.abortController.signal
        })
    ]);

    if (myGroupsResponse.value.ok && groupsResponse.value.ok) {

        const myGroups = await myGroupsResponse.value.json(),
        groups = await groupsResponse.value.json();

        const options = [];

        for (const myGroup of myGroups) {
            if (myGroup.role === 'Administrator') {

                let groupName;
                for (const group of groups) {
                    if (group.id === myGroup.communityId) {
                        groupName = group.name;
                        break;
                    }
                }

                options.push({ name: groupName, id: myGroup.communityId });
            }
        }
    
        functions.addOptionsToSelect(createPost.querySelector('#postGroup'), options);

        if (chosenGroup !== null) {
            createPost.querySelector('#postGroup').value = chosenGroup;
        }
    }
    else {
        functions.resolveError(response.status);
    }
}

function addOptionsToAddressSelect(select, options) {

    for (const option of options) {

        const newOptionElement = document.createElement('option');
        newOptionElement.innerText = option.text;
        newOptionElement.value = option.id;
        newOptionElement.objectId = option.objectId;
        newOptionElement.objectGuid = option.objectGuid;
        newOptionElement.objectLevelText = option.objectLevelText;
        newOptionElement.objectLevel = option.objectLevel;

        select.add(newOptionElement, null);
    }
}

async function loadInitialAddressOptions() {
    
    const response = await fetch(links.apiURL + 'address/search', {
        signal: functions.abortController.signal
    });

    if (response.ok) {

        const result = await response.json();
        
        const newAddressSelect = emptyAddressSelect.cloneNode(true);
        newAddressSelect.querySelector('.select-label').innerText = 'Субъект РФ';
        newAddressSelect.addEventListener('change', selectChange);
        addOptionsToAddressSelect(newAddressSelect.querySelector('.select'), result);
        adressSelectsContainer.appendChild(newAddressSelect);
    }
    else {

    }
}

async function loadNewAddressOptions(parentObjectId) {

    const response = await fetch(links.apiURL + 'address/search?parentObjectId=' + parentObjectId, {
        signal: functions.abortController.signal
    });

    if (response.ok) {

        const result = await response.json();

        const newAddressSelect = emptyAddressSelect.cloneNode(true);
        newAddressSelect.querySelector('.select-label').innerText = 'Следующий элемент адреса';
        newAddressSelect.addEventListener('change', selectChange);
        addOptionsToAddressSelect(newAddressSelect.querySelector('.select'), result);
        adressSelectsContainer.appendChild(newAddressSelect);
    }
    else {
        
    }
}

function selectChange(e) {
    
    while (adressSelectsContainer.lastChild != e.target.parentNode.parentNode) {
        adressSelectsContainer.lastChild.remove();
    }

    if (e.target.selectedOptions[0].objectId !== undefined) {
        e.target.parentNode.parentNode.firstChild.innerText = e.target.selectedOptions[0].objectLevelText;
        
        if (e.target.selectedOptions[0].objectLevel != 'Building') {
            loadNewAddressOptions(e.target.selectedOptions[0].objectId);
        }
    }
    else if (e.target.parentNode.parentNode.parentNode.children.length != 2) {
        e.target.parentNode.parentNode.firstChild.innerText = 'Следующий элемент адреса';
    }
}

function chooseGroup(groupToChoose) {

    chosenGroup = groupToChoose;
}

export { load, chooseGroup, findTags }