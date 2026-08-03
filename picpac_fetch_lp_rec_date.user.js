// ==UserScript==
// @name         PicPac - Fetch License Plate Received Date & Highlight Old Rows
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Fetches the "Mottaget" date and highlights rows older than 24 hours in light red
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/admin/pallet_racks/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_fetch_lp_rec_date.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_fetch_lp_rec_date.user.js
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

        // Fetch the date and pass the row element so we can highlight it
        fetchDateAndInsert(targetUrl, dateCell, row);
    }

    // Function that fetches the page, parses the "Mottaget" date, and checks the age
    async function fetchDateAndInsert(url, cellToUpdate, rowElement) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // Find all list items on the target page
            const listItems = doc.querySelectorAll('md-list-item');
            let receivedDateStr = null;

            for (const item of listItems) {
                const description = item.querySelector('p');
                const value = item.querySelector('h3');

                // Extract the date if the description matches "Mottaget"
                if (description && description.textContent.trim() === 'Mottaget' && value) {
                    receivedDateStr = value.textContent.trim();
                    break;
                }
            }

            if (receivedDateStr) {
                cellToUpdate.textContent = receivedDateStr;

                // --- Highlight Logic ---
                // Parse the timestamp (e.g., "2026-07-08 15:46:35")
                // Replacing space with 'T' converts it to ISO format for reliable browser parsing
                const receivedDate = new Date(receivedDateStr.replace(' ', 'T'));
                const now = new Date();

                // Calculate the difference in milliseconds
                const timeDifference = now - receivedDate;
                const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

                if (timeDifference > twentyFourHoursInMs) {
                    // Set background color of the table row to light red
                    rowElement.style.backgroundColor = '#ff9696';
                }
            } else {
                cellToUpdate.textContent = 'Saknas'; // "Missing"
            }

        } catch (error) {
            console.error(`Failed to fetch from ${url}:`, error);
            cellToUpdate.textContent = 'Fel vid hämtning'; // "Fetch error"
        }
    }
})();
