// ==UserScript==
// @name         NetSuite VNR & Transaction Search
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds VNR and Transaction ID search boxes to the top left, expandable on hover
// @author       OpheOphe
// @match        https://1313874.app.netsuite.com/*
// @match        https://picpac.medovia.se/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/netsuite_search_boxes.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/netsuite_search_boxes.user.js
// ==/UserScript==

// OBS: Sätt developer mode chrome://extensions/ och tillåt att tampermonkey kör script
(function() {
    'use strict';

    // Container set to 5x5mm trigger box initially
    var container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0px';
    container.style.left = '0px';
    container.style.width = '5mm';
    container.style.height = '5mm';
    container.style.backgroundColor = '#607799';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.gap = '2px';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'flex-start';
    container.style.overflow = 'hidden';
    container.style.transition = 'all 0.2s ease-in-out';
    container.style.borderRadius = '0 0 4px 0';
    container.style.cursor = 'pointer';
    document.body.appendChild(container);

    // Helper to style inputs
    function styleInput(placeholder) {
        var el = document.createElement('input');
        el.type = 'text';
        el.placeholder = placeholder;
        el.style.width = '50px';
        el.style.padding = '2px';
        el.style.border = '2px solid #607799';
        el.style.borderRadius = '4px';
        el.style.backgroundColor = 'white';
        el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        el.style.fontSize = '10px';
        el.style.opacity = '0'; // Hidden when collapsed
        el.style.transition = 'opacity 0.2s ease-in-out';
        container.appendChild(el);
        return el;
    }

    // BOX 1: VNR Search
    var vnrInput = styleInput('VNR');

    vnrInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            var v = vnrInput.value.trim().replace(/\s+/g, '');
            if (v) {
                window.open('https://1313874.app.netsuite.com/app/common/search/searchresults.nl?searchid=22950&whence=&Item_VENDORNAME=' + encodeURIComponent(v), '_blank');
                vnrInput.value = '';
            }
        }
    };

    // BOX 2: Transaction ID Search (or selection)
    var idInput = styleInput('Trans ID');

    idInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            var typedValue = idInput.value.trim();
            var selectedText = window.getSelection().toString().trim();
            var finalValue = typedValue || selectedText;

            if (finalValue) {
                var url = 'https://1313874.app.netsuite.com/app/accounting/transactions/transaction.nl?id=' + encodeURIComponent(finalValue);
                window.open(url, '_blank');
                idInput.value = '';
            } else {
                alert('Type an ID or highlight text first.');
            }
        }
    };

    // Expand container on mouse enter
    container.onmouseenter = function() {
        container.style.width = 'auto';
        container.style.height = 'auto';
        container.style.padding = '2px';
        container.style.backgroundColor = 'transparent';
        vnrInput.style.opacity = '1';
        idInput.style.opacity = '1';
    };

    // Collapse container on mouse leave
    container.onmouseleave = function() {
        // Only collapse if neither input is currently focused
        if (document.activeElement !== vnrInput && document.activeElement !== idInput) {
            container.style.width = '5mm';
            container.style.height = '5mm';
            container.style.padding = '0px';
            container.style.backgroundColor = '#607799';
            vnrInput.style.opacity = '0';
            idInput.style.opacity = '0';
        }
    };

    // Ensure keyboard shortcuts expand the container if focused via Alt+V / Alt+T
    document.addEventListener('keydown', function(e) {
        // Alt + V to focus VNR
        if (e.altKey && e.key === 'v') {
            container.onmouseenter();
            vnrInput.focus();
        }
        // Alt + T to focus Transaction ID box
        if (e.altKey && e.key === 't') {
            container.onmouseenter();
            idInput.focus();
        }
    });

    // Collapse if user clicks outside after focusing with keyboard shortcuts
    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            container.onmouseleave();
        }
    });

})();
