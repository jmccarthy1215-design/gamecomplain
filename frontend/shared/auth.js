/**
 * shared/auth.js
 * Authentication UI and state management for every page.
 *
 * What it does:
 *   1. On load, silently checks /api/auth/me to restore session state.
 *   2. Updates the navbar: shows display name and dev badge when logged in.
 *   3. Injects the login/register modal into the document.
 *   4. Wires the "Login / Sign Up" navbar button to open the modal.
 *   5. Exposes window.openAuthModal(tab) and window.getAuthUser().
 */
(function () {
  // Guard against double execution.
  // navbar.js dynamically loads this script; some pages also include it
  // via an explicit <script> tag. Without this guard the IIFE runs twice,
  // creating a duplicate modal overlay whose buttons have no event listeners —
  // so clicking "Log In" in the visible (second) overlay triggers nothing.
  if (window.openAuthModal) return;

  var currentUser = null;

  // ── Helpers ──────────────────────────────────────────────────────
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  // SVG icons for show/hide password toggle
  var EYE_OPEN =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"' +
        ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
      '<circle cx="12" cy="12" r="3"/>' +
    '</svg>';
  var EYE_CLOSED =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"' +
        ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8' +
               'a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8' +
               'a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>' +
      '<line x1="1" y1="1" x2="23" y2="23"/>' +
    '</svg>';

  // ── Inject auth modal HTML ───────────────────────────────────────
  var MODAL_HTML =
    '<div id="auth-modal-overlay" class="auth-modal-overlay hidden"' +
         ' role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">' +
      '<div class="auth-modal">' +
        '<button class="auth-modal-close" id="auth-modal-close" aria-label="Close">&times;</button>' +
        '<div class="auth-tabs" role="tablist">' +
          '<button class="auth-tab active" id="auth-tab-login"' +
                  ' role="tab" aria-selected="true" aria-controls="auth-pane-login">Log In</button>' +
          '<button class="auth-tab" id="auth-tab-register"' +
                  ' role="tab" aria-selected="false" aria-controls="auth-pane-register">Register</button>' +
        '</div>' +

        // ── Login pane ───────────────────────────────────────────
        '<div class="auth-pane" id="auth-pane-login" role="tabpanel">' +
          '<div class="auth-google-wrap">' +
            '<div id="google-signin-btn"></div>' +
            '<div class="auth-divider"><span>or sign in with email</span></div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label for="auth-login-email">Email</label>' +
            '<input type="email" id="auth-login-email" autocomplete="email"' +
                   ' placeholder="your@email.com" />' +
          '</div>' +
          '<div class="field-group">' +
            '<label for="auth-login-password">Password</label>' +
            '<div class="pw-wrap">' +
              '<input type="password" id="auth-login-password" autocomplete="current-password"' +
                     ' placeholder="Your password" />' +
              '<button type="button" class="pw-toggle" id="auth-login-pw-toggle"' +
                      ' aria-label="Show password" aria-pressed="false"></button>' +
            '</div>' +
          '</div>' +
          '<p class="auth-message" id="auth-login-message" aria-live="polite"></p>' +
          '<button class="auth-submit-btn" id="auth-login-submit">Log In</button>' +
        '</div>' +

        // ── Register pane ────────────────────────────────────────
        '<div class="auth-pane hidden" id="auth-pane-register" role="tabpanel">' +
          '<div class="field-group">' +
            '<label for="auth-reg-email">Email</label>' +
            '<input type="email" id="auth-reg-email" autocomplete="email"' +
                   ' placeholder="your@email.com" />' +
          '</div>' +
          '<div class="field-group">' +
            '<label for="auth-reg-displayname">Display Name</label>' +
            '<input type="text" id="auth-reg-displayname" autocomplete="nickname"' +
                   ' placeholder="Name shown on your posts" maxlength="50" />' +
          '</div>' +
          '<div class="field-group">' +
            '<label for="auth-reg-password">Password</label>' +
            '<div class="pw-wrap">' +
              '<input type="password" id="auth-reg-password" autocomplete="new-password"' +
                     ' placeholder="At least 8 characters" />' +
              '<button type="button" class="pw-toggle" id="auth-reg-pw-toggle"' +
                      ' aria-label="Show password" aria-pressed="false"></button>' +
            '</div>' +
          '</div>' +
          '<div class="field-group auth-terms-group">' +
            '<label class="auth-terms-label">' +
              '<input type="checkbox" id="auth-reg-terms" />' +
              '<span>I agree to the ' +
                '<a href="/legal/terms.html" target="_blank" rel="noopener" class="auth-terms-link">Terms of Service</a>' +
                ' and ' +
                '<a href="/legal/privacy.html" target="_blank" rel="noopener" class="auth-terms-link">Privacy Policy</a>' +
              '</span>' +
            '</label>' +
          '</div>' +
          '<p class="auth-message" id="auth-reg-message" aria-live="polite"></p>' +
          '<button class="auth-submit-btn" id="auth-reg-submit">Create Account</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', MODAL_HTML);

  // ── Element refs ─────────────────────────────────────────────────
  var overlay         = document.getElementById('auth-modal-overlay');
  var closeBtn        = document.getElementById('auth-modal-close');
  var tabLogin        = document.getElementById('auth-tab-login');
  var tabReg          = document.getElementById('auth-tab-register');
  var paneLogin       = document.getElementById('auth-pane-login');
  var paneReg         = document.getElementById('auth-pane-register');
  var loginEmail      = document.getElementById('auth-login-email');
  var loginPass       = document.getElementById('auth-login-password');
  var loginMsg        = document.getElementById('auth-login-message');
  var loginBtn        = document.getElementById('auth-login-submit');
  var regEmail        = document.getElementById('auth-reg-email');
  var regDisplayName  = document.getElementById('auth-reg-displayname');
  var regPass         = document.getElementById('auth-reg-password');
  var regMsg          = document.getElementById('auth-reg-message');
  var regBtn          = document.getElementById('auth-reg-submit');

  // ── Show / hide password toggles ─────────────────────────────────
  function initPwToggle(inputEl, toggleBtn) {
    toggleBtn.innerHTML = EYE_OPEN;
    toggleBtn.addEventListener('click', function () {
      var isHidden = inputEl.type === 'password';
      inputEl.type = isHidden ? 'text' : 'password';
      toggleBtn.innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
      toggleBtn.setAttribute('aria-label',   isHidden ? 'Hide password' : 'Show password');
      toggleBtn.setAttribute('aria-pressed', String(isHidden));
    });
  }

  initPwToggle(loginPass, document.getElementById('auth-login-pw-toggle'));
  initPwToggle(regPass,   document.getElementById('auth-reg-pw-toggle'));

  // ── Open / close ─────────────────────────────────────────────────
  function openModal(tab) {
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    switchTab(tab || 'login');
    setTimeout(function () {
      (tab === 'register' ? regEmail : loginEmail).focus();
    }, 50);
  }

  function closeModal() {
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    loginEmail.value       = '';
    loginPass.value        = '';
    loginMsg.textContent   = '';
    regEmail.value         = '';
    regDisplayName.value   = '';
    regPass.value          = '';
    regMsg.textContent     = '';
    var regTerms = document.getElementById('auth-reg-terms');
    if (regTerms) regTerms.checked = false;
    // Reset password fields back to hidden so they don't stay visible on next open
    loginPass.type = 'password';
    regPass.type   = 'password';
    document.getElementById('auth-login-pw-toggle').innerHTML = EYE_OPEN;
    document.getElementById('auth-reg-pw-toggle').innerHTML   = EYE_OPEN;
  }

  window.openAuthModal = openModal;

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
  });

  // ── Tab switching ─────────────────────────────────────────────────
  function switchTab(which) {
    var isLogin = which !== 'register';
    tabLogin.classList.toggle('active', isLogin);
    tabReg.classList.toggle('active', !isLogin);
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabReg.setAttribute('aria-selected', String(!isLogin));
    paneLogin.classList.toggle('hidden', !isLogin);
    paneReg.classList.toggle('hidden', isLogin);
  }

  tabLogin.addEventListener('click', function () { switchTab('login'); });
  tabReg.addEventListener('click', function ()   { switchTab('register'); });

  // ── Navbar update ─────────────────────────────────────────────────
  function updateNavbar(user) {
    // is-logged-in drives CSS show/hide of mobile hamburger auth links
    document.documentElement.classList.toggle('is-logged-in', !!user);

    var loginLinks = document.querySelectorAll('.nav-login-btn');
    var ddName     = document.querySelector('.profile-dd-name');
    var ddSub      = document.querySelector('.profile-dd-sub');

    if (user) {
      // ── Role class on <html> — CSS uses this to show/hide admin-only UI ──
      document.documentElement.classList.toggle('is-admin', user.role === 'admin');

      loginLinks.forEach(function (el) { el.style.display = 'none'; });

      if (ddName) {
        // displayName is the public name; fall back to username for legacy accounts
        var name  = user.displayName || user.username || 'User';
        var badge = '';
        if (user.role === 'admin') {
          badge = ' <span class="nav-admin-badge">&#9679; Admin</span>';
        } else if (user.isVerifiedDev) {
          badge = ' <span class="nav-verified-badge">&#10004; Dev</span>';
        }
        ddName.innerHTML = escapeHtml(name) + badge;
      }

      if (ddSub) {
        if (user.role === 'admin')          ddSub.textContent = 'Administrator';
        else if (user.isVerifiedDev)        ddSub.textContent = 'Verified Developer';
        else                                ddSub.textContent = 'Community Member';
      }
    } else {
      document.documentElement.classList.remove('is-admin');
      loginLinks.forEach(function (el) { el.style.display = ''; });
      if (ddName) ddName.textContent = 'Guest User';
      if (ddSub)  ddSub.textContent  = 'Sign in to save your posts';
    }

    // Show logout only when authenticated (handles all .profile-logout elements)
    document.querySelectorAll('.profile-logout').forEach(function (el) {
      el.style.display = user ? '' : 'none';
    });
  }

  // ── Wire "Login / Sign Up" navbar button ──────────────────────────
  // Uses event delegation so it works whether navbar was injected by
  // navbar.js (sub-pages) or is hardcoded in index.html
  document.addEventListener('click', function (e) {
    var el = e.target.closest('.nav-login-btn');
    if (el) {
      e.preventDefault();
      openModal('login');
    }
  });

  // ── Wire logout via event delegation ──────────────────────────────
  // Handles all .profile-logout elements (profile dropdown + mobile hamburger)
  document.addEventListener('click', function (e) {
    var el = e.target.closest('.profile-logout');
    if (el) {
      e.preventDefault();
      doLogout();
    }
  });

  // ── API calls ─────────────────────────────────────────────────────
  async function doLogin() {
    var email    = loginEmail.value.trim();
    var password = loginPass.value;
    loginMsg.textContent = '';
    loginMsg.className   = 'auth-message';

    if (!email || !password) {
      loginMsg.textContent = 'Please enter your email and password.';
      loginMsg.className   = 'auth-message error';
      return;
    }

    loginBtn.disabled     = true;
    loginBtn.textContent  = 'Logging in…';
    try {
      var res  = await fetch((window.API_URL || '') + '/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ email: email, password: password })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      currentUser = data;
      updateNavbar(currentUser);
      window.dispatchEvent(new CustomEvent('authReady', { detail: currentUser }));
      closeModal();
    } catch (err) {
      loginMsg.textContent = err.message;
      loginMsg.className   = 'auth-message error';
    } finally {
      loginBtn.disabled    = false;
      loginBtn.textContent = 'Log In';
    }
  }

  async function doRegister() {
    var email       = regEmail.value.trim();
    var displayName = regDisplayName.value.trim();
    var password    = regPass.value;
    regMsg.textContent = '';
    regMsg.className   = 'auth-message';

    if (!email || !displayName || !password) {
      regMsg.textContent = 'Please fill in all fields.';
      regMsg.className   = 'auth-message error';
      return;
    }

    var termsCheckbox = document.getElementById('auth-reg-terms');
    if (!termsCheckbox || !termsCheckbox.checked) {
      regMsg.textContent = 'You must accept the Terms of Service and Privacy Policy to create an account.';
      regMsg.className   = 'auth-message error';
      return;
    }

    regBtn.disabled     = true;
    regBtn.textContent  = 'Creating account…';
    try {
      var res  = await fetch((window.API_URL || '') + '/api/auth/register', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ email: email, displayName: displayName, password: password, acceptedTerms: true })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      currentUser = data;
      updateNavbar(currentUser);
      window.dispatchEvent(new CustomEvent('authReady', { detail: currentUser }));
      closeModal();
    } catch (err) {
      regMsg.textContent = err.message;
      regMsg.className   = 'auth-message error';
    } finally {
      regBtn.disabled    = false;
      regBtn.textContent = 'Create Account';
    }
  }

  async function doLogout() {
    try { await fetch((window.API_URL || '') + '/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (_) {}
    currentUser = null;
    updateNavbar(null);
    window.dispatchEvent(new CustomEvent('authReady', { detail: null }));
  }

  loginBtn.addEventListener('click', doLogin);
  regBtn.addEventListener('click',   doRegister);
  loginPass.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin();    });
  regPass.addEventListener('keydown',   function (e) { if (e.key === 'Enter') doRegister(); });

  // ── Bootstrap: restore session if cookie is present ───────────────
  (async function checkSession() {
    try {
      var res = await fetch((window.API_URL || '') + '/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        currentUser = await res.json();
        updateNavbar(currentUser);
      }
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('authReady', { detail: currentUser }));
  }());

  // Expose getter for other scripts (e.g. app.js could check getAuthUser())
  window.getAuthUser = function () { return currentUser; };

  // ── Google Identity Services (GIS) integration ─────────────
  // Called by the GIS script via the data-callback attribute, OR wired below.
  window.handleGoogleCredential = function (response) {
    var credential = response.credential;
    if (!credential) return;

    var msgEl = document.getElementById('auth-login-message');
    if (msgEl) { msgEl.textContent = 'Signing in with Google…'; msgEl.className = 'auth-message'; }

    fetch((window.API_URL || '') + '/api/auth/google', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ credential: credential })
    })
    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.data.error || 'Google sign-in failed.');
      currentUser = result.data;
      updateNavbar(currentUser);
      window.dispatchEvent(new CustomEvent('authReady', { detail: currentUser }));
      closeModal();
    })
    .catch(function (err) {
      if (msgEl) { msgEl.textContent = err.message; msgEl.className = 'auth-message error'; }
    });
  };

  // Load the GIS script and render the button once the overlay is first opened
  var gisLoaded = false;
  function initGoogleButton() {
    if (gisLoaded || !document.getElementById('google-signin-btn')) return;
    var clientId = window.GOOGLE_CLIENT_ID || '';  // set via <script>window.GOOGLE_CLIENT_ID='...'</script> on the page if needed
    if (!clientId) {
      // No client ID configured — hide the Google section gracefully
      var wrap = document.querySelector('.auth-google-wrap');
      if (wrap) wrap.style.display = 'none';
      return;
    }
    gisLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = function () {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback:  window.handleGoogleCredential
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { theme: 'filled_black', size: 'large', width: 360, text: 'signin_with' }
        );
      }
    };
    document.head.appendChild(s);
  }

  // Try to init whenever the modal becomes visible (open is called)
  var _originalOpen = window.openAuthModal;
  window.openAuthModal = function (tab) {
    _originalOpen(tab);
    setTimeout(initGoogleButton, 100);
  };

}());
