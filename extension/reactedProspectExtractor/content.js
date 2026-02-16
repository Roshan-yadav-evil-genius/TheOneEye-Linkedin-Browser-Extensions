(function () {
  const REACTIONS_QUERY_ID = 'voyagerSocialDashReactions.41ebf31a9f4c4a84e35a49d5abc9010b';
  const PAGE_SIZE = 10;

  var X_LI_TRACK = '{"clientVersion":"1.13.42430","mpVersion":"1.13.42430","osName":"web","timezoneOffset":-8,"timezone":"America/Los_Angeles","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":0.6666666865348816,"displayWidth":1280,"displayHeight":720}';

  function getCsrfFromCookie() {
    try {
      var parts = document.cookie.split(';');
      for (var i = 0; i < parts.length; i++) {
        var pair = parts[i].trim().split('=');
        var name = pair[0].trim();
        if (name === 'JSESSIONID') {
          var v = pair.slice(1).join('=').trim().replace(/^"|"$/g, '');
          if (v && /^ajax:\d+$/.test(v)) return v;
        }
      }
    } catch (e) {}
    return null;
  }

  function buildReactionsUrl(activityId, start, postType) {
    var urnType = (postType === 'ugcPost') ? 'ugcPost' : 'activity';
    var threadUrn = 'urn%3Ali%3A' + urnType + '%3A' + String(activityId);
    var vars = '(count:' + PAGE_SIZE + ',start:' + start + ',threadUrn:' + threadUrn + ')';
    var base = 'https://www.linkedin.com/voyager/api/graphql?';
    if (start > 0) {
      return base + 'variables=' + vars + '&queryId=' + REACTIONS_QUERY_ID;
    }
    return base + 'includeWebMetadata=true&variables=' + vars + '&queryId=' + REACTIONS_QUERY_ID;
  }

  function parseReactorsFromResponse(data) {
    const reactors = [];
    if (!data || typeof data !== 'object') return reactors;
    var included = data.included;
    if (!Array.isArray(included) && data.data && typeof data.data === 'object') {
      included = data.data.included;
    }
    if (!Array.isArray(included) && data.data && data.data.data && typeof data.data.data === 'object') {
      included = data.data.data.included;
    }
    if (!Array.isArray(included)) return reactors;

    for (var i = 0; i < included.length; i++) {
      var it = included[i];
      if (!it || typeof it !== 'object') continue;
      var lockup = it.reactorLockup || it['*reactorLockup'];
      if (!lockup) continue;
      var name = '';
      var title = lockup.title;
      if (title && typeof title === 'object' && typeof title.text === 'string') {
        name = title.text.trim();
      } else if (typeof title === 'string') {
        name = title.trim();
      }
      if (!name && lockup.accessibilityText && typeof lockup.accessibilityText === 'string') {
        var m = lockup.accessibilityText.match(/View\s+(.+?)'s\s+profile/i) || lockup.accessibilityText.match(/^(.+?)\s*'s\s+profile/i);
        if (m) name = m[1].trim();
      }
      if (!name) name = 'Unknown';

      var url = null;
      var actorUrn = it.actorUrn || (it.actor && it.actor['*profileUrn']);
      if (actorUrn && typeof actorUrn === 'string') {
        var match = actorUrn.match(/urn:li:fsd_profile:(.+)/);
        if (match) {
          var memberId = match[1];
          url = 'https://www.linkedin.com/in/' + encodeURIComponent(memberId);
        }
      }

      reactors.push({ name: name, url: url || undefined });
    }
    return reactors;
  }

  function looksLikePostUrl(u) {
    if (!u || typeof u !== 'string') return false;
    if (!/linkedin\.com\//.test(u)) return false;
    if (/activity-\d+-/.test(u) || /ugcPost-\d+-/.test(u) || /share-\d+-/.test(u)) return true;
    if (/urn:li:activity:\d+/.test(u) || /urn:li:ugcPost:\d+/.test(u)) return true;
    try {
      var d = decodeURIComponent(u);
      if (/urn:li:activity:\d+/.test(d) || /urn:li:ugcPost:\d+/.test(d)) return true;
    } catch (e) {}
    return false;
  }

  function findPostIdInString(str) {
    if (!str || typeof str !== 'string') return null;
    var m = str.match(/activity-(\d+)-/);
    if (m) return { id: m[1], postType: 'activity' };
    m = str.match(/ugcPost-(\d+)-/);
    if (m) return { id: m[1], postType: 'ugcPost' };
    m = str.match(/share-(\d+)-/);
    if (m) return { id: m[1], postType: 'share' };
    m = str.match(/urn:li:activity:(\d+)/);
    if (m) return { id: m[1], postType: 'activity' };
    m = str.match(/urn:li:ugcPost:(\d+)/);
    if (m) return { id: m[1], postType: 'ugcPost' };
    try {
      var d = decodeURIComponent(str);
      m = d.match(/urn:li:activity:(\d+)/);
      if (m) return { id: m[1], postType: 'activity' };
      m = d.match(/urn:li:ugcPost:(\d+)/);
      if (m) return { id: m[1], postType: 'ugcPost' };
    } catch (e) {}
    return null;
  }

  function getRealActivityIdFromPage() {
    try {
      var html = (document.documentElement && document.documentElement.innerHTML) || (document.body && document.body.innerHTML) || '';
      var m = html.match(/threadUrn[^&]*?urn%3Ali%3Aactivity%3A(\d+)/);
      if (m) return m[1];
      m = html.match(/urn:li:activity:(\d+)/);
      if (m) return m[1];
      m = html.match(/activity%3A(\d+).*?voyagerSocialDashReactions/);
      if (m) return m[1];
    } catch (e) {}
    return null;
  }

  function buildPostUrlFromFound(found) {
    if (!found || !found.id) return null;
    var path = (found.postType === 'ugcPost' ? 'ugcPost-' + found.id + '-x' : found.postType === 'share' ? 'share-' + found.id + '-x' : 'activity-' + found.id + '-x');
    return 'https://www.linkedin.com/posts/' + path + '/';
  }

  function getCurrentPostFromPage() {
    var href = window.location.href || '';
    if (looksLikePostUrl(href)) {
      var found = findPostIdInString(href);
      if (found && found.postType === 'share') {
        var realId = getRealActivityIdFromPage();
        if (realId) return { url: href, activityId: realId, postType: 'activity' };
      }
      return { url: href, activityId: found ? found.id : null, postType: found ? found.postType : 'activity' };
    }
    try {
      var sel = 'a[href*="activity-"], a[href*="ugcPost-"], a[href*="share-"], a[href*="urn%3Ali%3Aactivity"], a[href*="urn%3Ali%3AugcPost"], a[href*="urn:li:activity"], a[href*="urn:li:ugcPost"], a[href*="/posts/"]';
      var links = document.querySelectorAll(sel);
      for (var i = 0; i < links.length; i++) {
        var u = (links[i].href || '').trim();
        if (looksLikePostUrl(u)) {
          var f = findPostIdInString(u);
          if (f && f.postType === 'share') {
            var realId = getRealActivityIdFromPage();
            if (realId) return { url: u, activityId: realId, postType: 'activity' };
          }
          return { url: u, activityId: f ? f.id : null, postType: f ? f.postType : 'activity' };
        }
      }
      for (var j = 0; j < links.length; j++) {
        var found = findPostIdInString(links[j].href || links[j].getAttribute('href') || '');
        if (found) {
          if (found.postType === 'share') {
            var realId = getRealActivityIdFromPage();
            if (realId) return { url: buildPostUrlFromFound({ id: realId, postType: 'activity' }), activityId: realId, postType: 'activity' };
          }
          return { url: buildPostUrlFromFound(found), activityId: found.id, postType: found.postType };
        }
      }
    } catch (e) {}
    try {
      var html = (document.documentElement && document.documentElement.innerHTML) || (document.body && document.body.innerHTML) || '';
      var found = findPostIdInString(html);
      if (found) {
        if (found.postType === 'share') {
          var realId = getRealActivityIdFromPage();
          if (realId) return { url: buildPostUrlFromFound({ id: realId, postType: 'activity' }), activityId: realId, postType: 'activity' };
        }
        return { url: buildPostUrlFromFound(found), activityId: found.id, postType: found.postType };
      }
    } catch (e2) {}
    return { url: null, activityId: null, postType: null };
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'getContext') {
      sendResponse({ url: window.location.href, csrf: getCsrfFromCookie() });
      return false;
    }
    if (request.action === 'getCurrentPostUrl') {
      sendResponse(getCurrentPostFromPage());
      return false;
    }
    if (request.action !== 'fetchReactions') {
      sendResponse({ error: 'Unknown action' });
      return true;
    }

    const activityId = request.activityId;
    const start = request.start;
    const postUrl = request.postUrl;
    const postType = request.postType || 'activity';
    const csrfToken = request.csrfToken;

    if (!activityId || start === undefined) {
      sendResponse({ error: 'Missing activityId or start' });
      return true;
    }
    var csrf = (csrfToken && typeof csrfToken === 'string' && csrfToken.trim()) ? csrfToken.trim() : getCsrfFromCookie();
    if (!csrf) {
      sendResponse({ error: 'Paste the CSRF token in the popup (from Network tab or from cookie JSESSIONID, e.g. ajax:1411155100407433114).' });
      return true;
    }

    var url = buildReactionsUrl(activityId, start, postType);
    var referer = (postUrl && typeof postUrl === 'string' && postUrl.indexOf('linkedin.com') !== -1)
      ? postUrl
      : (window.location.href || 'https://www.linkedin.com/feed/');

    var headers = {
      'csrf-token': csrf,
      'Referer': referer,
      'x-restli-protocol-version': '2.0.0',
      'x-li-lang': 'en_US',
      'x-li-track': X_LI_TRACK,
      'x-li-page-instance': 'urn:li:page:d_flagship3_detail_base;' + (typeof window.__LI_PAGE_INSTANCE_ID__ === 'string' ? window.__LI_PAGE_INSTANCE_ID__ : 'R6FTiOIrQ7ajsfpF4fYwnQ=='),
      'Accept': 'application/vnd.linkedin.normalized+json+2.1',
      'x-li-query-accept': 'application/graphql',
      'x-li-accept': 'application/vnd.linkedin.normalized+json+2.1',
      'sec-ch-ua': navigator.userAgentData ? '"' + navigator.userAgentData.brands.map(function (b) { return b.brand + '";v="' + b.version; }).join(', ') + '"' : '"Chromium";v="120", "Not A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"' + (navigator.platform || 'Windows') + '"'
    };

    fetch(url, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: headers
    })
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('403: Token may have expired. Get a fresh csrf-token from the Network tab and paste it again.');
          }
          throw new Error('API returned ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) {}
        }
        var reactors = parseReactorsFromResponse(data);
        var hasMore = reactors.length >= PAGE_SIZE;
        if (reactors.length > 0) {
          sendResponse({ reactors: reactors, hasMore: hasMore });
          return;
        }
        var errList = (data && data.errors && Array.isArray(data.errors) && data.errors) ||
          (data && data.data && data.data.errors && Array.isArray(data.data.errors) && data.data.errors) ||
          [];
        if (errList.length > 0) {
          var err = errList[0];
          var msg = err.message || (err.toString && err.toString()) || 'API error';
          if (String(msg).indexOf('Reaction cannot be found') !== -1) {
            msg = 'Reaction cannot be found. Open the post in this tab (click the post so the URL is the post page, not the feed), ensure the post has reactions, then try again.';
          }
          sendResponse({ error: msg });
          return;
        }
        sendResponse({ reactors: [], hasMore: false });
      })
      .catch(function (err) {
        sendResponse({
          error: err.message || 'Request failed'
        });
      });

    return true;
  });
})();
