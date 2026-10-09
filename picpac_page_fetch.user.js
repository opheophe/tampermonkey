// ==UserScript==
// @name         PicPac Page Fetch
// @namespace    local.tampermonkey.picpac
// @version      0.19
// @description  Beat the server page-size cap using a stable sort order, then merge all pages
// @match        https://picpac.medovia.se/*
// @match        https://picpac-1.sb.apoex.se/*
// @include      /^https:\/\/picpac[^/]*\.(medovia\.se|apoex\.se)\//
// @updateURL    https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_page_fetch.user.js
// @downloadURL  https://raw.githubusercontent.com/opheophe/tampermonkey/main/picpac_page_fetch.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var BIG = 100000;
  var STEP = 100;

  function log() {
    console.log.apply(console, ['[pagesize]'].concat([].slice.call(arguments)));
  }

  function userDt() {
    if (!window.jQuery || !jQuery.fn || !jQuery.fn.dataTable) return null;
    var $t = jQuery('.datatable').first();
    return ($t.length && $t.hasClass('dataTable')) ? $t.DataTable() : null;
  }

  function rowsOf(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    return json.aaData || json.data || [];
  }

  function totalOf(json) {
    if (!json) return 0;
    return json.recordsTotal || json.iTotalRecords || 0;
  }

  function setWindow(p, start, length) {
    p.start = start; p.iDisplayStart = start;
    p.length = length; p.iDisplayLength = length;
    return p;
  }

  function setOrder(p, specs) {
    p.order = specs.map(function (s) { return { column: s[0], dir: s[1] }; });
    p.iSortingCols = specs.length;
    for (var i = 0; i < 24; i++) { delete p['iSortCol_' + i]; delete p['sSortDir_' + i]; }
    specs.forEach(function (s, i) {
      p['iSortCol_' + i] = s[0];
      p['sSortDir_' + i] = s[1];
      p['bSortable_' + s[0]] = true;
    });
  }

  window.probe = function () {
    var d = userDt();
    if (!d) { log('no DataTable'); return; }
    var url = d.ajax.url();
    var base = jQuery.extend(true, {}, d.ajax.params() || {});
    setWindow(base, 0, STEP);
    jQuery.ajax({ url: url, data: base, dataType: 'json', cache: false })
      .done(function (json) {
        log('probe keys=' + Object.keys(json || {}).join(','));
        log('probe got=' + rowsOf(json).length + ' recordsTotal=' + totalOf(json));
        log('row0=' + JSON.stringify(rowsOf(json)[0]).slice(0, 500));
      })
      .fail(function (x) { log('probe failed ' + x.status); });
  };

  window.forcePageSize = function (n) {
    n = n || BIG;
    var d = userDt();
    if (!d) { log('no DataTable'); return; }
    log('forcePageSize(' + n + ') recordsTotal=' + d.page.info().recordsTotal);
    d.page.len(n).draw(false);
    setTimeout(function () {
      var i = d.page.info();
      log('after len=' + d.page.len() + ' rowsInPage=' + (i.end - i.start));
    }, 1500);
  };

  var fullyLoaded = false;
  var box, panel, clickSpan, autoCheck, status, expanded = false, barWrap, barFill, pctEl, statusLine;

  var STORAGE_PREFIX = 'picpac.autoload.';
  function pageKey() { return STORAGE_PREFIX + location.origin + location.pathname; }
  function isAutoloadEnabled() {
    try { return localStorage.getItem(pageKey()) === '1'; } catch (e) { return false; }
  }
  function setAutoloadEnabled(v) {
    try { if (v) localStorage.setItem(pageKey(), '1'); else localStorage.removeItem(pageKey()); } catch (e) {}
  }

  function setProgress(pct, label) {
    pct = Math.max(0, Math.min(100, Math.round(pct || 0)));
    if (barFill) barFill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (statusLine) statusLine.textContent = 'Loading... ' + (label || '0') + ' (' + pct + '%)';
  }

  function refreshProgressVisibility() {
    if (!barWrap) return;
    var blue = status === 'blue';
    barWrap.style.opacity = blue ? '1' : '0';
    if (pctEl) pctEl.style.opacity = (blue && !expanded) ? '1' : '0';
    if (statusLine) statusLine.style.opacity = (blue && expanded) ? '1' : '0';
  }

  function setStatus(state) {
    status = state;
    var colors = { red: '#c0392b', blue: '#2980b9', orange: '#e67e22', green: '#2e7d32' };
    if (box) box.style.backgroundColor = colors[state] || colors.red;
    if (clickSpan) {
      clickSpan.style.opacity = (state === 'orange') ? '1' : '0.55';
      clickSpan.style.cursor = (state === 'orange') ? 'pointer' : 'default';
    }
    refreshProgressVisibility();
    if (state === 'blue') setProgress(0, '0');
  }

  window.loadAllRows = function (force) {
    var d = userDt();
    if (!d) { log('no DataTable'); setStatus('red'); return; }
    if (fullyLoaded && force !== true) {
      log('already fully loaded; run loadAllRows(true) to re-fetch');
      return;
    }
    setStatus('blue');
    var s = d.settings()[0];
    var url = d.ajax.url();
    var knownTotal = (d.page.info() || {}).recordsTotal || 0;
    log('loadAllRows: recordsTotal=' + knownTotal + ' url=' + url);

    s.oFeatures.bStateSave = false;

    s.ajax = function (requestData, callback) {
      var base = jQuery.extend(true, {}, requestData || {});
      var seen = {};
      var all = [];
      var serverTotal = knownTotal;

      var strategies = [
        { name: 'id asc', specs: [[0, 'asc']] },
        { name: 'id desc', specs: [[0, 'desc']] },
        { name: 'default+id', specs: [[1, 'desc'], [0, 'asc']] },
        { name: 'all asc', specs: null }
      ];

      function addRows(rows) {
        rows.forEach(function (row) {
          var k = JSON.stringify(row);
          if (!seen[k]) { seen[k] = 1; all.push(row); }
        });
      }

      function finish() {
        var draw = 1;
        if (base.draw !== undefined) draw = base.draw;
        else if (base.sEcho !== undefined) draw = base.sEcho;

        log('collected ' + all.length + ' unique rows (server total ' + serverTotal + '); feeding them back');
        if (serverTotal && all.length >= serverTotal) { fullyLoaded = true; setStatus('green'); }
        else setStatus('orange');
        s._iDisplayLength = all.length || 1;
        callback({
          draw: draw, sEcho: draw,
          recordsTotal: all.length, iTotalRecords: all.length,
          recordsFiltered: all.length, iTotalDisplayRecords: all.length,
          data: all, aaData: all
        });
      }

      var si = 0;
      (function runStrategy() {
        if (si >= strategies.length) return finish();
        if (knownTotal && all.length >= knownTotal) return finish();

        var strat = strategies[si++];
        var colCount = s.aoColumns.length;
        var specs = strat.specs;
        if (specs === null) {
          specs = [];
          for (var c = 0; c < colCount; c++) specs.push([c, 'asc']);
        }

        var maxIter = Math.max(20, Math.ceil((knownTotal || 0) / STEP) + 10);
        var iter = 0;
        var before = all.length;

        (function fetch(start) {
          if ((knownTotal && start >= knownTotal) || iter++ > maxIter) return next();
          var p = setWindow(jQuery.extend(true, {}, base), start, STEP);
          if (specs.length) setOrder(p, specs);

          jQuery.ajax({ url: url, data: p, dataType: 'json', cache: false })
            .done(function (json) {
              var rows = rowsOf(json);
              var total = totalOf(json) || knownTotal;
              if (total > serverTotal) serverTotal = total;
              addRows(rows);
              if (serverTotal) setProgress(all.length / serverTotal * 100, all.length + '/' + serverTotal);
              if (rows.length === 0) return next();
              if (total && start + rows.length >= total) return next();
              fetch(start + rows.length);
            })
            .fail(function (x) {
              log('strategy ' + strat.name + ' failed at start=' + start + ' (' + x.status + ')');
              next();
            });
        })(0);

        function next() {
          log('strategy "' + strat.name + '": +' + (all.length - before) + ' new (total unique ' + all.length + '/' + knownTotal + ')');
          runStrategy();
        }
      })();
    };

    d.page(0);
    d.ajax.reload();
  };

  box = document.createElement('div');
  box.style.position = 'fixed';
  box.style.top = '5mm';
  box.style.left = '0px';
  box.style.width = '5mm';
  box.style.height = '5mm';
  box.style.backgroundColor = '#c0392b';
  box.style.zIndex = '10000';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.alignItems = 'flex-start';
  box.style.justifyContent = 'center';
  box.style.overflow = 'hidden';
  box.style.transition = 'all 0.2s ease-in-out';
  box.style.borderRadius = '0 0 4px 0';
  box.style.cursor = 'default';
  box.style.color = '#ffffff';
  box.style.fontFamily = 'Roboto, Arial, sans-serif';
  box.style.fontSize = '10px';
  box.style.whiteSpace = 'nowrap';

  panel = document.createElement('div');
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '2px';
  panel.style.padding = '0 4px';
  panel.style.opacity = '0';
  panel.style.transition = 'opacity 0.2s ease-in-out';

  var autoLabel = document.createElement('label');
  autoLabel.style.display = 'flex';
  autoLabel.style.alignItems = 'center';
  autoLabel.style.gap = '4px';
  autoLabel.style.cursor = 'pointer';
  autoCheck = document.createElement('input');
  autoCheck.type = 'checkbox';
  autoCheck.checked = isAutoloadEnabled();
  autoLabel.appendChild(autoCheck);
  autoLabel.appendChild(document.createTextNode('Autoload this page'));

  clickSpan = document.createElement('span');
  clickSpan.textContent = 'Load all pages';
  clickSpan.style.display = 'inline-block';
  clickSpan.style.padding = '3px 8px';
  clickSpan.style.backgroundColor = '#ffffff';
  clickSpan.style.color = '#1a1a1a';
  clickSpan.style.border = '1px solid #cfd8dc';
  clickSpan.style.borderRadius = '4px';
  clickSpan.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
  clickSpan.style.fontWeight = '600';
  clickSpan.style.fontSize = '10px';
  clickSpan.style.userSelect = 'none';
  clickSpan.onclick = function (e) {
    e.stopPropagation();
    if (status === 'orange') window.loadAllRows();
  };

  panel.appendChild(autoLabel);

  statusLine = document.createElement('span');
  statusLine.style.fontSize = '10px';
  statusLine.style.fontWeight = '600';
  statusLine.style.opacity = '0';
  statusLine.style.transition = 'opacity 0.2s ease-in-out';
  panel.appendChild(statusLine);

  panel.appendChild(clickSpan);
  box.appendChild(panel);

  barWrap = document.createElement('div');
  barWrap.style.position = 'absolute';
  barWrap.style.left = '0';
  barWrap.style.right = '0';
  barWrap.style.bottom = '0';
  barWrap.style.top = '0';
  barWrap.style.pointerEvents = 'none';
  barWrap.style.opacity = '0';
  barWrap.style.transition = 'opacity 0.2s ease-in-out';

  var barTrack = document.createElement('div');
  barTrack.style.position = 'absolute';
  barTrack.style.left = '0';
  barTrack.style.right = '0';
  barTrack.style.bottom = '0';
  barTrack.style.height = '3px';
  barTrack.style.background = 'rgba(255,255,255,0.25)';
  barWrap.appendChild(barTrack);

  barFill = document.createElement('div');
  barFill.style.position = 'absolute';
  barFill.style.left = '0';
  barFill.style.top = '0';
  barFill.style.bottom = '0';
  barFill.style.width = '0%';
  barFill.style.background = '#ffffff';
  barFill.style.transition = 'width 0.2s ease-in-out';
  barWrap.appendChild(barFill);

  pctEl = document.createElement('div');
  pctEl.style.position = 'absolute';
  pctEl.style.top = '50%';
  pctEl.style.left = '0';
  pctEl.style.right = '0';
  pctEl.style.transform = 'translateY(-50%)';
  pctEl.style.textAlign = 'center';
  pctEl.style.fontSize = '6px';
  pctEl.style.fontWeight = '700';
  pctEl.style.lineHeight = '1';
  pctEl.style.color = '#ffffff';
  pctEl.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
  pctEl.style.opacity = '0';
  pctEl.style.transition = 'opacity 0.2s ease-in-out';
  barWrap.appendChild(pctEl);

  box.appendChild(barWrap);

  autoCheck.onchange = function () {
    setAutoloadEnabled(autoCheck.checked);
    if (autoCheck.checked && status === 'orange') window.loadAllRows();
  };

  box.onmouseenter = function () {
    expanded = true;
    box.style.width = 'auto';
    box.style.height = 'auto';
    box.style.padding = '3px 4px';
    panel.style.opacity = '1';
    refreshProgressVisibility();
  };
  box.onmouseleave = function () {
    if (box.contains(document.activeElement)) return;
    expanded = false;
    box.style.width = '5mm';
    box.style.height = '5mm';
    box.style.padding = '0px';
    panel.style.opacity = '0';
    refreshProgressVisibility();
  };

  document.body.appendChild(box);
  setStatus('red');

  var tries = 0;
  (function wait() {
    if (userDt()) {
      setStatus('orange');
      log('DataTable ready (active). Console: loadAllRows()  |  forcePageSize()  |  probe()');
      if (autoCheck.checked) window.loadAllRows();
      return;
    }
    if (++tries > 240) { setStatus('red'); log('gave up waiting for DataTable'); return; }
    setTimeout(wait, 250);
  })();
})();
