// ==UserScript==
// @name         ApoSuite Debloat
// @namespace    http://tampermonkey.net/
// @version      1.1
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
        /* --- Top Welcome / Site Toolbar --- */
        .site-content-toolbar,
        .aposuite-toolbar,
        md-toolbar,
        md-toolbar.site-content-toolbar {
            min-height: 32px !important;
            height: 32px !important;
            max-height: 32px !important;
            padding: 0 8px !important;
            margin: 0 !important;
        }

        .site-content-toolbar .md-toolbar-tools,
        .aposuite-toolbar .md-toolbar-tools,
        md-toolbar .md-toolbar-tools {
            height: 32px !important;
            min-height: 32px !important;
            max-height: 32px !important;
            padding: 0 8px !important;
        }

        .header-title {
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
        }

        .section-title {
            font-size: 0.95rem !important;
            line-height: 1 !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        /* --- Top App Bar (Main Navigation) --- */
        .aposuite-app-bar {
            min-height: 38px !important;
            height: 38px !important;
            padding: 0 12px !important;
        }

        /* --- Tabs --- */
        md-tabs-wrapper,
        md-tabs-canvas {
            height: 36px !important;
        }

        .md-tab {
            padding: 6px 12px !important;
            line-height: 24px !important;
        }

        /* --- General Layout & Grid --- */
        .aposuite-columns {
            gap: 12px !important;
            padding: 8px !important;
        }

        .aposuite-column {
            gap: 12px !important;
        }

        #home_screen, md-tab-content {
            padding: 4px 8px !important;
        }

        /* --- Cards & Containers --- */
        .aposuite-card {
            margin-bottom: 8px !important;
            padding: 8px 10px !important;
            border-radius: 6px !important;
        }

        .aposuite-card-header {
            font-size: 1rem !important;
            padding-bottom: 2px !important;
            margin-bottom: 6px !important;
            min-height: auto !important;
        }

        /* --- Lists & Navigation Items --- */
        .aposuite-list-item {
            margin: 0 !important;
            padding: 1px 0 !important;
            min-height: 22px !important;
            height: auto !important;
        }

        .aposuite-list-item a {
            padding: 2px 4px !important;
            font-size: 0.85rem !important;
            line-height: 1.2 !important;
        }

        .aposuite-subheader {
            padding: 4px 0 2px 0 !important;
            margin-top: 2px !important;
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
        }

        .aposuite-divider {
            margin: 3px 0 !important;
        }

        /* --- Sidebar Adjustments --- */
        .aposuite-sidebar .aposuite-nav-link {
            padding: 4px 12px !important;
            min-height: 28px !important;
        }

        .aposuite-nav-submenu li a {
            padding: 3px 12px 3px 36px !important;
            font-size: 0.82rem !important;
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
