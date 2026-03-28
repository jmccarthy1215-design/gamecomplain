/**
 * Seed script — populates the database with realistic sample complaints.
 *
 * Usage:
 *   node server/seed.js           → skips if DB already has data
 *   node server/seed.js --force   → drops existing data and reseeds
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');

const FORCE = process.argv.includes('--force');

const SEED_COMPLAINTS = [
  // ── Fortnite ──────────────────────────────────────────────────────────────
  {
    game: 'Fortnite',
    title: 'Zero Build mode inflated sweat level in regular BR',
    description:
      'Since Epic made Zero Build permanent, the regular battle royale mode lost casual players to it. What remains are experienced builders with nothing to prove. Average lobby skill has jumped noticeably. New players trying to learn the full mode have no soft landing — they face veterans every game.',
    category: 'Stupid Mechanics',
    votes: 187
  },
  {
    game: 'Fortnite',
    title: 'Controller aim assist snaps to targets at close range',
    description:
      'Rotational aim assist on controller is effectively locking onto targets within 15 meters. Pro PC players have switched to controller just to compete in ranked. Multiple tournament organizers have flagged this. No meaningful rebalance has shipped despite Riot\'s promises.',
    category: 'Game Bugs',
    votes: 145
  },
  {
    game: 'Fortnite',
    title: 'Bot lobbies in Diamond and Champion ranks deflate skill',
    description:
      'High-ranked lobbies still include AI bots in the early game. Players farm easy bot eliminations to inflate RP and rank badges. The matchmaking pool for top-tier ranks is too small to fill lobbies, so bots pad numbers. Diamond and Champion ranks no longer represent genuine skill.',
    category: 'Matchmaking Issues',
    votes: 132
  },
  {
    game: 'Fortnite',
    title: 'Chapter 5 map drops FPS by 25% on mid-range hardware',
    description:
      'Since Chapter 5 launched, average frame rates on 1080p mid-range setups dropped 25–30%. The heavy foliage density and new dynamic lighting appear to be the cause. No performance optimization patch has shipped. Budget-hardware players are at a measurable disadvantage in competitive play.',
    category: 'Performance Issues',
    votes: 98
  },
  {
    game: 'Fortnite',
    title: 'Mythic item spawn randomization makes late game luck-based',
    description:
      'Mythic-tier items appear at one fixed location per match, but which location is randomized each game. Landing-spot mains who camp the same spot every match have a random chance of getting a game-deciding weapon. There is no counter-strategy. Late game becomes a coin flip on Mythic access.',
    category: 'Stupid Mechanics',
    votes: 76
  },

  // ── Call of Duty ──────────────────────────────────────────────────────────
  {
    game: 'Call of Duty',
    title: 'SBMM in casual playlists punishes average players',
    description:
      'Skill-based matchmaking in public lobbies places players against near-professional opponents after just a small win streak. A few good games triggers a lobby full of people with sub-100ms reaction times and optimized movement. Casual play feels like ranked without any reward. Player retention is visibly suffering.',
    category: 'Matchmaking Issues',
    votes: 224
  },
  {
    game: 'Call of Duty',
    title: 'Warzone is overrun by aimbots and wall hacks',
    description:
      'Multiple games per session feature at least one player with 100% headshot accuracy through walls at any range. Ricochet anti-cheat is not keeping pace with new injection methods. Hardware ID bans are being bypassed within hours via HWID spoofers. The competitive integrity of ranked Warzone is effectively gone.',
    category: 'Cheating / Exploits',
    votes: 198
  },
  {
    game: 'Call of Duty',
    title: 'MW3 maps are designed for camping, not movement',
    description:
      'Most MW3 maps feature long sightlines with minimal cover, rewarding stationary high-ground holds. Power positions are impossible to push without burning multiple utility charges. Movement-focused players are consistently punished. Map design philosophy has regressed compared to MW2019.',
    category: 'Stupid Mechanics',
    votes: 167
  },
  {
    game: 'Call of Duty',
    title: '20Hz server tick rate causes consistent netcode deaths',
    description:
      'Kill cams regularly show opponents landing shots while clearly behind cover. The 20Hz server tick rate is a documented limitation but competitors run at 60–128Hz. Packet loss during peak hours compounds the problem. Deaths behind cover are not edge cases — they are a regular occurrence.',
    category: 'Performance Issues',
    votes: 143
  },
  {
    game: 'Call of Duty',
    title: 'Core weapon blueprints hidden behind paid bundles',
    description:
      'Several weapon blueprints that improve visibility, recoil pattern perception, and barrel flash are locked behind paid store bundles or the premium Blackcell pass. The line between cosmetic and pay-to-win is being crossed. Players who cannot afford bundles are at a situational disadvantage.',
    category: 'Updates / Patches',
    votes: 112
  },

  // ── Minecraft ─────────────────────────────────────────────────────────────
  {
    game: 'Minecraft',
    title: 'Java and Bedrock parity is completely broken',
    description:
      'Java and Bedrock editions have diverged so far that cross-platform communities cannot share farms or tutorials. Redstone behaves differently, mob AI pathfinding differs, and water mechanics are inconsistent. Mojang has promised parity updates for years. Critical technical differences remain unaddressed while new features ship separately.',
    category: 'Stupid Mechanics',
    votes: 156
  },
  {
    game: 'Minecraft',
    title: 'The Warden spawns too easily and has no reliable counterplay',
    description:
      'Sculk shriekers in the Deep Dark trigger the Warden even with careful sneaking during routine exploration. The 3-summon threshold is crossed unintentionally before players realize the danger. The Warden deals 30 hearts of damage per hit on Hardcore — a death sentence with no sprint or attack to interrupt. Counterplay requires foreknowledge, not skill.',
    category: 'Broken Characters',
    votes: 134
  },
  {
    game: 'Minecraft',
    title: 'Chunk loading freezes large servers every 10–15 seconds',
    description:
      'On vanilla servers with 30+ players, chunk loading causes 2–5 second freezes every 10–15 seconds during travel. This has been a core Java Edition limitation for over a decade. Chunk loading remains single-threaded in the vanilla engine. No recent update has meaningfully addressed the performance ceiling.',
    category: 'Performance Issues',
    votes: 89
  },
  {
    game: 'Minecraft',
    title: '1.20 update silently broke automated farms',
    description:
      'The Trails and Tales update changed mob AI pathfinding without documentation in the patch notes. Villager crop farms, iron farms, and mob grinders using pre-1.20 designs now produce 60–90% less output. Millions of hours of player work were made obsolete by an undocumented change. This is not an acceptable way to ship an update.',
    category: 'Updates / Patches',
    votes: 78
  },
  {
    game: 'Minecraft',
    title: 'Smithing Template system adds tedium without depth',
    description:
      'The netherite upgrade Smithing Template introduced in 1.20 gates armor upgrades behind structure exploration RNG. Finding the required template in a bastion remnant is unpredictable and cannot be reliably targeted. The extra step adds friction to a core progression path with no interesting decision point attached.',
    category: 'Stupid Mechanics',
    votes: 67
  },

  // ── Valorant ──────────────────────────────────────────────────────────────
  {
    game: 'Valorant',
    title: 'Vanguard anti-cheat causes BSODs and boot failures',
    description:
      'Vanguard\'s kernel-level driver has caused blue screens and boot failures on a confirmed subset of PC hardware combinations. Riot has acknowledged isolated cases but no root cause patch has shipped. Players must grant kernel-level access with no opt-out. Uninstalling the game does not always fully remove the driver.',
    category: 'Game Bugs',
    votes: 201
  },
  {
    game: 'Valorant',
    title: 'Chamber remains S-tier despite repeated nerfs',
    description:
      'Chamber\'s Rendezvous anchor still enables aggressive off-angle plays with a guaranteed escape. Combined with Headhunter\'s near-operator damage at range, he punishes pushes without losing presence. His pick rate in professional EMEA and Americas play remains the highest of any sentinel after four consecutive nerf patches.',
    category: 'Broken Characters',
    votes: 176
  },
  {
    game: 'Valorant',
    title: 'Placement system drops returning players multiple ranks',
    description:
      'Returning players who missed one to two ranked seasons are placed 2–3 tiers below previous peak and immediately matched against players far above. The hidden MMR system is opaque and there is no way to understand or contest your placement. Returning players face a multi-week grind just to return to previous standing.',
    category: 'Matchmaking Issues',
    votes: 154
  },
  {
    game: 'Valorant',
    title: 'Smoke and molly spam drops FPS by 30–50%',
    description:
      'On maps with three sites like Haven, deploying multiple simultaneous smokes and molotovs causes 30–50% FPS drops on mid-range hardware. Competitive viability should not be gated by whether your GPU can handle ability spam. Agent compositions that use heavy utility systematically disadvantage players on non-high-end machines.',
    category: 'Performance Issues',
    votes: 118
  },
  {
    game: 'Valorant',
    title: 'Smurfing is rampant and detection is nonexistent',
    description:
      'High-ranked players creating fresh accounts to smurf in Bronze and Iron is destroying the new player experience. Accounts with under 10 games display professional-level movement and aim. Riot\'s smurf detection, if it exists, is not visibly acting on obvious cases. New players are abandoning the game before reaching meaningful rank.',
    category: 'Cheating / Exploits',
    votes: 95
  },

  // ── Apex Legends ──────────────────────────────────────────────────────────
  {
    game: 'Apex Legends',
    title: 'Horizon\'s passive makes her movement impossible to read',
    description:
      'Horizon\'s passive removes fall stagger, allowing her to exit Gravity Lift with full aim stability while opponents are forced to adjust. Combined with VTOL Jets, she has the highest mobility of any legend with no meaningful trade-off. Triple-Horizon compositions have dominated ALGS tournament meta for two consecutive splits.',
    category: 'Broken Characters',
    votes: 189
  },
  {
    game: 'Apex Legends',
    title: 'Server disconnects deduct RP and trigger abandon penalties',
    description:
      'EA servers regularly drop players mid-match during peak hours. The system registers this as intentional abandonment, issuing a ranked LP deduction and temporary matchmaking ban. This has affected thousands of players on Tokyo and Frankfurt servers. Support tickets citing server disconnects are systematically closed without manual review.',
    category: 'Matchmaking Issues',
    votes: 165
  },
  {
    game: 'Apex Legends',
    title: 'Kings Canyon server spikes to 200ms during third parties',
    description:
      'Kings Canyon consistently performs worst for server latency. During third-party fights and ring collapses, server calculations spike to 200ms+ causing rubber banding. Local hit markers show clean shots that are not registered server-side. This has been a known issue since Season 14 with no dedicated server infrastructure fix.',
    category: 'Performance Issues',
    votes: 142
  },
  {
    game: 'Apex Legends',
    title: 'Inside-geometry exploit on Olympus still not patched',
    description:
      'A specific corner near Fragment East on Olympus allows players to clip inside building geometry using a crouch-strafe input at the boundary. Players inside walls are invisible but can shoot outward. The exploit has appeared in compilation clips for six weeks. No hotfix has shipped despite the clip evidence being widely shared.',
    category: 'Cheating / Exploits',
    votes: 88
  },
  {
    game: 'Apex Legends',
    title: '30-30 Repeater dominates mid-range with no counter',
    description:
      'The 30-30 Repeater\'s ammo efficiency combined with the charged shot mechanic gives it superior damage-per-ammo over nearly every marksman rifle. At mid range it outperforms the G7 Scout in most scenarios without any meaningful trade-off. The Season 19 balance pass did not adjust it despite its widespread use in professional play.',
    category: 'Stupid Mechanics',
    votes: 73
  },

  // ── League of Legends ─────────────────────────────────────────────────────
  {
    game: 'League of Legends',
    title: 'Yasuo and Yone are unbalanced every single season',
    description:
      'Yasuo and Yone hold the highest ban rates across all ranks every season. Their kit design — persistent dashes, a massive passive shield, and knockup-triggered crowd control — makes them overtuned for one-tricks. Counterpick options exist but are insufficient in solo queue without coordinated play. The champion design creates a fundamentally unfair play pattern.',
    category: 'Broken Characters',
    votes: 312
  },
  {
    game: 'League of Legends',
    title: 'LP gain vs loss ratio is mathematically punishing',
    description:
      'At Platinum rank and above, winning awards 18–22 LP while losing deducts 20–24 LP. A 50% winrate produces a slow but consistent LP decrease. Riot\'s hidden MMR creates scenarios where players must maintain over 55% winrate just to hold rank. The system actively works against the median player and is not acknowledged in official communications.',
    category: 'Stupid Mechanics',
    votes: 278
  },
  {
    game: 'League of Legends',
    title: 'Smurfs and boosted accounts destroy low-elo ranked',
    description:
      'Bronze, Silver, and Gold lobbies are heavily contaminated by smurf accounts and recently boosted players. A smurf with 10 placement games regularly reaches Platinum in under 100 games. The detection system does not flag or demote these accounts at a rate that prevents damage to legitimate players\' climb. Low-elo ranked has lost its function as a learning environment.',
    category: 'Cheating / Exploits',
    votes: 234
  },
  {
    game: 'League of Legends',
    title: 'Durability Update extended average game time by 10 minutes',
    description:
      'Since the Durability Update, average game lengths increased by 8–12 minutes. Base stat increases made tanks unkillable in the mid-game, preventing assassins from closing out carries before scaling. Teamfights drag on past the point of skill expression. The macro pacing of the game has fundamentally shifted away from the pre-update standard.',
    category: 'Stupid Mechanics',
    votes: 187
  },
  {
    game: 'League of Legends',
    title: 'League client crashes at champion select every week',
    description:
      'The League of Legends client crashes at champion select at least once per week for most players since Patch 13.1. The crash triggers a Leaver Buster penalty even though it is a client-side failure. Riot has acknowledged "ongoing instability" but no root-cause fix has shipped in seven months. Players are being penalized for Riot\'s infrastructure failures.',
    category: 'Game Bugs',
    votes: 156
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const count = await Complaint.countDocuments();

    if (count > 0 && !FORCE) {
      console.log(`Database already has ${count} complaint(s). Skipping seed.`);
      console.log('Run with --force to drop existing data and reseed.');
    } else {
      if (FORCE && count > 0) {
        await Complaint.deleteMany({});
        console.log(`Cleared ${count} existing complaint(s).`);
      }
      await Complaint.insertMany(SEED_COMPLAINTS);
      console.log(`Seeded ${SEED_COMPLAINTS.length} sample complaints across 6 games.`);
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
