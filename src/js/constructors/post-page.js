import * as links from "../exports/links.js";
import * as classNames from "../exports/classNames.js";
import * as mainDOMElements from "../exports/dom.js";
import * as functions from "../exports/functions.js";
import * as elementConstructors from "./elements.js";

let post, postId, commentThread, comment, commentsContainer, needToScroll = false, commentThreadGuidToReopen = null;

async function load(givenPostId, openComments = false) {
    
    if (postId !== givenPostId) {
        needToScroll = true;
    }
    
    postId = givenPostId;

    const cutHref = window.location.href.replace('://', '');
    let currentURL = cutHref.slice(cutHref.indexOf("/") + 1);

    localStorage.setItem('beforeOpeningPostTitle', document.title);
    localStorage.setItem('beforeOpeningPostUrl', currentURL);

    functions.abortAll();
    document.title = "Пост";
    window.history.replaceState({}, '', "/post/" + postId);

    const options = {};

    if (localStorage.getItem('token') !== null) {
        options.headers = {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        };
    }

    const postDataFetchPromise = fetch(`${links.apiURL}post/${postId}`, options)
    .then(response => response.json());

    const fullPostLocalFetchPromise = fetch("/pages/elements/full-post.html", { signal: functions.abortController.signal })
    .then(response => response.text())
    .then(htmlString => { return htmlString });

    const commentsLocalFetchPromise = fetch("/pages/elements/comments.html", { signal: functions.abortController.signal })
    .then(response => response.text())
    .then(htmlString => { return htmlString });

    Promise.all([postDataFetchPromise, fullPostLocalFetchPromise, commentsLocalFetchPromise])
    .then(([postData, postHtmlString, commentHtmlString]) => {
        
        functions.cleanOverlayPost();

        const parser = new DOMParser();
        const fullPost = parser.parseFromString(postHtmlString, 'text/html').querySelector(".full-post");

        post = elementConstructors.newPost(fullPost, postData, false);
        post.querySelector('.post__title-text').removeEventListener('click', toPost);
        post.querySelector('.post__author').addEventListener('click', functions.hidePost);

        const groupName = post.querySelector('.post__group-name');
        if (groupName !== null) groupName.addEventListener('click', functions.hidePost);

        if (postData.addressId !== null) {
            setGeoposition(postData.addressId);    
        }
        else {
            post.querySelector('.post__geoposition').remove();
        }

        const comments = parser.parseFromString(commentHtmlString, 'text/html').querySelector(".comments");

        mainDOMElements.overlayBlock.appendChild(post);
        
        const delimiter = document.createElement('div');
        delimiter.className = 'comments-delimiter';
        mainDOMElements.overlayBlock.appendChild(delimiter);

        mainDOMElements.overlayBlock.appendChild(comments);
        comments.querySelector('#sendComment').addEventListener('click', sendComment);
        comments.querySelector('#newCommentText').addEventListener('click', (e) => e.target.classList.remove('invalid'));

        commentsContainer = comments.querySelector('.comments__comments-container');
        commentThread = comments.querySelector('.comments__comment-thread').cloneNode(true);
        comment = commentThread.querySelector('.comments__comment');

        commentThreadGuidToReopen = null;

        appendComments(postData.comments, false);

        comments.querySelector('.comments__comment-thread').remove();
        
        if (needToScroll) {
            needToScroll = false;
            mainDOMElements.postOverlay.scrollTo({top: 0});
        }

        if (openComments) {
            mainDOMElements.postOverlay.querySelector('.comments__comment-create-form').scrollIntoView({ block: 'start', behavior: 'smooth' });
        }

        checkForCentering();

        functions.showPost();
    });
}

function checkForCentering() {
    if (mainDOMElements.overlayBlock.scrollHeight > window.innerHeight - 90) {
        mainDOMElements.postOverlay.classList.remove('center-children');
    }
    else {
        mainDOMElements.postOverlay.classList.add('center-children');
    }
}

async function setGeoposition(locationId) {
    
    const response = await fetch(links.apiURL + 'address/chain?objectGuid=' + locationId);

    if (response.ok) {
        const address = await response.json();

        let geoposition = '';
    
        address.forEach(element => {
            geoposition += (geoposition === '' ? '' : ', ') + element.text;
        });
    
        const geopositionEl = post.querySelector('.post__geoposition');
        geopositionEl.innerText = geoposition.replace('обл ', 'обл. ')
        .replace(' ул ', ' ул. ').replace(' п ', ' п. ').replace(' г ', ' г. ').replace(' д ', ' д. ');
        geopositionEl.classList.remove('processing');
    }
    else {
        functions.resolveError(response.status);
    }
}

function appendComments(comments, needToHighlight = true) {

    comments.sort((a, b) => {
        const dateA = new Date(a.createTime);
        const dateB = new Date(b.createTime);
        return dateA < dateB;
    });

    for (const comment of comments) {
        
        const newCommentEl = commentThread.cloneNode(true);
        commentsContainer.appendChild(newCommentEl);
        fillCommentWithData(newCommentEl, comment);

        if (commentThreadGuidToReopen !== null && commentThreadGuidToReopen === comment.id) {

            if (needToHighlight) {
                setTimeout((newCommentEl) => { 
                    newCommentEl.lastChild.lastChild.addEventListener('mouseover', (e) => e.target.classList.remove('newly-created'));
                    newCommentEl.lastChild.lastChild.classList.add('newly-created'); 
                    newCommentEl.lastChild.lastChild.scrollIntoView({ block: 'center', behavior: 'smooth' }) 
                }, 500, newCommentEl);
            }
            else {
                setTimeout((newCommentEl) => { 
                    if (newCommentEl.lastChild.lastChild !== null) newCommentEl.lastChild.lastChild.scrollIntoView({ block: 'center', behavior: 'smooth' })
                }, 500, newCommentEl);
            }

            if (newCommentEl.querySelector('.comment__show-replies') !== null) newCommentEl.querySelector('.comment__show-replies').click();
        }
    }

    if (commentThreadGuidToReopen === null && needToHighlight) {
        commentsContainer.firstChild.firstChild.classList.add('newly-created');
        commentsContainer.firstChild.firstChild.addEventListener('mouseover', (e) => e.target.classList.remove('newly-created'));
    }

    checkForCentering();
}

let closeRepliesTimer;
async function toggleCommentReplies(e) {

    clearTimeout(closeRepliesTimer);

    if (e.target.classList.contains('comment__show-replies_activated')) {
        e.target.parentNode.parentNode.parentNode.parentNode.lastChild.style = '';
        closeRepliesTimer = setTimeout(() => { if (!e.target.classList.contains('comment__show-replies_activated')) { e.target.parentNode.parentNode.parentNode.parentNode.lastChild.replaceChildren(); } checkForCentering(); }, 500);
        e.target.classList.remove('comment__show-replies_activated');
    }
    else {

        e.target.parentNode.parentNode.parentNode.parentNode.lastChild.replaceChildren();

        e.target.classList.add('processing');

        const repliesContainer = e.target.parentNode.parentNode.parentNode.parentNode.lastChild;

        const response = await fetch(`${links.apiURL}comment/${e.target.commentGuid}/tree`);
        const nestedComments = await response.json();

        if (response.ok) {
            for (const nestedComment of nestedComments) {
                const newNestedCommentEl = comment.cloneNode(true);
                repliesContainer.appendChild(newNestedCommentEl);
                fillCommentWithData(newNestedCommentEl, nestedComment, true);

                const deleteButton = newNestedCommentEl.querySelector('.comment__delete');
                if (deleteButton !== null) deleteButton.rootCommentGuid = e.target.commentGuid;
                const replyButton = newNestedCommentEl.querySelector('.comment__reply');
                if (replyButton !== null) replyButton.rootCommentGuid = e.target.commentGuid;
                const editButton = newNestedCommentEl.querySelector('.comment__edit');
                if (editButton !== null) editButton.rootCommentGuid = e.target.commentGuid;
            }
    
            e.target.parentNode.parentNode.parentNode.parentNode.lastChild.style.height = `${e.target.parentNode.parentNode.parentNode.parentNode.lastChild.scrollHeight}px`;
            e.target.classList.add('comment__show-replies_activated');
            e.target.classList.remove('processing');
            setTimeout(checkForCentering, 500);
        }
        else {
            functions.resolveError(response.status);
        }
    }
}

function fillCommentWithData(comment, data, removeShowReplies = false) {

    if (data.deleteDate !== null) {
        // if (data.subComments === 0) {
        //     comment.remove();
        //     return;
        // }
        functions.setIconStyle(comment.querySelector('.profile-icon'), 'X');
        comment.querySelector('.profile-icon').style.background = '#E60012';
        comment.querySelector('.comment__author-name').classList.add('comment__author-name_deleted');
        comment.querySelector('.comment__reply').remove();
    }
    else {
        functions.setIconStyle(comment.querySelector('.profile-icon'), data.author);
        const commentAuthorEl = comment.querySelector('.comment__author-name');
        functions.setTrimmedText(commentAuthorEl, data.author, 20);
        commentAuthorEl.title = data.author;

        if (data.modifiedDate !== null) {
            const modifiedEl = document.createElement('div');
            modifiedEl.className = 'comment__edited';
            modifiedEl.innerText = '(изменён)';
            modifiedEl.title = 'Комментарий был изменён ' + functions.dateToString(data.modifiedDate);
            commentAuthorEl.appendChild(modifiedEl);
        }

        comment.querySelector('.comment__text').innerText = data.content;
        const replyButton = comment.querySelector('.comment__reply');
        replyButton.commentGuid = data.id;
        replyButton.rootCommentGuid = data.id;
        replyButton.addEventListener('click', toggleReplyForm);

        if (data.authorId === localStorage.getItem('id')) {

            const buttons = comment.querySelector('.comment__buttons');
            
            const editButton = document.createElement('div');
            editButton.className = 'comment__edit';
            editButton.innerText = 'Изменить';
            editButton.commentGuid = data.id;
            editButton.rootCommentGuid = data.id;
            editButton.addEventListener('click', editComment);
            buttons.appendChild(editButton);
            
            const deleteButton = document.createElement('div');
            deleteButton.className = 'comment__delete';
            deleteButton.innerText = 'Удалить';
            deleteButton.commentGuid = data.id;
            deleteButton.addEventListener('click', deleteComment);
            buttons.appendChild(deleteButton);
        }
    }

    comment.querySelector('.comment__time').innerText = functions.dateToString(data.createTime);

    if (data.subComments === 0 || removeShowReplies) {
        comment.querySelector('.comment__show-replies').remove();
    }
    else {
        comment.querySelector('.comment__show-replies').commentGuid = data.id;
        comment.querySelector('.comment__show-replies').addEventListener('click', toggleCommentReplies);
    }
}

async function sendComment(e) {

    const commentData = {
        content: e.target.parentNode.firstChild.value,
        parentId: e.target.commentGuid === undefined ? null : e.target.commentGuid
    }

    if (commentData.content.length < 1 ||
        commentData.content.length > 1000) {
        e.target.parentNode.firstChild.classList.add('invalid');
        return;
    }
    
    const response = await fetch(`${links.apiURL}post/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          Authorization: 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(commentData)
    });

    if (response.ok) {
        
        e.target.parentNode.firstChild.value = '';

        if (e.target.rootCommentGuid !== undefined) {
            commentThreadGuidToReopen = e.target.rootCommentGuid;
        }
        else {
            commentThreadGuidToReopen = null;
        }

        reloadComments();
    }
    else {
        functions.resolveError(response.status);
    }
}

function editComment(e) {

    if (e.target.classList.contains('comment__edit_activated')) {

        e.target.parentNode.parentNode.querySelector('.comments__comment-create-form').remove();
        e.target.parentNode.classList.remove('closed');
        e.target.classList.remove('comment__edit_activated');

        const repliesEl = e.target.parentNode.parentNode.parentNode.parentNode;
        if (repliesEl.classList.contains('comments__replies')) {
            repliesEl.style.height = (repliesEl.style.height.substring(0, repliesEl.style.height.length - 2) - (-e.target.parentNode.parentNode.querySelector('.comment__text').scrollHeight+123)) + 'px';
        }

    }
    else {

        const repliesEl = e.target.parentNode.parentNode.parentNode.parentNode;
        if (repliesEl.classList.contains('comments__replies')) {
            repliesEl.style.height = (repliesEl.style.height.substring(0, repliesEl.style.height.length - 2) - (e.target.parentNode.parentNode.querySelector('.comment__text').scrollHeight-123)) + 'px';
        }
        checkForCentering();

        e.target.parentNode.classList.add('closed');
        e.target.classList.add('comment__edit_activated');

        const form = mainDOMElements.overlayBlock.querySelector('.comments__comment-create-form').cloneNode(true);
        form.classList.add('comments__comment-create-form_activated');
        form.classList.add('comments__comment-create-form_editing');
        const commentTextarea = form.querySelector('#newCommentText');
        commentTextarea.value = e.target.parentNode.parentNode.querySelector('.comment__text').innerText;
        const sendCommentEl = form.querySelector('#sendComment');
        sendCommentEl.commentGuid = e.target.commentGuid;
        sendCommentEl.rootCommentGuid = e.target.rootCommentGuid;
        sendCommentEl.addEventListener('click', putComment);
        e.target.parentNode.parentNode.insertBefore(form, e.target.parentNode);
        commentTextarea.focus();
        commentTextarea.addEventListener('click', (e) => e.target.classList.remove('invalid'));
    }
}

async function putComment(e) {
    
    const commentData = {
        content: e.target.parentNode.firstChild.value
    }

    if (commentData.content.length < 1 ||
        commentData.content.length > 1000) {
        e.target.parentNode.firstChild.classList.add('invalid');
        return;
    }
    
    const response = await fetch(`${links.apiURL}comment/${e.target.commentGuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          Authorization: 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(commentData)
    });

    if (response.ok) {
            
        commentThreadGuidToReopen = e.target.rootCommentGuid;

        reloadComments(false);
    }
    else {
        functions.resolveError(response.status);
    }
    
}

async function deleteComment(e) {

    e.target.classList.add('processing');
    
    const response = await fetch(`${links.apiURL}comment/${e.target.commentGuid}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token')
        }
    }); 
    
    if (response.ok) {

        commentThreadGuidToReopen = e.target.rootCommentGuid;

        reloadComments(false);
    }
    else {
        functions.resolveError(response.status);
    }
}

let replyFromCloseTimer;
function toggleReplyForm(e) {

    clearTimeout(replyFromCloseTimer);

    if (e.target.classList.contains('comment__reply_activated')) {

        e.target.parentNode.parentNode.querySelector('.comments__comment-create-form').classList.remove('comments__comment-create-form_activated');
        e.target.classList.remove('comment__reply_activated');

        const repliesEl = e.target.parentNode.parentNode.parentNode.parentNode;
        if (repliesEl.classList.contains('comments__replies')) {
            repliesEl.style.height = (repliesEl.style.height.substring(0, repliesEl.style.height.length - 2) - 135) + 'px';
        }

        replyFromCloseTimer = setTimeout(() => { 
            if (!e.target.classList.contains('comment__reply_activated')) {
                e.target.parentNode.parentNode.querySelector('.comments__comment-create-form').remove();
            } 
            checkForCentering(); 
        }, 500);
    }
    else {

        let form = e.target.parentNode.parentNode.querySelector('.comments__comment-create-form');

        if (form === null) {
            
            form = mainDOMElements.overlayBlock.querySelector('.comments__comment-create-form').cloneNode(true);
            
            const sendReply = form.querySelector('#sendComment');
            sendReply.addEventListener('click', sendComment);
            sendReply.rootCommentGuid = e.target.rootCommentGuid;
            sendReply.commentGuid = e.target.commentGuid;
    
            const replyTextarea = form.querySelector('#newCommentText');
            replyTextarea.id = 'replyText';
            replyTextarea.addEventListener('click', (e) => e.target.classList.remove('invalid'));
            replyTextarea.classList.remove('invalid');
            replyTextarea.placeholder = `Ответьте пользователю "${e.target.parentNode.parentNode.querySelector('.comment__author-name').title}"...`;
            
    
            e.target.parentNode.parentNode.appendChild(form);
        }
        
        form.querySelector('#replyText').focus();
        
        form.classList.add('comments__comment-create-form_activated');
        e.target.classList.add('comment__reply_activated');

        const repliesEl = e.target.parentNode.parentNode.parentNode.parentNode;
        if (repliesEl.classList.contains('comments__replies')) {
            repliesEl.style.height = (repliesEl.style.height.substring(0, repliesEl.style.height.length - 2) - (-135)) + 'px';
        }

        checkForCentering();
    }
}

async function reloadComments(needScrolling = true) {

    const options = {};

    if (localStorage.getItem('token') !== null) {
        options.headers = {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        };
    }

    const postResponse = await fetch(`${links.apiURL}post/${postId}`, options);

    if (postResponse.ok) {

        const postData = await postResponse.json();

        mainDOMElements.overlayBlock.querySelector('.post__comments-count').innerText = postData.commentsCount;
        mainDOMElements.overlayBlock.querySelector('.comments__comments-container').replaceChildren();
        
        appendComments(postData.comments, needScrolling);
    }
    else {
        functions.resolveError(response.status);
    }
}

function toPost(e) {

    load(e.target.postGuid);
}

function toPostComments(e) {

    load(e.target.postGuid, true);
}

async function toggleLike(e) {
    
    e.target.classList.add('processing');

    if (!e.target.classList.contains('post__likes-wrapper_liked')) {

        const response = await fetch(links.apiURL + `post/${e.target.postGuid}/like`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              Authorization: 'Bearer ' + localStorage.getItem('token')
            }
        });

        e.target.classList.remove('processing');

        if (response.ok) {
            e.target.classList.add('post__likes-wrapper_liked');
            e.target.querySelector('.post__likes-count').innerText -= -1;
        }
        else {
            functions.resolveError(response.status);
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

        e.target.classList.remove('processing');
        
        if (response.ok) {
            e.target.classList.remove('post__likes-wrapper_liked');
            e.target.querySelector('.post__likes-count').innerText -= 1;
        }
        else {
            functions.resolveError(response.status);
        }
    }
}

export { load, toPost, toPostComments, toggleLike }