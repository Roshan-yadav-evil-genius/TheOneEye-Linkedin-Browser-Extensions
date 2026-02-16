(function () {
  var REPORT_ENDPOINT = 'http://127.0.0.1:7878/api/workflow/1771881b-6d1e-4b5d-b645-5df14e0374d1/execute/';
  var EXTENSION_NAME = 'Prospect Involved In Post Extractor - Reactors';

  const loadBtn = document.getElementById('loadBtn');
  const moreBtn = document.getElementById('moreBtn');
  const errorMessageEl = document.getElementById('errorMessage');
  const listBody = document.getElementById('listBody');
  const currentUrlEl = document.getElementById('currentUrl');
  const currentCsrfEl = document.getElementById('currentCsrf');
  const limitInput = document.getElementById('limitInput');
  const exportBtn = document.getElementById('exportBtn');
  const listWrapper = document.getElementById('listWrapper');
  const reportBtn = document.getElementById('reportBtn');
  const reportSection = document.getElementById('reportSection');
  const reportDescription = document.getElementById('reportDescription');
  const reportCloseBtn = document.getElementById('reportCloseBtn');
  const reportSubmitBtn = document.getElementById('reportSubmitBtn');

  let state = {
    activityId: null,
    postUrl: null,
    start: 0
  };

  function getLimit() {
    var el = limitInput;
    if (!el || typeof el.value !== 'string') return 10;
    var n = parseInt(el.value, 10);
    if (isNaN(n) || n < 1) return 10;
    if (n > 100) return 100;
    return n;
  }

  function setStatus(text, isError) {
    if (!errorMessageEl) return;
    if (isError && text) {
      errorMessageEl.textContent = text;
      errorMessageEl.style.display = 'block';
      errorMessageEl.className = 'error-message';
    } else {
      errorMessageEl.textContent = '';
      errorMessageEl.style.display = 'none';
      errorMessageEl.className = 'error-message';
    }
  }

  function setButtonLoading(button, loading) {
    if (!button) return;
    var textEl = button.querySelector('.btn-text');
    var spinnerEl = button.querySelector('.btn-spinner');
    if (textEl) textEl.hidden = !!loading;
    if (spinnerEl) spinnerEl.style.display = loading ? 'inline-block' : 'none';
  }

  function updateExportButtonLabel() {
    var n = listBody && listBody.rows ? listBody.rows.length : 0;
    if (exportBtn) exportBtn.textContent = n > 0 ? 'Copy ' + n : 'Copy';
  }

  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.trim().replace(/\s+/g, ' ').split(/[\r\n]/)[0].trim();
  }

  function parseActivityId(url) {
    const trimmed = normalizeUrl(url);
    if (!trimmed) return null;
    const activityMatch = trimmed.match(/activity-(\d+)-/);
    if (activityMatch) return activityMatch[1];
    const ugcMatch = trimmed.match(/ugcPost-(\d+)-/);
    if (ugcMatch) return ugcMatch[1];
    const urnActivityMatch = trimmed.match(/urn:li:activity:(\d+)/);
    if (urnActivityMatch) return urnActivityMatch[1];
    const urnUgcMatch = trimmed.match(/urn:li:ugcPost:(\d+)/);
    if (urnUgcMatch) return urnUgcMatch[1];
    try {
      const decoded = decodeURIComponent(trimmed);
      const encActivity = decoded.match(/urn:li:activity:(\d+)/);
      if (encActivity) return encActivity[1];
      const encUgc = decoded.match(/urn:li:ugcPost:(\d+)/);
      if (encUgc) return encUgc[1];
    } catch (e) {}
    return null;
  }

  function getPostType(url) {
    const trimmed = normalizeUrl(url);
    if (!trimmed) return 'activity';
    if (/ugcPost-\d+-/.test(trimmed)) return 'ugcPost';
    try {
      if (/urn:li:ugcPost:\d+/.test(decodeURIComponent(trimmed))) return 'ugcPost';
    } catch (e) {}
    return 'activity';
  }

  function isValidPostUrl(url) {
    const trimmed = normalizeUrl(url);
    if (!trimmed) return false;
    const isLinkedIn = /^https?:\/\/(www\.)?linkedin\.com\//.test(trimmed);
    const activityId = parseActivityId(trimmed);
    return isLinkedIn && activityId !== null;
  }

  function isOnPostPage(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.indexOf('linkedin.com') === -1 || url.indexOf('/posts/') === -1) return false;
    return isValidPostUrl(normalizeUrl(url));
  }

  function getActiveTab() {
    return new Promise(function (resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        resolve(tabs && tabs.length ? tabs[0] : null);
      });
    });
  }

  function buildUrlFromPost(activityId, postType) {
    if (!activityId || !postType) return null;
    var path = (postType === 'ugcPost' ? 'ugcPost-' + activityId + '-x' : postType === 'share' ? 'share-' + activityId + '-x' : 'activity-' + activityId + '-x');
    return 'https://www.linkedin.com/posts/' + path + '/';
  }

  function getPostFromPage(tabId) {
    return new Promise(function (resolve) {
      chrome.scripting.executeScript(
        { target: { tabId: tabId }, files: ['content.js'] },
        function () {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          chrome.tabs.sendMessage(tabId, { action: 'getCurrentPostUrl' }, function (res) {
            if (chrome.runtime.lastError || !res) resolve(null);
            else resolve(res);
          });
        }
      );
    });
  }

  function setControlsEnabled(enabled) {
    loadBtn.disabled = !enabled;
    moreBtn.disabled = !enabled;
    exportBtn.disabled = !enabled;
    limitInput.disabled = !enabled;
  }

  function updateListVisibility() {
    var show = listBody && listBody.rows && listBody.rows.length > 0;
    if (listWrapper) listWrapper.style.display = show ? '' : 'none';
  }

  function renumberListBody() {
    if (!listBody || !listBody.rows) return;
    var rows = listBody.rows;
    var len = rows.length;
    if (typeof len !== 'number' || len < 0) return;
    for (var i = 0; i < len; i++) {
      var row = rows[i];
      if (row && row.cells && row.cells[0]) row.cells[0].textContent = i + 1;
    }
  }

  function refreshContextDisplay() {
    getActiveTab().then(function (tab) {
      var onPostPage = tab && tab.url && isOnPostPage(tab.url);
      setControlsEnabled(onPostPage);
      var infoBlock = document.getElementById('infoBlock');
      if (infoBlock) {
        if (onPostPage) infoBlock.classList.remove('not-post-page');
        else infoBlock.classList.add('not-post-page');
      }
      if (!currentUrlEl) return;
      if (!tab) {
        currentUrlEl.textContent = '—';
        if (currentCsrfEl) currentCsrfEl.textContent = '—';
        return;
      }
      currentUrlEl.textContent = onPostPage ? (tab.url || '—') : 'Please visit a specific post page';
      if (!tab.url || tab.url.indexOf('linkedin.com') === -1) {
        if (currentCsrfEl) currentCsrfEl.textContent = '—';
        return;
      }
      chrome.scripting.executeScript(
        { target: { tabId: tab.id }, files: ['content.js'] },
        function () {
          if (chrome.runtime.lastError) {
            if (currentCsrfEl) currentCsrfEl.textContent = '—';
            return;
          }
          chrome.tabs.sendMessage(tab.id, { action: 'getContext' }, function (res) {
            if (chrome.runtime.lastError || !res) {
              if (currentCsrfEl) currentCsrfEl.textContent = '—';
              return;
            }
            if (onPostPage && res.url) currentUrlEl.textContent = res.url;
            if (currentCsrfEl) currentCsrfEl.textContent = res.csrf || '—';
          });
        }
      );
    });
  }

  function appendReactors(reactors, timeStr, prepend) {
    if (!listBody) return;
    var time = timeStr || new Date().toLocaleTimeString();
    var fragment = document.createDocumentFragment();
    var baseNum = prepend ? 0 : (listBody.rows ? listBody.rows.length : 0);
    var items = prepend ? reactors.slice(0).reverse() : reactors;
    items.forEach(function (r, i) {
      var tr = document.createElement('tr');
      var tdNum = document.createElement('td');
      tdNum.textContent = baseNum + i + 1;
      tr.appendChild(tdNum);
      var tdName = document.createElement('td');
      if (r.url) {
        var a = document.createElement('a');
        a.href = r.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = r.name;
        tdName.appendChild(a);
      } else {
        var span = document.createElement('span');
        span.className = 'name-only';
        span.textContent = r.name;
        tdName.appendChild(span);
      }
      tr.appendChild(tdName);
      var tdTime = document.createElement('td');
      tdTime.className = 'list-time';
      tdTime.textContent = time;
      tr.appendChild(tdTime);
      fragment.appendChild(tr);
    });
    if (prepend) {
      listBody.insertBefore(fragment, listBody.firstChild);
    } else {
      listBody.appendChild(fragment);
    }
    renumberListBody();
    updateListVisibility();
    updateExportButtonLabel();
  }

  function fetchReactions(activityId, start, postUrl, tabId, postType) {
    return new Promise(function (resolve, reject) {
      var payload = {
        action: 'fetchReactions',
        activityId: activityId,
        start: start,
        postUrl: postUrl,
        postType: postType || 'activity'
      };
      chrome.scripting.executeScript(
        { target: { tabId: tabId }, files: ['content.js'] },
        function () {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Inject failed. Try refreshing the LinkedIn tab.'));
            return;
          }
          chrome.tabs.sendMessage(tabId, payload, function (response) {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'Content script not ready'));
              return;
            }
            if (response && response.error) {
              reject(new Error(response.error));
              return;
            }
            resolve(response || { reactors: [], hasMore: false });
          });
        }
      );
    });
  }

  function onLoad() {
    getActiveTab().then(function (tab) {
      if (!tab) {
        setStatus('No active tab', true);
        return;
      }
      var url = normalizeUrl(tab.url);
      if (!url || url.indexOf('linkedin.com') === -1) {
        setStatus('Open a LinkedIn post in this tab first', true);
        return;
      }
      if (!isValidPostUrl(url)) {
        setStatus('Detecting post from page…');
        loadBtn.disabled = true;
        getPostFromPage(tab.id).then(function (res) {
          loadBtn.disabled = false;
          if (res && res.url && isValidPostUrl(res.url)) {
            url = normalizeUrl(res.url);
          } else if (res && res.activityId && res.postType) {
            url = buildUrlFromPost(res.activityId, res.postType);
          }
          if (url && parseActivityId(url)) {
            startFetchWithUrl(tab, url);
          } else {
            setStatus('No post detected', true);
          }
        });
        return;
      }
      startFetchWithUrl(tab, url);
    });
  }

  function startFetchWithUrl(tab, url) {
    var activityId = parseActivityId(url);
    var postType = getPostType(url);
    state.activityId = activityId;
    state.postUrl = url;
    state.postType = postType;
    state.start = 0;

    setStatus('', false);
    setButtonLoading(loadBtn, true);
    loadBtn.disabled = true;
    if (listBody) listBody.innerHTML = '';
    updateListVisibility();
    updateExportButtonLabel();
    loadBtn.style.display = 'flex';
    moreBtn.style.display = 'none';

    var limit = getLimit();
    var collected = [];
    var nextStart = 0;
    var timeStr = new Date().toLocaleTimeString();

    function fetchNext() {
      if (collected.length >= limit) {
        loadBtn.disabled = false;
        setButtonLoading(loadBtn, false);
        appendReactors(collected, timeStr, false);
        state.start = nextStart;
        setStatus('', false);
        loadBtn.style.display = 'none';
        moreBtn.style.display = 'flex';
        return;
      }
      fetchReactions(activityId, nextStart, url, tab.id, postType)
        .then(function (res) {
          var list = res.reactors || [];
          for (var i = 0; i < list.length && collected.length < limit; i++) {
            collected.push(list[i]);
          }
          nextStart += list.length;
          if (list.length < 10 || !res.hasMore || collected.length >= limit) {
            loadBtn.disabled = false;
            setButtonLoading(loadBtn, false);
            if (collected.length > 0) {
              appendReactors(collected, timeStr, false);
              setStatus('', false);
              loadBtn.style.display = 'none';
              moreBtn.style.display = res.hasMore ? 'flex' : 'none';
            } else {
              setStatus('No reactors' + (res.debug ? '. ' + res.debug : ''), true);
            }
            state.start = nextStart;
            return;
          }
          fetchNext();
        })
        .catch(function (err) {
          loadBtn.disabled = false;
          setButtonLoading(loadBtn, false);
          setStatus(err.message || 'Request failed', true);
        });
    }
    fetchNext();
  }

  function onLoadMore() {
    if (!state.activityId || !state.postUrl) return;
    getActiveTab().then(function (tab) {
      if (!tab || tab.id === undefined) {
        setStatus('Open the same LinkedIn post tab and try again', true);
        return;
      }
      setStatus('', false);
      setButtonLoading(moreBtn, true);
      moreBtn.disabled = true;

      var limit = getLimit();
      var collected = [];
      var nextStart = state.start;
      var moreTimeStr = new Date().toLocaleTimeString();

      function fetchNext() {
        if (collected.length >= limit) {
          moreBtn.disabled = false;
          setButtonLoading(moreBtn, false);
          appendReactors(collected, moreTimeStr, true);
          state.start = nextStart;
          setStatus('', false);
          loadBtn.style.display = 'none';
          moreBtn.style.display = 'flex';
          return;
        }
        fetchReactions(state.activityId, nextStart, state.postUrl, tab.id, state.postType || 'activity')
          .then(function (res) {
            var list = res.reactors || [];
            for (var i = 0; i < list.length && collected.length < limit; i++) {
              collected.push(list[i]);
            }
            nextStart += list.length;
            if (list.length < 10 || !res.hasMore || collected.length >= limit) {
              moreBtn.disabled = false;
              setButtonLoading(moreBtn, false);
              if (collected.length > 0) {
                appendReactors(collected, moreTimeStr, true);
                setStatus('', false);
              }
              loadBtn.style.display = 'none';
              moreBtn.style.display = res.hasMore ? 'flex' : 'none';
              state.start = nextStart;
              return;
            }
            fetchNext();
          })
          .catch(function (err) {
            moreBtn.disabled = false;
            setButtonLoading(moreBtn, false);
            setStatus(err.message || 'Request failed', true);
          });
      }
      fetchNext();
    });
  }

  function onExport() {
    var lines = [];
    if (listBody && listBody.rows) {
      for (var i = 0; i < listBody.rows.length; i++) {
        var row = listBody.rows[i];
        if (!row.cells || row.cells.length < 2) continue;
        var nameCell = row.cells[1];
        var name = (nameCell.textContent || '').trim();
        var link = '';
        var a = nameCell.querySelector('a');
        if (a && a.href && typeof a.href === 'string') link = a.href.trim();
        lines.push(name + ', ' + link);
      }
    }
    if (lines.length === 0) {
      setStatus('No profiles to copy', true);
      return;
    }
    var text = lines.join('\n');
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(function () {
        setStatus('', false);
        exportBtn.classList.add('copied');
        setTimeout(function () { exportBtn.classList.remove('copied'); }, 500);
      }).catch(function () {
        setStatus('Clipboard failed', true);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setStatus('', false);
        exportBtn.classList.add('copied');
        setTimeout(function () { exportBtn.classList.remove('copied'); }, 500);
      } catch (e) {
        setStatus('Clipboard failed', true);
      }
      document.body.removeChild(ta);
    }
  }

  function toggleReportSection() {
    if (!reportSection) return;
    reportSection.style.display = reportSection.style.display === 'none' ? 'block' : 'none';
  }

  function closeReportSection() {
    if (reportSection) reportSection.style.display = 'none';
  }

  function onReportSubmit() {
    var postUrl = state.postUrl || '';
    var description = reportDescription ? reportDescription.value.trim() : '';
    if (!postUrl) {
      getActiveTab().then(function (tab) {
        postUrl = tab && tab.url ? tab.url : '';
        sendReport(postUrl, description);
      });
    } else {
      sendReport(postUrl, description);
    }
  }

  function sendReport(postUrl, description) {
    if (!reportSubmitBtn) return;
    reportSubmitBtn.disabled = true;
    var body = {
      input: {
        input: {
          post_url: postUrl || '',
          issue_description: description || '',
          extension_name: EXTENSION_NAME,
          submitted_at: new Date().toISOString()
        }
      },
      timeout: 300
    };
    fetch(REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Report failed');
          if (data.success !== true) throw new Error(data.error || 'Report failed');
          if (reportDescription) reportDescription.value = '';
          closeReportSection();
          if (errorMessageEl) {
            errorMessageEl.textContent = 'Report sent';
            errorMessageEl.style.display = 'block';
            errorMessageEl.className = 'error-message success';
            setTimeout(function () { setStatus('', false); }, 2000);
          }
        });
      })
      .catch(function (err) {
        setStatus(err.message || 'Report failed', true);
      })
      .finally(function () {
        if (reportSubmitBtn) reportSubmitBtn.disabled = false;
      });
  }

  loadBtn.addEventListener('click', onLoad);
  moreBtn.addEventListener('click', onLoadMore);
  exportBtn.addEventListener('click', onExport);
  if (reportBtn) reportBtn.addEventListener('click', toggleReportSection);
  if (reportCloseBtn) reportCloseBtn.addEventListener('click', closeReportSection);
  if (reportSubmitBtn) reportSubmitBtn.addEventListener('click', onReportSubmit);

  refreshContextDisplay();
  updateListVisibility();
})();
