// ==UserScript==
// @name         ApoSuite Debloat Inköpsorderrader
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Tighten margins, padding, and layout density on ApoSuite pages.
// @author       Ophe
// @match        https://picpac.medovia.se/admin/purchase_order_lines/*
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_debloat_purch_orderlines.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_debloat_purch_orderlines.user.js
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // CSS styling: force single line on headers and handle merged content
    GM_addStyle(`
        .aposuite-table table th,
        .aposuite-table table th div {
            white-space: nowrap !important;
            vertical-align: middle;
        }
        .merged-cell {
            line-height: 1.3;
        }
        .primary-line {
            font-weight: bold;
            display: block;
        }
        .secondary-line {
            color: #444;
            display: block;
        }
    `);

    function modifyTable() {
        const table = document.querySelector('table.datatable');
        if (!table) return;

        const headers = Array.from(table.querySelectorAll('thead th'));
        if (headers.length === 0) return;

        // Locate column indices by matching original text or existing data attributes
        let colMap = {};
        headers.forEach((th, index) => {
            const text = th.innerText.trim();
            const originalRole = th.getAttribute('data-orig-col');

            if (originalRole === 'varunummer' || text === 'Varunummer') {
                colMap.varunummer = index;
                th.setAttribute('data-orig-col', 'varunummer');
            } else if (originalRole === 'vara' || (text === 'Vara' && !th.hasAttribute('data-orig-col'))) {
                colMap.vara = index;
                th.setAttribute('data-orig-col', 'vara');
            } else if (originalRole === 'inkopsorder' || text === 'Inköpsorder') {
                colMap.inkopsorder = index;
                th.setAttribute('data-orig-col', 'inkopsorder');
            } else if (originalRole === 'plats' || text === 'Plats') {
                colMap.plats = index;
                th.setAttribute('data-orig-col', 'plats');
            } else if (originalRole === 'leverantor' || text === 'Leverantör') {
                colMap.leverantor = index;
                th.setAttribute('data-orig-col', 'leverantor');
            }
        });

        // 1. Rename Column Headers
        headers.forEach(th => {
            let div = th.querySelector('div') || th;
            let title = div.innerText.trim();
            let role = th.getAttribute('data-orig-col');

            if (role === 'varunummer') div.innerText = 'Vara';
            else if (title === 'Kvantitet') div.innerText = 'Q';
            else if (title === 'Mottaget') div.innerText = 'Q Rec';
            else if (title.startsWith('Avvikelse')) div.innerText = 'Diff (NS)';
            else if (title === 'Följesedels-/kolli-nummer') div.innerText = 'Nummer';
            else if (title === 'Kvantitet som levereras') div.innerText = 'Q Levererat';
            else if (title === 'Mottaget i backen') div.innerText = 'Q i back';
        });

        // 2. Hide original secondary headers that got merged
        if (colMap.vara !== undefined && headers[colMap.vara]) {
            headers[colMap.vara].style.display = 'none';
        }
        if (colMap.plats !== undefined && headers[colMap.plats]) {
            headers[colMap.plats].style.display = 'none';
        }

        // 3. Process Table Rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.children;

            // --- A. Move Plats directly under Leverantör OR format Leverantör text ---
            if (colMap.leverantor !== undefined && cells[colMap.leverantor]) {
                const leverantorCell = cells[colMap.leverantor];
                const platsCell = colMap.plats !== undefined ? cells[colMap.plats] : null;

                formatLeverantorCell(leverantorCell, platsCell);
            }

            // --- B. Merge Varunummer (Primary) and Vara (Secondary) ---
            if (colMap.varunummer !== undefined && colMap.vara !== undefined) {
                const varunummerCell = cells[colMap.varunummer];
                const varaCell = cells[colMap.vara];

                if (varunummerCell && varaCell && varaCell.style.display !== 'none') {
                    mergeTwoCells(varunummerCell, varaCell);
                }
            }
        });
    }

    // Formats Leverantör: moves Plats cell content underneath OR splits location text dynamically
    function formatLeverantorCell(leverantorCell, platsCell) {
        if (leverantorCell.getAttribute('data-formatted') === 'true') return;

        // Priority 1: If Plats column exists and has content, move it under Leverantör
        if (platsCell && platsCell.innerText.trim().length > 0) {
            mergeTwoCells(leverantorCell, platsCell);
            leverantorCell.setAttribute('data-formatted', 'true');
            return;
        }

        // Priority 2: Universal regex split for location suffixes in vendor string (e.g., "Oriola - Sörmland", "Oriola Nettopriser Sörmland")
        const fullText = leverantorCell.innerText.trim();
        const match = fullText.match(/^(.+?)(?:\s*[-–]\s*|\s+)(Sörmland.*|Värmland.*|Västmanland.*|EDI.*|Nettopriser.*|avtalspris.*)$/i);

        if (match) {
            const mainVendor = match[1].trim();
            const subDetail = match[2].trim();

            const container = document.createElement('div');
            container.className = 'merged-cell';

            const mainSpan = document.createElement('span');
            mainSpan.className = 'primary-line';

            // Preserve existing links/HTML inside mainVendor
            while (leverantorCell.firstChild) {
                mainSpan.appendChild(leverantorCell.firstChild);
            }

            const subSpan = document.createElement('span');
            subSpan.className = 'secondary-line';
            subSpan.textContent = subDetail;

            container.appendChild(mainSpan);
            container.appendChild(subSpan);

            leverantorCell.appendChild(container);
        }

        leverantorCell.setAttribute('data-formatted', 'true');
    }

    // Safely merges two cells into a single structured container preserving links
    function mergeTwoCells(primaryCell, secondaryCell) {
        const mergedWrapper = document.createElement('div');
        mergedWrapper.className = 'merged-cell';

        const primarySpan = document.createElement('span');
        primarySpan.className = 'primary-line';

        const secondarySpan = document.createElement('span');
        secondarySpan.className = 'secondary-line';

        while (primaryCell.firstChild) {
            primarySpan.appendChild(primaryCell.firstChild);
        }
        while (secondaryCell.firstChild) {
            secondarySpan.appendChild(secondaryCell.firstChild);
        }

        mergedWrapper.appendChild(primarySpan);
        mergedWrapper.appendChild(secondarySpan);

        primaryCell.appendChild(mergedWrapper);
        secondaryCell.style.display = 'none';
    }

    // Initial Execution
    modifyTable();

    // DOM MutationObserver for dynamic page updates
    let isProcessing = false;
    const observer = new MutationObserver((mutations) => {
        if (isProcessing) return;

        let shouldUpdate = false;
        for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldUpdate = true;
                break;
            }
        }

        if (shouldUpdate) {
            isProcessing = true;
            observer.disconnect();

            modifyTable();

            observer.observe(document.body, { childList: true, subtree: true });
            isProcessing = false;
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
