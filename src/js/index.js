import * as functions from "./exports/functions.js";
import * as mainDOMElements from "./exports/dom.js";
import * as links from "./exports/links.js";
import * as classNames from "./exports/classNames.js";
import * as loginPage from "./constructors/login-profile-page.js";
import * as mainPage from "./constructors/main-page.js";
import * as authorsPage from "./constructors/authors-page.js";
import * as groupsPage from "./constructors/groups-page.js";

mainDOMElements.headerLogo.addEventListener('click', () => { functions.hideModal(); functions.hidePost(); functions.navigationClick(mainDOMElements.mainPageNav, mainPage.load); });
mainDOMElements.profileNav.addEventListener('click', (e) => functions.navigationClick(e.target, loginPage.load));
mainDOMElements.mainPageNav.addEventListener('click', (e) => functions.navigationClick(e.target, mainPage.load));
mainDOMElements.authorsNav.addEventListener('click', (e) => functions.navigationClick(e.target, authorsPage.load));
mainDOMElements.groupsNav.addEventListener('click', (e) => functions.navigationClick(e.target, groupsPage.load));
mainDOMElements.profileWrapper.addEventListener('click', functions.profileClick);
mainDOMElements.profileOptionProfile.addEventListener('click', () => functions.navigationClick(mainDOMElements.profileNav, loginPage.load));
mainDOMElements.profileOptionLogout.addEventListener('click', functions.logout);
mainDOMElements.postOverlay.addEventListener('click', (e) => { if (e.target.classList.contains('overlay')) functions.hidePost() });
mainDOMElements.modalOverlay.addEventListener('click', (e) => { if (e.target.classList.contains('overlay')) functions.hideModal() });
mainDOMElements.subBlockCaller.addEventListener('click', () => mainDOMElements.subBlock.classList.toggle('shown'));
document.addEventListener('click', functions.clickAnywhere);

functions.moveAccordingToHref();
functions.checkAuthorization();