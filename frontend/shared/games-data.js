/**
 * shared/games-data.js
 * Per-game category and item suggestion data.
 * Used to power cascading dropdowns in the complaint form.
 * Load BEFORE app.js on any page that uses the complaint form.
 */
(function () {

  // ── Game metadata: categories → item suggestions ─────────────
  window.GAMES_DATA = {

    'Fortnite': {
      color: '#c084fc',
      page:  '/games/fortnite.html',
      categories: {
        'Weapons':             ['Assault Rifle', 'Pump Shotgun', 'Tac Shotgun', 'Heavy Sniper', 'SMG', 'Pistol', 'Grenade Launcher', 'Rocket Launcher', 'Mythic Weapon', 'Exotic Weapon', 'Shotgun', 'Bow'],
        'Mechanics':           ['Building', 'Zero Build', 'Storm Mechanics', 'Movement', 'Mantling', 'Vehicles', 'Fishing', 'Crafting System', 'Augments'],
        'Maps':                ['Current Map', 'Named Locations', 'Vault', 'OG Island', 'Chapter Layout', 'POI'],
        'Characters / Agents': ['Batman', 'Peter Griffin', 'Eminem', 'Lara Croft', 'Magneto', 'Marvel Collab', 'NPCs', 'Bosses'],
        'Matchmaking Issues':  ['SBMM', 'Ranked Mode', 'Queue Times', 'Server Issues', 'Lobby Balance'],
        'Performance Issues':  ['FPS Drops', 'Input Lag', 'Server Tick Rate', 'Mobile Performance', 'Load Times'],
        'Cheating / Exploits': ['Aimbots', 'Soft Aim', 'Easy Anti-Cheat', 'Exploit Abuse', 'Wall Glitch'],
        'Updates / Patches':   ['Item Vault', 'Item Unvault', 'Nerfs', 'Buffs', 'Season Changes', 'Balance Changes'],
        'Bugs / Glitches':     ['Visual Bug', 'Audio Bug', 'Collision Bug', 'Inventory Bug', 'Progress Loss'],
        'Ranked / Competitive':['FNCS', 'Cash Cups', 'Ranked Mode', 'Placement Rules', 'Ranked Points'],
        'Skins / Cosmetics':   ['Battle Pass', 'Item Shop Pricing', 'Collab Skin', 'FOMO Cosmetics', 'V-Bucks'],
        'Other':               []
      }
    },

    'Valorant': {
      color: '#FF4655',
      page:  '/games/valorant.html',
      categories: {
        'Characters / Agents': ['Jett', 'Neon', 'Raze', 'Reyna', 'Phoenix', 'Omen', 'Brimstone', 'Sage', 'Skye', 'Sova', 'Viper', 'Killjoy', 'Cypher', 'Breach', 'Clove', 'Yoru', 'Deadlock', 'Gekko', 'Fade', 'Harbor'],
        'Weapons':             ['Vandal', 'Phantom', 'Operator', 'Outlaw', 'Sheriff', 'Ghost', 'Shorty', 'Classic', 'Frenzy', 'Bulldog', 'Guardian'],
        'Maps':                ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Pearl', 'Sunset', 'Fracture', 'Breeze', 'Icebox', 'Abyss'],
        'Mechanics':           ['Abilities', 'Economy', 'Planting / Defusing', 'Movement', 'Peeking', 'Sage Wall', 'Utility'],
        'Matchmaking Issues':  ['Ranked Mode', 'SBMM', 'Smurf Accounts', 'Role Queue', 'RR Gains'],
        'Performance Issues':  ['FPS Drops', 'Input Lag', 'Server Issues', 'Vanguard Impact'],
        'Cheating / Exploits': ['Aimbots', 'Vanguard Issues', 'Script Injection', 'Lineups Exploit'],
        'Updates / Patches':   ['Agent Nerf', 'Weapon Buff', 'Map Changes', 'Economy Changes', 'Patch Notes'],
        'Bugs / Glitches':     ['Ability Bug', 'Visual Bug', 'Ranking Bug', 'Audio Bug', 'Clipping Bug'],
        'Ranked / Competitive':['Radiant', 'Immortal', 'Ascendant', 'RR System', 'Peak Rating', 'Placement'],
        'Skins / Cosmetics':   ['Bundle Pricing', 'Skin Variants', 'Night Market', 'Agent Contracts', 'Gun Buddy'],
        'Other':               []
      }
    },

    'Apex Legends': {
      color: '#e85d04',
      page:  '/games/apex-legends.html',
      categories: {
        'Characters / Agents': ['Wraith', 'Pathfinder', 'Octane', 'Lifeline', 'Gibraltar', 'Caustic', 'Bloodhound', 'Bangalore', 'Wattson', 'Crypto', 'Revenant', 'Loba', 'Rampart', 'Horizon', 'Fuse', 'Valkyrie', 'Seer', 'Ash', 'Newcastle', 'Catalyst', 'Ballistic', 'Conduit'],
        'Weapons':             ['R-301', 'Flatline', 'Havoc', 'Volt', 'R-99', 'Prowler', 'Peacekeeper', 'Eva-8', 'Mastiff', 'Wingman', 'Charge Rifle', 'Sentinel', 'Kraber', 'Bocek Bow', 'Hemlok', 'Spitfire'],
        'Maps':                ['Kings Canyon', 'World\'s Edge', 'Olympus', 'Storm Point', 'Broken Moon', 'E-District', 'Ring Placement'],
        'Mechanics':           ['Respawn System', 'Third-Partying', 'Ring Mechanics', 'Attachments', 'Loot Distribution', 'Ziplines'],
        'Matchmaking Issues':  ['Ranked Mode', 'RP System', 'SBMM', 'Predator Camping', 'Stacked Lobbies'],
        'Performance Issues':  ['FPS Drops', 'Server Lag', 'Input Lag', 'Console Performance', 'Hit Reg'],
        'Cheating / Exploits': ['Aimbots', 'Wallhacks', 'DDOS', 'Exploit Bugs'],
        'Updates / Patches':   ['Legend Nerf', 'Weapon Buff', 'Balance Changes', 'Collection Event'],
        'Bugs / Glitches':     ['Hit Registration', 'Ability Bug', 'Visual Bug', 'Soft Lock', 'Disconnect'],
        'Ranked / Competitive':['RP Gates', 'Ranked Split', 'Predator Rank', 'Masters', 'ALGS'],
        'Skins / Cosmetics':   ['Event Pricing', 'Apex Packs', 'Heirloom', 'Collection Event', 'Crafting Metal'],
        'Other':               []
      }
    },

    'League of Legends': {
      color: '#c89b3c',
      page:  '/games/league-of-legends.html',
      categories: {
        'Characters / Agents': ['Yasuo', 'Yone', 'Zed', 'Lee Sin', 'Darius', 'Vayne', 'Thresh', 'Jinx', 'Kai\'Sa', 'Katarina', 'Master Yi', 'Fizz', 'Irelia', 'Riven', 'Zoe', 'Viego', 'Akali', 'Caitlyn', 'Tristana'],
        'Weapons':             ['AD Itemization', 'AP Itemization', 'Support Items', 'Jungle Items', 'Tank Items', 'Mythic Items'],
        'Maps':                ['Summoner\'s Rift', 'ARAM', 'Baron Pit', 'Dragon Area', 'Jungle Camps', 'Objectives'],
        'Mechanics':           ['Jungle Clear', 'Tower Damage', 'Item Stats', 'Death Timers', 'Vision', 'Recall', 'Recalls'],
        'Matchmaking Issues':  ['MMR System', 'Autofill', 'Duo Queue', 'Ranked LP', 'Long Queue Times'],
        'Performance Issues':  ['FPS Issues', 'Server Lag', 'EUW Servers', 'Crash Bugs'],
        'Cheating / Exploits': ['Scripting', 'Smurfs', 'Boosting', 'Exploit Abuse'],
        'Updates / Patches':   ['Champion Nerf', 'Champion Buff', 'Item Changes', 'Preseason Changes'],
        'Bugs / Glitches':     ['Ability Bug', 'Pathing Bug', 'Hitbox Issue', 'Reconnect Bug'],
        'Ranked / Competitive':['Emerald Rank', 'Diamond', 'Challenger', 'LP Gains', 'Placement Matches'],
        'Skins / Cosmetics':   ['Prestige Skin', 'Ultimate Skin', 'Loot System', 'Hextech Crafting', 'Mythic Shop'],
        'Other':               []
      }
    },

    'Call of Duty': {
      color: '#78c5f7',
      page:  '/games/call-of-duty.html',
      categories: {
        'Weapons':             ['M4A1', 'AK-47', 'MP5', 'MP40', 'MP7', 'Sniper Rifle', 'Crossbow', 'Akimbo Pistols', 'Combat Shotgun'],
        'Mechanics':           ['Aim Assist', 'Slide Cancel', 'Bunny Hop', 'Perks System', 'Killstreaks', 'Loadout System'],
        'Maps':                ['Shipment', 'Rust', 'Highrise', 'Terminal', 'Crash', 'Dome'],
        'Characters / Agents': ['Operator Skins', 'Crossover Operators', 'Bundles'],
        'Matchmaking Issues':  ['SBMM', 'EOMM', 'Party Queue', 'Long Wait Times'],
        'Performance Issues':  ['Console Frame Rate', 'Server Tick Rate', 'Input Lag', 'Packet Loss'],
        'Cheating / Exploits': ['Aimbots', 'Wallhacks', 'Ricochet Anti-Cheat', 'Damage Exploits'],
        'Updates / Patches':   ['Weapon Nerf', 'Weapon Buff', 'Map Rotation', 'Balance Changes'],
        'Bugs / Glitches':     ['Out of Bounds', 'Audio Bug', 'Animation Bug', 'Progression Bug'],
        'Ranked / Competitive':['CDL Rules', 'Ranked Mode', 'Skill Rating', 'Placement Matches'],
        'Skins / Cosmetics':   ['Store Bundles', 'Operator Pricing', 'Battle Pass', 'Tracer Packs'],
        'Other':               []
      }
    },

    'Call of Duty: Warzone': {
      color: '#78c5f7',
      page:  '/games/call-of-duty-warzone.html',
      categories: {
        'Weapons':             ['Long-Range Meta', 'Close-Range Meta', 'Sniper Rifle', 'Assault Rifle', 'SMG', 'LMG'],
        'Mechanics':           ['Circle RNG', 'Buy Station', 'Gulag', 'Loadout Drop', 'Vehicles', 'Plunder Mode'],
        'Maps':                ['Al Mazrah', 'Urzikstan', 'Rebirth Island', 'Fortune\'s Keep', 'Verdansk'],
        'Matchmaking Issues':  ['SBMM', 'Solo Queue', 'Quad Fill', 'Lobby MMR'],
        'Performance Issues':  ['Console Frame Rate', 'Texture Streaming', 'Server Issues', 'PC Optimization'],
        'Cheating / Exploits': ['Aim Assist Abuse', 'Wallhacks', 'Ricochet Issues', 'Invisible Skins'],
        'Updates / Patches':   ['Weapon Nerf', 'Weapon Buff', 'Season Changes', 'Map Updates'],
        'Bugs / Glitches':     ['Revive Bug', 'Gas Mask Bug', 'Contract Bug', 'Out of Bounds'],
        'Ranked / Competitive':['Ranked Mode', 'SR System', 'CDL Packs', 'Tournaments'],
        'Other':               []
      }
    },

    'Call of Duty: Black Ops 6': {
      color: '#78c5f7',
      page:  '/games/call-of-duty-bo6.html',
      categories: {
        'Weapons':             ['Assault Rifles', 'SMGs', 'Shotguns', 'Sniper Rifles', 'LMGs', 'Pistols'],
        'Mechanics':           ['Omnimovement', 'Slide', 'Dive', 'Perks', 'Killstreaks', 'Field Upgrades'],
        'Maps':                ['Nuketown', 'Stakeout', 'Vault', 'Rewind', 'Babylon'],
        'Matchmaking Issues':  ['SBMM', 'Lobby Disbanding', 'Ping Issues', 'Ranked Queue'],
        'Performance Issues':  ['Console Optimization', 'Frame Rate', 'Input Lag', 'Server Tick'],
        'Cheating / Exploits': ['Aimbots', 'Wallhacks', 'Ricochet', 'Exploit Abuse'],
        'Updates / Patches':   ['Season Updates', 'Weapon Balancing', 'Prestige System', 'Map Pool'],
        'Bugs / Glitches':     ['Animation Bug', 'Sound Design', 'Hit Registration', 'Crash Bug'],
        'Ranked / Competitive':['Ranked Play', 'SR Gains', 'CDL Rules', 'Placement System'],
        'Other':               []
      }
    },

    'Call of Duty: Black Ops Cold War': {
      color: '#78c5f7',
      categories: {
        'Weapons':             ['AK-47', 'FFAR 1', 'MAC-10', 'DMR 14', 'LC10', 'C58', 'OTs 9'],
        'Mechanics':           ['Scorestreaks', 'Wildcard System', 'Gunfight', 'Zombies Mode', 'Perks'],
        'Maps':                ['Nuketown \'84', 'Checkmate', 'Garrison', 'Moscow', 'Armada'],
        'Matchmaking Issues':  ['SBMM', 'Crossplay', 'Party Issues'],
        'Performance Issues':  ['Console FPS', 'Packet Burst', 'Game Crashes'],
        'Updates / Patches':   ['Weapon Nerfs', 'Map Additions', 'Season Content'],
        'Bugs / Glitches':     ['Prestige Bug', 'Camo Bug', 'Progression Bug'],
        'Other':               []
      }
    },

    'Call of Duty: Modern Warfare II': {
      color: '#78c5f7',
      categories: {
        'Weapons':             ['M4', 'Kastov 762', 'PDSW 528', 'SP-X 80', 'Fennec 45', 'Vaznev-9K'],
        'Mechanics':           ['Perks 2.0', 'Gunsmith', 'DMZ Mode', 'Invasion Mode', 'Spec Ops'],
        'Maps':                ['Shipment', 'Farm 18', 'El Asilo', 'Taraq', 'Santa Sena Border'],
        'Matchmaking Issues':  ['SBMM', 'EOMM', 'Fill Issues', 'Hardcore Queue'],
        'Performance Issues':  ['Shader Compilation', 'Crashes', 'PC Optimization', 'Server Tick'],
        'Cheating / Exploits': ['Ricochet Anti-Cheat', 'Aim Exploit', 'Bunker Glitch'],
        'Updates / Patches':   ['Weapon Nerfs', 'Game Mode Changes', 'Seasonal Content'],
        'Bugs / Glitches':     ['Camo Bug', 'Progression Bug', 'Audio Bug'],
        'Other':               []
      }
    },

    'Minecraft': {
      color: '#69db7c',
      page:  '/games/minecraft.html',
      categories: {
        'Mechanics':           ['Combat System', 'Redstone', 'Crafting', 'Enchanting', 'Villager Trading', 'Farming', 'Elytra', 'Boats'],
        'Maps':                ['Overworld Generation', 'Nether', 'End Dimension', 'Cave Generation', 'Structure Spawning', 'Ocean'],
        'Characters / Agents': ['Enderman', 'Creeper', 'Skeleton', 'Zombie', 'Spider', 'Pillager', 'Warden', 'Phantom', 'Endermite'],
        'Performance Issues':  ['Java FPS', 'Bedrock FPS', 'Server TPS', 'Chunk Loading', 'Memory Leaks'],
        'Cheating / Exploits': ['Crystal PvP Exploits', 'Duplication Glitch', 'Server Griefing', 'X-Ray Texture Packs'],
        'Updates / Patches':   ['Java Updates', 'Bedrock Updates', 'Feature Parity', 'Snapshot Changes'],
        'Bugs / Glitches':     ['World Generation Bug', 'Inventory Bug', 'Multiplayer Desync', 'Entity Bug'],
        'Matchmaking Issues':  ['Server Browser', 'Bedrock Realms', 'Hypixel Issues', 'Queue Time'],
        'Other':               []
      }
    },

    'Counter-Strike 2': {
      color: '#e8b339',
      page:  '/games/counter-strike-2.html',
      categories: {
        'Weapons':             ['AK-47', 'M4A4', 'M4A1-S', 'AWP', 'Desert Eagle', 'Glock-18', 'P250', 'UMP-45', 'SG 553', 'AUG', 'FAMAS', 'Galil AR'],
        'Maps':                ['Mirage', 'Dust 2', 'Inferno', 'Nuke', 'Overpass', 'Ancient', 'Anubis', 'Vertigo'],
        'Mechanics':           ['Economy', 'Spray Patterns', 'Movement', 'Flashing', 'Utility', 'Buy Phase', 'Smokes'],
        'Characters / Agents': ['CT Agents', 'T Agents', 'Knife Skins'],
        'Matchmaking Issues':  ['Premier Mode', 'Faceit', 'Unranked Queue', 'Cheater Lobbies', 'Trust Factor'],
        'Performance Issues':  ['Subtick Issues', 'FPS Drops', 'Server Tick Rate', 'Input Lag'],
        'Cheating / Exploits': ['VAC Issues', 'Aimbots', 'Wallhacks', 'Overwatch', 'VAC Live'],
        'Updates / Patches':   ['Map Updates', 'Weapon Nerfs', 'Utility Changes', 'CS2 Migration'],
        'Bugs / Glitches':     ['Subtick Bug', 'Hit Registration', 'Sound Delay', 'Smoke Glitch'],
        'Ranked / Competitive':['Premier Rating', 'CS Rating', 'Majors', 'ESEA', 'Faceit Levels'],
        'Skins / Cosmetics':   ['Skin Market', 'Case Opening', 'Knife Skins', 'Sticker Capsules', 'Float Value'],
        'Other':               []
      }
    },

    'Rainbow Six Siege': {
      color: '#74c0fc',
      page:  '/games/rainbow-six-siege.html',
      categories: {
        'Characters / Agents': ['Ash', 'Thermite', 'Hibana', 'Thatcher', 'Twitch', 'Valkyrie', 'Echo', 'Pulse', 'Rook', 'Doc', 'Sledge', 'Bandit', 'Kapkan', 'Jäger', 'Vigil', 'Zero', 'Flores', 'Azami', 'Solis', 'Fenrir', 'Deimos'],
        'Mechanics':           ['Destruction', 'Drone Phase', 'Rappelling', 'Gadget Mechanics', 'Reinforcements', 'Barricades', 'Vertical Play'],
        'Maps':                ['Clubhouse', 'Bank', 'Chalet', 'Border', 'Villa', 'Kanal', 'Consulate', 'Outback', 'Coastline'],
        'Weapons':             ['AK-12', 'R4-C', '9x19VSN', 'MP5', 'ACOG Scope', 'Pistols', 'C75 Auto'],
        'Matchmaking Issues':  ['Ranked Mode', 'MMR System', 'Stack Abuse', 'Region Lock', 'Long Queue'],
        'Performance Issues':  ['FPS Drops', 'Server Lag', 'Hitbox Issues', 'Packet Loss'],
        'Cheating / Exploits': ['Wallhacks', 'Exterior Camping', 'Pixel Walk', 'BattlEye Issues'],
        'Updates / Patches':   ['Operator Nerf', 'Rework Updates', 'Map Rework', 'Meta Changes'],
        'Bugs / Glitches':     ['Hitbox Bug', 'Gadget Bug', 'Audio Bug', 'Animation Issue'],
        'Ranked / Competitive':['Pro League', 'Ranked Changes', 'Top Ranked Abuse', 'Seasonal Rank'],
        'Skins / Cosmetics':   ['Elite Skins', 'Battle Pass', 'Seasonal Bundles', 'Cosmetic Pricing'],
        'Other':               []
      }
    },

    'Rocket League': {
      color: '#4dabf7',
      page:  '/games/rocket-league.html',
      categories: {
        'Mechanics':           ['Aerial', 'Dribbling', 'Boost Management', 'Boost Stealing', 'Wavedash', 'Flip Reset', 'Fast Aerials', 'Wall Play', 'Ceiling Shot'],
        'Maps':                ['DFH Stadium', 'Mannfield', 'Urban Central', 'Wasteland', 'Forbidden Temple', 'Farmstead', 'Aquadome'],
        'Matchmaking Issues':  ['MMR System', 'Rank Reset', 'Placement Games', 'Extra Mode Ranks', 'Toxic Players'],
        'Performance Issues':  ['Frame Rate', 'Input Lag', 'Server Tick Rate', 'Packet Loss'],
        'Cheating / Exploits': ['Smurf Accounts', 'Boost Pad Exploits', 'Script Usage'],
        'Updates / Patches':   ['Car Hitbox Changes', 'Boost Changes', 'Season Updates', 'Mode Rotation'],
        'Bugs / Glitches':     ['Hitbox Issues', 'Freeze Bug', 'Disconnect Bug', 'Goalline Bug'],
        'Ranked / Competitive':['Champion / GC Rank', 'MMR Inflation', 'Tournament Mode', 'Rank Grinding'],
        'Skins / Cosmetics':   ['Blueprint System', 'Car Pricing', 'Rocket Pass', 'Trading', 'Credits'],
        'Other':               []
      }
    },

    'Clash Royale': {
      color: '#cc5de8',
      page:  '/games/clash-royale.html',
      categories: {
        'Characters / Agents': ['Barbarians', 'Giant', 'Witch', 'Wizard', 'PEKKA', 'Hog Rider', 'Mega Knight', 'Electro Giant', 'Goblin Giant', 'Royal Recruits', 'Skeleton King', 'Golden Knight', 'Archer Queen'],
        'Mechanics':           ['Elixir Economy', 'Tower HP', 'Cycle Speed', 'Bridge Spam', 'Counter Play', 'Card Levels'],
        'Maps':                ['Arena Layouts', 'Challenge Arenas', 'Special Events'],
        'Matchmaking Issues':  ['Trophy Road', 'Path of Legends', 'Pay-to-Win', 'King Tower Level', 'Matchmaking Balance'],
        'Performance Issues':  ['Mobile Lag', 'Server Disconnect', 'Connection Issues'],
        'Cheating / Exploits': ['Emulator Advantage', 'Bot Accounts', 'Exploit Abuse'],
        'Updates / Patches':   ['Card Nerf', 'Card Buff', 'Season Pass', 'Balance Changes'],
        'Bugs / Glitches':     ['Card Bug', 'Visual Bug', 'Connection Bug', 'Replay Bug'],
        'Ranked / Competitive':['Path of Legends', 'Ultimate Champion', 'CRL', 'King Level Advantage'],
        'Skins / Cosmetics':   ['Pass Royale', 'Tower Skins', 'Card Backs', 'Emotes', 'Shop Bundles'],
        'Other':               []
      }
    },

    'Clash of Clans': {
      color: '#ffd43b',
      page:  '/games/clash-of-clans.html',
      categories: {
        'Characters / Agents': ['Barbarian King', 'Archer Queen', 'Grand Warden', 'Royal Champion', 'Minion Prince', 'Giants', 'Goblins', 'Dragons', 'PEKKA', 'Valkyries', 'Bowlers', 'Electro Dragon'],
        'Mechanics':           ['Base Building', 'Farming', 'Trophy Pushing', 'War Strategy', 'Clan Capital', 'Builder Base', 'Hero Abilities'],
        'Maps':                ['Village Layout', 'Clan War League', 'Capital Peaks', 'Builder Hall'],
        'Matchmaking Issues':  ['War Matchmaking', 'Legend League', 'Multiplayer Trophy System', 'Scripted Attacks'],
        'Performance Issues':  ['Mobile Performance', 'App Crashes', 'Server Issues', 'Load Times'],
        'Cheating / Exploits': ['Modded APKs', 'Bot Farmers', 'Fake Donations', 'Server Exploits'],
        'Updates / Patches':   ['Troop Nerf', 'Building Changes', 'Season Pass', 'Balance Changes'],
        'Bugs / Glitches':     ['Attack Bug', 'Defense Bug', 'Resource Bug', 'Clan Castle Bug'],
        'Ranked / Competitive':['Legend League', 'Clan War League', 'CWL Points', 'Builder Legends'],
        'Skins / Cosmetics':   ['Hero Skins', 'Gold Pass', 'Season Challenges', 'Decorations'],
        'Other':               []
      }
    },

    'H1Z1': {
      color: '#69db7c',
      page:  '/games/h1z1.html',
      categories: {
        'Mechanics':           ['Zone Mechanics', 'Looting', 'Vehicles', 'Airdrop System', 'Base Building', 'Crafting', 'Combat Z1'],
        'Weapons':             ['AR-15', 'AK47', 'M1911', 'Shotgun', 'Crossbow', 'Melee Weapons', 'Throwables'],
        'Maps':                ['Z1 Map', 'Combat Zone', 'Battle Royale Arena'],
        'Matchmaking Issues':  ['Server Population', 'Queue Times', 'Region Lock'],
        'Performance Issues':  ['FPS Issues', 'Server Lag', 'Desync', 'Anti-Cheat Impact'],
        'Cheating / Exploits': ['Aimbots', 'Wallhacks', 'Duplication', 'Server Exploits'],
        'Updates / Patches':   ['Patch Stability', 'Feature Changes', 'Map Updates'],
        'Bugs / Glitches':     ['Desync Kills', 'Hit Registration', 'Vehicle Bug', 'Invisible Player'],
        'Other':               []
      }
    },

    'DayZ': {
      color: '#8bc34a',
      page:  '/games/dayz.html',
      categories: {
        'Mechanics':           ['Survival Mechanics', 'Hunger / Thirst', 'Medical System', 'Crafting', 'Base Building', 'Vehicle System', 'Stamina'],
        'Weapons':             ['AKM', 'M4A1', 'SKS', 'Shotgun', 'VSS Vintorez', 'Blaze 95', 'Melee Weapons', 'Suppressors'],
        'Maps':                ['Chernarus', 'Livonia', 'Namalsk', 'DeerIsle', 'Modded Maps'],
        'Matchmaking Issues':  ['Server Browser', 'Queue System', 'Official vs Community Servers'],
        'Performance Issues':  ['FPS Issues', 'Server Desync', 'Base Building Lag', 'Console Performance'],
        'Cheating / Exploits': ['Duplication Glitch', 'Ghosting', 'Wallhacks', 'Anti-Cheat Issues'],
        'Updates / Patches':   ['Stable vs Beta Branch', 'Patch Stability', 'Content Updates'],
        'Bugs / Glitches':     ['Desync Deaths', 'Hit Registration', 'Inventory Bug', 'Respawn Bug', 'Ladder Bug'],
        'Other':               []
      }
    }

  };

  // ── Helpers ───────────────────────────────────────────────────

  // Returns item suggestions for a game + category combo
  window.getItemSuggestions = function (game, category) {
    var gd = window.GAMES_DATA[game];
    if (!gd || !category) return [];
    return (gd.categories && gd.categories[category]) || [];
  };

  // Returns ordered category list for a game, or null if game not found
  window.getGameCategories = function (game) {
    var gd = window.GAMES_DATA[game];
    if (!gd) return null;
    return Object.keys(gd.categories);
  };

}());
