// ==UserScript==
// @name         ApoSuite Debloat
// @namespace    http://tampermonkey.net/
// @version      1.0
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
        /* --- General Layout & Grid --- */
        .aposuite-columns {
            gap: 12px !important;
            padding: 12px !important;
        }

        .aposuite-column {
            gap: 12px !important;
        }

        #home_screen, md-tab-content {
            padding: 8px !important;
        }

        /* --- Cards & Containers --- */
        .aposuite-card {
            margin-bottom: 12px !important;
            padding: 8px 12px !important;
            border-radius: 6px !important;
        }

        .aposuite-card-header {
            font-size: 1.1rem !important;
            padding-bottom: 4px !important;
            margin-bottom: 8px !important;
            min-height: auto !important;
        }

        /* --- Lists & Navigation Items --- */
        .aposuite-list-item {
            margin: 0 !important;
            padding: 2px 0 !important;
            min-height: 24px !important;
            height: auto !important;
        }

        .aposuite-list-item a {
            padding: 2px 6px !important;
            font-size: 0.875rem !important;
            line-height: 1.2 !important;
        }

        .aposuite-subheader {
            padding: 4px 0 2px 0 !important;
            margin-top: 4px !important;
            font-size: 0.75rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
        }

        .aposuite-divider {
            margin: 4px 0 !important;
        }

        /* --- Top App Bar & Toolbars --- */
        .aposuite-app-bar {
            min-height: 44px !important;
            height: 44px !important;
            padding: 0 12px !important;
        }

        .site-content-toolbar, .aposuite-toolbar {
            min-height: 40px !important;
            height: 40px !important;
        }

        .section-title {
            font-size: 1.1rem !important;
        }

        /* --- Sidebar Adjustments --- */
        .aposuite-sidebar .aposuite-nav-link {
            padding: 6px 12px !important;
            min-height: 32px !important;
        }

        .aposuite-nav-submenu li a {
            padding: 4px 12px 4px 36px !important;
            font-size: 0.85rem !important;
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
