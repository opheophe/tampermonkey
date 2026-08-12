// ==UserScript==
// @name         PicPac - Fetch License Plate Received Date & Highlight Old Rows
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Fetches the "Mottaget" date and highlights rows older than 24 hours in light red
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/admin/pallet_racks/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Hjälpfunktion för att vänta på att tabellen laddas in i DOM
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const found = document.querySelector(selector);
                if (found) {
                    observer.disconnect();
                    resolve(found);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Elementet "${selector}" hittades inte inom ${timeout}ms`));
            }, timeout);
        });
    }

    async function init() {
        try {
            // 1. Vänta tills tabellraderna faktiskt finns på sidan
            await waitForElement('table.slim tbody tr');
            const rows = document.querySelectorAll('table.slim tbody tr');
            const headerRow = document.querySelector('table.slim thead tr');

            if (!rows.length) return;

            // 2. Lägg till rubrik om den inte redan finns
            if (headerRow && !headerRow.querySelector('.th-mottaget')) {
                const newHeader = document.createElement('th');
                newHeader.className = 'th-mottaget';
                newHeader.innerHTML = '<div>Mottaget</div>';
                headerRow.appendChild(newHeader);
            }

            // 3. Hantera alla rader parallellt
            const promises = Array.from(rows).map(async (row) => {
                if (row.dataset.processed) return;
                row.dataset.processed = 'true';

                const linkElement = row.querySelector('td:last-child a');
                const dateCell = document.createElement('td');
                dateCell.textContent = 'Laddar...';
                row.appendChild(dateCell);

                if (!linkElement) {
                    dateCell.textContent = 'Ingen länk';
                    return;
                }

                await fetchDateAndInsert(linkElement.href, dateCell, row);
            });

            await Promise.allSettled(promises);

        } catch (err) {
            console.error('[PicPac Script] Fel:', err);
        }
    }

    async function fetchDateAndInsert(url, cellToUpdate, rowElement) {
        try {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const listItems = doc.querySelectorAll('md-list-item');
            let receivedDateStr = null;

            for (const item of listItems) {
                const description = item.querySelector('p');
                const value = item.querySelector('h3');

                if (description && description.textContent.trim() === 'Mottaget' && value) {
                    receivedDateStr = value.textContent.trim();
                    break;
                }
            }

            if (receivedDateStr) {
                cellToUpdate.textContent = receivedDateStr;

                // Hantera datum/tid-format
                const formattedDateStr = receivedDateStr.replace(' ', 'T');
                const receivedDate = new Date(formattedDateStr);
                const now = new Date();

                if (isNaN(receivedDate.getTime())) {
                    console.warn(`Kunde inte tolka datumet: "${receivedDateStr}"`);
                    return;
                }

                const timeDifference = now - receivedDate;
                const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

                if (timeDifference > twentyFourHoursInMs) {
                    rowElement.style.backgroundColor = '#ff9696';
                }
            } else {
                cellToUpdate.textContent = 'Saknas';
            }

        } catch (error) {
            console.error(`Fel vid hämtning från ${url}:`, error);
            cellToUpdate.textContent = 'Fel vid hämtning';
        }
    }

    // Starta skriptet
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
