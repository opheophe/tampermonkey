// ==UserScript==
// @name         Medovia PicPac - Inventeringssummering
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Calculates and displays the total sum of the Värde column on both results and durability pages.
// @author       Gemini
// @match        https://picpac.medovia.se/admin/stocktaking_results*
// @match        https://picpac.medovia.se/item_transfer_assignments/pending_durability*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function calculateVardeSum() {
        const table = document.querySelector('table.datatable');
        if (!table) return;

        // Find index of the 'Värde' column dynamically
        const headers = Array.from(table.querySelectorAll('thead th'));
        const vardeIndex = headers.findIndex(th => th.textContent.trim().includes('Värde'));

        if (vardeIndex === -1) return;
        const targetHeader = headers[vardeIndex];

        const rows = table.querySelectorAll('tbody tr');
        let totalSum = 0;

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > vardeIndex) {
                const cellText = cells[vardeIndex].textContent.trim();
                if (cellText) {
                    // Strips Swedish kr symbols, non-breaking spaces (\xa0), regular spaces,
                    // and flips the decimal comma to a dot so JavaScript can calculate it.
                    const cleanNum = cellText.replace(/[\s\xa0kr]/g, '').replace(',', '.');
                    const value = parseFloat(cleanNum);
                    if (!isNaN(value)) {
                        totalSum += value;
                    }
                }
            }
        });

        const formattedSum = new Intl.NumberFormat('sv-SE', {
            style: 'currency',
            currency: 'SEK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(totalSum);

        // Target the inner container inside the md-data-table headers
        const innerContainer = targetHeader.querySelector('div, button') || targetHeader;

        // Force the parent container to wrap items horizontally (Flexbox break fix)
        innerContainer.style.flexWrap = 'wrap';

        let sumContainer = innerContainer.querySelector('.custom-header-sum');

        if (!sumContainer) {
            sumContainer = document.createElement('span');
            sumContainer.className = 'custom-header-sum';
            sumContainer.style.fontSize = '0.85em';
            sumContainer.style.fontWeight = 'bold';
            sumContainer.style.color = '#ff9800';

            // Layout alignment rules to cleanly force it below the title text
            sumContainer.style.width = '100%';
            sumContainer.style.display = 'block';
            sumContainer.style.marginTop = '4px';

            innerContainer.appendChild(sumContainer);
        }

        sumContainer.textContent = formattedSum;
    }

    // Set up a repeating polling loop to safely capture the table once loaded in the DOM
    const initInterval = setInterval(() => {
        const targetTable = document.querySelector('table.datatable');
        if (targetTable) {
            clearInterval(initInterval);

            const tbody = targetTable.querySelector('tbody');
            if (tbody) {
                // Watches for backend data stream updates asynchronously
                const observer = new MutationObserver(() => calculateVardeSum());
                observer.observe(tbody, { childList: true, subtree: true });
            }

            calculateVardeSum();
        }
    }, 250);
})();
