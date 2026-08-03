// ==UserScript==
// @name         Kickstarter Default to Newest
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically changes default or 'magic' sorting to 'newest' on Kickstarter discover pages.
// @author       You
// @match        https://www.kickstarter.com/discover*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/kickstarter_default.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/kickstarter_default.user.js
// ==/UserScript==

(function() {
    'use strict';

    function forceNewestSort() {
        const url = new URL(window.location.href);
        const currentSort = url.searchParams.get('sort');

        // Kickstarter uses 'magic' or missing parameters for "Relevance"
        if (!currentSort || currentSort === 'magic') {
            url.searchParams.set('sort', 'newest');
            window.location.replace(url.toString());
        }
    }

    forceNewestSort();
})();
