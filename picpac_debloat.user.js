// ==UserScript==
// @name         ApoSuiite Debloat
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Tighten margins, padding, and layout density on ApoSuite pages.
// @author       Ophe
// @match        https://picpac.medovia.se/*
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_debloat.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_debloat.user.js
// ==/UserScript==

(function() {
    'use strict';

    const compactCSS = `
        /* --- Zero Vertical Padding Tables --- */
        table.md-table,
        .aposuite-table table {
            width: 100% !important;
            border-collapse: collapse !important;
        }

        /* Target all rows, headers, and cells */
        table.md-table tr,
        table.md-table tr.md-row,
        .aposuite-table tr {
            height: auto !important;
            min-height: 0 !important;
        }

        table.md-table th,
        table.md-table td,
        table.md-table th.md-column,
        table.md-table td.md-cell,
        .aposuite-table th,
        .aposuite-table td {
            padding-top: 1px !important;
            padding-bottom: 1px !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
            height: 20px !important;
            min-height: 0 !important;
            line-height: 1.1 !important;
            vertical-align: middle !important;
            font-size: 0.82rem !important;
        }

        /* Direct overrides for nested spans, divs, or links inside table cells */
        table.md-table td.md-cell *,
        table.md-table th.md-column * {
            line-height: 1.1 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
        }

        table.md-table th.md-column {
            font-weight: 700 !important;
            background-color: #f5f5f5 !important;
            border-bottom: 1px solid #ccc !important;
        }

        /* --- Compact Visa Action Container --- */
        table.md-table td.md-cell .layout,
        table.md-table td.md-cell .layout-align-end-end {
            min-height: 0 !important;
            height: auto !important;
        }

        .aposuite-btn-small,
        .aposuite-btn-tertiary {
            padding: 0 6px !important;
            min-height: 18px !important;
            height: 18px !important;
            line-height: 18px !important;
            font-size: 0.75rem !important;
            margin: 0 !important;
        }

        /* --- Forms, Filters & Inputs --- */
        .aposuite-form-title {
            font-size: 0.85rem !important;
            margin: 2px 0 4px 0 !important;
            padding: 0 !important;
        }

        .aposuite-scan-row {
            padding: 4px 8px !important;
        }

        md-input-container,
        .aposuite-field {
            margin: 2px 0 !important;
            padding: 0 !important;
        }

        md-input-container input.md-input,
        select {
            padding: 2px 4px !important;
            height: 24px !important;
            font-size: 0.85rem !important;
        }

        #sales-orders-search-type-container .layout-row,
        #sales-orders-search-date-container .layout-row {
            margin-right: 12px !important;
            margin-bottom: 2px !important;
            font-size: 0.82rem !important;
        }

        /* --- Header & Layout Spacing --- */
        .site-content-toolbar,
        .aposuite-toolbar,
        md-toolbar,
        md-toolbar.site-content-toolbar {
            min-height: 28px !important;
            height: 28px !important;
            max-height: 28px !important;
            padding: 0 8px !important;
            margin: 0 !important;
        }

        .site-content-toolbar .md-toolbar-tools,
        .aposuite-toolbar .md-toolbar-tools,
        md-toolbar .md-toolbar-tools {
            height: 28px !important;
            min-height: 28px !important;
            max-height: 28px !important;
            padding: 0 8px !important;
        }

        .section-title {
            font-size: 0.9rem !important;
            line-height: 1 !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        .aposuite-app-bar {
            min-height: 34px !important;
            height: 34px !important;
            padding: 0 12px !important;
        }

        md-tabs-wrapper,
        md-tabs-canvas {
            height: 28px !important;
        }

        .md-tab {
            padding: 2px 8px !important;
            line-height: 24px !important;
            font-size: 0.82rem !important;
        }

        #home_screen,
        md-tab-content,
        .md-padding {
            padding: 2px 4px !important;
        }

        .aposuite-card {
            margin-bottom: 4px !important;
            padding: 4px 6px !important;
            border-radius: 4px !important;
        }

        .aposuite-card-header {
            font-size: 0.95rem !important;
            padding-bottom: 2px !important;
            margin-bottom: 4px !important;
            min-height: auto !important;
        }

        .aposuite-list-item {
            margin: 0 !important;
            padding: 1px 0 !important;
            min-height: 18px !important;
            height: auto !important;
        }

        .aposuite-list-item a {
            padding: 1px 4px !important;
            font-size: 0.82rem !important;
            line-height: 1.1 !important;
        }
    `;

    // Inject CSS
    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(compactCSS);
    } else {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = compactCSS;
        document.head.appendChild(style);
    }
})();
