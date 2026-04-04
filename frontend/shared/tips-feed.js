/**
 * shared/tips-feed.js
 * Self-contained feed for the Tips page.
 * Mirrors feed.js but targets /api/tips and adds client-side keyword search.
 *
 * Exposes window.refreshTipsFeed() so the Post Tip modal can trigger a reload.
 */
(function () {
  var config   = window.PAGE_CONFIG || {};
  var API_BASE = (window.API_URL || '') + '/api/tips';
  var TRUNCATE = 250;
  var TOP_THRESHOLD = 50;

  var allTips    = [];   // full result set cached for client-side search
  var searchTerm = '';
  var searchTimer = null;
  var listEl;            // resolved in init()

  var CATEGORY_COLORS = {
    'Strategy':        { bg:'rgba(32,201,151,.15)',  border:'rgba(32,201,151,.4)',  color:'#20c997' },
    'Weapon Tip':      { bg:'rgba(255,107,107,.15)', border:'rgba(255,107,107,.4)', color:'#ff8787' },
    'Character Guide': { bg:'rgba(188,110,255,.15)', border:'rgba(188,110,255,.4)', color:'#be6cff' },
    'Map Knowledge':   { bg:'rgba(169,227,75,.15)',  border:'rgba(169,227,75,.4)',  color:'#a9e34b' },
    'Bug Workaround':  { bg:'rgba(255,169,77,.15)',  border:'rgba(255,169,77,.4)',  color:'#ffa94d' },
    'Settings':        { bg:'rgba(77,171,247,.15)',  border:'rgba(77,171,247,.4)',  color:'#74c0fc' },
    'General':         { bg:'rgba(123,127,158,.15)', border:'rgba(123,127,158,.4)', color:'#a0a3bb' }
  };

  // ── Auth helper ───────────────────────────────────────────
  function getCurrentUser() {
    return typeof window.getAuthUser === 'function' ? window.getAuthUser() : null;
  }

  // ── Utilities ─────────────────────────────────────────────
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  }

  function applyCategoryStyle(el, cat) {
    var c = CATEGORY_COLORS[cat] || { bg:'rgba(123,127,158,.15)', border:'rgba(123,127,158,.4)', color:'#a0a3bb' };
    el.style.background = c.bg;
    el.style.border     = '1px solid ' + c.border;
    el.style.color      = c.color;
  }

  // ── Filter state ──────────────────────────────────────────
  var userFilters = { category: '', game: '', range: 'all', sort: config.sort || 'votes' };

  // ── Reveal own-content delete buttons ─────────────────────
  function revealOwnDeleteButtons(user) {
    document.querySelectorAll('.complaint-card').forEach(function (card) {
      var btn = card.querySelector('.delete-btn');
      if (!btn) return;
      if (user && card.dataset.userId && card.dataset.userId === String(user._id)) {
        btn.classList.add('own-delete-visible');
      } else {
        btn.classList.remove('own-delete-visible');
      }
    });
    document.querySelectorAll('.reply-item').forEach(function (item) {
      var btn = item.querySelector('.reply-delete-btn');
      if (!btn) return;
      if (user && item.dataset.userId && item.dataset.userId === String(user._id)) {
        btn.classList.add('own-delete-visible');
      } else {
        btn.classList.remove('own-delete-visible');
      }
    });
  }

  window.addEventListener('authReady', function (e) { revealOwnDeleteButtons(e.detail); });

  // ── Search bar ────────────────────────────────────────────
  function injectSearchBar(el) {
    var wrap = document.createElement('div');
    wrap.className = 'tips-search-wrap';
    wrap.innerHTML =
      '<div class="tips-search-bar">' +
        '<span class="tips-search-icon" aria-hidden="true">&#128269;</span>' +
        '<input type="search" id="tips-search-input" class="tips-search-input" ' +
               'placeholder="Search tips — try a gun name, strategy, character, or game…" ' +
               'autocomplete="off" aria-label="Search tips" />' +
        '<button id="tips-search-clear" class="tips-search-clear" aria-label="Clear search" hidden>&#10005;</button>' +
      '</div>';
    el.parentNode.insertBefore(wrap, el);

    var input    = document.getElementById('tips-search-input');
    var clearBtn = document.getElementById('tips-search-clear');

    input.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTerm = input.value.trim();
      clearBtn.hidden = !searchTerm;
      // Debounce re-render by 250 ms for smooth typing
      searchTimer = setTimeout(function () { applySearch(); }, 250);
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      searchTerm  = '';
      clearBtn.hidden = true;
      applySearch();
      input.focus();
    });
  }

  // ── Client-side search filter ─────────────────────────────
  // Filters the cached allTips array — no extra API call on each keystroke
  function applySearch() {
    if (!listEl) return;
    var filtered = allTips;
    if (searchTerm) {
      var term = searchTerm.toLowerCase();
      filtered = allTips.filter(function (t) {
        return t.title.toLowerCase().indexOf(term)       !== -1 ||
               t.description.toLowerCase().indexOf(term) !== -1 ||
               (t.game && t.game.toLowerCase().indexOf(term) !== -1) ||
               (t.item && t.item.toLowerCase().indexOf(term) !== -1);
      });
    }
    renderList(filtered);
  }

  // ── Filter panel ──────────────────────────────────────────
  function injectFilterPanel(el) {
    var panel = document.createElement('div');
    panel.className = 'filter-panel';
    panel.id = 'feed-filter-panel';
    panel.innerHTML =
      '<span class="filter-label">Filter:</span>' +

      '<select class="filter-select" id="fp-category" aria-label="Filter by category">' +
        '<option value="">All Categories</option>' +
        '<option>Strategy</option>' +
        '<option>Weapon Tip</option>' +
        '<option>Character Guide</option>' +
        '<option>Map Knowledge</option>' +
        '<option>Bug Workaround</option>' +
        '<option>Settings</option>' +
        '<option>General</option>' +
      '</select>' +

      '<select class="filter-select" id="fp-tips-game" aria-label="Filter by game">' +
        '<option value="">All Games</option>' +
        '<option>Fortnite</option>' +
        '<option>Minecraft</option>' +
        '<option>Valorant</option>' +
        '<option>Apex Legends</option>' +
        '<option>League of Legends</option>' +
        '<option>Rocket League</option>' +
        '<option>Clash Royale</option>' +
        '<option>Clash of Clans</option>' +
        '<option>Counter-Strike 2</option>' +
        '<option>Rainbow Six Siege</option>' +
        '<option>Call of Duty</option>' +
        '<option>Call of Duty: Warzone</option>' +
        '<option>Call of Duty: Black Ops 6</option>' +
        '<option>H1Z1</option>' +
        '<option>DayZ</option>' +
        '<option>Other</option>' +
      '</select>' +

      '<select class="filter-select" id="fp-range" aria-label="Filter by date range">' +
        '<option value="all">All Time</option>' +
        '<option value="today">Today</option>' +
        '<option value="week">This Week</option>' +
        '<option value="month">This Month</option>' +
      '</select>' +

      '<select class="filter-select" id="fp-sort" aria-label="Sort order">' +
        '<option value="votes">Top Voted</option>' +
        '<option value="newest">Newest First</option>' +
      '</select>';

    el.parentNode.insertBefore(panel, el);

    panel.querySelector('#fp-category').addEventListener('change', function (e) {
      userFilters.category = e.target.value;
      panel.classList.toggle('has-filters', hasActiveFilters());
      loadFeed();
    });
    panel.querySelector('#fp-tips-game').addEventListener('change', function (e) {
      userFilters.game = e.target.value;
      panel.classList.toggle('has-filters', hasActiveFilters());
      loadFeed();
    });
    panel.querySelector('#fp-range').addEventListener('change', function (e) {
      userFilters.range = e.target.value;
      panel.classList.toggle('has-filters', hasActiveFilters());
      loadFeed();
    });
    panel.querySelector('#fp-sort').addEventListener('change', function (e) {
      userFilters.sort = e.target.value;
      panel.classList.toggle('has-filters', hasActiveFilters());
      loadFeed();
    });
  }

  function hasActiveFilters() {
    return !!(userFilters.category || userFilters.game ||
              (userFilters.range && userFilters.range !== 'all') ||
              userFilters.sort === 'newest');
  }

  // ── Build API query string ────────────────────────────────
  function buildQuery() {
    var params = new URLSearchParams();
    if (userFilters.category) params.set('category', userFilters.category);
    if (userFilters.game)     params.set('game',     userFilters.game);
    if (userFilters.range && userFilters.range !== 'all') params.set('range', userFilters.range);
    var sort = userFilters.sort || 'votes';
    if (sort !== 'votes') params.set('sort', sort);
    return params.toString() ? '?' + params.toString() : '';
  }

  // ── Vote handler ──────────────────────────────────────────
  function handleVote(tipId, type, card) {
    var upBtn         = card.querySelector('.upvote-btn');
    var downBtn       = card.querySelector('.downvote-btn');
    var countEl       = card.querySelector('.vote-count');
    var prevCount     = parseInt(countEl.textContent, 10);
    var wasActiveUp   = upBtn.classList.contains('active-up');
    var wasActiveDown = downBtn.classList.contains('active-down');

    // Optimistic update
    var optimisticCount = prevCount;
    if (type === 'up') {
      if (wasActiveUp) {
        optimisticCount -= 1; upBtn.classList.remove('active-up');
      } else {
        optimisticCount += wasActiveDown ? 2 : 1;
        upBtn.classList.add('active-up'); downBtn.classList.remove('active-down');
      }
    } else {
      if (wasActiveDown) {
        optimisticCount += 1; downBtn.classList.remove('active-down');
      } else {
        optimisticCount -= wasActiveUp ? 2 : 1;
        downBtn.classList.add('active-down'); upBtn.classList.remove('active-up');
      }
    }
    countEl.textContent = optimisticCount;

    fetch(API_BASE + '/' + tipId + '/vote', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: type })
    })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Vote failed.'); });
      return res.json();
    })
    .then(function (data) {
      countEl.textContent = data.votes;
      if (data.myVote === 'up')        { upBtn.classList.add('active-up');    downBtn.classList.remove('active-down'); }
      else if (data.myVote === 'down') { downBtn.classList.add('active-down'); upBtn.classList.remove('active-up'); }
      else                             { upBtn.classList.remove('active-up'); downBtn.classList.remove('active-down'); }
    })
    .catch(function () {
      // Roll back optimistic update on failure
      countEl.textContent = prevCount;
      if (wasActiveUp)        { upBtn.classList.add('active-up');    downBtn.classList.remove('active-down'); }
      else if (wasActiveDown) { downBtn.classList.add('active-down'); upBtn.classList.remove('active-up'); }
      else                    { upBtn.classList.remove('active-up'); downBtn.classList.remove('active-down'); }
    });
  }

  // ── Reply rendering ───────────────────────────────────────
  function buildReplyItem(r, tipId, currentUser, isNested) {
    var isDev = !!(r.developerTag);
    var item  = document.createElement('div');
    item.className      = 'reply-item' + (isDev ? ' dev-reply' : '') + (isNested ? ' reply-nested' : '');
    item.dataset.id     = r._id;
    item.dataset.userId = r.userId || '';

    var likedReplies = new Set(JSON.parse(localStorage.getItem('likedReplies') || '[]'));
    var hasLiked     = likedReplies.has(String(r._id));

    item.innerHTML =
      (isDev ? '<div class="reply-dev-header"><span class="dev-reply-badge">&#128737; ' + escapeHtml(r.developerTag) + '</span></div>' : '') +
      '<p class="reply-text">' + escapeHtml(r.text) + '</p>' +
      '<div class="reply-footer">' +
        '<span class="reply-author">&#128100; ' + escapeHtml(r.username || 'Anonymous') + '</span>' +
        '<p class="reply-date">' + formatDate(r.createdAt) + '</p>' +
        '<button class="reply-to-reply-btn" data-reply-id="' + escapeHtml(r._id) + '" ' +
                'data-reply-user="' + escapeHtml(r.username || 'Anonymous') + '">&#128172; Reply</button>' +
        '<button class="reply-like-btn' + (hasLiked ? ' liked' : '') + '" ' +
                'data-complaint-id="' + escapeHtml(tipId) + '" ' +
                'data-reply-id="' + escapeHtml(r._id) + '" ' +
                (hasLiked ? 'disabled ' : '') +
                'aria-label="Like reply">&#9829; <span class="reply-like-count">' + (r.likes || 0) + '</span></button>' +
        '<button class="reply-delete-btn" ' +
                'data-complaint-id="' + escapeHtml(tipId) + '" ' +
                'data-reply-id="' + escapeHtml(r._id) + '" ' +
                'aria-label="Delete reply">&#128465; Delete</button>' +
      '</div>' +
      '<div class="inline-reply-form hidden" id="inline-reply-' + escapeHtml(r._id) + '">' +
        '<textarea class="reply-input inline-reply-input" placeholder="Reply to ' + escapeHtml(r.username || 'Anonymous') + '…" maxlength="500" rows="2"></textarea>' +
        '<p class="reply-error inline-reply-error"></p>' +
        '<div class="inline-reply-actions">' +
          '<button class="inline-reply-cancel">Cancel</button>' +
          '<button class="reply-submit-btn inline-reply-submit">Reply</button>' +
        '</div>' +
      '</div>';

    return item;
  }

  function renderRepliesInto(container, replies, tipId) {
    var listDiv = container.querySelector('.replies-list');
    listDiv.innerHTML = '';
    if (!replies || replies.length === 0) {
      listDiv.innerHTML = '<p class="no-replies-text">No replies yet. Be the first!</p>';
      return;
    }
    var currentUser = getCurrentUser();
    var topLevel = [];
    var childMap = {};

    replies.forEach(function (r) {
      if (r.parentReplyId) {
        var pid = String(r.parentReplyId);
        if (!childMap[pid]) childMap[pid] = [];
        childMap[pid].push(r);
      } else {
        topLevel.push(r);
      }
    });

    topLevel.forEach(function (r) {
      var item = buildReplyItem(r, tipId, currentUser, false);
      listDiv.appendChild(item);
      (childMap[String(r._id)] || []).forEach(function (child) {
        listDiv.appendChild(buildReplyItem(child, tipId, currentUser, true));
      });
    });
  }

  // ── Render a single tip card ───────────────────────────────
  function renderCard(tip) {
    var id         = tip._id;
    var myVote     = tip.myVote || null;
    var desc       = tip.description;
    var isLong     = desc.length > TRUNCATE;
    var shortDesc  = isLong ? desc.slice(0, TRUNCATE) + '…' : desc;
    var replyCount = (tip.replies || []).length;
    var isTop      = tip.votes >= TOP_THRESHOLD;
    var currentUser = getCurrentUser();
    var isOwn      = currentUser && tip.userId && String(tip.userId) === String(currentUser._id);

    var card = document.createElement('article');
    card.className      = 'complaint-card' + (isTop ? ' top-complaint' : '') + (tip.isDevPost ? ' dev-post' : '');
    card.dataset.id     = id;
    card.dataset.userId = tip.userId || '';

    var badgesHtml = '';
    if (tip.isDevPost) badgesHtml += '<span class="dev-badge">&#128737; ' + escapeHtml(tip.developerTag || 'Dev') + '</span>';
    if (isTop)         badgesHtml += '<span class="top-badge">&#9733; Top</span>';
    if (tip.game)      badgesHtml += '<span class="card-game-badge"></span>';
    badgesHtml += '<span class="card-category"></span>';
    if (tip.item)      badgesHtml += '<span class="card-item-badge">' + escapeHtml(tip.item) + '</span>';

    var username   = tip.username || 'Anonymous';
    var avatarChar = username.charAt(0).toUpperCase();

    card.innerHTML =
      '<div class="card-meta">' +
        '<div class="card-author-row">' +
          '<div class="card-avatar-circle" aria-hidden="true">' + escapeHtml(avatarChar) + '</div>' +
          '<div class="card-author-info">' +
            '<span class="card-author">' + escapeHtml(username) + '</span>' +
            '<span class="card-date">' + formatDate(tip.createdAt) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-badges">' + badgesHtml + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<h3 class="card-title">' + escapeHtml(tip.title) + '</h3>' +
        '<p class="card-description">' +
          '<span class="desc-text"></span>' +
          (isLong ? '<button class="read-more-btn">Read more</button>' : '') +
        '</p>' +
      '</div>' +
      '<div class="card-actions">' +
        '<div class="vote-group">' +
          '<button class="vote-btn upvote-btn' + (myVote === 'up' ? ' active-up' : '') + '" aria-label="Upvote">' +
            '<span class="vote-icon">&#9650;</span>' +
            '<span class="vote-count">' + tip.votes + '</span>' +
          '</button>' +
          '<button class="vote-btn downvote-btn' + (myVote === 'down' ? ' active-down' : '') + '" aria-label="Downvote">' +
            '<span class="vote-icon">&#9660;</span>' +
          '</button>' +
        '</div>' +
        '<button class="reply-btn" aria-label="Toggle replies">' +
          '&#128172; <span class="reply-count">' + replyCount + '</span>' +
        '</button>' +
        '<span class="spacer"></span>' +
        '<button class="delete-btn' + (isOwn ? ' own-delete-visible' : '') + '" aria-label="Delete tip">&#128465; Delete</button>' +
      '</div>' +
      '<div class="replies-section hidden">' +
        '<div class="replies-list"></div>' +
        '<div class="reply-form">' +
          '<textarea class="reply-input" placeholder="Write a reply…" maxlength="500" rows="2"></textarea>' +
          '<p class="reply-error"></p>' +
          '<button class="reply-submit-btn">Submit Reply</button>' +
        '</div>' +
      '</div>';

    card.querySelector('.desc-text').textContent = shortDesc;
    card.querySelector('.card-category').textContent = tip.category;
    applyCategoryStyle(card.querySelector('.card-category'), tip.category);
    var gameBadge = card.querySelector('.card-game-badge');
    if (gameBadge) gameBadge.textContent = tip.game;

    var repliesSection = card.querySelector('.replies-section');
    renderRepliesInto(repliesSection, tip.replies || [], id);

    // Read more toggle
    var readMoreBtn = card.querySelector('.read-more-btn');
    if (readMoreBtn) {
      var expanded = false;
      readMoreBtn.addEventListener('click', function () {
        expanded = !expanded;
        card.querySelector('.desc-text').textContent = expanded ? desc : shortDesc;
        readMoreBtn.textContent = expanded ? 'Show less' : 'Read more';
      });
    }

    // Voting
    card.querySelector('.upvote-btn').addEventListener('click', function () {
      if (!getCurrentUser()) { alert('Please log in to vote.'); return; }
      handleVote(id, 'up', card);
    });
    card.querySelector('.downvote-btn').addEventListener('click', function () {
      if (!getCurrentUser()) { alert('Please log in to vote.'); return; }
      handleVote(id, 'down', card);
    });

    // Replies toggle
    var replyBtn     = card.querySelector('.reply-btn');
    var replyCountEl = card.querySelector('.reply-count');

    replyBtn.addEventListener('click', function () {
      var hidden = repliesSection.classList.contains('hidden');
      repliesSection.classList.toggle('hidden', !hidden);
      replyBtn.classList.toggle('active', hidden);
      if (hidden) repliesSection.querySelector('.reply-input').focus();
    });

    // Post a reply (top-level or nested)
    function postReply(text, parentReplyId, onSuccess, onError, onFinally) {
      var body = { text: text };
      if (parentReplyId) body.parentReplyId = parentReplyId;
      fetch(API_BASE + '/' + id + '/reply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || 'Failed.');
        onSuccess(result.data);
      })
      .catch(onError)
      .finally(onFinally);
    }

    // Top-level reply submit
    var replyInput     = repliesSection.querySelector('.reply-input:not(.inline-reply-input)');
    var replySubmitBtn = repliesSection.querySelector('.reply-form > .reply-submit-btn');
    var replyError     = repliesSection.querySelector('.reply-form > .reply-error');

    replySubmitBtn.addEventListener('click', function () {
      var text = replyInput.value.trim();
      replyError.textContent = '';
      if (!text) { replyError.textContent = 'Reply cannot be empty.'; return; }
      replySubmitBtn.disabled = true;
      replySubmitBtn.textContent = 'Posting…';

      postReply(text, null,
        function (data) {
          replyInput.value = '';
          var listDiv   = repliesSection.querySelector('.replies-list');
          var noReplies = listDiv.querySelector('.no-replies-text');
          if (noReplies) noReplies.remove();
          var item = buildReplyItem(data, id, getCurrentUser(), false);
          listDiv.appendChild(item);
          wireInlineReply(item, listDiv);
          replyCountEl.textContent = parseInt(replyCountEl.textContent, 10) + 1;
        },
        function (e) { replyError.textContent = e.message || 'Something went wrong.'; },
        function ()  { replySubmitBtn.disabled = false; replySubmitBtn.textContent = 'Submit Reply'; }
      );
    });

    // Wire "reply to reply" inline forms
    function wireInlineReply(item, listDiv) {
      var toReplyBtn = item.querySelector('.reply-to-reply-btn');
      if (!toReplyBtn) return;

      toReplyBtn.addEventListener('click', function () {
        if (!getCurrentUser()) { alert('Please log in to reply.'); return; }
        var rid  = toReplyBtn.dataset.replyId;
        var form = document.getElementById('inline-reply-' + rid);
        if (!form) return;
        repliesSection.querySelectorAll('.inline-reply-form').forEach(function (f) {
          if (f !== form) f.classList.add('hidden');
        });
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) form.querySelector('.inline-reply-input').focus();
      });

      item.querySelectorAll('.inline-reply-form').forEach(function (form) {
        var rid       = form.id.replace('inline-reply-', '');
        var input     = form.querySelector('.inline-reply-input');
        var errEl     = form.querySelector('.inline-reply-error');
        var submitBtn = form.querySelector('.inline-reply-submit');
        var cancelBtn = form.querySelector('.inline-reply-cancel');

        cancelBtn.addEventListener('click', function () {
          form.classList.add('hidden');
          input.value = '';
          errEl.textContent = '';
        });
        submitBtn.addEventListener('click', function () {
          var text = input.value.trim();
          errEl.textContent = '';
          if (!text) { errEl.textContent = 'Reply cannot be empty.'; return; }
          submitBtn.disabled = true;
          submitBtn.textContent = 'Posting…';

          postReply(text, rid,
            function (data) {
              input.value = ''; form.classList.add('hidden');
              var newItem = buildReplyItem(data, id, getCurrentUser(), true);
              item.insertAdjacentElement('afterend', newItem);
              wireInlineReply(newItem, listDiv);
              replyCountEl.textContent = parseInt(replyCountEl.textContent, 10) + 1;
            },
            function (e) { errEl.textContent = e.message || 'Something went wrong.'; },
            function ()  { submitBtn.disabled = false; submitBtn.textContent = 'Reply'; }
          );
        });
      });
    }

    repliesSection.querySelectorAll('.reply-item').forEach(function (item) {
      wireInlineReply(item, repliesSection.querySelector('.replies-list'));
    });

    // Delete tip
    card.querySelector('.delete-btn').addEventListener('click', function () {
      if (!window.confirm('Permanently delete this tip? This cannot be undone.')) return;
      fetch(API_BASE + '/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Delete failed.'); });
        allTips = allTips.filter(function (t) { return t._id !== id; });
        card.remove();
      })
      .catch(function (e) { alert(e.message || 'Could not delete tip.'); });
    });

    // Like reply (event delegation)
    var repliesListEl = repliesSection.querySelector('.replies-list');
    repliesListEl.addEventListener('click', function (e) {
      var likeBtn = e.target.closest('.reply-like-btn');
      if (!likeBtn || likeBtn.disabled) return;
      var cid     = likeBtn.dataset.complaintId;
      var rid     = likeBtn.dataset.replyId;
      var countEl = likeBtn.querySelector('.reply-like-count');
      var prev    = parseInt(countEl.textContent, 10);

      countEl.textContent = prev + 1;
      likeBtn.disabled = true;
      likeBtn.classList.add('liked');

      var likedReplies = new Set(JSON.parse(localStorage.getItem('likedReplies') || '[]'));
      likedReplies.add(rid);
      localStorage.setItem('likedReplies', JSON.stringify(Array.from(likedReplies)));

      fetch(API_BASE + '/' + cid + '/replies/' + rid + '/like', { method: 'PATCH' })
      .then(function (res) { if (!res.ok) throw new Error('failed'); return res.json(); })
      .then(function (data) { countEl.textContent = data.likes; })
      .catch(function () {
        countEl.textContent = prev;
        likeBtn.disabled = false; likeBtn.classList.remove('liked');
        likedReplies.delete(rid);
        localStorage.setItem('likedReplies', JSON.stringify(Array.from(likedReplies)));
      });
    });

    // Delete reply (event delegation)
    repliesListEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.reply-delete-btn');
      if (!btn) return;
      if (!window.confirm('Delete this reply? This cannot be undone.')) return;
      var cid = btn.dataset.complaintId;
      var rid = btn.dataset.replyId;

      fetch(API_BASE + '/' + cid + '/replies/' + rid, { method: 'DELETE', credentials: 'include' })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Delete failed.'); });
        var item = btn.closest('.reply-item');
        if (item) item.remove();
        replyCountEl.textContent = Math.max(0, parseInt(replyCountEl.textContent, 10) - 1);
      })
      .catch(function (e) { alert(e.message || 'Could not delete reply.'); });
    });

    return card;
  }

  // ── Render list from array ─────────────────────────────────
  function renderList(tips) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (tips.length === 0) {
      if (searchTerm) {
        listEl.innerHTML =
          '<p class="empty-text">No tips matching <strong>"' + escapeHtml(searchTerm) + '"</strong>.<br>' +
          '<span style="font-size:.85rem;color:var(--text-muted)">Try a different keyword or clear the search.</span></p>';
      } else {
        listEl.innerHTML =
          '<p class="empty-text">No tips here yet.<br>' +
          '<a href="#" onclick="if(window.openTipModal)window.openTipModal();return false;" ' +
             'style="color:var(--accent);text-decoration:none;font-weight:600;">&#128161; Be the first to post one!</a></p>';
      }
      return;
    }
    tips.forEach(function (t) { listEl.appendChild(renderCard(t)); });
  }

  // ── Load from API ──────────────────────────────────────────
  // Fetches with current filter state, caches in allTips, then applies search
  function loadFeed() {
    if (!listEl) return;
    listEl.innerHTML = '<p class="loading-text">Loading tips…</p>';
    fetch(API_BASE + buildQuery())
    .then(function (res) {
      if (!res.ok) throw new Error('Server error ' + res.status);
      return res.json();
    })
    .then(function (tips) {
      allTips = tips;
      applySearch();
    })
    .catch(function (err) {
      console.error(err);
      listEl.innerHTML = '<p class="empty-text">Could not load tips — make sure the server is running.</p>';
    });
  }

  // ── Expose reload hook for the Post Tip modal ──────────────
  window.refreshTipsFeed = loadFeed;

  // ── Bootstrap ─────────────────────────────────────────────
  function init() {
    listEl = document.getElementById('complaints-list');
    if (!listEl) return;
    injectSearchBar(listEl);
    injectFilterPanel(listEl);
    loadFeed();
  }

  init();
}());
