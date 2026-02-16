(function () {
  const COMMENTS_QUERY_ID = 'voyagerSocialDashComments.afec6d88d7810d45548797a8dac4fb87';
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

  function buildCommentsUrl(activityId, start, paginationToken, postType) {
    var id = String(activityId);
    var urnType = (postType === 'ugcPost') ? 'ugcPost' : 'activity';
    var encodedUrn = 'urn%3Ali%3Afsd_socialDetail%3A%28urn%3Ali%3A' + urnType + '%3A' + id + '%2Curn%3Ali%3A' + urnType + '%3A' + id + '%2Curn%3Ali%3AhighlightedReply%3A-%29';
    var vars = '(count:' + PAGE_SIZE + ',numReplies:1,socialDetailUrn:' + encodedUrn + ',sortOrder:RELEVANCE,start:' + start + ')';
    if (paginationToken && typeof paginationToken === 'string' && paginationToken.trim()) {
      vars = '(count:' + PAGE_SIZE + ',numReplies:1,paginationToken:' + paginationToken.trim() + ',socialDetailUrn:' + encodedUrn + ',sortOrder:RELEVANCE,start:' + start + ')';
    }
    var base = 'https://www.linkedin.com/voyager/api/graphql?';
    var queryPart = 'variables=' + vars + '&queryId=' + COMMENTS_QUERY_ID;
    if (!paginationToken && start === 0) {
      return base + 'includeWebMetadata=true&' + queryPart;
    }
    return base + queryPart;
  }

  function parseCommentersFromResponse(data) {
    var commenters = [];
    if (!data || typeof data !== 'object') return commenters;
    var included = data.included;
    if (!Array.isArray(included) && data.data && typeof data.data === 'object') {
      included = data.data.included;
    }
    if (!Array.isArray(included) && data.data && data.data.data && typeof data.data.data === 'object') {
      included = data.data.data.included;
    }
    if (!Array.isArray(included)) return commenters;

    var seen = {};
    for (var i = 0; i < included.length; i++) {
      var it = included[i];
      if (!it || typeof it !== 'object') continue;
      if (it.$type !== 'com.linkedin.voyager.dash.social.Comment') continue;
      var commenter = it.commenter;
      if (!commenter || typeof commenter !== 'object') continue;
      var name = '';
      var title = commenter.title;
      if (title && typeof title === 'object' && typeof title.text === 'string') {
        name = title.text.trim();
      } else if (typeof title === 'string') {
        name = title.trim();
      }
      if (!name && commenter.accessibilityText && typeof commenter.accessibilityText === 'string') {
        var m = commenter.accessibilityText.match(/View\s+(.+?)'s\s+profile/i) || commenter.accessibilityText.match(/^(.+?)\s*'s\s+profile/i);
        if (m) name = m[1].trim();
      }
      if (!name) name = 'Unknown';
      var url = (commenter.navigationUrl && typeof commenter.navigationUrl === 'string') ? commenter.navigationUrl.trim() : null;
      if (!url && commenter.commenterProfileId) {
        url = 'https://www.linkedin.com/in/' + encodeURIComponent(commenter.commenterProfileId);
      }
      var key = (url || name).toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      commenters.push({ name: name, url: url || undefined });
    }
    return commenters;
  }

  function getPaginationToken(data) {
    if (!data || typeof data !== 'object') return null;
    var dd = data.data;
    if (dd && typeof dd === 'object' && dd.data && typeof dd.data === 'object') {
      dd = dd.data;
    }
    if (dd && typeof dd === 'object' && dd.socialDashCommentsBySocialDetail && typeof dd.socialDashCommentsBySocialDetail === 'object') {
      var meta = dd.socialDashCommentsBySocialDetail.metadata;
      if (meta && typeof meta === 'object' && typeof meta.paginationToken === 'string' && meta.paginationToken.trim()) {
        return meta.paginationToken.trim();
      }
    }
    return null;
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'getContext') {
      sendResponse({ url: window.location.href, csrf: getCsrfFromCookie() });
      return false;
    }
    if (request.action !== 'fetchComments') {
      sendResponse({ error: 'Unknown action' });
      return true;
    }

    var activityId = request.activityId;
    var start = request.start;
    var paginationToken = request.paginationToken;
    var postUrl = request.postUrl;
    var postType = request.postType || 'activity';
    var csrfToken = request.csrfToken;

    if (!activityId || start === undefined) {
      sendResponse({ error: 'Missing activityId or start' });
      return true;
    }
    var csrf = (csrfToken && typeof csrfToken === 'string' && csrfToken.trim()) ? csrfToken.trim() : getCsrfFromCookie();
    if (!csrf) {
      sendResponse({ error: 'Could not read CSRF token. Ensure this tab is on LinkedIn and you are logged in.' });
      return true;
    }

    var url = buildCommentsUrl(activityId, start, paginationToken, postType);
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
      'x-li-pem-metadata': 'Voyager - Feed - Comments=load-comments',
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
          return res.text().then(function (body) {
            var msg = 'API returned ' + res.status;
            if (res.status === 403) {
              msg = '403: Token may have expired. Refresh the LinkedIn tab and try again.';
            } else if (body && body.length < 500) {
              msg = msg + '. Body: ' + body;
            }
            throw new Error(msg);
          });
        }
        return res.json();
      })
      .then(function (data) {
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) {}
        }
        var commenters = parseCommentersFromResponse(data);
        var hasMore = commenters.length >= PAGE_SIZE;
        var token = getPaginationToken(data);
        if (commenters.length > 0) {
          sendResponse({ commenters: commenters, hasMore: hasMore, paginationToken: token || undefined });
          return;
        }
        var errList = (data && data.errors && Array.isArray(data.errors) && data.errors) ||
          (data && data.data && data.data.errors && Array.isArray(data.data.errors) && data.data.errors) ||
          [];
        if (errList.length > 0) {
          var err = errList[0];
          var msg = err.message || (err.toString && err.toString()) || 'API error';
          sendResponse({ error: msg });
          return;
        }
        sendResponse({ commenters: [], hasMore: false, paginationToken: token || undefined });
      })
      .catch(function (err) {
        sendResponse({
          error: err.message || 'Request failed'
        });
      });

    return true;
  });
})();
