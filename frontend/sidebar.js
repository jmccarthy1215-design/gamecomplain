/**
 * sidebar.js
 * Drives the Esports News, Top Rated Complaints, and Hottest Game sidebar widgets.
 * Loaded only on index.html.
 * All esports summaries are original paraphrases, not verbatim copies.
 */
(function () {

  // ── ESPORTS NEWS DATA ────────────────────────────────────────────────
  var ESPORTS_NEWS = [
    {
      game:    'Fortnite',
      event:   'FNCS Major 1 2025',
      summary: 'Team Mero claims top honours at FNCS Major 1 after a dominant final-day run, taking the season\'s largest prize pool in a tense final lobby.',
      date:    'Mar 2025',
      accent:  '#7c3aed'
    },
    {
      game:    'Valorant',
      event:   'VCT EMEA Stage 1',
      summary: 'Team Liquid advances to the VCT EMEA playoffs after finishing the group stage undefeated, defeating the defending champions along the way.',
      date:    'Feb 2025',
      accent:  '#dc2626'
    },
    {
      game:    'Call of Duty',
      event:   'CDL Major 3',
      summary: 'OpTic Texas secures back-to-back CDL Major wins, extending their standings lead heading into the summer split with an impressive clean sweep.',
      date:    'Mar 2025',
      accent:  '#b45309'
    },
    {
      game:    'League of Legends',
      event:   'LCS Spring Final',
      summary: '100 Thieves clinch the LCS Spring championship in a dramatic reverse sweep against Cloud9, earning their first split title of the season.',
      date:    'Feb 2025',
      accent:  '#ca8a04'
    },
    {
      game:    'Apex Legends',
      event:   'ALGS Pro League',
      summary: 'NRG Esports extends their win streak to five consecutive ALGS Pro League matches, positioning themselves as clear favourites for Split 1 playoffs.',
      date:    'Mar 2025',
      accent:  '#ea580c'
    },
    {
      game:    'Minecraft',
      event:   'MCC 28',
      summary: 'Team Purple wins MCC 28 with a record-breaking points total, surpassing all previous championship scores by a wide margin in the finale.',
      date:    'Jan 2025',
      accent:  '#16a34a'
    }
  ];

  // ── HOTTEST GAME DATA ────────────────────────────────────────────────
  var HOTTEST = {
    game:   'Fortnite',
    reason: 'New chapter launch + FNCS season in full swing',
    stats:  [
      { n: '42M+', l: 'Active Players' },
      { n: '#1',   l: 'Most Discussed'  },
      { n: '3.2K', l: 'Posts / Week'   }
    ],
    accent: '#7c3aed'
  };

  // ── HELPER ────────────────────────────────────────────────────────────
  function escStr(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  // ════════════════════════════════════════════════════════════════════
  // ESPORTS NEWS CAROUSEL
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var track   = document.getElementById('esports-track');
    var dotsEl  = document.getElementById('esports-dots');
    var prevBtn = document.getElementById('esports-prev');
    var nextBtn = document.getElementById('esports-next');
    if (!track) return;

    var current   = 0;
    var total     = ESPORTS_NEWS.length;
    var autoTimer = null;

    // Build cards + dots
    ESPORTS_NEWS.forEach(function (item, i) {
      var card = document.createElement('div');
      card.className = 'patch-card';
      card.setAttribute('aria-hidden', i !== 0 ? 'true' : 'false');
      card.innerHTML =
        '<div class="patch-card-game" style="color:' + item.accent + ';border-color:' + item.accent + '33">' +
          escStr(item.game) +
        '</div>' +
        '<div class="patch-card-version">' + escStr(item.event) + '</div>' +
        '<p class="patch-card-summary">' + escStr(item.summary) + '</p>' +
        '<div class="patch-card-date">' + escStr(item.date) + '</div>';
      track.appendChild(card);

      var dot = document.createElement('button');
      dot.className = 'patch-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to news item ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); resetTimer(); });
      dotsEl.appendChild(dot);
    });

    // Activate first card
    track.querySelectorAll('.patch-card')[0].classList.add('active');

    function goTo(idx) {
      var cards = track.querySelectorAll('.patch-card');
      var dots  = dotsEl.querySelectorAll('.patch-dot');
      cards[current].classList.remove('active');
      cards[current].setAttribute('aria-hidden', 'true');
      dots[current].classList.remove('active');
      current = (idx + total) % total;
      cards[current].classList.add('active');
      cards[current].setAttribute('aria-hidden', 'false');
      dots[current].classList.add('active');
    }

    prevBtn.addEventListener('click', function () { goTo(current - 1); resetTimer(); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); resetTimer(); });

    function startTimer() { autoTimer = setInterval(function () { goTo(current + 1); }, 7000); }
    function resetTimer() { clearInterval(autoTimer); startTimer(); }
    startTimer();

    var slider = document.getElementById('esports-slider');
    if (slider) {
      slider.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
      slider.addEventListener('mouseleave', startTimer);
    }
  }());

  // ════════════════════════════════════════════════════════════════════
  // TOP RATED COMPLAINTS CAROUSEL (live data)
  // ════════════════════════════════════════════════════════════════════
  (async function () {
    var track   = document.getElementById('top-track');
    var dotsEl  = document.getElementById('top-dots');
    var prevBtn = document.getElementById('top-prev');
    var nextBtn = document.getElementById('top-next');
    var navArea = document.querySelector('#top-slider .patch-nav');
    if (!track) return;

    var complaints = [];
    try {
      var res = await fetch((window.API_URL || '') + '/api/complaints?sort=votes');
      if (res.ok) {
        var data = await res.json();
        complaints = data.slice(0, 6);
      }
    } catch (_) { /* API unavailable — fallback to empty */ }

    // Replace loading placeholder
    track.innerHTML  = '';
    dotsEl.innerHTML = '';

    if (!complaints.length) {
      track.innerHTML =
        '<div class="patch-card active">' +
          '<p class="patch-card-summary" style="padding:.35rem 0">No top complaints yet. Be the first to post!</p>' +
        '</div>';
      if (navArea) navArea.style.display = 'none';
      return;
    }

    var current   = 0;
    var total     = complaints.length;
    var autoTimer = null;

    // Build cards + dots
    complaints.forEach(function (c, i) {
      var card = document.createElement('div');
      card.className = 'patch-card';
      card.setAttribute('aria-hidden', i !== 0 ? 'true' : 'false');
      var shortDesc = (c.description || '');
      if (shortDesc.length > 90) shortDesc = shortDesc.slice(0, 90) + '\u2026';
      card.innerHTML =
        '<div class="patch-card-game" style="color:var(--accent);border-color:rgba(108,99,255,.3)">' +
          escStr(c.game || 'General') +
        '</div>' +
        '<div class="patch-card-title">' + escStr(c.title) + '</div>' +
        '<p class="patch-card-summary">' + escStr(shortDesc) + '</p>' +
        '<div class="top-complaint-votes">&#9650; ' + escStr(String(c.votes || 0)) + ' votes</div>';
      track.appendChild(card);

      var dot = document.createElement('button');
      dot.className = 'patch-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to complaint ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); resetTimer(); });
      dotsEl.appendChild(dot);
    });

    // Activate first card
    track.querySelectorAll('.patch-card')[0].classList.add('active');

    // Hide nav if only one item
    if (navArea && total <= 1) navArea.style.display = 'none';

    function goTo(idx) {
      var cards = track.querySelectorAll('.patch-card');
      var dots  = dotsEl.querySelectorAll('.patch-dot');
      cards[current].classList.remove('active');
      cards[current].setAttribute('aria-hidden', 'true');
      dots[current].classList.remove('active');
      current = (idx + total) % total;
      cards[current].classList.add('active');
      cards[current].setAttribute('aria-hidden', 'false');
      dots[current].classList.add('active');
    }

    prevBtn.addEventListener('click', function () { goTo(current - 1); resetTimer(); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); resetTimer(); });

    function startTimer() { autoTimer = setInterval(function () { goTo(current + 1); }, 8000); }
    function resetTimer() { clearInterval(autoTimer); startTimer(); }
    startTimer();

    var slider = document.getElementById('top-slider');
    if (slider) {
      slider.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
      slider.addEventListener('mouseleave', startTimer);
    }
  }());

  // ════════════════════════════════════════════════════════════════════
  // HOTTEST GAME (static panel)
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var el = document.getElementById('hottest-game-content');
    if (!el) return;

    var statsHtml = HOTTEST.stats.map(function (s) {
      return (
        '<div class="hottest-stat">' +
          '<span class="hottest-stat-n" style="color:' + HOTTEST.accent + '">' + escStr(s.n) + '</span>' +
          '<span class="hottest-stat-l">' + escStr(s.l) + '</span>' +
        '</div>'
      );
    }).join('');

    el.innerHTML =
      '<div class="hottest-game-name" style="color:' + HOTTEST.accent + '">' +
        '&#128293; ' + escStr(HOTTEST.game) +
      '</div>' +
      '<p class="hottest-game-reason">' + escStr(HOTTEST.reason) + '</p>' +
      '<div class="hottest-stats">' + statsHtml + '</div>';
  }());

}());
