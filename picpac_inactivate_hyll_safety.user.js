// ==UserScript==
// @name         PicPac Inactivate Safety Popup when removing Bin Location
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Styles "Inaktivera" buttons as dangerous and automatically confirms/bypasses modal popups without breaking site functionality.
// @author       Ophe
// @match        https://picpac-1.sb.apoex.se/admin/bin_locations/*
// @match        http://*/admin/bin_locations/*
// @match        https://*/admin/bin_locations/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_inactivate_hyll_safety.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_inactivate_hyll_safety.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 1. Bypass native browser confirm/alert dialogs instantly
    window.confirm = () => true;
    window.alert = () => true;

    // 2. Main function to update styling and auto-dismiss modals
    function handleInaktiveraButtons() {
        // Automatically find and click any popups/modals that open after clicking
        const modalConfirmSelectors = [
            '.modal.show .btn-primary',
            '.modal.in .btn-primary',
            '.modal.show .btn-danger',
            '.modal.in .btn-danger',
            '.swal2-confirm',
            '[data-confirm-btn]'
        ];

        modalConfirmSelectors.forEach(selector => {
            const confirmBtn = document.querySelector(selector);
            if (confirmBtn && confirmBtn.offsetParent !== null) {
                confirmBtn.click();
            }
        });

        // Style the Inaktivera buttons without disrupting their click events
        const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], a, [role="button"]');

        buttons.forEach((btn) => {
            const text = (btn.textContent || btn.value || '').trim();

            if (text.includes('Inaktivera') && !btn.dataset.customizedDanger) {
                btn.dataset.customizedDanger = 'true';

                // Update text with skull emote
                const dangerLabel = '💀 Risk: Inaktivera Plats';
                if (btn.tagName === 'INPUT') {
                    btn.value = dangerLabel;
                } else {
                    btn.textContent = dangerLabel;
                }

                // Apply explicit warning/danger visual styles
                Object.assign(btn.style, {
                    backgroundColor: '#dc3545',
                    color: '#ffffff',
                    borderColor: '#b21f2d',
                    fontWeight: 'bold',
                    boxShadow: '0 0 8px rgba(220, 53, 69, 0.6)',
                    cursor: 'pointer'
                });
            }
        });
    }

    // Run on page load
    handleInaktiveraButtons();

    // DOM Observer listens for modal creation and auto-clicks the popup confirmation
    const observer = new MutationObserver(handleInaktiveraButtons);
    observer.observe(document.body, { childList: true, subtree: true });
})();
