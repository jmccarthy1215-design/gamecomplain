/**
 * shared/navbar.js
 * Injects the full navbar into sub-pages and wires all interactions.
 * Load as the FIRST script inside <body> — do NOT include on index.html,
 * which has the navbar hardcoded and app.js handles its events.
 */
(function () {

  // Apply theme immediately — before any DOM injection — to prevent flash
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light-mode');
  }

  var PERSON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="8" r="4"/>' +
    '<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

  var NAV_HTML =
    '<nav class="navbar" role="navigation" aria-label="Main navigation">' +
    '<div class="nav-inner">' +

      /* Brand — margin-right:auto pushes everything else right */
      '<a href="/" class="nav-brand">&#127918; GameComplain</a>' +

      /* Main menu (collapses to drawer on mobile) */
      '<div class="nav-menu" id="nav-menu">' +

        '<div class="nav-item has-dropdown">' +
          '<button class="nav-link" id="nav-games">Games <span class="nav-arrow">&#9662;</span></button>' +
          '<ul class="nav-dropdown">' +
            '<li><a href="/games/fortnite.html" class="nav-dropdown-item">Fortnite</a></li>' +
            '<li><a href="/games/call-of-duty.html" class="nav-dropdown-item">Call of Duty</a></li>' +
            '<li><a href="/games/minecraft.html" class="nav-dropdown-item">Minecraft</a></li>' +
            '<li><a href="/games/valorant.html" class="nav-dropdown-item">Valorant</a></li>' +
            '<li><a href="/games/apex-legends.html" class="nav-dropdown-item">Apex Legends</a></li>' +
            '<li><a href="/games/league-of-legends.html" class="nav-dropdown-item">League of Legends</a></li>' +
            '<li><a href="/games/rocket-league.html" class="nav-dropdown-item">Rocket League</a></li>' +
            '<li><a href="/games/clash-royale.html" class="nav-dropdown-item">Clash Royale</a></li>' +
            '<li><a href="/games/counter-strike-2.html" class="nav-dropdown-item">Counter-Strike 2</a></li>' +
            '<li><a href="/games/rainbow-six-siege.html" class="nav-dropdown-item">Rainbow Six Siege</a></li>' +
          '</ul>' +
        '</div>' +

        '<div class="nav-item has-dropdown">' +
          '<button class="nav-link" id="nav-top">Top Complaints <span class="nav-arrow">&#9662;</span></button>' +
          '<ul class="nav-dropdown">' +
            '<li><a href="/top/this-week.html" class="nav-dropdown-item">This Week</a></li>' +
            '<li><a href="/top/this-month.html" class="nav-dropdown-item">This Month</a></li>' +
            '<li><a href="/top/all-time.html" class="nav-dropdown-item">All Time</a></li>' +
          '</ul>' +
        '</div>' +

        '<div class="nav-item has-dropdown">' +
          '<button class="nav-link" id="nav-rated">Highest Rated <span class="nav-arrow">&#9662;</span></button>' +
          '<ul class="nav-dropdown align-right">' +
            '<li><a href="/rated/by-player.html" class="nav-dropdown-item">By Player Rating</a></li>' +
            '<li><a href="/rated/community-score.html" class="nav-dropdown-item">By Community Score</a></li>' +
            '<li><a href="/rated/trending.html" class="nav-dropdown-item">Trending Games</a></li>' +
          '</ul>' +
        '</div>' +

        '<a href="/clips.html" class="nav-link">&#127909; Clips</a>' +
        '<a href="/complain-about-us.html" class="nav-link">&#128172; Complain About Us</a>' +
        '<button class="nav-post-btn" id="nav-post-btn">+ Post Complaint</button>' +

      '</div>' + /* /nav-menu */

      /* Auth section — always visible, not inside the hamburger drawer */
      '<div class="nav-auth" id="nav-auth">' +
        '<button class="theme-toggle" id="theme-toggle" aria-label="Toggle light/dark mode" title="Toggle theme">☀️</button>' +
        '<a href="#" class="nav-login-btn">Login / Sign Up</a>' +
        '<div class="nav-profile-wrap">' +
          '<button class="nav-avatar" id="nav-avatar" aria-label="Open profile menu" aria-expanded="false">' +
            PERSON_SVG +
          '</button>' +
          '<div class="nav-profile-dropdown" id="nav-profile-dropdown">' +
            '<div class="profile-dd-header">' +
              '<div class="profile-dd-avatar-lg">' + PERSON_SVG + '</div>' +
              '<div class="profile-dd-info">' +
                '<div class="profile-dd-name">Guest User</div>' +
                '<div class="profile-dd-sub">Sign in to save your posts</div>' +
              '</div>' +
            '</div>' +
            '<ul class="profile-menu-list">' +
              '<li><a href="/profile/posts.html" class="profile-menu-item">&#128221;&nbsp; My Posts</a></li>' +
              '<li><a href="/profile/replies.html" class="profile-menu-item">&#128172;&nbsp; Replies to My Posts</a></li>' +
              '<li><a href="/profile/index.html" class="profile-menu-item">&#128100;&nbsp; Profile</a></li>' +
              '<li><a href="/profile/settings.html" class="profile-menu-item">&#9881;&#65039;&nbsp; Settings</a></li>' +
              '<li class="profile-menu-divider"></li>' +
              '<li><a href="#" class="profile-menu-item profile-logout">&#128682;&nbsp; Logout</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</div>' + /* /nav-auth */

      /* Hamburger — visible only on mobile, comes last so auth sits left of it */
      '<button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu" aria-expanded="false">' +
        '<span></span><span></span><span></span>' +
      '</button>' +

    '</div>' + /* /nav-inner */
    '</nav>';

  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);

  // ── Theme toggle wiring ───────────────────────────────────
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = document.documentElement.classList.contains('light-mode') ? '🌙' : '☀️';
    themeToggle.addEventListener('click', function () {
      var isLight = document.documentElement.classList.toggle('light-mode');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      themeToggle.textContent = isLight ? '🌙' : '☀️';
    });
  }

  // ── Element refs ──────────────────────────────────────────
  var hamburger      = document.getElementById('nav-hamburger');
  var navMenu        = document.getElementById('nav-menu');
  var navPostBtn     = document.getElementById('nav-post-btn');
  var navAvatar      = document.getElementById('nav-avatar');
  var profileDropdown = document.getElementById('nav-profile-dropdown');

  // ── Post Complaint ────────────────────────────────────────
  navPostBtn.addEventListener('click', function () {
    closeMobileMenu();
    closeProfile();
    if (typeof openModal === 'function') { openModal(); }
    else { window.location.href = '/'; }
  });

  // ── Hamburger ─────────────────────────────────────────────
  hamburger.addEventListener('click', function () {
    var isOpen = navMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    if (!isOpen) closeAllDropdowns();
    closeProfile();
  });

  // ── Nav dropdown triggers ─────────────────────────────────
  document.querySelectorAll('.has-dropdown .nav-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var parent = btn.closest('.has-dropdown');
      var wasOpen = parent.classList.contains('dropdown-open');
      closeAllDropdowns();
      closeProfile();
      if (!wasOpen) parent.classList.add('dropdown-open');
    });
  });

  // ── Profile avatar toggle ─────────────────────────────────
  navAvatar.addEventListener('click', function (e) {
    e.stopPropagation(); // don't let document click close it immediately
    var isOpen = profileDropdown.classList.toggle('open');
    navAvatar.classList.toggle('open', isOpen);
    navAvatar.setAttribute('aria-expanded', String(isOpen));
    closeAllDropdowns();
    closeMobileMenu();
  });

  // ── Click outside ─────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.navbar')) {
      closeAllDropdowns();
      closeMobileMenu();
      closeProfile();
    }
  });

  // ── Escape key ────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAllDropdowns();
      closeMobileMenu();
      closeProfile();
    }
  });

  // ── Active section highlight ──────────────────────────────
  var path = window.location.pathname;
  var sectionMap = {
    '/games/': 'nav-games',
    '/top/':   'nav-top',
    '/rated/': 'nav-rated'
  };
  Object.keys(sectionMap).forEach(function (prefix) {
    if (path.startsWith(prefix)) {
      var el = document.getElementById(sectionMap[prefix]);
      if (el) el.classList.add('nav-link-active');
    }
  });

  // ── Load auth.js (handles login modal + session state) ───────────
  // auth.js is loaded on index.html via a <script> tag.
  // On all sub-pages navbar.js is the entry point, so we load it here.
  if (!window.openAuthModal) {
    var authScript = document.createElement('script');
    authScript.src = '/shared/auth.js';
    document.body.appendChild(authScript);
  }

  // ── Helpers ───────────────────────────────────────────────
  function closeAllDropdowns() {
    document.querySelectorAll('.has-dropdown.dropdown-open')
      .forEach(function (el) { el.classList.remove('dropdown-open'); });
  }

  function closeMobileMenu() {
    navMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  function closeProfile() {
    profileDropdown.classList.remove('open');
    navAvatar.classList.remove('open');
    navAvatar.setAttribute('aria-expanded', 'false');
  }

}());
