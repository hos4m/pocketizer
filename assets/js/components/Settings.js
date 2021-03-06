import * as helpers from '../utils/helpers.js';
import * as globals from '../utils/globals.js';
import { selector, search, item } from './index.js';
import pocket from '../App.js';

class Settings {
    /**
     * @constructor
     */
    constructor() {
        this.selectorChange = this.handleSelectorChange.bind(this);
        this.focusAddInput = this.handleFocusAddInput.bind(this);
        this.resetAddInput = this.handleResetAddInput.bind(this);
        this.submitNewItem = this.handleSubmitNewItem.bind(this);
    }

    /**
     * Initialize settings.
     *
     * @function init
     * @return {void}
     */
    init() {
        this.bindEvents();
        this.loadOrder();
        this.loadUpdateInterval();
        this.loadArchiveAfterOpen();
    }

    /**
     * Bind all events.
     *
     * @function bindEvents
     * @return {void}
     */
    bindEvents() {
        document.addEventListener('select.selector', this.selectorChange, false);
        document.addEventListener('opened.modal', this.focusAddInput, false);
        document.addEventListener('closed.modal', this.resetAddInput, false);
        document.newItemForm.addEventListener('submit', this.submitNewItem, false);
    }

    /**
     * Remove all events.
     *
     * @function removeEvents
     * @return {void}
     */
    removeEvents() {
        document.removeEventListener('select.selector', this.selectorChange, false);
        document.removeEventListener('opened.modal', this.focusAddInput, false);
        document.removeEventListener('closed.modal', this.resetAddInput, false);
        document.newItemForm.removeEventListener('submit', this.submitNewItem, false);
    }

    /**
     * Set default page to load on extension load.
     *
     * @function setDefaultPage
     * @param {String} page - Page to set.
     * @return {void}
     */
    setDefaultPage(page = 'list') {
        helpers.setToStorage('defaultPage', page);
    }

    /**
     * Get default page to load on extension load.
     *
     * @function getDefaultPage
     * @return {String | null}
     */
    getDefaultPage() {
        return helpers.getFromStorage('defaultPage') || globals.PAGES[0];
    }

    /**
     * Set default theme if none is provided.
     *
     * @function setTheme
     * @param {String} theme - Theme to set.
     * @return {void}
     */
    setTheme(theme = globals.THEMES[0]) {
        helpers.setToStorage('theme', theme);
    }

    /**
     * Get theme to load on extension load.
     *
     * @function getTheme
     * @return {String | null}
     */
    getTheme() {
        return helpers.getFromStorage('theme');
    }

    /**
     * Get items order to load on extension load.
     *
     * @function getOrder
     * @return {String | null}
     */
    getOrder() {
        return helpers.getFromStorage('order');
    }

    /**
     * Get update interval to load on extension load.
     *
     * @function getUpdateInterval
     * @return {String | null}
     */
    getUpdateInterval() {
        return helpers.getFromStorage('updateInterval') || globals.UPDATE_INTERVALS[0];
    }

    /**
     * Load and set theme color on pocket load.
     *
     * @function loadTheme
     * @return {void}
     */
    loadTheme() {
        let theme = this.getTheme();

        if (!theme && !globals.THEMES.includes(theme)) {
            this.setTheme();
            theme = this.getTheme();
        }

        if (globals.THEMES.includes(theme)) {
            if (theme === 'theme-dynamic') {
                helpers
                    .getCurrentPosition()
                    .then(position => {
                        const isNight = this.isNightTime(position);
                        helpers.addClass(
                            document.body,
                            isNight ? globals.THEMES[1] : globals.THEMES[0],
                        );
                    })
                    .catch(() => {
                        helpers.setToStorage('theme', globals.THEMES[0]);
                        helpers.showMessage(
                            chrome.i18n.getMessage('ERROR_GETTING_LOCATION'),
                            false,
                            false,
                            true,
                            10000,
                        );
                        this.loadTheme();
                    });
            } else {
                helpers.addClass(document.body, theme);
            }

            const colorSelector = [...document.querySelectorAll('[name=selector-theme]')];
            for (const selector of colorSelector) {
                if (selector.value === theme) {
                    selector.checked = true;
                }
            }
        }
    }

    /**
     * Set default page on pocket load.
     *
     * @function loadDefaultPage
     * @return {void}
     */
    loadDefaultPage() {
        let defaultPage = this.getDefaultPage();

        if (defaultPage !== globals.PAGES[0] && !globals.PAGES.includes(defaultPage)) {
            defaultPage = globals.PAGES[0];
            this.setDefaultPage(defaultPage);
        }

        pocket.changePage(defaultPage, true);

        if (defaultPage) {
            const pageSelector = [...document.querySelectorAll('[name=selector-page]')];
            for (const selector of pageSelector) {
                if (selector.value === defaultPage) {
                    selector.checked = true;
                }
            }
        }
    }

    /**
     * Set order button direction and init selector in settings.
     *
     * @function loadOrder
     * @return {void}
     */
    loadOrder() {
        const order = this.getOrder();

        if (order) {
            this.rotateOrderButton(order === 'asc' ? true : false);

            const orderSelector = [...document.querySelectorAll('[name=selector-order]')];
            for (const selector of orderSelector) {
                if (selector.value === order) {
                    selector.checked = true;
                }
            }
        }
    }

    /**
     * Add class and change text in order by button.
     *
     * @function rotateOrderButton
     * @param {Boolean} orderItemsAsc - Order asc or desc.
     * @param {Event} e - Event from button click.
     * @return {void}
     */
    rotateOrderButton(orderItemsAsc, e) {
        const target = e && e.target ? e.target : document.querySelector('#js-orderButton');
        const orderDirectionText = document.querySelector('#js-orderDirectionText');

        if (orderItemsAsc) {
            target.classList.remove('is-rotated');
            orderDirectionText.innerText = chrome.i18n.getMessage('DESC');
        } else {
            helpers.addClass(target, 'is-rotated');
            orderDirectionText.innerText = chrome.i18n.getMessage('ASC');
        }
    }

    /**
     * Set update interval and change to right selector.
     *
     * @function loadUpdateInterval
     * @return {void}
     */
    loadUpdateInterval() {
        const updateInterval = this.getUpdateInterval();

        if (updateInterval) {
            const updateIntervalSelector = [
                ...document.querySelectorAll('[name=selector-update-interval]'),
            ];
            for (const selector of updateIntervalSelector) {
                if (selector.value === updateInterval) {
                    selector.checked = true;
                }
            }
        }
    }

    /**
     * Set the value of "archive after open"
     *
     * @function setArchiveAfterOpen
     * @param {Boolean}
     * @return {void}
     */
    setArchiveAfterOpen(val) {
        helpers.setToStorage('archiveAfterOpen', val);
    }

    /**
     * Get "archive after open" to load on extension load.
     *
     * @function getArchiveAfterOpen
     * @return {Boolean}
     */
    getArchiveAfterOpen() {
        return helpers.getFromStorage('archiveAfterOpen') || false;
    }

    /**
     * Load the "archive after open" option
     *
     * @function loadArchiveAfterOpen
     * @return {void}
     */
    loadArchiveAfterOpen () {
        document.querySelector('[name="archive-after-open"]').checked = JSON.parse(this.getArchiveAfterOpen());
    }

    /**
     * Handle selector change in settings.
     *
     * @function handleSelectorChange
     * @param {Event} e - Selector change event.
     * @return {void}
     */
    handleSelectorChange(e) {
        switch (e.detail.name) {
            case 'selector-theme':
                const value = e.detail.value.toString();

                if (globals.THEMES.includes(value)) {
                    if (value === 'theme-dynamic') {
                        selector.showMessage(
                            e,
                            true,
                            chrome.i18n.getMessage('LOADING_THEME'),
                            'infinite',
                        );

                        helpers
                            .getCurrentPosition()
                            .then(position => {
                                const isNight = this.isNightTime(position);

                                helpers.removeClass(document.body, helpers.getFromStorage('theme'));
                                helpers.addClass(
                                    document.body,
                                    isNight ? globals.THEMES[1] : globals.THEMES[0],
                                );
                                helpers.setToStorage('theme', value);

                                selector.showMessage(
                                    e,
                                    true,
                                    `${chrome.i18n.getMessage('SAVED')}!`,
                                );
                            })
                            .catch(() => {
                                this.loadTheme();
                                selector.showMessage(
                                    e,
                                    false,
                                    chrome.i18n.getMessage('ERROR_THEME'),
                                    10000,
                                );
                            });
                    } else {
                        helpers.removeClass(document.body, helpers.getFromStorage('theme'));
                        helpers.addClass(document.body, value);
                        helpers.setToStorage('theme', value);

                        selector.showMessage(e, true, `${chrome.i18n.getMessage('SAVED')}!`);
                    }
                }
                break;
            case 'selector-page':
                const page = e.detail.value.toString();

                if (globals.PAGES.includes(page)) {
                    this.setDefaultPage(page);

                    selector.showMessage(e, true, `${chrome.i18n.getMessage('SAVED')}!`);
                }
                break;
            case 'selector-order':
                const order = e.detail.value.toString();

                if (order === 'asc' || order === 'desc') {
                    helpers.setToStorage('order', order);
                    selector.showMessage(e, true, `${chrome.i18n.getMessage('SAVED')}!`);
                }
                break;
            case 'selector-update-interval':
                const interval = e.detail.value.toString();

                if (globals.UPDATE_INTERVALS.includes(interval)) {
                    helpers.setToStorage('updateInterval', interval);
                    selector.showMessage(e, true, `${chrome.i18n.getMessage('SAVED')}!`);
                }
                break;

            case 'archive-after-open':
                this.setArchiveAfterOpen(e.detail.checked);
                selector.showMessage(
                    e,
                    true,
                    `${chrome.i18n.getMessage('SAVED')}!`,
                );
        }
    }

    /**
     * Focus new item input when opening modal.
     *
     * @function handleFocusAddInput
     * @return {void}
     */
    handleFocusAddInput() {
        document.querySelector('#js-newItemInput').focus();
    }

    /**
     * Reset new item input value when closing modal.
     *
     * @function handleResetAddInput
     * @return {void}
     */
    handleResetAddInput() {
        document.querySelector('#js-newItemInput').value = '';
    }

    /**
     * Handle submitting new item adding form.
     *
     * @function handleSubmitNewItem
     * @param {Event} e - Submit event.
     * @return {void}
     */
    handleSubmitNewItem(e) {
        const form = e.target;

        if (form.checkValidity()) {
            e.preventDefault();
            helpers.showMessage(
                `${chrome.i18n.getMessage('CREATING_ITEM')}...`,
                true,
                false,
                false,
            );

            if (pocket.getActivePage() === 'list') {
                search.reset(true);
            }

            const rawData = new FormData(form);
            let data = {};

            for (const link of rawData.entries()) {
                data[link[0]] = link[1];
            }

            item.add(data);
        }
    }

    /**
     * If update interval difference is bigger than selected.
     *
     * @function isTimeToUpdate
     * @return {Boolean} - If is time to update.
     */
    isTimeToUpdate() {
        let isTime = false;
        const timeDifference = helpers.calcTimeDifference(
            helpers.getCurrentUNIX(),
            helpers.getFromStorage(`${this.getDefaultPage()}Since`) || 0,
        );

        if (timeDifference >= this.getUpdateInterval()) {
            isTime = true;
        }

        return isTime;
    }

    /**
     * If is between sunset and sunrise in your geolocation.
     *
     * @function isNightTime
     * @param {Object} position - Position from navigator.geolocation
     * @return {Boolean}
     */
    isNightTime(position) {
        const sunset = new Date().sunset(position.coords.latitude, position.coords.longitude);
        const tomorrow = helpers.getFutureDate(1);
        const sunrise = tomorrow.sunrise(position.coords.latitude, position.coords.longitude);

        return new Date().getTime() > sunset.getTime() && new Date().getTime() < sunrise.getTime();
    }

    /**
     * Destroy settings.
     *
     * @function destroy
     * @return {void}
     */
    destroy() {
        this.removeEvents();
    }
}

const settings = new Settings();
export default settings;
