// ==UserScript==
// @name         PicPac - Visa fler rader (1000)
// @namespace    https://picpac.medovia.se/
// @version      2026-07-24
// @description  Sets DataTables dropdown option to 1000 rows across ApoSuite pages
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function setPageSizeTo1000() {
        // Targets DataTables length dropdowns by name ending in '_length' or container class '.dataTables_length'
        const select = document.querySelector('.dataTables_length select, select[name$="_length"]');
        if (!select) return false;

        // Check if option 1000 already exists
        let option = Array.from(select.options).find(opt => opt.value === '1000');

        // Inject option '1000'
        if (!option) {
            option = new Option('1000', '1000');
            select.add(option);
        }

        // Apply 1000 if not selected
        if (select.value !== '1000') {
            select.value = '1000';

            // 1. Try triggering via DataTables API if present
            if (window.jQuery && window.jQuery.fn.dataTable) {
                const $table = window.jQuery(select).closest('.dataTables_wrapper').find('table.datatable');
                if ($table.length && window.jQuery.fn.dataTable.isDataTable($table)) {
                    $table.DataTable().page.len(1000).draw();
                    console.log('[Userscript] Triggered DataTables API page.len(1000)');
                    return true;
                }
            }

            // 2. Fallback to dispatching change event
            if (window.jQuery) {
                window.jQuery(select).trigger('change');
            } else {
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }

            console.log('[Userscript] Set table page length to 1000 rows.');
        }

        return true;
    }

    // Observer to handle dynamic content loads
    const observer = new MutationObserver((mutations, obs) => {
        if (setPageSizeTo1000()) {
            // Keep observing in case tab switches or table reloads occur dynamically
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Fallback execution
    setTimeout(setPageSizeTo1000, 500);
})();
