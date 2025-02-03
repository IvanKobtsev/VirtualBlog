import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as elementConstructors from "./elements.js";
import * as createPost from "./create-post.js";
import * as structs from "../exports/structs.js";
import { unauthorized } from "../exports/resolvers.js";

let feed, post, mainPageActions, tags = [], filter = new structs.postFilter(1, 5, null, null, null, null, null, null), bEndlessFeed = false, 
    bAppliedNewFilters = true, paginationPanelButtons = null;

async function loadSubMenu() {

    const response = await fetch("/pages/main-page/sub-block.html", { signal: functions.abortController.signal });
    const post = await response.text();
    const parser = new DOMParser();
    mainPageActions = parser.parseFromString(post, 'text/html').querySelector('.main-page-actions');
    mainDOMElements.subBlock.appendChild(mainPageActions);

    mainPageActions.querySelector('#filterUsername').value = filter.author;

    const onlyMyCommunitiesEl = mainPageActions.querySelector('#filterMyGroups');
    onlyMyCommunitiesEl.parentNode.addEventListener('click', (e) => functions.toggleCheckBox(e.target));
    onlyMyCommunitiesEl.checked = filter.onlyMyCommunities !== null ? filter.onlyMyCommunities : false;
    if (filter.onlyMyCommunities === true) onlyMyCommunitiesEl.parentNode.click();

    const filterReadingTimeMinEl = mainPageActions.querySelector('#filterReadingTimeMin');
    filterReadingTimeMinEl.addEventListener('focus', functions.removeErrorHighlight);
    filterReadingTimeMinEl.value = filter.readingTimeMin;

    const filterReadingTimeMaxEl = mainPageActions.querySelector('#filterReadingTimeMax');
    filterReadingTimeMaxEl.addEventListener('focus', functions.removeErrorHighlight);
    filterReadingTimeMaxEl.value = filter.readingTimeMax;

    mainPageActions.querySelector('#tagSearch').addEventListener('input', createPost.findTags);
    functions.prepareTagSelector(tags, mainPageActions.querySelector('.input-tags__selectable-tags'), mainPageActions.querySelector('.input-tags'), filter.tags);
    mainPageActions.querySelector('.input-tags__add-tag').addEventListener('click', (e) => functions.toggleTagsSelection(e.target, mainPageActions.querySelector('.input-tags-selecter')));
    mainPageActions.querySelector('.form-submit').addEventListener('click', applyFilters);
    
    const postSortEl = mainPageActions.querySelector('#postSort');
    postSortEl.value = filter.sorting !== null ? filter.sorting : 'CreateDesc';
    postSortEl.addEventListener('change', applyFilters);

    const pageSize = mainPageActions.querySelector('#pageSize');
    pageSize.value = filter.size;
    pageSize.addEventListener('change', applyFilters);

    mainPageActions.querySelector('#currentPage').addEventListener('change', (e) => { filter.page = e.target.selectedOptions[0].value; loadPosts(); });
}

async function load() {

    functions.abortAll();
    document.title = "VirtualBlog";
    window.history.replaceState({}, '', "/");

    const delayPromise = new Promise(resolve => setTimeout(resolve, 500));

    const fetchPromise = fetch("/pages/elements/post.html", { signal: functions.abortController.signal })
        .then(response => response.text())
        .then(htmlString => { return htmlString });

    Promise.all([fetchPromise, delayPromise]).then(([htmlString]) => {

        functions.cleanUp();

        const parser = new DOMParser();
        post = parser.parseFromString(htmlString, 'text/html').querySelector(".post");      

        const createPostInnerDiv = document.createElement('div');
        createPostInnerDiv.className = 'feed__add-post-icon';

        const createPostButton = document.createElement('button');
        createPostButton.className = 'feed__add-post button';
        createPostButton.addEventListener('click', () => { 
            if (localStorage.getItem('token') !== null) {
                functions.navigationClick(null, createPost.load);
            }
            else {
                unauthorized();
            }
        });
        createPostButton.innerText = 'Написать пост';
        createPostButton.appendChild(createPostInnerDiv);

        feed = document.createElement('div');
        feed.className = 'feed';

        mainDOMElements.mainBlock.appendChild(createPostButton);        
        mainDOMElements.mainBlock.appendChild(feed);

        loadSubMenu();
        loadPosts();

        functions.finishedLoadingPage();
        
    });
}

async function loadPosts() {

    window.scrollTo({top: 0, behavior: 'smooth'})
    feed.classList.add('feed_processing');
    feed.classList.remove('feed_no-posts');

    let query = "post";

    if (filter.page !== null) {
        query += "?page=" + filter.page 
        + "&size=" + filter.size
        + (filter.tags !== null && filter.tags.length > 0 ? "&tags=" + filter.tags.join("&tags=") : "")
        + (filter.author !== null ? "&author=" + filter.author : "")
        + (filter.readingTimeMin !== null ? "&min=" + filter.readingTimeMin : "")
        + (filter.readingTimeMax !== null ? "&max=" + filter.readingTimeMax : "")
        + (filter.sorting !== null ? "&sorting=" + filter.sorting : "")
        + (filter.onlyMyCommunities !== null && filter.onlyMyCommunities !== false ? "&onlyMyCommunities=" + filter.onlyMyCommunities : "");
    
        if (query !== 'post?page=1&size=5' && query !== 'post?page=1&size=5&sorting=CreateDesc') {
            window.history.replaceState({}, '', query);
        }
        else {
            window.history.replaceState({}, '', '/');
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

    if (paginationResponse.value.ok && postsResponse.value.ok) {

        const paginationBlock = await paginationResponse.value.text();
        const result = await postsResponse.value.json();

        setTimeout(() => {
            
            if (mainDOMElements.mainBlock.querySelector('.feed') === null) return;
                
            feed.replaceChildren();

            let counter = 0;

            const currentPageEl = mainPageActions.querySelector('#currentPage');
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

                feed.appendChild(newPost);
                
                functions.trimmTags(newPost.querySelector('.post__tags-wrapper'));

                setTimeout((postToShow) => postToShow.classList.remove('hidden'), 500 + 250 * Math.min(counter++, 5), newPost);
            }

            filter.count = result.pagination.count;
            filter.current = result.pagination.current;

            if (!bEndlessFeed) appendPagination(paginationBlock);

            if (counter === 0) feed.classList.add('feed_no-posts');

            feed.classList.remove('feed_processing');

        }, 500);
    }
    else {
        functions.resolveError(postsResponse.value.status);
    }
}

function applyFilters() {
    
    let bIsValid = true;

    const readingTimeMinEl = mainPageActions.querySelector('#filterReadingTimeMin');
    const readingTimeMinNum = Number(readingTimeMinEl.value);
    if (!(!isNaN(readingTimeMinNum) && readingTimeMinNum >= 0)) {
        readingTimeMinEl.classList.add('invalid');
        bIsValid = false;
    }
    
    const readingTimeMaxEl = mainPageActions.querySelector('#filterReadingTimeMax');
    const readingTimeMaxNum = Number(readingTimeMaxEl.value);
    if (!(!isNaN(readingTimeMaxNum) && (isNaN(readingTimeMinNum) || readingTimeMaxNum >= readingTimeMinNum))) {
        readingTimeMaxEl.classList.add('invalid');
        bIsValid = false;
    }
    
    if (!bIsValid) return;

    const username = mainPageActions.querySelector('#filterUsername').value;
    filter.author = username.length > 0 ? username : null;
    filter.onlyMyCommunities = mainPageActions.querySelector('#filterMyGroups').checked;
    
    filter.readingTimeMin = readingTimeMinEl.value === '' ? null : readingTimeMinEl.value;
    filter.readingTimeMax = readingTimeMaxEl.value === '' ? null : readingTimeMaxEl.value;

    const selectedTags = [];
    for (const tag of mainPageActions.querySelectorAll('.input-tags-selecter .tag_selected')) {
        selectedTags.push(tag.id);
    }

    filter.tags = selectedTags.length > 0 ? selectedTags : null;

    filter.sorting = mainPageActions.querySelector('#postSort').selectedOptions[0].value;
    
    filter.page = 1;
    filter.size = mainPageActions.querySelector('#pageSize').selectedOptions[0].value;
    
    bAppliedNewFilters = true;
    loadPosts();
}

function move(url) {

    if (!url.includes('?')) {
        mainDOMElements.mainPageNav.click();
    }
    else {

        const urlParams = new URLSearchParams(window.location.search);
        
        filter.page = urlParams.get('page');
        filter.size = urlParams.get('size');
        filter.sorting = urlParams.get('sorting');
        filter.author = urlParams.get('author');
        filter.onlyMyCommunities = urlParams.get('onlyMyCommunities') == 'true';
        filter.readingTimeMin = urlParams.get('min');
        filter.readingTimeMax = urlParams.get('max');
        filter.tags = urlParams.getAll('tags');
        bAppliedNewFilters = false;

        mainDOMElements.mainPageNav.click();
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

function clearFilters() {

    filter = new structs.postFilter(1, 5, null, null, null, null, null, null);

}

export { load, move, feed, clearFilters };