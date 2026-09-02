// ==UserScript==
// @name         ApoSuite Debloat
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Tighten margins, padding, and layout density on ApoSuite pages.
// @author       Ophe
// @match        https://picpac.medovia.se/*
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_debloat.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_debloat.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. Inject Styles
    const css = `
        /* --- Brand Logos & Layout Safety --- */
        .aposuite-app-bar__company-logo img,
        .aposuite-app-bar__picpac-logo img,
        .aposuite-app-bar__brand img {
            max-height: 24px !important;
            width: auto !important;
        }

        .aposuite-app-bar {
            height: 40px !important;
            min-height: 40px !important;
        }

        .site-content-toolbar, .aposuite-toolbar, md-toolbar {
            min-height: 32px !important;
            height: 32px !important;
            padding: 0 12px !important;
        }

        /* --- Custom Compact Product Info Grid --- */
        .custom-compact-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px 16px !important;
            padding: 8px 12px !important;
            background: #fff !important;
        }

        .custom-grid-item {
            display: flex !important;
            flex-direction: column !important;
            margin: 0 !important;
            padding: 2px 0 !important;
            border-bottom: 1px solid #f0f0f0 !important;
        }

        .custom-grid-item .item-title {
            font-size: 0.82rem !important;
            font-weight: 700 !important;
            color: #111 !important;
            line-height: 1.1 !important;
            margin: 0 !important;
        }

        .custom-grid-item .item-label {
            font-size: 0.72rem !important;
            color: #666 !important;
            line-height: 1 !important;
            margin: 2px 0 0 0 !important;
        }

        /* --- Tighten Cards & Tables Globally --- */
        #items_detail md-card {
            margin: 4px 0 8px 0 !important;
            padding: 4px !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.06) !important;
        }

        .article-title {
            font-size: 0.9rem !important;
            margin: 6px 0 2px 0 !important;
        }

        table.md-table, table.slim, .aposuite-table table {
            width: 100% !important;
            border-collapse: collapse !important;
        }

        table.md-table th, table.md-table td,
        table.slim th, table.slim td {
            padding: 2px 6px !important;
            height: 22px !important;
            font-size: 0.82rem !important;
            line-height: 1.1 !important;
        }

        table.slim th {
            background: #f5f5f5 !important;
            font-weight: 700 !important;
        }

        #inventory-levels {
            height: 260px !important;
        }
    `;

    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(css);
    } else {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    // 2. DOM Restructuring for Product Information Card
    function rebuildProductInfoCard() {
        const detailContainer = document.querySelector('#items_detail');
        if (!detailContainer) return;

        // Find the first md-card containing lists
        const productCard = detailContainer.querySelector('md-card');
        if (!productCard || productCard.classList.contains('rebuilt-grid')) return;

        const listItems = productCard.querySelectorAll('md-list-item');
        if (listItems.length === 0) return;

        // Create new Grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'custom-compact-grid';

        // Extract each title (h3) and label (p) pair
        listItems.forEach(item => {
            const h3 = item.querySelectorAll('h3');
            const p = item.querySelector('p');

            if (h3.length > 0) {
                const gridItem = document.createElement('div');
                gridItem.className = 'custom-grid-item';

                // Handle multi-line product codes inside single items
                let titleText = '';
                h3.forEach(h => {
                    titleText += (titleText ? ' / ' : '') + h.innerText.trim();
                });

                const titleEl = document.createElement('span');
                titleEl.className = 'item-title';
                titleEl.innerText = titleText;

                const labelEl = document.createElement('span');
                labelEl.className = 'item-label';
                labelEl.innerText = p ? p.innerText.trim() : '';

                gridItem.appendChild(titleEl);
                gridItem.appendChild(labelEl);
                gridContainer.appendChild(gridItem);
            }
        });

        // Replace card contents with the clean grid
        productCard.innerHTML = '';
        productCard.appendChild(gridContainer);
        productCard.classList.add('rebuilt-grid');
    }

    // Run DOM rebuild on load
    window.addEventListener('DOMContentLoaded', rebuildProductInfoCard);
    rebuildProductInfoCard();
})();
