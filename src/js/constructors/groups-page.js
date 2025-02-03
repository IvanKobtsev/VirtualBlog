import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as elementConstructors from "./elements.js";
import * as createPost from "./create-post.js";
import * as structs from "../exports/structs.js";
import * as groupPage from "./group-page.js";

let groupElement, groups, groupsActions;

async function loadSubMenu() {
    
    const response = await fetch("/pages/groups/sub-block.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    groupsActions = parser.parseFromString(post, 'text/html').querySelector('.groups-actions');
    groupsActions.querySelector('#filterGroupname').parentNode.addEventListener('input', appendGroups);

    groupsActions.querySelector('#filterMySubscriptions').parentNode.addEventListener('click', (e) => {

        if (groupsActions.querySelector('#filterMyGroups').checked) {
            functions.toggleCheckBox(groupsActions.querySelector('#filterMyGroups').parentNode);
        }
        functions.toggleCheckBox(e.target); 
        appendGroups(); 
    });

    groupsActions.querySelector('#filterMyGroups').parentNode.addEventListener('click', (e) => { 
        if (groupsActions.querySelector('#filterMySubscriptions').checked) {
            functions.toggleCheckBox(groupsActions.querySelector('#filterMySubscriptions').parentNode);
        }
        functions.toggleCheckBox(e.target); 
        appendGroups(); 
    });

    mainDOMElements.subBlock.appendChild(groupsActions);

    loadGroups({});
}

async function load() {

    functions.abortAll();
    document.title = "Группы";
    window.history.replaceState({}, '', "/communities");

    const delayPromise = new Promise(resolve => setTimeout(resolve, 500));

    const fetchPromise = fetch("/pages/elements/group.html", { signal: functions.abortController.signal })
        .then(response => response.text())
        .then(htmlString => { return htmlString });

    Promise.all([fetchPromise, delayPromise]).then(([htmlString]) => {

        functions.cleanUp();

        const parser = new DOMParser();
        groupElement = parser.parseFromString(htmlString, 'text/html').querySelector(".group");   
        
        loadSubMenu();
    })
    .catch(error => console.error('Error loading content:', error));

}

async function appendGroups() {

    mainDOMElements.mainBlock.replaceChildren();

    for (const newGroup of groups) {

        const groupNameFilter = groupsActions.querySelector('#filterGroupname');
        if (!newGroup.name.toLowerCase().includes(groupNameFilter.value.toLowerCase()) || 
            groupsActions.querySelector('#filterMyGroups').checked && newGroup.myStatus !== 'Administrator' ||
            groupsActions.querySelector('#filterMySubscriptions').checked && newGroup.myStatus !== 'Subscriber') {
            continue;
        }

        const newGroupEl = groupElement.cloneNode(true);
        const groupNameEl = newGroupEl.querySelector('.group__name');
        
        let newGroupName = newGroup.name; 
        if (newGroupName.length > 15) {
            newGroupName = newGroupName.substring(0, 15).trim();
            groupNameEl.title = newGroup.name;
            groupNameEl.classList.add('shortened');
        }

        groupNameEl.innerText = newGroupName;
        groupNameEl.groupGuid = newGroup.id;
        groupNameEl.addEventListener('click', toGroup);

        if (newGroup.isClosed) {
            groupNameEl.classList.add('group__name_private');
        }        

        const subscribeButton = newGroupEl.querySelector('.button');
        let newInnerText = "подписаться"
        switch (newGroup.myStatus) {
            case 'Subscriber':
                subscribeButton.classList.add('group__subscribe-button_active');
                newInnerText = "отписаться"
                break;
            case 'Administrator':
                subscribeButton.classList.add('hidden');
                newInnerText = ""
                break;
        }

        subscribeButton.groupGuid = newGroup.id;
        subscribeButton.addEventListener('click', subscribeToggle);

        newGroupEl.querySelector('.group__subs-count-value').innerText = newGroup.subscribersCount;
        newGroupEl.querySelector('.group__subscribe-button').innerText = newInnerText;

        mainDOMElements.mainBlock.appendChild(newGroupEl);

        functions.setIconStyle(mainDOMElements.mainBlock.lastChild.querySelector('.group-icon'), newGroup.name);
    }
}

async function loadGroups(params) {

    if (localStorage.getItem('token') !== null) {

        const [groupsResponse, myGroupsResponse] = await Promise.allSettled([
            fetch(links.apiURL + 'community', { signal: functions.abortController.signal }), 
            fetch(links.apiURL + 'community/my', { 
                signal: functions.abortController.signal,
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token')
                }
            })
        ]);
        
        if (groupsResponse.value.ok && myGroupsResponse.value.ok) {
    
            groups = await groupsResponse.value.json();
            const myGroups = await myGroupsResponse.value.json();
    
            for (const myGroup of myGroups) {
                for (const g of groups) {
                    if (g.id == myGroup.communityId) {
                        g.myStatus = myGroup.role;
                        break;
                    }
                }
            }
            
            appendGroups();
        }
        else {
            if (groupsResponse.value.ok) {
                functions.resolveError(myGroupsResponse.value.status);
            }
            else {
                functions.resolveError(groupsResponse.value.status);
            }
        }
    }
    else {
        const response = await fetch(links.apiURL + 'community', { signal: functions.abortController.signal });
        
        if (response.ok) {
    
            groups = await response.json();
            appendGroups();
        }
        else {
            functions.resolveError(response.status);
        }
    }

    functions.finishedLoadingPage();
}

async function subscribeToggle(e) {
    
    e.target.classList.add('button_processing');

    if (!e.target.classList.contains('group__subscribe-button_active')) {

        const response = await fetch(links.apiURL + `community/${e.target.groupGuid}/subscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        e.target.classList.remove('button_processing');

        if (response.ok) {

            for (const newGroup of groups) {
                if (newGroup.id == e.target.groupGuid) {
                    newGroup.myStatus = 'Subscriber';
                    e.target.parentNode.querySelector('.group__subs-count-value').innerText = ++newGroup.subscribersCount;
                    break;
                }
            }
            
            e.target.classList.add('group__subscribe-button_active');
            e.target.innerText = 'отписаться';
        }
        else {
            functions.resolveError(response.status);
        }

    }
    else {

        const response = await fetch(links.apiURL + `community/${e.target.groupGuid}/unsubscribe`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        });

        e.target.classList.remove('button_processing');
        
        if (response.ok) {

            for (const newGroup of groups) {
                if (newGroup.id == e.target.groupGuid) {
                    newGroup.myStatus = null;
                    e.target.parentNode.querySelector('.group__subs-count-value').innerText = --newGroup.subscribersCount;
                    break;
                }
            }
            e.target.classList.remove('group__subscribe-button_active');
            e.target.innerText = 'подписаться';

            groupsActions.querySelector('#filterMySubscriptions').parentNode.click();
            groupsActions.querySelector('#filterMySubscriptions').parentNode.click();
        }
        else {
            functions.resolveError(response.status);
        }
    }
}

function move(url) {

    if (url.includes('/')) {
        groupPage.move(url.slice(url.indexOf('/') + 1));
    }
    else {
        mainDOMElements.groupsNav.click();
    }
}

function toGroup(e) {

    window.history.replaceState({}, '', `/communities/${e.target.groupGuid}`);
    functions.moveAccordingToHref();
}

export { load, move, toGroup }