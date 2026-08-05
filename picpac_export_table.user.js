// ==UserScript==
// @name         PicPac - Universal Table CSV Exporter
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Detects table pagination type (Static vs UI-Automated/AJAX), fetches all pages, and exports to CSV.
// @author       Cristopher Dahlström
// @match        https://picpac.medovia.se/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_export_table.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_export_table.user.js
// ==/UserScript==

(function() {
    'use strict';

    function findMainTable(doc = document) {
        return doc.querySelector('table.slim') ||
               doc.querySelector('table[md-data-table]') ||
               doc.querySelector('table');
    }

    // Detects whether table is static (server-rendered URL pagination) or dynamic (UI-driven/AJAX)
    function getTableType(table) {
        if (!table) return 'Unknown';

        // Check for AJAX indicators or AngularJS data table containers
        const isDynamic = table.hasAttribute('data-source') ||
                          table.classList.contains('datatable') ||
                          document.querySelector('#picking_assignment_lines') !== null;

        return isDynamic ? 'UI-Automated' : 'Static';
    }

    function tryInjectButton() {
        if (document.getElementById('tampermonkey-csv-btn')) return;

        var mainTable = findMainTable();
        if (!mainTable) return;

        var tableType = getTableType(mainTable);

        var headerTitle = document.querySelector('.header-title') ||
                          document.querySelector('.section-title') ||
                          document.querySelector('.site-content-toolbar');

        if (!headerTitle) return;

        headerTitle.style.display = 'flex';
        headerTitle.style.alignItems = 'center';
        headerTitle.style.gap = '15px';

        var btn = document.createElement('button');
        btn.id = 'tampermonkey-csv-btn';
        btn.innerText = `📥 Export CSV (${tableType})`;
        btn.dataset.tableType = tableType;
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

            var tableType = btn.dataset.tableType || 'Static';

            if (tableType === 'UI-Automated') {
                runUIAutomatedFetch(mainTable, tbody);
            } else {
                runStaticFetch(mainTable, tbody);
            }
        });

        // STRATEGY 1: Static HTML Page Fetching
        function runStaticFetch(mainTable, tbody) {
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

            fetchNextPage();
        }

        // STRATEGY 2: UI Automated Click & Deduplicate Fetching (For AngularJS / DataTables)
        async function runUIAutomatedFetch(mainTable, tbody) {
            const harvestedRows = [];
            const seenKeys = new Set();
            let pageCount = 0;
            let keepGoing = true;

            while (keepGoing && pageCount < 20) {
                if (isAborted) return;

                pageCount++;
                progressText.innerText = `Collecting UI Page ${pageCount}...`;
                progressBar.style.width = Math.min(pageCount * 15, 90) + '%';

                await new Promise(resolve => setTimeout(resolve, 400));

                const currentRows = tbody.querySelectorAll('tr');
                let newlyAdded = 0;

                currentRows.forEach(row => {
                    const actionLink = row.querySelector('a')?.getAttribute('href');
                    const rowKey = actionLink || row.innerText.trim();

                    if (rowKey && !seenKeys.has(rowKey)) {
                        seenKeys.add(rowKey);
                        harvestedRows.push(row.cloneNode(true));
                        newlyAdded++;
                    }
                });

                if (newlyAdded === 0) break;

                const nextButton = Array.from(document.querySelectorAll('button, a, md-button'))
                    .find(el => {
                        const txt = el.innerText.trim().toUpperCase();
                        return txt.includes('NÄSTA') || txt.includes('NEXT');
                    });

                if (!nextButton ||
                    nextButton.hasAttribute('disabled') ||
                    nextButton.getAttribute('aria-disabled') === 'true' ||
                    nextButton.classList.contains('md-disabled') ||
                    nextButton.classList.contains('disabled')) {
                    keepGoing = false;
                } else {
                    nextButton.click();
                }
            }

            if (!isAborted) {
                progressBar.style.width = '100%';
                progressText.innerText = 'Generating CSV file...';
                tbody.innerHTML = '';
                harvestedRows.forEach(row => tbody.appendChild(row));
                setTimeout(generateCSV, 100);
            }
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
    }

    var observer = new MutationObserver(function() {
        tryInjectButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    tryInjectButton();
})();
