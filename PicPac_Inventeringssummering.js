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

        const headers = Array.from(table.querySelectorAll('thead th'));
        const vardeIndex = headers.findIndex(th => th.textContent.trim().includes('Värde'));

        if (vardeIndex === -1) return;
        const targetHeader = headers[vardeIndex];

        // Ensure the parent TH element has a relative position context
        targetHeader.style.position = 'relative';
        // Add bottom padding to the cell structure to beautifully accommodate the sum row
        targetHeader.style.paddingBottom = '22px';

        const rows = table.querySelectorAll('tbody tr');
        let totalSum = 0;

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > vardeIndex) {
                const cellText = cells[vardeIndex].textContent.trim();
                if (cellText) {
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

        const innerContainer = targetHeader.querySelector('div, button') || targetHeader;
        let sumContainer = innerContainer.querySelector('.custom-header-sum');
        
        if (!sumContainer) {
            sumContainer = document.createElement('div');
            sumContainer.className = 'custom-header-sum';
            
            // Clean, non-intrusive absolute layout properties
            sumContainer.style.position = 'absolute';
            sumContainer.style.bottom = '4px';
            sumContainer.style.left = '16px'; // Matches standard Angular table cell left padding
            sumContainer.style.fontSize = '11px';
            sumContainer.style.fontWeight = '500';
            sumContainer.style.color = '#757575'; // Native secondary text color muted gray
            sumContainer.style.backgroundColor = '#f5f5f5'; // Subtle background badge look
            sumContainer.style.padding = '2px 6px';
            sumContainer.style.borderRadius = '4px';
            sumContainer.style.border = '1px solid #e0e0e0';
            sumContainer.style.pointerEvents = 'none'; // Prevents blocking header clicks/sorting actions
            
            innerContainer.appendChild(sumContainer);
        }
        
        sumContainer.textContent = `Totalt: ${formattedSum}`;
    }

    const initInterval = setInterval(() => {
        const targetTable = document.querySelector('table.datatable');
        if (targetTable) {
            clearInterval(initInterval);

            const tbody = targetTable.querySelector('tbody');
            if (tbody) {
                const observer = new MutationObserver(() => calculateVardeSum());
                observer.observe(tbody, { childList: true, subtree: true });
            }
            
            calculateVardeSum();
        }
    }, 250);
})();
