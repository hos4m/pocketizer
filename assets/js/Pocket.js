'use strict';

class Pocket {
    /**
     * @constructor
     */
    constructor() {
        this.active_page = 'list';
        this.items_shown = 0;
        this.load_count = 18;

        this.scroll = {
            lastKnownScrollY: 0,
            ticking: false
        }
    }

    /**
     * Initialize Pocket.
     *
     * @function init
     * @return {void}
     */
    init() {
        localizeHtml();

        if (authService.isLoggedIn()) {
            this.startSync();
        } else {
            // TODO: user variabels for querySelector
            document.querySelector('#js-default-message').style.display = 'block';
            this.bindLoginClickEvent();
        }
    }

    /**
     * Gets content from localStorage and from Pocket API to see if there are newer links.
     *
     * @function getContent
     * @return {void}
     */
    getContent() {
        let state;

        switch (this.active_page) {
            case 'list':
                state = 'unread';
            break;
            case 'archive':
                state = 'archive';
            break;
        }

        apiService.get(state)
            .then(response => {
                this.sortGetResponse(response);
            })
            .catch(error => {
                console.log(error);
                showMessage(chrome.i18n.getMessage('ERROR_GETTING_CONTENT'), false);
            });
    }

    /**
     * Sort get response, add to localstorage and render page again.
     *
     * @function sortGetResponse
     * @param  {Object} response - response from fetch.
     * @return {void}
     */
    sortGetResponse(response) {
        let array = [];
        let items = response.list;

        for (let key in items) {
            array.push(items[key]);
        }

        array.sort((x, y) => {
            return x.sort_id - y.sort_id;
        });

        switch (this.active_page) {
            case 'list':
                localStorage.setItem('listFromLocalStorage', JSON.stringify(array));
                localStorage.setItem('listCount', array.length);
            break;
            case 'archive':
                localStorage.setItem('archiveListFromLocalStorage', JSON.stringify(array));
                localStorage.setItem('archiveCount', array.length);
            break;
        }

        this.render();
        showMessage(chrome.i18n.getMessage('SYNCHRONIZING'));
    }

    /**
     * Renders from localStorage.
     *
     * @function render
     * @return {void}
     */
    render() {
        let array;
        let listElement;

        switch (this.active_page) {
            case 'list':
                array = JSON.parse(localStorage.getItem('listFromLocalStorage'));

                document.querySelector('#js-count').innerText = localStorage.getItem('listCount');
            break;
            case 'archive':
                array = JSON.parse(localStorage.getItem('archiveListFromLocalStorage'));

                document.querySelector('#js-count').innerText = localStorage.getItem('archiveCount');
            break;
        }

        this.items_shown = this.load_count;

        document.querySelector('#js-list').innerHTML = "";

        if (array === null) {
            this.getContent();
        } else if (array.length === 0) {
            document.querySelector('#js-empty-list-message').style.display = 'block';
        } else {
            array = array.filter((i, index) => (index < this.load_count));
            document.querySelector('#js-empty-list-message').style.display = 'none';

            this.createItems(array);
            this.createSentinel();
            this.createObserver();
        }
    }

    /**
     * Creates items and appends to DOM.
     *
     * @function createItems
     * @param  {Array} a Array of items.
     * @return {void}
     */
    createItems(a) {
        Object.keys(a).forEach(key => {
            item.create(a[key], this.active_page);
        });
    }

    /**
     * Create empty div for observer to observe.
     *
     * @function createSentinel
     * @return {void}
     */
    createSentinel() {
        const list = document.querySelector('.list');
        let element = createNode('div');

        element.setAttribute('id', 'js-sentinel');
        element.setAttribute('class', 'sentinel');

        append(list, element);
    }

    /**
     * Create IntersectionObserver to load more items on scroll.
     *
     * @function createObserver
     * @return {void}
     */
    createObserver() {
        const sentinel = document.querySelector('#js-sentinel');
        const list = document.querySelector('#js-list');

        const io = new IntersectionObserver(entries => {
            if (entries[0].intersectionRatio <= 0) {
                return;
            }

            this.infiniteScroll();
            append(list, sentinel);
        });

        io.observe(sentinel);
    }

    /**
     * Load more items.
     *
     * @function infiniteScroll
     * @return {void}
     */
    infiniteScroll() {
        showMessage(`${chrome.i18n.getMessage('LOADING')}...`, true, false, false);
        let array;

        switch (this.active_page) {
            case 'list':
                array = JSON.parse(localStorage.getItem('listFromLocalStorage'));
            break;
            case 'archive':
                array = JSON.parse(localStorage.getItem('archiveListFromLocalStorage'));
            break;
        }

        array = array.filter((i, index) => (index >= this.items_shown && index < this.items_shown + this.load_count));

        this.items_shown += this.load_count;

        if (array.length === 0) {
            showMessage(chrome.i18n.getMessage('EVERYTHING_LOADED'), true, false, true);
        } else {
            showMessage(chrome.i18n.getMessage('LOADING'));
        }

        this.createItems(array);
    }

    /**
     * Binds click events for action buttons.
     *
     * @function bindActionClickEvents
     * @return {void}
     */
    bindActionClickEvents() {
        document.body.addEventListener('click', (e) => {
            let id = e.target.dataset.id;

            if (e.target.classList.contains('js-toggle-favourite-button')) {
                e.preventDefault();
                let isFavourited = e.target.dataset.favourite;
                isFavourited = (isFavourited == 'true'); // convert to boolean

                this.toggleActionState(e, 'favourite', id, isFavourited);
            } else if (e.target.classList.contains('js-deleteButton')) {
                e.preventDefault();
                this.toggleActionState(e, 'delete', id, false);
            } else if (e.target.classList.contains('js-toggleReadButton')) {
                e.preventDefault();
                this.toggleActionState(e, 'read', id, false);
            }
        });

        document.querySelector('#js-logout').addEventListener('click', () => {
            this.logout();
        }, false);
    }

    /**
     * Bind menu change click events.
     *
     * @function bindMenuClickEvents
     * @return {void}
     */
    bindMenuClickEvents() {
        document.body.addEventListener('click', (e) => {
            if (e.target.parentNode.classList.contains('js-changeMenu')) {
                e.preventDefault();
                let page = e.target.parentNode.dataset.page;

                this.changePage(page);
            }
        });
    }

    /**
     * Bind login button click event.
     *
     * @function bindLoginClickEvent
     * @return {void}
     */
    bindLoginClickEvent() {
        let loginButton = document.querySelector('#js-login');
        loginButton.addEventListener('click', () => {
            this.startLogin();

            loginButton.disabled = true;
        }, false);
    }

    /**
     * Toggles item state.
     *
     * @function toggleActionState
     * @param  {Event}  e - Event.
     * @param  {String}  state - Current state.
     * @param  {Number}  id - Item id.
     * @param  {Boolean} isFavourited - If should be favourited.
     * @return {void}
     */
    toggleActionState(e, state, id, isFavourited) {
        let action;

        if (state == 'read') {
            switch (this.active_page) {
                case 'archive':
                    action = 'readd';
                    showMessage(`${chrome.i18n.getMessage('UNARCHIVING')}...`, true, false, false);
                break;
                case 'list':
                    action = 'archive';
                    showMessage(`${chrome.i18n.getMessage('ARCHIVING')}...`, true, false, false);
                break;
            }
        } else if (state == 'favourite') {
            action = (isFavourited === true ? 'unfavorite' : 'favorite');
            showMessage(`${chrome.i18n.getMessage('PROCESSING')}...`, true, false, false);
        } else if (state == 'delete') {
            action = 'delete';
            showMessage(`${chrome.i18n.getMessage('DELETING')}...`, true, false, false);
        }

        let actions = [{
            "action": action,
            "item_id": id,
            "time": getCurrentUNIX()
        }];

        apiService.send(actions)
            .then(response => {
                let a;

                switch (this.active_page) {
                    case 'list':
                        a = JSON.parse(localStorage.getItem('listFromLocalStorage'));
                    break;
                    case 'archive':
                        a = JSON.parse(localStorage.getItem('archiveListFromLocalStorage'));
                    break;
                }

                for (let i = 0; i < a.length; i++) {
                    if (a[i].item_id == id) {
                        switch (state) {
                            case 'read':
                            case 'delete':
                                a.splice(i, 1);

                                e.target.parentNode.parentNode.remove();

                                switch (this.active_page) {
                                    case 'list':
                                        localStorage.setItem('listCount', localStorage.getItem('listCount') - 1);
                                        document.querySelector('#js-count').innerText = localStorage.getItem('listCount');
                                    break;
                                    case 'archive':
                                        localStorage.setItem('archiveCount', localStorage.getItem('archiveCount') - 1);
                                        document.querySelector('#js-count').innerText = localStorage.getItem('archiveCount');
                                    break;
                                }
                            break;
                            case 'favourite':
                                a[i].favorite = (isFavourited === true ? 0 : 1);

                                isFavourited = !isFavourited;
                                e.target.parentNode.querySelector('.js-toggle-favourite-button').dataset.favourite = isFavourited;
                            break;
                        }
                    }
                };

                switch (this.active_page) {
                    case 'list':
                        localStorage.setItem('listFromLocalStorage', JSON.stringify(a));
                    break;
                    case 'archive':
                        localStorage.setItem('archiveListFromLocalStorage', JSON.stringify(a));
                    break;
                }

                if (state == 'read') {
                    if (this.active_page === 'list') {
                        showMessage(chrome.i18n.getMessage('ARCHIVING'));
                    } else if (this.active_page === 'archive') {
                        showMessage(chrome.i18n.getMessage('UNARCHIVING'));
                    }
                } else if (state == 'favourite') {
                    showMessage(chrome.i18n.getMessage('PROCESSING'));
                } else if (state == 'delete') {
                    showMessage(chrome.i18n.getMessage('DELETING'));
                }
            })
            .catch(error => {
                console.log(error);
                showMessage(chrome.i18n.getMessage('ACTION'), false);
            });
    }

    /**
     * Change page between list and archive.
     *
     * @function changePage
     * @param  {String} page - Page to change to.
     * @return {void}
     */
    changePage(page) {
        let menuLinkElements = document.querySelectorAll('.menu__link');
        for (let i = 0; i < menuLinkElements.length; i++) {
            menuLinkElements[i].classList.remove('menu__link--active');
            if (menuLinkElements[i].dataset.page == page) {
                menuLinkElements[i].classList.add('menu__link--active');
            }
        }

        this.items_shown = 0;
        document.querySelector('#js-list').innerHTML = "";

        switch (page) {
            case 'list':
                this.active_page = 'list';

                document.querySelector('#js-count').innerText = localStorage.getItem('listCount');
                document.querySelector('#js-title').innerText = chrome.i18n.getMessage('MY_POCKET_LIST');
                showMessage(`${chrome.i18n.getMessage('SYNCHRONIZING')}...`, true, false, false);

                this.render();
                this.getContent();
            break;
            case 'archive':
                this.active_page = 'archive';

                document.querySelector('#js-count').innerText = localStorage.getItem('archiveCount');
                document.querySelector('#js-title').innerText = chrome.i18n.getMessage('ARCHIVE');
                showMessage(`${chrome.i18n.getMessage('SYNCHRONIZING')}...`, true, false, false);

                if (localStorage.getItem('archiveCount')) {
                    this.render();
                }

                this.getContent();
            break;
        }
    }

    /**
     * Show right elements when coming to new tab or logging in.
     *
     * @function showLoggedInContent
     * @return {void}
     */
    showLoggedInContent() {
        document.querySelector('#js-default-message').style.display = 'none';
        document.querySelector('#js-count-wrapper').style.display = 'inline-block';
        document.querySelector('#js-menu').style.display = 'flex';
        document.querySelector('#js-list').style.display = 'flex';
        document.querySelector('#js-username').style.display = 'inline-block';
        document.querySelector('#js-logout').style.display = 'inline-block';
    }

    /**
     * Show right content after loging in.
     *
     * @function loggedIn
     * @return {void}
     */
    loggedIn() {
        document.querySelector('#js-username').innerText = localStorage.getItem('username');

        showMessage(`${chrome.i18n.getMessage('SYNCHRONIZING')}...`, true, false, false);

        this.showLoggedInContent();

        // get content from pocket api
        this.getContent();

        this.bindMenuClickEvents();
        this.bindActionClickEvents();
    }

    /**
     * Show content from localStorage and start sync with Pocket.
     *
     * @function startSync
     * @return {void}
     */
    startSync() {
        showMessage(`${chrome.i18n.getMessage('SYNCHRONIZING')}...`, true, false, false);

        this.render();

        this.showLoggedInContent();

        if (localStorage.getItem('username')) {
            document.querySelector('#js-username').innerText = localStorage.getItem('username');
        }

        this.bindMenuClickEvents();
        this.bindActionClickEvents();

        this.getContent();
    }

    /**
     * Start login flow.
     *
     * @function startLogin
     * @return {void}
     */
    startLogin() {
        authService.authenticate().then((response) => {
            if (response.status !== 'authenticated') {
                showMessage(chrome.i18n.getMessage('AUTHENTICATION'), false);
                this.logout();
            }

            showMessage(chrome.i18n.getMessage('AUTHENTICATION'));
            this.loggedIn();
        });
    }

    /**
     * Clear localStorage and show and hide right elements.
     *
     * @function logout
     * @return {void}
     */
    logout() {
        showMessage(`${chrome.i18n.getMessage('LOGGING_OUT')}...`, true, false, false);
        localStorage.clear();

        document.querySelector('#js-default-message').style.display = 'block';
        document.querySelector('#js-list').style.display = 'none';
        document.querySelector('#js-menu').style.display = 'none';
        document.querySelector('#js-username').style.display = 'none';
        document.querySelector('#js-logout').style.display = 'none';
        document.querySelector('#js-count-wrapper').style.display = 'none';

        this.bindLoginClickEvent();

        showMessage(chrome.i18n.getMessage('LOGGING_OUT'));
    }
};

window.pocket = new Pocket();
window.onload = (() => {
    window.pocket.init();
});