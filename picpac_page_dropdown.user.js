// ==UserScript==
// @name         PicPac - Default x Rows (Universal)
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Forcibly sets rows per page dropdown to x on all Medovia PicPac datatables
// @author       Ophe
// @match        https://picpac.medovia.se/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_page_dropdown.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_page_dropdown.user.js
// ==/UserScript==


(function() {
    'use strict';

    const TARGET_LIMIT = '1000000';

    // Prevent execution if already redirected/processed to prevent refresh loops
    if (window.location.search.includes(`per_page=${TARGET_LIMIT}`) ||
        window.location.search.includes(`limit=${TARGET_LIMIT}`)) {
        return;
    }

    const checkExist = setInterval(() => {
        const select = document.querySelector('select#per_page') ||
                       document.querySelector('md-pagination select, md-data-table-container select, [md-data-table] select') ||
                       document.querySelector('select[ng-model*="limit"]');

        if (select) {
            clearInterval(checkExist);
            applyLimit(select);
        }
    }, 250);

    setTimeout(() => clearInterval(checkExist), 10000);

    function applyLimit(selectElement) {
        // Handle server-side rendered links (like in this HTML structure)
        if (selectElement.hasAttribute('onchange') && selectElement.getAttribute('onchange').includes('window.location')) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('per_page', TARGET_LIMIT);

            // Construct new URL path format used by the options
            const targetPathWithQuery = currentUrl.pathname + currentUrl.search;

            // Check if option exists, create if missing
            let optionExists = Array.from(selectElement.options).some(opt => opt.value.includes(`per_page=${TARGET_LIMIT}`));
            if (!optionExists) {
                const newOption = document.createElement('option');
                newOption.value = targetPathWithQuery;
                newOption.text = TARGET_LIMIT;
                selectElement.add(newOption);
            }

            // Redirect safely to the update URL with query parameter
            window.location.href = targetPathWithQuery;
            return;
        }

        // Handle AngularJS dynamic client-side tables
        let optionExists = Array.from(selectElement.options).some(opt => opt.value === TARGET_LIMIT);
        if (!optionExists) {
            const newOption = document.createElement('option');
            newOption.value = TARGET_LIMIT;
            newOption.text = TARGET_LIMIT;
            selectElement.add(newOption);
        }

        selectElement.value = TARGET_LIMIT;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        selectElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
})();
