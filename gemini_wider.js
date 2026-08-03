// ==UserScript==
// @name         Gemini Chat Full Width & Table Un-Clipper
// @namespace    https://gemini.google.com/
// @version      3.1
// @description  Blows open Gemini's hardcoded message container width and forces tables to expand.
// @author       Your Friendly Neighborhood Coder
// @match        https://gemini.google.com/*
// @icon         https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg
// @grant        GM_addStyle
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/gemini_wider.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/gemini_wider.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. Inject aggressive CSS targeting the main layout shell
    GM_addStyle(`
        /* Force outer viewports, main layout, and chat streams to 96% width */
        main,
        chat-history,
        conversation-container,
        .conversation-container,
        .main-content,
        .chat-container,
        model-response,
        user-query,
        message-content,
        .message-content,
        input-area-v2,
        .input-area-container {
            max-width: 96% !important;
            width: 96% !important;
            min-width: 96% !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }

        /* Destroy inline max-width limits on ALL wrapper divs inside main */
        main div[class*="max-w-"],
        main div[style*="max-width"] {
            max-width: 100% !important;
            width: 100% !important;
        }

        /* Release overflow locks on table containers */
        inline-html,
        table-block,
        .table-wrapper,
        div:has(> table) {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: visible !important;
            overflow: visible !important;
        }

        /* Table structural stretch */
        table {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            display: table !important;
        }

        th, td {
            max-width: none !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: anywhere !important;
            padding: 12px 16px !important;
        }
    `);

    // 2. Continuous JS enforcement to strip inline max-width styles set by Angular/Wiz runtime
    function stretchContainers() {
        // Target model responses and conversation blocks
        const blocks = document.querySelectorAll('model-response, conversation-container, .message-content, inline-html');
        blocks.forEach(el => {
            if (el.style.maxWidth !== '100%') {
                el.style.setProperty('max-width', '100%', 'important');
                el.style.setProperty('width', '100%', 'important');
            }
        });

        // Target table parent wrappers
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            table.style.setProperty('width', '100%', 'important');
            table.style.setProperty('table-layout', 'auto', 'important');

            let parent = table.parentElement;
            while (parent && parent.tagName !== 'MODEL-RESPONSE' && parent.tagName !== 'MAIN') {
                parent.style.setProperty('max-width', '100%', 'important');
                parent.style.setProperty('width', '100%', 'important');
                parent.style.setProperty('overflow', 'visible', 'important');
                parent = parent.parentElement;
            }
        });
    }

    // Run enforcement loop for active streaming
    const observer = new MutationObserver(stretchContainers);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    // Periodic check for lazy-loaded responses
    setInterval(stretchContainers, 1000);
    stretchContainers();
})();
