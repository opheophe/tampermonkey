// ==UserScript==
// @name         PicPac - Fetch License Plate Received Date
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Fetches and displays the "Mottaget" date for each license plate directly in the Pallet Racks table
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/admin/pallet_racks/*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    // 1. Find the table rows inside the main data container
    const rows = document.querySelectorAll('table.slim tbody tr');
    if (!rows.length) return;

    // Add a new header column to the table
    const headerRow = document.querySelector('table.slim thead tr');
    if (headerRow) {
        const newHeader = document.createElement('th');
        newHeader.innerHTML = '<div>Mottaget</div>';
        headerRow.appendChild(newHeader);
    }

    // 2. Loop through each row to fetch details
    for (const row of rows) {
        // Find the "Visa" link (icon button) in the last column
        const linkElement = row.querySelector('td:last-child a');
        if (!linkElement) continue;

        const targetUrl = linkElement.href;

        // Create a new cell (td) in the current row to hold the fetched date
        const dateCell = document.createElement('td');
        dateCell.textContent = 'Laddar...'; // Temporary loading status
        row.appendChild(dateCell);

        // Fetch the date in the background
        fetchDateAndInsert(targetUrl, dateCell);
    }

    // Function that fetches the page and parses the "Mottaget" date
    async function fetchDateAndInsert(url, cellToUpdate) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // Find all two-line list items on the target page
            const listItems = doc.querySelectorAll('md-list-item');
            let receivedDate = null;

            for (const item of listItems) {
                const description = item.querySelector('p');
                const value = item.querySelector('h3');

                // If the description element says "Mottaget", extract the date
                if (description && description.textContent.trim() === 'Mottaget' && value) {
                    receivedDate = value.textContent.trim();
                    break;
                }
            }

            if (receivedDate) {
                cellToUpdate.textContent = receivedDate;
            } else {
                cellToUpdate.textContent = 'Saknas'; // "Missing"
            }

        } catch (error) {
            console.error(`Failed to fetch from ${url}:`, error);
            cellToUpdate.textContent = 'Fel vid hämtning'; // "Fetch error"
        }
    }
})();
