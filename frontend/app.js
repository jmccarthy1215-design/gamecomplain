// ── Constants ─────────────────────────────────────────────────
const API_BASE = (window.API_URL || '') + '/api/complaints';

// Description length (chars) before truncation + "Read more"
const TRUNCATE_AT = 250;

// Complaints with this many votes or more get the gold "Top" highlight
const TOP_THRESHOLD = 50;

// Category badge color map — background / text color pairs
const CATEGORY_COLORS = {
  'Game Bugs':           { bg: 'rgba(255,107,107,0.15)', border: 'rgba(255,107,107,0.4)', color: '#ff8787' },
  'Broken Characters':   { bg: 'rgba(255,169,77,0.15)',  border: 'rgba(255,169,77,0.4)',  color: '#ffa94d' },
  'Stupid Mechanics':    { bg: 'rgba(255,212,59,0.15)',  border: 'rgba(255,212,59,0.4)',  color: '#ffd43b' },
  'Matchmaking Issues':  { bg: 'rgba(105,219,124,0.15)', border: 'rgba(105,219,124,0.4)', color: '#69db7c' },
  'Performance Issues':  { bg: 'rgba(77,171,247,0.15)',  border: 'rgba(77,171,247,0.4)',  color: '#74c0fc' },
  'Cheating / Exploits': { bg: 'rgba(247,131,172,0.15)', border: 'rgba(247,131,172,0.4)', color: '#f783ac' },
  'Updates / Patches':   { bg: 'rgba(169,227,75,0.15)',  border: 'rgba(169,227,75,0.4)',  color: '#a9e34b' },
  'Other':               { bg: 'rgba(123,127,158,0.15)', border: 'rgba(123,127,158,0.4)', color: '#a0a3bb' }
};

// ── Element references ────────────────────────────────────────
const openModalBtn  = document.getElementById('open-modal-btn');
const modalOverlay  = document.getElementById('modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const form          = document.getElementById('complaint-form');
const titleInput    = document.getElementById('c-title');
const descInput     = document.getElementById('c-description');
const catSelect     = document.getElementById('c-category');
const gameSelect    = document.getElementById('c-game');
const submitBtn     = document.getElementById('submit-btn');
const formMessage   = document.getElementById('form-message');
const listEl        = document.getElementById('complaints-list');

// ── Filter panel elements ──────────────────────────────────
const filterGame     = document.getElementById('filter-game');
const filterCategory = document.getElementById('filter-category');
const filterRange    = document.getElementById('filter-range');
const filterSort     = document.getElementById('filter-sort');
const filterDevPost  = document.getElementById('filter-devpost');
const filterPanel    = document.getElementById('filter-panel');
const feedSortLabel  = document.getElementById('feed-sort-label');

// ── Auth helper ───────────────────────────────────────────────
function getCurrentUser() {
  return typeof window.getAuthUser === 'function' ? window.getAuthUser() : null;
}

// ── Utilities ─────────────────────────────────────────────────

// Escapes text before insertion as innerHTML — prevents XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function showFormMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function clearFormMessage() {
  formMessage.textContent = '';
  formMessage.className = 'form-message';
}

// ── Reveal own-content delete buttons ─────────────────────────
// Called once auth resolves — adds .own-delete-visible to cards/replies
// the current user owns. Also hides delete buttons when the user logs out.
function revealOwnDeleteButtons(user) {
  // Complaint cards
  document.querySelectorAll('.complaint-card').forEach(card => {
    const deleteBtn = card.querySelector('.delete-btn');
    if (!deleteBtn) return;
    if (user && card.dataset.userId && card.dataset.userId === String(user._id)) {
      deleteBtn.classList.add('own-delete-visible');
    } else {
      deleteBtn.classList.remove('own-delete-visible');
    }
  });

  // Reply items
  document.querySelectorAll('.reply-item').forEach(item => {
    const deleteBtn = item.querySelector('.reply-delete-btn');
    if (!deleteBtn) return;
    if (user && item.dataset.userId && item.dataset.userId === String(user._id)) {
      deleteBtn.classList.add('own-delete-visible');
    } else {
      deleteBtn.classList.remove('own-delete-visible');
    }
  });
}

window.addEventListener('authReady', e => revealOwnDeleteButtons(e.detail));

// ── Modal ──────────────────────────────────────────────────────

function openModal() {
  modalOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
  setTimeout(() => titleInput.focus(), 50);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.classList.remove('modal-open');
  form.reset();
  clearFormMessage();
}

openModalBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    closeModal();
  }
});

// ── Category badge style ──────────────────────────────────────

function applyCategoryStyle(el, category) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
  el.style.background   = colors.bg;
  el.style.border       = `1px solid ${colors.border}`;
  el.style.color        = colors.color;
}

// ── Render replies ─────────────────────────────────────────────

function renderRepliesInto(container, replies, complaintId) {
  const listDiv = container.querySelector('.replies-list');
  listDiv.innerHTML = '';

  if (!replies || replies.length === 0) {
    listDiv.innerHTML = '<p class="no-replies-text">No replies yet. Be the first!</p>';
    return;
  }

  const currentUser = getCurrentUser();

  replies.forEach(reply => {
    const isDev = !!reply.developerTag;
    const item  = document.createElement('div');
    item.className = 'reply-item' + (isDev ? ' dev-reply' : '');
    item.dataset.id     = reply._id;
    item.dataset.userId = reply.userId || '';

    const isOwnReply = currentUser && reply.userId && String(reply.userId) === String(currentUser._id);

    const likedReplies = new Set(JSON.parse(localStorage.getItem('likedReplies') || '[]'));
    const hasLiked = likedReplies.has(String(reply._id));

    item.innerHTML =
      (isDev ? `<div class="reply-dev-header"><span class="dev-reply-badge">&#128737; ${escapeHtml(reply.developerTag)}</span></div>` : '') +
      `<p class="reply-text">${escapeHtml(reply.text)}</p>` +
      `<div class="reply-footer">` +
        `<p class="reply-date">${formatDate(reply.createdAt)}</p>` +
        `<button class="reply-like-btn${hasLiked ? ' liked' : ''}" ` +
                `data-complaint-id="${escapeHtml(complaintId)}" ` +
                `data-reply-id="${escapeHtml(reply._id)}" ` +
                `${hasLiked ? 'disabled' : ''} ` +
                `aria-label="Like reply">&#9829; <span class="reply-like-count">${reply.likes || 0}</span></button>` +
        `<button class="reply-delete-btn${isOwnReply ? ' own-delete-visible' : ''}" ` +
                `data-complaint-id="${escapeHtml(complaintId)}" ` +
                `data-reply-id="${escapeHtml(reply._id)}" ` +
                `aria-label="Delete reply">&#128465; Delete</button>` +
      `</div>`;

    listDiv.appendChild(item);
  });
}

// ── Vote handler ──────────────────────────────────────────────

async function handleVote(complaintId, type, card) {
  const upBtn    = card.querySelector('.upvote-btn');
  const downBtn  = card.querySelector('.downvote-btn');
  const countEl  = card.querySelector('.vote-count');
  const prevCount = parseInt(countEl.textContent, 10);
  const wasActiveUp   = upBtn.classList.contains('active-up');
  const wasActiveDown = downBtn.classList.contains('active-down');

  // Optimistic UI
  let optimisticCount = prevCount;
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

  try {
    const res = await fetch(`${API_BASE}/${complaintId}/vote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Vote failed.');
    }
    const data = await res.json();
    countEl.textContent = data.votes;
    if (data.myVote === 'up')   { upBtn.classList.add('active-up');     downBtn.classList.remove('active-down'); }
    else if (data.myVote === 'down') { downBtn.classList.add('active-down'); upBtn.classList.remove('active-up'); }
    else                        { upBtn.classList.remove('active-up');   downBtn.classList.remove('active-down'); }
  } catch (err) {
    // Rollback
    countEl.textContent = prevCount;
    if (wasActiveUp)   { upBtn.classList.add('active-up');     downBtn.classList.remove('active-down'); }
    else if (wasActiveDown) { downBtn.classList.add('active-down'); upBtn.classList.remove('active-up'); }
    else               { upBtn.classList.remove('active-up');   downBtn.classList.remove('active-down'); }
    console.error('Vote error:', err);
  }
}

// ── Render a single complaint card (social-post style) ────────

function renderCard(complaint) {
  const id         = complaint._id;
  const myVote     = complaint.myVote || null;
  const desc       = complaint.description;
  const isLong     = desc.length > TRUNCATE_AT;
  const shortDesc  = isLong ? desc.slice(0, TRUNCATE_AT) + '…' : desc;
  const replyCount = (complaint.replies || []).length;
  const currentUser = getCurrentUser();
  const username   = complaint.username || 'Anonymous';
  const avatarChar = username.charAt(0).toUpperCase();

  const card = document.createElement('article');
  card.className = 'complaint-card'
    + (complaint.votes >= TOP_THRESHOLD ? ' top-complaint' : '')
    + (complaint.isDevPost ? ' dev-post' : '');
  card.dataset.id     = id;
  card.dataset.userId = complaint.userId || '';

  const isOwnComplaint = currentUser && complaint.userId && String(complaint.userId) === String(currentUser._id);

  card.innerHTML = `
    <div class="card-meta">
      <div class="card-author-row">
        <div class="card-avatar-circle" aria-hidden="true">${escapeHtml(avatarChar)}</div>
        <div class="card-author-info">
          <span class="card-author">${escapeHtml(username)}</span>
          <span class="card-date">${formatDate(complaint.createdAt)}</span>
        </div>
      </div>
      <div class="card-badges">
        ${complaint.isDevPost ? `<span class="dev-badge">&#128737; ${escapeHtml(complaint.developerTag || 'Dev Response')}</span>` : ''}
        ${complaint.votes >= TOP_THRESHOLD ? '<span class="top-badge">&#9733; Top</span>' : ''}
        ${complaint.game ? '<span class="card-game-badge"></span>' : ''}
        <span class="card-category"></span>
      </div>
    </div>

    <div class="card-body">
      <h3 class="card-title">${escapeHtml(complaint.title)}</h3>
      <p class="card-description">
        <span class="desc-text"></span>
        ${isLong ? '<button class="read-more-btn">Read more</button>' : ''}
      </p>
    </div>

    <div class="card-actions">
      <div class="vote-group">
        <button class="vote-btn upvote-btn${myVote === 'up' ? ' active-up' : ''}" aria-label="Upvote">
          <span class="vote-icon">▲</span>
          <span class="vote-count">${complaint.votes}</span>
        </button>
        <button class="vote-btn downvote-btn${myVote === 'down' ? ' active-down' : ''}" aria-label="Downvote">
          <span class="vote-icon">▼</span>
        </button>
      </div>

      <button class="reply-btn" aria-label="Toggle replies">
        &#128172; <span class="reply-count">${replyCount}</span>
      </button>

      <span class="spacer"></span>
      <button class="delete-btn${isOwnComplaint ? ' own-delete-visible' : ''}" aria-label="Delete complaint">&#128465; Delete</button>
    </div>

    <div class="replies-section hidden">
      <div class="replies-list"></div>
      <div class="reply-form">
        <textarea class="reply-input" placeholder="Write a reply…" maxlength="500" rows="2"></textarea>
        <p class="reply-error"></p>
        <button class="reply-submit-btn">Submit Reply</button>
      </div>
    </div>
  `;

  card.querySelector('.card-description .desc-text').textContent = shortDesc;
  card.querySelector('.card-category').textContent = complaint.category;
  applyCategoryStyle(card.querySelector('.card-category'), complaint.category);
  const gameBadgeEl = card.querySelector('.card-game-badge');
  if (gameBadgeEl) gameBadgeEl.textContent = complaint.game;

  const repliesSection = card.querySelector('.replies-section');
  renderRepliesInto(repliesSection, complaint.replies || [], id);

  // ── Read more / show less toggle ────────────────────────────
  const readMoreBtn = card.querySelector('.read-more-btn');
  if (readMoreBtn) {
    let expanded = false;
    readMoreBtn.addEventListener('click', () => {
      expanded = !expanded;
      card.querySelector('.desc-text').textContent = expanded ? desc : shortDesc;
      readMoreBtn.textContent = expanded ? 'Show less' : 'Read more';
    });
  }

  // ── Voting ────────────────────────────────────────────────────
  const upBtn   = card.querySelector('.upvote-btn');
  const downBtn = card.querySelector('.downvote-btn');

  upBtn.addEventListener('click', () => {
    if (!getCurrentUser()) { alert('Please log in to vote.'); return; }
    handleVote(id, 'up', card);
  });
  downBtn.addEventListener('click', () => {
    if (!getCurrentUser()) { alert('Please log in to vote.'); return; }
    handleVote(id, 'down', card);
  });

  // ── Reply toggle ─────────────────────────────────────────────
  const replyBtn     = card.querySelector('.reply-btn');
  const replyCountEl = card.querySelector('.reply-count');

  replyBtn.addEventListener('click', () => {
    const isHidden = repliesSection.classList.contains('hidden');
    repliesSection.classList.toggle('hidden', !isHidden);
    replyBtn.classList.toggle('active', isHidden);
    if (isHidden) repliesSection.querySelector('.reply-input').focus();
  });

  // ── Reply submission ──────────────────────────────────────────
  const replyInput     = repliesSection.querySelector('.reply-input');
  const replySubmitBtn = repliesSection.querySelector('.reply-submit-btn');
  const replyError     = repliesSection.querySelector('.reply-error');

  replySubmitBtn.addEventListener('click', async () => {
    const text = replyInput.value.trim();
    replyError.textContent = '';

    if (!text) {
      replyError.textContent = 'Reply cannot be empty.';
      return;
    }

    replySubmitBtn.disabled = true;
    replySubmitBtn.textContent = 'Posting…';

    try {
      const res = await fetch(`${API_BASE}/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post reply.');

      replyInput.value = '';

      const listDiv   = repliesSection.querySelector('.replies-list');
      const noReplies = listDiv.querySelector('.no-replies-text');
      if (noReplies) noReplies.remove();

      const isDev = !!data.developerTag;
      const item  = document.createElement('div');
      item.className      = 'reply-item' + (isDev ? ' dev-reply' : '');
      item.dataset.id     = data._id;
      item.dataset.userId = data.userId || '';

      const user    = getCurrentUser();
      const isOwn   = user && data.userId && String(data.userId) === String(user._id);

      item.innerHTML =
        (isDev ? `<div class="reply-dev-header"><span class="dev-reply-badge">&#128737; ${escapeHtml(data.developerTag)}</span></div>` : '') +
        `<p class="reply-text">${escapeHtml(data.text)}</p>` +
        `<div class="reply-footer">` +
          `<p class="reply-date">${formatDate(data.createdAt)}</p>` +
          `<button class="reply-delete-btn${isOwn ? ' own-delete-visible' : ''}" ` +
                  `data-complaint-id="${escapeHtml(id)}" ` +
                  `data-reply-id="${escapeHtml(data._id)}" ` +
                  `aria-label="Delete reply">&#128465; Delete</button>` +
        `</div>`;

      listDiv.appendChild(item);

      replyCountEl.textContent = parseInt(replyCountEl.textContent, 10) + 1;
    } catch (err) {
      replyError.textContent = err.message || 'Something went wrong.';
      console.error('Reply error:', err);
    } finally {
      replySubmitBtn.disabled = false;
      replySubmitBtn.textContent = 'Submit Reply';
    }
  });

  // ── Delete complaint ──────────────────────────────────────────
  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', async () => {
    if (!window.confirm('Permanently delete this complaint? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed.');
      }
      card.remove();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.message || 'Could not delete complaint.');
    }
  });

  // ── Like reply (event delegation on replies-list) ─────────────
  const repliesListEl = repliesSection.querySelector('.replies-list');
  repliesListEl.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.reply-like-btn');
    if (!likeBtn) return;
    if (likeBtn.disabled) return;

    const cid = likeBtn.dataset.complaintId;
    const rid = likeBtn.dataset.replyId;
    const countEl = likeBtn.querySelector('.reply-like-count');
    const prev = parseInt(countEl.textContent, 10);

    countEl.textContent = prev + 1;
    likeBtn.disabled = true;
    likeBtn.classList.add('liked');

    const likedReplies = new Set(JSON.parse(localStorage.getItem('likedReplies') || '[]'));
    likedReplies.add(rid);
    localStorage.setItem('likedReplies', JSON.stringify(Array.from(likedReplies)));

    try {
      const res = await fetch(`${API_BASE}/${cid}/replies/${rid}/like`, { method: 'PATCH' });
      if (!res.ok) throw new Error('failed');
      countEl.textContent = (await res.json()).likes;
    } catch (_) {
      countEl.textContent = prev;
      likeBtn.disabled = false;
      likeBtn.classList.remove('liked');
      likedReplies.delete(rid);
      localStorage.setItem('likedReplies', JSON.stringify(Array.from(likedReplies)));
    }
  });

  // ── Delete reply (event delegation on replies-list) ───────────
  repliesListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.reply-delete-btn');
    if (!btn) return;
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;

    const cid = btn.dataset.complaintId;
    const rid = btn.dataset.replyId;

    try {
      const res = await fetch(`${API_BASE}/${cid}/replies/${rid}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed.');
      }
      const item = btn.closest('.reply-item');
      if (item) item.remove();
      replyCountEl.textContent = Math.max(0, parseInt(replyCountEl.textContent, 10) - 1);
    } catch (err) {
      console.error('Reply delete error:', err);
      alert(err.message || 'Could not delete reply.');
    }
  });

  return card;
}

// ── Build filter query string ──────────────────────────────────

function buildQueryString() {
  const params = new URLSearchParams();
  const game     = filterGame     ? filterGame.value     : '';
  const category = filterCategory ? filterCategory.value : '';
  const range    = filterRange    ? filterRange.value    : 'all';
  const sort     = filterSort     ? filterSort.value     : 'votes';

  if (game)             params.set('game', game);
  if (category)         params.set('category', category);
  if (range !== 'all')  params.set('range', range);
  if (sort !== 'votes') params.set('sort', sort);

  const devActive = filterDevPost && filterDevPost.checked;
  if (devActive) params.set('dev', 'true');

  if (feedSortLabel) {
    feedSortLabel.textContent = sort === 'newest' ? '🕐 Newest First' : '▲ Sorted by votes';
  }

  if (filterPanel) {
    const active = game || category || (range && range !== 'all') || sort === 'newest' || devActive;
    filterPanel.classList.toggle('has-filters', !!active);
  }

  return params.toString() ? '?' + params.toString() : '';
}

// ── Load and render all complaints ────────────────────────────

async function loadComplaints() {
  listEl.innerHTML = '<p class="loading-text">Loading complaints…</p>';
  try {
    const qs  = buildQueryString();
    const res = await fetch(API_BASE + qs);
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    const complaints = await res.json();
    const devFilterActive = filterDevPost && filterDevPost.checked;

    listEl.innerHTML = '';

    if (complaints.length === 0) {
      listEl.innerHTML = devFilterActive
        ? '<p class="empty-text">No developer posts yet. Check back soon! &#128737;</p>'
        : '<p class="empty-text">No complaints match these filters. Try a different combination.</p>';
      return;
    }

    complaints.forEach(c => listEl.appendChild(renderCard(c)));
  } catch (err) {
    console.error('Failed to load complaints:', err);
    listEl.innerHTML = '<p class="empty-text">Could not load complaints. Please refresh.</p>';
  }
}

// ── Form submission ────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormMessage();

  const title       = titleInput.value.trim();
  const description = descInput.value.trim();
  const category    = catSelect.value;
  const game        = gameSelect ? gameSelect.value : '';

  if (!title || !description || !category) {
    showFormMessage('Please fill in all fields before submitting.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting…';

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category, game })
    });

    let data = {};
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) throw new Error(data.error || `Submission failed (${res.status}).`);

    closeModal();
    await loadComplaints();
  } catch (err) {
    console.error('Submit error:', err);
    showFormMessage(err.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Complaint';
  }
});

// ── Bootstrap ─────────────────────────────────────────────────
loadComplaints();

// ── Filter panel — auto-reload on change ──────────────────────
[filterGame, filterCategory, filterRange, filterSort, filterDevPost].forEach(el => {
  if (el) el.addEventListener('change', loadComplaints);
});

// ── Theme toggle ───────────────────────────────────────────────
(function initTheme() {
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light-mode');
  }
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.textContent = document.documentElement.classList.contains('light-mode') ? '🌙' : '☀️';
  btn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    btn.textContent = isLight ? '🌙' : '☀️';
  });
}());

// ── Navbar ────────────────────────────────────────────────────

const hamburger  = document.getElementById('nav-hamburger');
const navMenu    = document.getElementById('nav-menu');
const navPostBtn = document.getElementById('nav-post-btn');

navPostBtn.addEventListener('click', () => {
  closeMobileMenu();
  openModal();
});

hamburger.addEventListener('click', () => {
  const isOpen = navMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  if (!isOpen) closeAllDropdowns();
});

document.querySelectorAll('.has-dropdown .nav-link').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('.has-dropdown');
    const wasOpen = parent.classList.contains('dropdown-open');
    closeAllDropdowns();
    if (!wasOpen) parent.classList.add('dropdown-open');
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.navbar')) {
    closeAllDropdowns();
    closeMobileMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllDropdowns();
    closeMobileMenu();
  }
});

function closeAllDropdowns() {
  document.querySelectorAll('.has-dropdown.dropdown-open')
    .forEach(el => el.classList.remove('dropdown-open'));
}

function closeMobileMenu() {
  navMenu.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}

// ── Profile dropdown ──────────────────────────────────────────

const navAvatar        = document.getElementById('nav-avatar');
const profileDropdown  = document.getElementById('nav-profile-dropdown');

function closeProfile() {
  profileDropdown.classList.remove('open');
  navAvatar.classList.remove('open');
  navAvatar.setAttribute('aria-expanded', 'false');
}

navAvatar.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = profileDropdown.classList.toggle('open');
  navAvatar.classList.toggle('open', isOpen);
  navAvatar.setAttribute('aria-expanded', isOpen);
  closeAllDropdowns();
  closeMobileMenu();
});

// ── Left sidebar wiring ───────────────────────────────────────

// Post CTA in left sidebar
const lsbPostBtn = document.getElementById('lsb-post-btn');
if (lsbPostBtn) {
  lsbPostBtn.addEventListener('click', () => openModal());
}

// Category quick-filter buttons sync to the filter-category select
const lsbCatBtns = document.querySelectorAll('#lsb-categories .lsb-cat-btn');
lsbCatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    lsbCatBtns.forEach(b => b.classList.remove('lsb-cat-active'));
    btn.classList.add('lsb-cat-active');
    if (filterCategory) {
      filterCategory.value = btn.dataset.category;
      filterCategory.dispatchEvent(new Event('change'));
    }
  });
});

// Keep sidebar category active state in sync with filter-category select
if (filterCategory) {
  filterCategory.addEventListener('change', () => {
    const val = filterCategory.value;
    lsbCatBtns.forEach(b => {
      b.classList.toggle('lsb-cat-active', b.dataset.category === val);
    });
  });
}
