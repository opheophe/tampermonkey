// ==UserScript==
// @name         PicPac - Universal simple table-fetch
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Fetches all pages sequentially for static tables and downloads CSV
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_export_av_enkel_tabell.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_export_av_enkel_tabell.js
// ==/UserScript==

(function() {
    'use strict';

    function findMainTable(doc = document) {
        return doc.querySelector('table.slim') ||
               doc.querySelector('table[md-data-table]') ||
               doc.querySelector('table');
    }

    function tryInjectButton() {
        // Don't duplicate if button is already present
        if (document.getElementById('tampermonkey-csv-btn')) return;

        var initialTable = findMainTable();
        if (!initialTable) return;

        // Skip pages that explicitly fetch data dynamically via AJAX endpoint
        if (initialTable.hasAttribute('data-source')) {
            return;
        }

        // Find header toolbar target
        var headerTitle = document.querySelector('.header-title') ||
                          document.querySelector('.section-title') ||
                          document.querySelector('.site-content-toolbar');

        if (!headerTitle) return;

        headerTitle.style.display = 'flex';
        headerTitle.style.alignItems = 'center';
        headerTitle.style.gap = '15px';

        var btn = document.createElement('button');
        btn.id = 'tampermonkey-csv-btn';
        btn.innerText = '📥 Export Table to CSV';
        btn.style.padding = '6px 12px';
        btn.style.backgroundColor = '#ffffff';
        btn.style.color = '#008080';
        btn.style.border = '1px solid #008080';
        btn.style.borderRadius = '4px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '13px';
        btn.style.lineHeight = '1.2';
        btn.style.zIndex = '1000';

        headerTitle.appendChild(btn);

        // Setup Overlay
        setupExportOverlay(btn);
    }

    function setupExportOverlay(btn) {
        if (document.getElementById('export-overlay')) return;

        var overlay = document.createElement('div');
        overlay.id = 'export-overlay';
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.zIndex = '100000';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';

        var dialog = document.createElement('div');
        dialog.style.background = '#ffffff';
        dialog.style.padding = '24px 32px';
        dialog.style.borderRadius = '8px';
        dialog.style.textAlign = 'center';
        dialog.style.minWidth = '320px';
        dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';

        dialog.innerHTML =
            '<h3 style="margin-top:0; color: #333;">Fetching Pages...</h3>' +
            '<p id="export-progress-text" style="font-size: 16px; color: #555; margin: 15px 0;">Preparing request...</p>' +
            '<div style="background: #eee; border-radius: 4px; height: 12px; width: 100%; overflow: hidden; margin-bottom: 20px;">' +
                '<div id="export-progress-bar" style="background: #008080; height: 100%; width: 0%; transition: width 0.2s;"></div>' +
            '</div>' +
            '<button id="export-abort-btn" style="padding: 8px 16px; background-color: #d32f2f; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Abort Export</button>';

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        var progressText = dialog.querySelector('#export-progress-text');
        var progressBar = dialog.querySelector('#export-progress-bar');
        var abortBtn = dialog.querySelector('#export-abort-btn');

        var isAborted = false;
        var timeoutId = null;

        abortBtn.addEventListener('click', function() {
            isAborted = true;
            if (timeoutId) clearTimeout(timeoutId);
            overlay.style.display = 'none';
            btn.disabled = false;
            progressBar.style.width = '0%';
        });

        btn.addEventListener('click', function() {
            btn.disabled = true;
            isAborted = false;
            overlay.style.display = 'flex';

            var mainTable = findMainTable();
            var tbody = mainTable ? mainTable.querySelector('tbody') : null;

            if (!tbody) {
                alert('Table container not found on this page!');
                overlay.style.display = 'none';
                btn.disabled = false;
                return;
            }

            var totalPages = 1;
            var pageLinks = document.querySelectorAll('.pagination a, md-data-table-pagination a');
            for (var i = 0; i < pageLinks.length; i++) {
                var pageMatch = pageLinks[i].href.match(/page=(\d+)/);
                if (pageMatch) {
                    var pageNum = parseInt(pageMatch[1], 10);
                    if (pageNum > totalPages) totalPages = pageNum;
                }
            }

            var currentPage = 2;

            function fetchNextPage() {
                if (isAborted) return;

                if (currentPage > totalPages) {
                    progressText.innerText = 'Generating CSV file...';
                    timeoutId = setTimeout(generateCSV, 100);
                    return;
                }

                progressText.innerText = 'Fetching page ' + currentPage + ' of ' + totalPages + '...';
                progressBar.style.width = Math.round((currentPage / totalPages) * 100) + '%';

                var baseUrl = new URL(window.location.href);
                baseUrl.searchParams.set('page', currentPage);

                fetch(baseUrl.href)
                    .then(function(response) {
                        if (!response.ok) throw new Error('HTTP error ' + response.status);
                        return response.text();
                    })
                    .then(function(text) {
                        if (isAborted) return;

                        var doc = new DOMParser().parseFromString(text, 'text/html');
                        var fetchedTable = findMainTable(doc);
                        var newRows = fetchedTable ? fetchedTable.querySelectorAll('tbody tr') : [];

                        if (newRows.length === 0) {
                            generateCSV();
                            return;
                        }

                        for (var j = 0; j < newRows.length; j++) {
                            tbody.appendChild(newRows[j]);
                        }

                        currentPage++;
                        timeoutId = setTimeout(fetchNextPage, 200);
                    })
                    .catch(function(err) {
                        console.error('Error fetching page ' + currentPage, err);
                        if (isAborted) return;
                        currentPage++;
                        timeoutId = setTimeout(fetchNextPage, 200);
                    });
            }

            function generateCSV() {
                if (isAborted) return;

                var table = findMainTable();
                if (table) {
                    var rows = table.querySelectorAll('tr');
                    var csvLines = [];

                    for (var r = 0; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('th, td');
                        var rowData = [];

                        var colCount = cells.length;
                        var hasActionCol = colCount > 1 && (
                            cells[colCount - 1].querySelector('md-icon, a, button') ||
                            cells[colCount - 1].innerText.trim() === 'Visa'
                        );
                        var targetLength = hasActionCol ? colCount - 1 : colCount;

                        for (var c = 0; c < targetLength; c++) {
                            var cellText = cells[c].innerText.trim().replace(/\s+/g, ' ');
                            cellText = cellText.replace(/"/g, '""');
                            rowData.push('"' + cellText + '"');
                        }

                        if (rowData.length > 0) {
                            csvLines.push(rowData.join(','));
                        }
                    }

                    var pathParts = window.location.pathname.split('/').filter(Boolean);
                    var pageName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'export';
                    var filename = pageName + '_' + new Date().toISOString().slice(0, 10) + '.csv';

                    var csvContent = '\uFEFF' + csvLines.join('\n');
                    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    var url = URL.createObjectURL(blob);
                    var link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }

                overlay.style.display = 'none';
                btn.disabled = false;
                progressBar.style.width = '0%';
            }

            fetchNextPage();
        });
    }

    // SPA Observer: Watches for page changes & mounts button dynamically
    var observer = new MutationObserver(function() {
        tryInjectButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial load call
    tryInjectButton();
})();
