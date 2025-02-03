import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as elementConstructors from "./elements.js";
import * as createPost from "./create-post.js";
import * as structs from "../exports/structs.js";
import { toAuthor } from "./authors-page.js";

let feed, post, groupPageActions, tags = [], filter, bEndlessFeed = false, 
    bAppliedNewFilters = true, paginationPanelButtons = null, groupId = null, myStatus = null;

async function loadSubMenu() {

    const response = await fetch("/pages/group/sub-block.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    groupPageActions = parser.parseFromString(post, 'text/html').querySelector('.group-actions');
    mainDOMElements.subBlock.appendChild(groupPageActions);

    const subscribeButton = groupPageActions.querySelector('#groupActionSubscribe');
    switch (myStatus) {
        case 'Subscriber':
            groupPageActions.querySelector('#groupActionCreatePost').remove();

            subscribeButton.classList.add('profile-actions__action_active');
            subscribeButton.innerText = 'Отписаться';
            subscribeButton.groupGuid = groupId;
            subscribeButton.addEventListener('click', subscribeToggle);
            break;
        case 'Administrator':
            subscribeButton.remove();

            groupPageActions.querySelector('#groupActionCreatePost').addEventListener('click', () => {
                createPost.chooseGroup(groupId);
                functions.navigationClick(null, createPost.load);
            });
            break;
        default:
            groupPageActions.querySelector('#groupActionCreatePost').remove();

            subscribeButton.groupGuid = groupId;
            subscribeButton.addEventListener('click', subscribeToggle);
            break;
    }

    functions.prepareTagSelector(tags, groupPageActions.querySelector('.input-tags__selectable-tags'), groupPageActions.querySelector('.input-tags'), filter.tags);
    groupPageActions.querySelector('.input-tags__add-tag').addEventListener('click', (e) => functions.toggleTagsSelection(e.target, groupPageActions.querySelector('.input-tags-selecter')));
    groupPageActions.querySelector('.form-submit').addEventListener('click', applyFilters);
    
    const postSortEl = groupPageActions.querySelector('#postSort');
    postSortEl.value = filter.sorting !== null ? filter.sorting : 'CreateDesc';
    postSortEl.addEventListener('change', applyFilters);

    const pageSize = groupPageActions.querySelector('#pageSize');
    pageSize.value = filter.size;
    pageSize.addEventListener('change', applyFilters);

    groupPageActions.querySelector('#currentPage').addEventListener('change', (e) => { filter.page = e.target.selectedOptions[0].value; loadPosts(); });
}

async function load(groupGuid) {

    if (groupGuid !== groupId) {
        filter = new structs.communityPostFilter(1, 5, null, null);
    }

    groupId = groupGuid;

    functions.abortAll();
    document.title = "Страница группы";
    window.history.replaceState({}, '', "/");

    const [postLocalFetchPromise, mainBlockLocalFetchPromise, authorLocalFetchPromise, apiMyStatusFetchPromise, apiGroupDataFetchPromise, delayPromise] = await Promise.allSettled([
        fetch("/pages/elements/post.html", { signal: functions.abortController.signal }),
        fetch("/pages/group/main-block.html", { signal: functions.abortController.signal }),
        fetch("/pages/elements/author.html", { signal: functions.abortController.signal }),
        fetch(links.apiURL + `community/${groupId}/role`, { 
            signal: functions.abortController.signal,
            headers: {
                Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        }),
        fetch(links.apiURL + `community/${groupId}`, { signal: functions.abortController.signal }),
        new Promise(resolve => setTimeout(resolve, 500))
    ]);

    const postHtmlString = await postLocalFetchPromise.value.text(),
    mainBlockHtmlString = await mainBlockLocalFetchPromise.value.text(),
    authorHtmlString = await authorLocalFetchPromise.value.text();
    
    if (!(localStorage.getItem('token') !== null && !apiMyStatusFetchPromise.value.ok || !apiGroupDataFetchPromise.value.ok)) {

        const groupData = await apiGroupDataFetchPromise.value.json(),
        myReceivedStatus = await apiMyStatusFetchPromise.value.text();

        functions.cleanUp();

        const parser = new DOMParser();
        post = parser.parseFromString(postHtmlString, 'text/html').querySelector(".post");

        const groupInfo = parser.parseFromString(mainBlockHtmlString, 'text/html').querySelector(".group-info-block");
        functions.setTrimmedText(groupInfo.querySelector('#groupName'), groupData.name, 15);
        groupInfo.querySelector('#groupName').title = groupData.name;
        groupInfo.querySelector('#groupStatus').innerText =  groupData.isClosed ? 'Закрытая группа' : 'Открытая группа';
        groupInfo.querySelector('#subscribersValue').innerText = groupData.subscribersCount;
        functions.setIconStyle(groupInfo.querySelector('.group-info-block__group-icon'), groupData.name);

        const adminsEl = groupInfo.querySelector('.group-info-block__admins-container');
        const adminEl = parser.parseFromString(authorHtmlString, 'text/html').querySelector(".author");
        for (const admin of groupData.administrators) {

            const newAdminEl = adminEl.cloneNode(true);
            const newAdminNameEl = newAdminEl.querySelector('.author__name');
            functions.setTrimmedText(newAdminNameEl, admin.fullName, 15);
            newAdminNameEl.fullName = admin.fullName;
            newAdminNameEl.addEventListener('click', toAuthor);
            newAdminNameEl.title = admin.fullName;
            newAdminEl.querySelector('.author__birth-date-value').innerText = functions.getDateString(admin.birthDate);
            functions.setIconStyle(newAdminEl.querySelector('.profile-icon'), admin.fullName);

            adminsEl.appendChild(newAdminEl);
        }

        feed = document.createElement('div');
        feed.className = 'feed';

        mainDOMElements.mainBlock.appendChild(groupInfo);
        mainDOMElements.mainBlock.appendChild(feed);

        myStatus = myReceivedStatus.substring(1, myReceivedStatus.length - 1);

        loadSubMenu();
        loadPosts();

        document.title = groupData.name;

        functions.finishedLoadingPage();
    }
    else {
        functions.resolveError(apiGroupDataFetchPromise.value.status);
    }
}

async function loadPosts() {

    window.scrollTo({top: 0, behavior: 'smooth'})
    feed.classList.add('feed_processing');

    let query = `community/${groupId}/post`;

    if (filter.page !== null) {
        query += "?page=" + filter.page 
        + "&size=" + filter.size
        + (filter.tags !== null && filter.tags.length > 0 ? "&tags=" + filter.tags.join("&tags=") : "")
        + (filter.sorting !== null ? "&sorting=" + filter.sorting : "");
    
        if (query.substring(query.indexOf('?')) !== '?page=1&size=5') {
            window.history.replaceState({}, '', '/' + query.replace('community', 'communities'));
        }
        else {
            window.history.replaceState({}, '', '/' + query.substring(0, query.indexOf('?') - 5).replace('community', 'communities'));
        }
    }

    const [paginationResponse, postsResponse] = await Promise.allSettled([
        fetch("/pages/elements/pagination.html", { signal: functions.abortController.signal }),
        fetch(links.apiURL + query, { 
            signal: functions.abortController.signal,
            headers: {
                Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        })
    ]);

    if (postsResponse.value.ok) {

        const paginationBlock = await paginationResponse.value.text();
        const result = await postsResponse.value.json();
    
        setTimeout(() => {

            if (mainDOMElements.mainBlock.querySelector('.feed') === null) return;
            
            feed.replaceChildren();

            let counter = 0;

            const currentPageEl = groupPageActions.querySelector('#currentPage');
            currentPageEl.replaceChildren();

            while (counter++ < Math.max(result.pagination.count, 1)) {
                const optionEl = document.createElement('option');
                optionEl.value = optionEl.text = counter;
                currentPageEl.add(optionEl, null);
            }

            if (bAppliedNewFilters) {
                currentPageEl.value = 1;
                bAppliedNewFilters = false;
            }
            else {
                currentPageEl.value = filter.page;
            }
            
            counter = 0;
            for (const res of result.posts) {

                const newPost = elementConstructors.newPost(post, res);
                newPost.querySelector('.post__title-text').addEventListener('click', openPost);
                newPost.querySelector('.post__likes-wrapper').addEventListener('click', toggleLike);
                newPost.querySelector('.post__comments-wrapper').addEventListener('click', openComments);

                feed.appendChild(newPost);

                functions.trimmTags(newPost.querySelector('.post__tags-wrapper'));
                newPost.querySelector('.post__group').remove();

                setTimeout((postToShow) => postToShow.classList.remove('hidden'), 500 + 250 * Math.min(counter++, 5), newPost);
            }

            filter.count = result.pagination.count;
            filter.current = result.pagination.current;

            if (!bEndlessFeed) appendPagination(paginationBlock);

            feed.classList.remove('feed_forbidden-error');
            feed.classList.remove('feed_processing');

        }, 500);

    }
    else {
        feed.classList.remove('feed_processing');
        feed.replaceChildren();

        if (postsResponse.value.status === 403) {
            feed.classList.add('feed_forbidden-error');
            mainDOMElements.mainBlock.querySelector('.pagination-panel').remove();
        }
        else {
            functions.resolveError(postsResponse.value.status);
        }
    }   
}

function applyFilters() {

    const selectedTags = [];
    for (const tag of groupPageActions.querySelectorAll('.input-tags-selecter .tag_selected')) {
        selectedTags.push(tag.id);
    }

    filter.tags = selectedTags.length > 0 ? selectedTags : null;

    filter.sorting = groupPageActions.querySelector('#postSort').selectedOptions[0].value;
    
    filter.page = 1;
    filter.size = groupPageActions.querySelector('#pageSize').selectedOptions[0].value;
    
    bAppliedNewFilters = true;
    loadPosts();
}

function move(url) {

    if (!url.includes('?')) {
        functions.navigationClick(null, () => load(url));
    }
    else {
        const urlParams = new URLSearchParams(window.location.search);

        if (filter === undefined) {
            filter = new structs.communityPostFilter(1, 5, null, null);
        }
        
        filter.page = urlParams.get('page');
        filter.size = urlParams.get('size');
        filter.sorting = urlParams.get('sorting');
        filter.tags = urlParams.getAll('tags');
        bAppliedNewFilters = false;

        functions.navigationClick(null, () => load(url.slice(0, url.indexOf('/'))));
    }
}

async function appendPagination(paginationBlockHTML) {

    if (mainDOMElements.mainBlock.querySelector('.pagination-panel__buttons-wrapper') === null) {

        const parser = new DOMParser();
        const paginationPanel = parser.parseFromString(paginationBlockHTML, 'text/html').querySelector('.pagination-panel');

        mainDOMElements.mainBlock.appendChild(paginationPanel);

        paginationPanel.querySelector('.pagination-panel__button_far-left').addEventListener('click', (e) => { 
            filter.page = 1; loadPosts();
        });
        paginationPanel.querySelector('.pagination-panel__button_left').addEventListener('click', (e) => { 
            filter.page = Math.max(filter.current - 1, 1); loadPosts();
        });
        paginationPanel.querySelector('.pagination-panel__button_right').addEventListener('click', (e) => { 
            filter.page = Math.min(filter.current + 1, filter.count); loadPosts();
        });
        paginationPanel.querySelector('.pagination-panel__button_far-right').addEventListener('click', (e) => { 
            filter.page = filter.count; loadPosts();
        });

        paginationPanelButtons = paginationPanel.querySelector('.pagination-panel__buttons-wrapper');
    }

    paginationPanelButtons.replaceChildren();

    const newPaginationPanelButton = document.createElement('div');
    newPaginationPanelButton.className = 'pagination-panel__button';

    if (filter.count > 5) {

        const newPaginationPanelDots = document.createElement('div');
        newPaginationPanelDots.className = 'pagination-panel__more';

        if (filter.current > 3) {
            const newDots = newPaginationPanelDots.cloneNode();
            newDots.innerText = '...';
            paginationPanelButtons.appendChild(newDots);
        }

        const leftBorder = Math.max(1, Math.min(filter.count - 4, filter.current - 2));
        const rightBorder = Math.max(5, Math.min(filter.count, filter.current + 2));

        let count = leftBorder - 1;
        while (count++ < rightBorder) {
            const newButton = newPaginationPanelButton.cloneNode();
            newButton.innerText = count;
            
            if (count == filter.current) {
                newButton.classList.add('pagination-panel__button_selected')
            }
            else {
                newButton.addEventListener('click', (e) => {
                    filter.page = e.target.innerText; loadPosts();
                });
            }
            
            paginationPanelButtons.appendChild(newButton);
        }

        if (filter.current < filter.count - 2) {
            const newDots = newPaginationPanelDots.cloneNode();
            newDots.innerText = '...';
            paginationPanelButtons.appendChild(newDots);
        }
    }
    else {

        let count = 0;
        while (count++ < filter.count) {
            const newButton = newPaginationPanelButton.cloneNode();
            newButton.innerText = count;
            paginationPanelButtons.appendChild(newButton);

            if (count == filter.current) {
                newButton.classList.add('pagination-panel__button_selected')
            }
            else {
                newButton.addEventListener('click', (e) => {
                    filter.page = e.target.innerText; loadPosts();
                });
            }
        }
    }
}

function openPost(e) {

}

async function toggleLike(e) {

    if (!e.target.classList.contains('post__likes-wrapper_liked')) {

        const response = await fetch(links.apiURL + `post/${e.target.postGuid}/like`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            e.target.classList.add('post__likes-wrapper_liked');
            e.target.querySelector('.post__likes-count').innerText -= -1;
        }
    }
    else {

        const response = await fetch(links.apiURL + `post/${e.target.postGuid}/like`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            e.target.classList.remove('post__likes-wrapper_liked');
            e.target.querySelector('.post__likes-count').innerText -= 1;
        }
    }
}

function openComments(e) {

}

async function subscribeToggle(e) {

    e.target.classList.add('button_processing');

    if (!e.target.classList.contains('profile-actions__action_active')) {

        const response = await fetch(links.apiURL + `community/${e.target.groupGuid}/subscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        });

        e.target.classList.remove('button_processing');
        
        if (response.ok) {
            e.target.classList.add('profile-actions__action_active');
            e.target.innerText = 'Отписаться';

            mainDOMElements.mainBlock.querySelector('#subscribersValue').innerText -= -1;

            loadPosts();
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
            e.target.classList.remove('profile-actions__action_active');
            e.target.innerText = 'Подписаться';

            mainDOMElements.mainBlock.querySelector('#subscribersValue').innerText -= 1;

            loadPosts();
        }
        else {
            functions.resolveError(response.status);
        }
    }
}

export { move, feed };