/**
 * patch-notes.js
 * Drives the rotating patch notes sidebar widget on the homepage.
 * All patch note content is original paraphrased summaries, not verbatim copies.
 */
(function () {

  var NOTES = [
    {
      game:    'Fortnite',
      version: 'v30.10',
      title:   'Weapon Balance Pass',
      summary: 'Shotgun spread reduced across all rarities. Assault rifle bloom tightened at range. Storm Surge damage scaling rebalanced for competitive queues.',
      date:    'Mar 2025',
      accent:  '#7c3aed'
    },
    {
      game:    'Fortnite',
      version: 'v29.30',
      title:   'Ranked Adjustments',
      summary: 'Arena point thresholds revised for Diamond and Elite divisions. Structure edit speed slightly reduced. Battle bus timing updated for drop variety.',
      date:    'Jan 2025',
      accent:  '#7c3aed'
    },
    {
      game:    'Call of Duty',
      version: 'Season 4 RL',
      title:   'Operator Tuning',
      summary: 'Assault rifle ADS speeds normalized across the weapon class. Sniper idle sway increased at max range. Ranked Play map rotation expanded.',
      date:    'Feb 2025',
      accent:  '#b45309'
    },
    {
      game:    'Call of Duty',
      version: 'Season 5',
      title:   'Resurgence Update',
      summary: 'Two returning Resurgence locations added to rotation. Ground loot refresh with updated weapon pool. Gulag overtime timer shortened by 5 seconds.',
      date:    'Mar 2025',
      accent:  '#b45309'
    },
    {
      game:    'Minecraft',
      version: 'Java 1.21.1',
      title:   'Mace Refinements',
      summary: 'Smite enchantment now correctly applies to the new Mace weapon. Trial Chamber loot variance increased. Ominous Bottle drops from patrol captains adjusted.',
      date:    'Jan 2025',
      accent:  '#16a34a'
    },
    {
      game:    'Minecraft',
      version: 'Java 1.21.3',
      title:   'Bundles of Bravery',
      summary: 'Bundle items now stack and display fill percentage in inventory. Pale Garden biome generation tuned. Creaking Heart block interaction clarified.',
      date:    'Mar 2025',
      accent:  '#16a34a'
    },
    {
      game:    'Valorant',
      version: 'Patch 9.01',
      title:   'Agent Adjustments',
      summary: 'Jett updraft charges reduced to one per round. Reyna dismiss window shortened by 0.3 s. Raze satchel velocity preserved on early cancel.',
      date:    'Jan 2025',
      accent:  '#dc2626'
    },
    {
      game:    'Valorant',
      version: 'Patch 9.04',
      title:   'Economy Changes',
      summary: 'Buy phase extended by 5 s in overtime rounds. Light shields cost reduced to 400 credits. Ultimate orb spawn positions rotated on Lotus and Pearl.',
      date:    'Feb 2025',
      accent:  '#dc2626'
    },
    {
      game:    'Apex Legends',
      version: 'Season 21.1',
      title:   'Legend Tuning',
      summary: 'Horizon tactical cooldown increased by 2 s. Wraith portal max placement range reduced. Respawn banner interaction range increased for faster revives.',
      date:    'Feb 2025',
      accent:  '#ea580c'
    },
    {
      game:    'Apex Legends',
      version: 'Season 22',
      title:   'Ring & Ranked',
      summary: 'Late-game ring closure speed increased in Ranked. LP decay for inactivity rebalanced. Care package weapon rotation updated with returning Bocek Bow.',
      date:    'Mar 2025',
      accent:  '#ea580c'
    },
    {
      game:    'League of Legends',
      version: 'Patch 14.12',
      title:   'Marksman Overhaul',
      summary: 'Crit item costs adjusted to encourage diverse ADC builds. On-hit damage standardized across ranged carries. Galeforce active cooldown increased to 90 s.',
      date:    'Jan 2025',
      accent:  '#ca8a04'
    },
    {
      game:    'League of Legends',
      version: 'Patch 14.14',
      title:   'Support Items',
      summary: 'Support income threshold raised by 50 gold. Sightstone passive cooldown reduced to 20 s. Banshee\'s Veil base magic resistance lowered from 40 to 35.',
      date:    'Mar 2025',
      accent:  '#ca8a04'
    }
  ];

  var track    = document.getElementById('patch-track');
  var dotsEl   = document.getElementById('patch-dots');
  var prevBtn  = document.getElementById('patch-prev');
  var nextBtn  = document.getElementById('patch-next');

  if (!track) return; // not on a page with the widget

  var current   = 0;
  var total     = NOTES.length;
  var autoTimer = null;

  // ── Build cards ──────────────────────────────────────────────────
  NOTES.forEach(function (note, i) {
    var card = document.createElement('div');
    card.className = 'patch-card';
    card.setAttribute('aria-hidden', i !== 0 ? 'true' : 'false');
    card.innerHTML =
      '<div class="patch-card-game" style="color:' + note.accent + ';border-color:' + note.accent + '33">' +
        note.game +
      '</div>' +
      '<div class="patch-card-version">' + escStr(note.version) + '</div>' +
      '<div class="patch-card-title">' + escStr(note.title) + '</div>' +
      '<p class="patch-card-summary">' + escStr(note.summary) + '</p>' +
      '<div class="patch-card-date">' + escStr(note.date) + '</div>';
    track.appendChild(card);

    // Dot
    var dot = document.createElement('button');
    dot.className = 'patch-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Go to patch note ' + (i + 1));
    dot.addEventListener('click', function () { goTo(i); resetTimer(); });
    dotsEl.appendChild(dot);
  });

  // ── Navigation ───────────────────────────────────────────────────
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

  // Activate first card
  track.querySelectorAll('.patch-card')[0].classList.add('active');

  prevBtn.addEventListener('click', function () { goTo(current - 1); resetTimer(); });
  nextBtn.addEventListener('click', function () { goTo(current + 1); resetTimer(); });

  // ── Auto-advance every 6 s ───────────────────────────────────────
  function startTimer() {
    autoTimer = setInterval(function () { goTo(current + 1); }, 6000);
  }

  function resetTimer() {
    clearInterval(autoTimer);
    startTimer();
  }

  startTimer();

  // Pause on hover
  var slider = document.getElementById('patch-slider');
  slider.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
  slider.addEventListener('mouseleave', startTimer);

  // ── Helpers ──────────────────────────────────────────────────────
  function escStr(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

}());
