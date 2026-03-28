/**
 * shared/feed.js
 * Self-contained complaint feed for sub-pages.
 * Reads window.PAGE_CONFIG set by each page before this script loads.
 *
 * PAGE_CONFIG shape (all fields optional):
 *   sort        : 'votes' | 'newest'
 *   timeFilter  : 'week' | 'month' | 'all'     (legacy — prefer range)
 *   category    : string                         (locks category filter)
 *   game        : string                         (locks game filter; passes to API)
 *   gameSearch  : string                         (fallback client-side search)
 */
(function () {
  var config   = window.PAGE_CONFIG || {};
  var API_BASE = (window.API_URL || '') + '/api/complaints';
  var TRUNCATE = 250;
  var TOP_THRESHOLD = 50;

  var CATEGORY_COLORS = {
    'Game Bugs':           { bg:'rgba(255,107,107,.15)', border:'rgba(255,107,107,.4)', color:'#ff8787' },
    'Broken Characters':   { bg:'rgba(255,169,77,.15)',  border:'rgba(255,169,77,.4)',  color:'#ffa94d' },
    'Stupid Mechanics':    { bg:'rgba(255,212,59,.15)',  border:'rgba(255,212,59,.4)',  color:'#ffd43b' },
    'Matchmaking Issues':  { bg:'rgba(105,219,124,.15)', border:'rgba(105,219,124,.4)', color:'#69db7c' },
    'Performance Issues':  { bg:'rgba(77,171,247,.15)',  border:'rgba(77,171,247,.4)',  color:'#74c0fc' },
    'Cheating / Exploits': { bg:'rgba(247,131,172,.15)', border:'rgba(247,131,172,.4)', color:'#f783ac' },
    'Updates / Patches':   { bg:'rgba(169,227,75,.15)',  border:'rgba(169,227,75,.4)',  color:'#a9e34b' },
    'Other':               { bg:'rgba(123,127,158,.15)', border:'rgba(123,127,158,.4)', color:'#a0a3bb' }
  };

  // ── Auth helper ───────────────────────────────────────────
  function getCurrentUser() {
    return typeof window.getAuthUser === 'function' ? window.getAuthUser() : null;
  }

  // ── Utilities ──────────────────────────────────────────────
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  }

  function applyCategoryStyle(el, cat) {
    var c = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
    el.style.background = c.bg;
    el.style.border     = '1px solid ' + c.border;
    el.style.color      = c.color;
  }

  // ── User-controlled filter state ───────────────────────────
  var userFilters = { category: '', range: 'all', sort: config.sort || 'votes', devPost: false };

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

  // ── Inject filter panel ────────────────────────────────────
  function injectFilterPanel(listEl) {
    var showCategory = !config.category;
    var panel = document.createElement('div');
    panel.className = 'filter-panel';
    panel.id = 'feed-filter-panel';

    var html = '<span class="filter-label">Filter:</span>';

    if (showCategory) {
      html +=
        '<select class="filter-select" id="fp-category" aria-label="Filter by category">' +
          '<option value="">All Categories</option>' +
          '<option>Game Bugs</option>' +
          '<option>Broken Characters</option>' +
          '<option>Stupid Mechanics</option>' +
          '<option>Matchmaking Issues</option>' +
          '<option>Performance Issues</option>' +
          '<option>Cheating / Exploits</option>' +
          '<option>Updates / Patches</option>' +
          '<option>Other</option>' +
        '</select>';
    }

    html +=
      '<select class="filter-select" id="fp-range" aria-label="Filter by date range">' +
        '<option value="all">All Time</option>' +
        '<option value="today">Today</option>' +
        '<option value="week">This Week</option>' +
        '<option value="month">This Month</option>' +
      '</select>' +
      '<select class="filter-select" id="fp-sort" aria-label="Sort order">' +
        '<option value="votes">Top Voted</option>' +
        '<option value="newest">Newest First</option>' +
      '</select>' +
      '<label class="filter-devpost-label" for="fp-devpost">' +
        '<input type="checkbox" id="fp-devpost" class="filter-devpost-check">' +
        '<span>&#128737; From the Devs</span>' +
      '</label>';

    panel.innerHTML = html;
    listEl.parentNode.insertBefore(panel, listEl);

    if (showCategory) {
      panel.querySelector('#fp-category').addEventListener('change', function (e) {
        userFilters.category = e.target.value;
        panel.classList.toggle('has-filters', hasActiveFilters());
        loadFeed(listEl);
      });
    }
    panel.querySelector('#fp-range').addEventListener('change', function (e) {
      userFilters.range = e.target.value;
      panel.classList.toggle('has-filters', hasActiveFilters());
      loadFeed(listEl);
    });
    panel.querySelector('#fp-sort').addEventListener('change', function (e) {
      userFilters.sort = e.target.value;
      panel.classList.toggle('has-filters', hasActiveFilters());
      loadFeed(listEl);
    });
    panel.querySelector('#fp-devpost').addEventListener('change', function (e) {
      userFilters.devPost = e.target.checked;
      panel.classList.toggle('has-filters', hasActiveFilters());
      loadFeed(listEl);
    });
  }

  function hasActiveFilters() {
    return !!(userFilters.category || (userFilters.range && userFilters.range !== 'all') || userFilters.sort === 'newest' || userFilters.devPost);
  }

  // ── Build API query string ─────────────────────────────────
  function buildQuery() {
    var params = new URLSearchParams();

    if (config.game)     params.set('game', config.game);
    if (config.category) params.set('category', config.category);

    if (userFilters.category && !config.category) params.set('category', userFilters.category);
    if (userFilters.range && userFilters.range !== 'all') params.set('range', userFilters.range);

    if (!userFilters.range || userFilters.range === 'all') {
      if (config.timeFilter && config.timeFilter !== 'all') params.set('range', config.timeFilter);
    }

    var sort = userFilters.sort || config.sort || 'votes';
    if (sort !== 'votes') params.set('sort', sort);

    if (userFilters.devPost) params.set('dev', 'true');

    return params.toString() ? '?' + params.toString() : '';
  }

  // ── Client-side gameSearch fallback ───────────────────────
  function applyGameSearch(complaints) {
    if (!config.gameSearch) return complaints;
    var term = config.gameSearch.toLowerCase();
    return complaints.filter(function (c) {
      return (c.game && c.game.toLowerCase().indexOf(term) !== -1) ||
             c.title.toLowerCase().indexOf(term) !== -1 ||
             c.description.toLowerCase().indexOf(term) !== -1;
    });
  }

  // ── Vote handler ──────────────────────────────────────────
  function handleVote(complaintId, type, card) {
    var upBtn    = card.querySelector('.upvote-btn');
    var downBtn  = card.querySelector('.downvote-btn');
    var countEl  = card.querySelector('.vote-count');
    var prevCount      = parseInt(countEl.textContent, 10);
    var wasActiveUp    = upBtn.classList.contains('active-up');
    var wasActiveDown  = downBtn.classList.contains('active-down');

    var optimisticCount = prevCount;
    if (type === 'up') {
      if (wasActiveUp) {
        optimisticCount -= 1;
        upBtn.classList.remove('active-up');
      } else {
        optimisticCount += wasActiveDown ? 2 : 1;
        upBtn.classList.add('active-up');
        downBtn.classList.remove('active-down');
      }
    } else {
      if (wasActiveDown) {
        optimisticCount += 1;
        downBtn.classList.remove('active-down');
      } else {
        optimisticCount -= wasActiveUp ? 2 : 1;
        downBtn.classList.add('active-down');
        upBtn.classList.remove('active-up');
      }
    }
    countEl.textContent = optimisticCount;

    fetch(API_BASE + '/' + complaintId + '/vote', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
      countEl.textContent = prevCount;
      if (wasActiveUp)        { upBtn.classList.add('active-up');    downBtn.classList.remove('active-down'); }
      else if (wasActiveDown) { downBtn.classList.add('active-down'); upBtn.classList.remove('active-up'); }
      else                    { upBtn.classList.remove('active-up'); downBtn.classList.remove('active-down'); }
    });
  }

  // ── Nested reply rendering ──────────────────────────────────
  function buildReplyItem(r, complaintId, currentUser, isNested) {
    var isDev  = !!(r.developerTag);
    var isOwn  = currentUser && r.userId && String(r.userId) === String(currentUser._id);
    var item   = document.createElement('div');
    item.className      = 'reply-item' + (isDev ? ' dev-reply' : '') + (isNested ? ' reply-nested' : '');
    item.dataset.id     = r._id;
    item.dataset.userId = r.userId || '';

    item.innerHTML =
      (isDev ? '<div class="reply-dev-header"><span class="dev-reply-badge">&#128737; ' + escapeHtml(r.developerTag) + '</span></div>' : '') +
      '<p class="reply-text">' + escapeHtml(r.text) + '</p>' +
      '<div class="reply-footer">' +
        '<span class="reply-author">&#128100; ' + escapeHtml(r.username || 'Anonymous') + '</span>' +
        '<p class="reply-date">' + formatDate(r.createdAt) + '</p>' +
        '<button class="reply-to-reply-btn" data-reply-id="' + escapeHtml(r._id) + '" ' +
                'data-reply-user="' + escapeHtml(r.username || 'Anonymous') + '">&#128172; Reply</button>' +
        '<button class="reply-delete-btn' + (isOwn ? ' own-delete-visible' : '') + '" ' +
                'data-complaint-id="' + escapeHtml(complaintId) + '" ' +
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

  function renderRepliesInto(container, replies, complaintId) {
    var listDiv = container.querySelector('.replies-list');
    listDiv.innerHTML = '';
    if (!replies || replies.length === 0) {
      listDiv.innerHTML = '<p class="no-replies-text">No replies yet. Be the first!</p>';
      return;
    }
    var currentUser = getCurrentUser();

    // Separate top-level replies from nested ones
    var topLevel = [];
    var childMap = {};  // parentReplyId -> [replies]

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
      var item = buildReplyItem(r, complaintId, currentUser, false);
      listDiv.appendChild(item);

      // Append nested replies indented beneath the parent
      var children = childMap[String(r._id)] || [];
      children.forEach(function (child) {
        var childItem = buildReplyItem(child, complaintId, currentUser, true);
        listDiv.appendChild(childItem);
      });
    });
  }

  // ── Render a single card ────────────────────────────────────
  function renderCard(complaint) {
    var id         = complaint._id;
    var myVote     = complaint.myVote || null;
    var desc       = complaint.description;
    var isLong     = desc.length > TRUNCATE;
    var shortDesc  = isLong ? desc.slice(0, TRUNCATE) + '…' : desc;
    var replyCount = (complaint.replies || []).length;
    var isTop      = complaint.votes >= TOP_THRESHOLD;
    var currentUser = getCurrentUser();
    var isOwn      = currentUser && complaint.userId && String(complaint.userId) === String(currentUser._id);

    var card = document.createElement('article');
    card.className      = 'complaint-card' + (isTop ? ' top-complaint' : '') + (complaint.isDevPost ? ' dev-post' : '');
    card.dataset.id     = id;
    card.dataset.userId = complaint.userId || '';

    var badgesHtml = '';
    if (complaint.isDevPost) badgesHtml += '<span class="dev-badge">&#128737; ' + escapeHtml(complaint.developerTag || 'Dev Response') + '</span>';
    if (isTop)               badgesHtml += '<span class="top-badge">&#9733; Top</span>';
    if (complaint.game)      badgesHtml += '<span class="card-game-badge"></span>';
    badgesHtml += '<span class="card-category"></span>';

    var username   = complaint.username || 'Anonymous';
    var avatarChar = username.charAt(0).toUpperCase();

    card.innerHTML =
      '<div class="card-meta">' +
        '<div class="card-author-row">' +
          '<div class="card-avatar-circle" aria-hidden="true">' + escapeHtml(avatarChar) + '</div>' +
          '<div class="card-author-info">' +
            '<span class="card-author">' + escapeHtml(username) + '</span>' +
            '<span class="card-date">' + formatDate(complaint.createdAt) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-badges">' + badgesHtml + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<h3 class="card-title">' + escapeHtml(complaint.title) + '</h3>' +
        '<p class="card-description">' +
          '<span class="desc-text"></span>' +
          (isLong ? '<button class="read-more-btn">Read more</button>' : '') +
        '</p>' +
      '</div>' +
      '<div class="card-actions">' +
        '<div class="vote-group">' +
          '<button class="vote-btn upvote-btn' + (myVote === 'up' ? ' active-up' : '') + '" aria-label="Upvote">' +
            '<span class="vote-icon">&#9650;</span>' +
            '<span class="vote-count">' + complaint.votes + '</span>' +
          '</button>' +
          '<button class="vote-btn downvote-btn' + (myVote === 'down' ? ' active-down' : '') + '" aria-label="Downvote">' +
            '<span class="vote-icon">&#9660;</span>' +
          '</button>' +
        '</div>' +
        '<button class="reply-btn" aria-label="Toggle replies">' +
          '&#128172; <span class="reply-count">' + replyCount + '</span>' +
        '</button>' +
        '<span class="spacer"></span>' +
        '<button class="delete-btn' + (isOwn ? ' own-delete-visible' : '') + '" aria-label="Delete complaint">&#128465; Delete</button>' +
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
    card.querySelector('.card-category').textContent = complaint.category;
    applyCategoryStyle(card.querySelector('.card-category'), complaint.category);

    var gameBadgeEl = card.querySelector('.card-game-badge');
    if (gameBadgeEl) gameBadgeEl.textContent = complaint.game;

    var repliesSection = card.querySelector('.replies-section');
    renderRepliesInto(repliesSection, complaint.replies || [], id);

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
    var upBtn   = card.querySelector('.upvote-btn');
    var downBtn = card.querySelector('.downvote-btn');

    upBtn.addEventListener('click', function () {
      if (!getCurrentUser()) { alert('Please log in to vote.'); return; }
      handleVote(id, 'up', card);
    });
    downBtn.addEventListener('click', function () {
      if (!getCurrentUser()) { alert('Please log in to vote.'); return; }
      handleVote(id, 'down', card);
    });

    // Reply toggle
    var replyBtn     = card.querySelector('.reply-btn');
    var replyCountEl = card.querySelector('.reply-count');

    replyBtn.addEventListener('click', function () {
      var hidden = repliesSection.classList.contains('hidden');
      repliesSection.classList.toggle('hidden', !hidden);
      replyBtn.classList.toggle('active', hidden);
      if (hidden) repliesSection.querySelector('.reply-input').focus();
    });

    // Helper: post a reply (top-level or nested)
    function postReply(text, parentReplyId, onSuccess, onError, onFinally) {
      var body = { text: text };
      if (parentReplyId) body.parentReplyId = parentReplyId;

      fetch(API_BASE + '/' + id + '/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      replySubmitBtn.disabled    = true;
      replySubmitBtn.textContent = 'Posting…';

      postReply(text, null,
        function (data) {
          replyInput.value = '';
          var listDiv   = repliesSection.querySelector('.replies-list');
          var noReplies = listDiv.querySelector('.no-replies-text');
          if (noReplies) noReplies.remove();

          var user  = getCurrentUser();
          var item  = buildReplyItem(data, id, user, false);
          listDiv.appendChild(item);
          wireInlineReply(item, listDiv);
          replyCountEl.textContent = parseInt(replyCountEl.textContent, 10) + 1;
        },
        function (e) { replyError.textContent = e.message || 'Something went wrong.'; },
        function ()  { replySubmitBtn.disabled = false; replySubmitBtn.textContent = 'Submit Reply'; }
      );
    });

    // Wire "Reply to reply" inline forms on a newly appended reply item
    function wireInlineReply(item, listDiv) {
      var toReplyBtn = item.querySelector('.reply-to-reply-btn');
      if (!toReplyBtn) return;

      toReplyBtn.addEventListener('click', function () {
        if (!getCurrentUser()) { alert('Please log in to reply.'); return; }
        var rid   = toReplyBtn.dataset.replyId;
        var form  = document.getElementById('inline-reply-' + rid);
        if (!form) return;
        var allForms = repliesSection.querySelectorAll('.inline-reply-form');
        allForms.forEach(function (f) { if (f !== form) f.classList.add('hidden'); });
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) form.querySelector('.inline-reply-input').focus();
      });

      var inlineForms = item.querySelectorAll('.inline-reply-form');
      inlineForms.forEach(function (form) {
        var rid        = form.id.replace('inline-reply-', '');
        var input      = form.querySelector('.inline-reply-input');
        var errEl      = form.querySelector('.inline-reply-error');
        var submitBtn  = form.querySelector('.inline-reply-submit');
        var cancelBtn  = form.querySelector('.inline-reply-cancel');

        cancelBtn.addEventListener('click', function () { form.classList.add('hidden'); input.value = ''; errEl.textContent = ''; });

        submitBtn.addEventListener('click', function () {
          var text = input.value.trim();
          errEl.textContent = '';
          if (!text) { errEl.textContent = 'Reply cannot be empty.'; return; }
          submitBtn.disabled = true; submitBtn.textContent = 'Posting…';

          postReply(text, rid,
            function (data) {
              input.value = '';
              form.classList.add('hidden');
              var user     = getCurrentUser();
              var newItem  = buildReplyItem(data, id, user, true);
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

    // Wire all existing reply items in the initial render
    repliesSection.querySelectorAll('.reply-item').forEach(function (item) {
      wireInlineReply(item, repliesSection.querySelector('.replies-list'));
    });

    // Wire inline-reply buttons on already-rendered items after load
    // (This is also called inside postReply success, so new items get wired too)
    repliesSection.querySelector('.replies-list').querySelectorAll('.reply-item').forEach(function (item) {
      wireInlineReply(item, repliesSection.querySelector('.replies-list'));
    });

    // Delete complaint
    var deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', function () {
      if (!window.confirm('Permanently delete this complaint? This cannot be undone.')) return;
      fetch(API_BASE + '/' + id, { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Delete failed.'); });
        card.remove();
      })
      .catch(function (e) {
        console.error('Delete error:', e);
        alert(e.message || 'Could not delete complaint.');
      });
    });

    // Delete reply (event delegation)
    var repliesListEl = repliesSection.querySelector('.replies-list');
    repliesListEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.reply-delete-btn');
      if (!btn) return;
      if (!window.confirm('Delete this reply? This cannot be undone.')) return;

      var cid = btn.dataset.complaintId;
      var rid = btn.dataset.replyId;

      fetch(API_BASE + '/' + cid + '/replies/' + rid, { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Delete failed.'); });
        var item = btn.closest('.reply-item');
        if (item) item.remove();
        replyCountEl.textContent = Math.max(0, parseInt(replyCountEl.textContent, 10) - 1);
      })
      .catch(function (e) {
        console.error('Reply delete error:', e);
        alert(e.message || 'Could not delete reply.');
      });
    });

    return card;
  }

  // ── Load + render ────────────────────────────────────────────
  function loadFeed(listEl) {
    listEl.innerHTML = '<p class="loading-text">Loading complaints…</p>';
    fetch(API_BASE + buildQuery())
    .then(function (res) {
      if (!res.ok) throw new Error('Server error ' + res.status);
      return res.json();
    })
    .then(function (complaints) {
      complaints = applyGameSearch(complaints);
      listEl.innerHTML = '';
      if (complaints.length === 0) {
        listEl.innerHTML = userFilters.devPost
          ? '<p class="empty-text">No developer posts yet. Check back soon! &#128737;</p>'
          : '<p class="empty-text">No complaints found here yet.<br>'
              + '<a href="/" style="color:var(--accent);text-decoration:none;font-weight:600;">&#8592; Back to home to post one</a></p>';
        return;
      }
      complaints.forEach(function (c) { listEl.appendChild(renderCard(c)); });
    })
    .catch(function (err) {
      console.error(err);
      listEl.innerHTML = '<p class="empty-text">Could not load complaints — make sure the server is running.</p>';
    });
  }

  // ── Bootstrap ────────────────────────────────────────────────
  function init() {
    var listEl = document.getElementById('complaints-list');
    if (!listEl) return;
    injectFilterPanel(listEl);
    loadFeed(listEl);
  }

  init();
}());
