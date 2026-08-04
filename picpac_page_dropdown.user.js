// ==UserScript==
// @name         PicPac - Default x Rows (Universal)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Forcibly sets rows per page dropdown to x on all Medovia PicPac datatables
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_page_dropdown.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_page_dropdown.user.js
// ==/UserScript==

(function() {
    'use strict';

    // We keep scanning periodically for the dropdown setup
    const checkExist = setInterval(() => {
        // Targets the select elements inside any of ApoSuite's dynamic Angular table structures
        const select = document.querySelector('md-pagination select, md-data-table-container select, [md-data-table] select') ||
                       document.querySelector('select[ng-model*="limit"]');

        if (select) {
            clearInterval(checkExist);
            setDropdownTo200(select);
        }
    }, 250); // Checks every 250ms

    // Safety timeout: stop looking if no table is found after 10 seconds (avoids background overhead)
    setTimeout(() => {
        clearInterval(checkExist);
    }, 10000);

    function setDropdownTo200(selectElement) {
        if (selectElement.value === '200') return;

        // Verify if 200 is present in the list; if not, inject it
        let optionExists = Array.from(selectElement.options).some(opt => opt.value === '200');

        if (!optionExists) {
            const newOption = document.createElement('option');
            newOption.value = '200';
            newOption.text = '200';
            selectElement.add(newOption);
        }

        // Apply change
        selectElement.value = '200';

        // Trigger both change and input events so AngularJS registers the update and reloads the table data
        const changeEvent = new Event('change', { bubbles: true });
        selectElement.dispatchEvent(changeEvent);

        const inputEvent = new Event('input', { bubbles: true });
        selectElement.dispatchEvent(inputEvent);

        console.log('Tampermonkey: Successfully defaulted table limit to 200 rows.');
    }
})();
