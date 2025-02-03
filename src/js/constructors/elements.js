import * as links from "../exports/links.js";
import * as functions from "../exports/functions.js";
import * as authorsPage from "./authors-page.js";
import * as groupsPage from "./groups-page.js";
import * as postPage from "./post-page.js";

function newPost(originalElement, postProps, trimTags = true) {

    const newPost = originalElement.cloneNode(true);

    // Author icon
    functions.setIconStyle(newPost.querySelector('.post__author-icon'), postProps.author);    

    // Author
    const authorNameEl = newPost.querySelector('.post__author');
    functions.setTrimmedText(authorNameEl, postProps.author, 24);
    authorNameEl.title += ` "${postProps.author}"`;
    authorNameEl.fullName = postProps.author;
    authorNameEl.addEventListener('click', authorsPage.toAuthor);
    
    // Creation time
    newPost.querySelector('.post__date').innerText = functions.dateToString(postProps.createTime);

    // Community name
    if (postProps.communityName !== null) {
        const groupNameEl = newPost.querySelector('.post__group-name');
        functions.setTrimmedText(groupNameEl, postProps.communityName, 15);
        groupNameEl.title = `Перейти на страницу группы "${postProps.communityName}"`;
        groupNameEl.groupGuid = postProps.communityId;
        groupNameEl.addEventListener('click', groupsPage.toGroup);
    }
    else {
        newPost.querySelector('.post__group').remove();
    }

    // Reading time
    if (postProps.readingTime > 99) {
        newPost.querySelector('.post__read-time-value').innerText = '99+';
        newPost.querySelector('.post__read-time-value').title = `Автор указал нереальное число "${postProps.readingTime}"`;
    }
    else if (postProps.readingTime <= 0) {
        newPost.querySelector('.post__read-time-value').innerText = '???';
        newPost.querySelector('.post__read-time-value').title = `Автор указал невалидное число "${postProps.readingTime}"`;
    }
    else {
        newPost.querySelector('.post__read-time-value').innerText = postProps.readingTime;
    }
    
    // Tags
    if (postProps.tags !== null) {

        postProps.tags.sort((a, b) => { return a.name.length > b.name.length });

        const tagsWrapper = newPost.querySelector('.post__tags-wrapper');
        const tagsLeft = newPost.querySelector('.post__tags-left');

        if (trimTags) {
            if (postProps.tags.length > 3) {
                tagsLeft.innerText = '+' + (postProps.tags.length - 3);
            }

            postProps.tags = postProps.tags.slice(0, Math.min(postProps.tags.length, 3));
        }

        for (const tag of postProps.tags) {

            const newTag = tagsWrapper.firstChild.cloneNode();

            newTag.innerText = tag.name;

            tagsWrapper.insertBefore(newTag, tagsLeft);
        }

        tagsWrapper.removeChild(tagsWrapper.firstChild);
    }

    // Title
    const titleEl = newPost.querySelector('.post__title-text');
    titleEl.innerText = postProps.title;
    titleEl.postGuid = postProps.id;
    titleEl.addEventListener('click', postPage.toPost);

    // Content
    const content = newPost.querySelector('.post__content');
    content.innerText = postProps.description;

    if (postProps.description.length > 500) {
        const openFullEl = document.createElement('div');
        openFullEl.className = 'post__open-full';
        openFullEl.innerText = 'Показать полностью';
        openFullEl.addEventListener('click', functions.openFullText);
        content.appendChild(openFullEl);
    }
    
    // Image
    if (postProps.image !== null) {
        newPost.querySelector('.post__bg-image').src = postProps.image;
        newPost.querySelector('.post__image').src = postProps.image;
    }
    else {
        newPost.removeChild(newPost.querySelector('.post__image-wrapper'));
    }

    // Likes
    newPost.querySelector('.post__likes-count').innerText = postProps.likes;
    newPost.querySelector('.post__likes-wrapper').addEventListener('click', postPage.toggleLike);
    
    const likeWrapper = newPost.querySelector('.post__likes-wrapper');
    likeWrapper.postGuid = postProps.id;
    
    if (postProps.hasLike) {
        likeWrapper.classList.add('post__likes-wrapper_liked');
    }

    // Comments
    newPost.querySelector('.post__comments-count').innerText = postProps.commentsCount;
    newPost.querySelector('.post__comments-wrapper').postGuid = postProps.id;
    newPost.querySelector('.post__comments-wrapper').addEventListener('click', postPage.toPostComments);

    return newPost;
}

export { newPost }