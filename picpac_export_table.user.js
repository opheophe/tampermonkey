// ==UserScript==
// @name         PicPac - Universal Table CSV Exporter
// @namespace    http://tampermonkey.net/
// @version      1.5
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

    function findLimitSelect() {
        return document.querySelector('md-pagination select, md-data-table-container select, [md-data-table] select') ||
               document.querySelector('select[ng-model*="limit"]');
    }

    function findMainTable(doc = document) {
        return doc.querySelector('table.slim') ||
               doc.querySelector('table[md-data-table]') ||
               doc.querySelector('table');
    }

    function detectLogicType(table) {
        if (!table) return 'Unknown';

        // 1. Static Server-Rendered Pagination
        const pageLinks = document.querySelectorAll('.pagination a[href*="page="]');
        if (pageLinks.length > 0) {
            return 'Static';
        }

        // 2. Limit-controlled Dynamic Tables
        const limitSelect = findLimitSelect();
        if (limitSelect) {
            // If already set to 1000000 (e.g. by Default x Rows script), it's ready as a Single pass
            if (limitSelect.value === '1000000') {
                return 'Single';
            }
            return 'Force single';
        }

        // 3. Dynamic DataTables / AJAX without visible dropdown
        const isDynamic = table.hasAttribute('data-source') ||
                          table.classList.contains('datatable') ||
                          document.querySelector('#picking_assignment_lines') !== null;

        if (isDynamic) {
            return 'Pagination';
        }

        return 'Single';
    }

    // Two-phase waiter for "Force single" mode
    async function waitForTableReload(tbody, initialCount, statusCallback) {
        const startTime = Date.now();
        const maxWaitMs = 45000;

        if (statusCallback) statusCallback('⏳ Triggering reload...');

        while (Date.now() - startTime < 10000) {
            const currentCount = tbody.querySelectorAll('tr').length;
            if (currentCount !== initialCount || currentCount === 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        let lastCount = -1;
        let stablePasses = 0;

        while (Date.now() - startTime < maxWaitMs) {
            const currentCount = tbody.querySelectorAll('tr').length;

            if (statusCallback) {
                statusCallback(`⏳ Loading rows... (${currentCount} loaded)`);
            }

            if (currentCount > 0 && currentCount === lastCount) {
                stablePasses++;
                if (stablePasses >= 5) {
                    return true;
                }
            } else {
                stablePasses = 0;
                lastCount = currentCount;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        return false;
    }

    // Explicit DataTables page harvester
    async function runDataTablesPaginationHarvest(mainTable, tbody, statusCallback) {
        const harvestedRowsData = [];

        let dtInstance = null;
        if (window.jQuery) {
            if (window.jQuery.fn.DataTable && window.jQuery.fn.DataTable.isDataTable(mainTable)) {
                dtInstance = window.jQuery(mainTable).DataTable();
            } else if (window.jQuery(mainTable).dataTable) {
                dtInstance = window.jQuery(mainTable).dataTable().api();
            }
        }

        function harvestCurrentDOMRows() {
            const rows = Array.from(tbody.querySelectorAll('tr'));
            let count = 0;

            rows.forEach(r => {
                const cells = Array.from(r.querySelectorAll('th, td'));
                if (cells.length === 0) return;
                const line = extractLineCells(cells);
                if (line.length > 0) {
                    harvestedRowsData.push(line);
                    count++;
                }
            });
            return count;
        }

        if (dtInstance) {
            try {
                const totalRecords = dtInstance.page.info().recordsTotal || 100000;
                dtInstance.page.len(totalRecords).draw(false);
                await new Promise(resolve => {
                    const timer = setTimeout(resolve, 1500);
                    window.jQuery(mainTable).one('draw.dt', () => { clearTimeout(timer); resolve(); });
                });
            } catch (e) {}

            const info = dtInstance.page.info();

            if (info.pages <= 1) {
                harvestCurrentDOMRows();
            } else {
                const totalPages = info.pages;

                for (let p = 0; p < totalPages; p++) {
                    if (statusCallback) {
                        statusCallback(`⏳ Fetching page ${p + 1} of ${totalPages}... (${harvestedRowsData.length} rows)`);
                    }

                    dtInstance.page(p).draw('page');

                    await new Promise(resolve => {
                        const timer = setTimeout(resolve, 3000);
                        window.jQuery(mainTable).one('draw.dt', () => {
                            clearTimeout(timer);
                            resolve();
                        });
                    });

                    harvestCurrentDOMRows();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                dtInstance.page(0).draw('page');
            }
        } else {
            harvestCurrentDOMRows();
        }

        const headerCells = Array.from(mainTable.querySelectorAll('thead th, thead td'));
        const headers = headerCells.map(c => c.innerText.trim().replace(/\s+/g, ' ').replace(/"/g, '""'));

        let csvLines = [];
        if (headers.length > 0) {
            csvLines.push(headers.map(h => `"${h}"`).join(','));
        }
        harvestedRowsData.forEach(rowCells => {
            csvLines.push(rowCells.map(c => `"${c}"`).join(','));
        });

        return csvLines;
    }

    async function runStaticFetch(mainTable, tbody, statusCallback) {
        let totalPages = 1;
        const pageLinks = document.querySelectorAll('.pagination a[href*="page="]');
        pageLinks.forEach(link => {
            const match = link.href.match(/page=(\d+)/);
            if (match) {
                const p = parseInt(match[1], 10);
                if (p > totalPages) totalPages = p;
            }
        });

        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
            if (statusCallback) {
                statusCallback(`⏳ Fetching static page ${currentPage} of ${totalPages}...`);
            }

            const baseUrl = new URL(window.location.href);
            baseUrl.searchParams.set('page', currentPage);

            try {
                const res = await fetch(baseUrl.href);
                const text = await res.text();
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const fetchedTable = findMainTable(doc);
                const newRows = fetchedTable ? fetchedTable.querySelectorAll('tbody tr') : [];
                newRows.forEach(r => tbody.appendChild(r));
            } catch (e) {
                console.error('Static fetch error', e);
            }
        }

        return extractRowsFromTbody(tbody, mainTable);
    }

    function extractLineCells(cells) {
        var colCount = cells.length;
        var hasActionCol = colCount > 1 && (
            cells[colCount - 1].querySelector('md-icon, a, button') ||
            cells[colCount - 1].innerText.trim() === 'Visa'
        );
        var targetLength = hasActionCol ? colCount - 1 : colCount;

        const lineData = [];
        for (let c = 0; c < targetLength; c++) {
            const cellText = cells[c].innerText.trim().replace(/\s+/g, ' ').replace(/"/g, '""');
            lineData.push(cellText);
        }
        return lineData;
    }

    function extractRowsFromTbody(tbody, mainTable) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const headerCells = Array.from(mainTable.querySelectorAll('thead th, thead td'));
        const headers = headerCells.map(c => c.innerText.trim().replace(/\s+/g, ' ').replace(/"/g, '""'));

        let csvLines = [];
        if (headers.length > 0) {
            csvLines.push(headers.map(h => `"${h}"`).join(','));
        }

        rows.forEach(r => {
            const cells = Array.from(r.querySelectorAll('th, td'));
            if (cells.length === 0) return;
            const lineData = extractLineCells(cells);
            if (lineData.length > 0) {
                csvLines.push(lineData.map(c => `"${c}"`).join(','));
            }
        });

        return csvLines;
    }

    function downloadCSV(csvLines) {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const pageName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'export';
        const filename = pageName + '_' + new Date().toISOString().slice(0, 10) + '.csv';

        const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function injectButton() {
        const tableEl = findMainTable();
        if (!tableEl) return;

        const logicType = detectLogicType(tableEl);
        let btn = document.getElementById('picpac-export-btn');

        if (btn) {
            btn.innerText = `📥 Export CSV (${logicType})`;
            return;
        }

        const container = document.querySelector('.header-title') || document.querySelector('.site-content-toolbar');
        if (!container) return;

        container.style.display = 'flex';
        container.style.alignItems = 'center';

        btn = document.createElement('button');
        btn.id = 'picpac-export-btn';
        btn.innerText = `📥 Export CSV (${logicType})`;

        btn.style.padding = '6px 12px';
        btn.style.marginLeft = '15px';
        btn.style.backgroundColor = '#ffffff';
        btn.style.color = '#008080';
        btn.style.border = '1px solid #008080';
        btn.style.borderRadius = '4px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '13px';
        btn.style.lineHeight = '1.2';
        btn.style.height = 'auto';
        btn.style.width = 'auto';

        btn.addEventListener('click', async function() {
            btn.disabled = true;

            const mainTable = findMainTable();
            if (!mainTable) {
                alert('Table element not found.');
                btn.disabled = false;
                return;
            }

            const tbody = mainTable.querySelector('tbody');
            if (!tbody) {
                alert('Table body not found.');
                btn.disabled = false;
                return;
            }

            const activeLogic = detectLogicType(mainTable);
            let csvLines = [];

            if (activeLogic === 'Force single') {
                const limitSelect = findLimitSelect();
                const initialRowCount = tbody.querySelectorAll('tr').length;
                const isAlreadyExpanded = limitSelect && limitSelect.value === '1000000';

                if (limitSelect && !isAlreadyExpanded) {
                    let optionExists = Array.from(limitSelect.options).some(opt => opt.value === '1000000');
                    if (!optionExists) {
                        const newOption = document.createElement('option');
                        newOption.value = '1000000';
                        newOption.text = '1000000';
                        limitSelect.add(newOption);
                    }

                    limitSelect.value = '1000000';
                    limitSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    limitSelect.dispatchEvent(new Event('input', { bubbles: true }));

                    await waitForTableReload(tbody, initialRowCount, text => { btn.innerText = text; });
                }
                btn.innerText = '⏳ Generating CSV...';
                csvLines = extractRowsFromTbody(tbody, mainTable);
            } else if (activeLogic === 'Pagination') {
                csvLines = await runDataTablesPaginationHarvest(mainTable, tbody, text => { btn.innerText = text; });
            } else if (activeLogic === 'Static') {
                csvLines = await runStaticFetch(mainTable, tbody, text => { btn.innerText = text; });
            } else { // Single
                btn.innerText = '⏳ Generating CSV...';
                csvLines = extractRowsFromTbody(tbody, mainTable);
            }

            downloadCSV(csvLines);

            btn.disabled = false;
            btn.innerText = `📥 Export CSV (${detectLogicType(mainTable)})`;
        });

        container.appendChild(btn);
    }

    const checkExist = setInterval(() => {
        if (findMainTable()) {
            injectButton();
        }
    }, 500);

    setTimeout(() => clearInterval(checkExist), 10000);
})();
