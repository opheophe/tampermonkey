// ==UserScript==
// @name         ApoSuite - Visa fler inköpsorderrader
// @namespace    https://picpac.medovia.se/
// @version      2026-07-21
// @description  Fetches all pages sequentially and downloads CSV
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/admin/purchase_order_lines/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function setPageSizeTo1000() {
        // Find the length select dropdown
        const select = document.querySelector('select[name$="_length"]');
        if (!select) return false;

        // Check if option 1000 already exists
        let option = Array.from(select.options).find(opt => opt.value === '1000');

        // Add option '1000' with plain text '1000' so it displays nicely next to "rader"
        if (!option) {
            option = new Option('1000', '1000');
            select.add(option);
        }

        // Apply 1000 if not selected
        if (select.value !== '1000') {
            select.value = '1000';

            // 1. Try triggering via DataTables API if present
            if (window.jQuery && window.jQuery.fn.dataTable) {
                const $table = window.jQuery(select).closest('table.datatable');
                if ($table.length && window.jQuery.fn.dataTable.isDataTable($table)) {
                    $table.DataTable().page.len(1000).draw();
                    console.log('[Userscript] Triggered DataTables API page.len(1000)');
                    return true;
                }
            }

            // 2. Fallback to dispatching jQuery change event
            if (window.jQuery) {
                window.jQuery(select).trigger('change');
            } else {
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }

            console.log('[Userscript] Set table page length to 1000 rows.');
        }

        return true;
    }

    // Observer to wait for the dynamic table controls to load
    const observer = new MutationObserver((mutations, obs) => {
        if (setPageSizeTo1000()) {
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Fallback run
    setTimeout(setPageSizeTo1000, 500);
})();
