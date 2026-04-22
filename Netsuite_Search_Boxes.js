// ==UserScript==
// @name         NetSuite VNR & Transaction Search
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds VNR and Transaction ID search boxes to the top left
// @author       You
// @match        https://1313874.app.netsuite.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Container for both boxes to keep them aligned
    var container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '2px';
    container.style.left = '2px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';
    document.body.appendChild(container);

    // Helper to style inputs
    function styleInput(el, placeholder) {
        el.type = 'text';
        el.placeholder = placeholder;
        el.style.width = '100px';
        el.style.padding = '5px';
        el.style.border = '2px solid #607799';
        el.style.borderRadius = '4px';
        el.style.backgroundColor = 'white';
        el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        el.style.fontSize = '12px';
        container.appendChild(el);
    }

    // BOX 1: VNR Search
    var vnrInput = document.createElement('input');
    styleInput(vnrInput, 'VNR Search');

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
    var idInput = document.createElement('input');
    styleInput(idInput, 'Trans ID');

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

    // Keyboard Shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt + V to focus VNR
        if (e.altKey && e.key === 'v') {
            vnrInput.focus();
        }
        // Alt + T to focus Transaction ID box
        if (e.altKey && e.key === 't') {
            idInput.focus();
        }
    });

})();