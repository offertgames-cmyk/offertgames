const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/gamesDatabase.ts');

async function fetchSteamData(appId) {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=es`);
    if (!res.ok) return null;
    const json = await res.json();
    const app = Object.values(json)[0]?.data;
    if (!app) return null;

    const screenshots = (app.screenshots || []).map(s => s.path_full);
    const videos = (app.movies || []).map(m => ({
      id: `steam-vid-${m.id}`,
      title: m.name || 'Tráiler Oficial',
      videoUrl: m.hls_h264 || m.dash_h264 || m.mp4?.max || m.mp4?.['480'] || '',
      thumbnail: m.thumbnail || app.header_image,
      type: 'trailer'
    }));

    return {
      screenshots,
      videos,
      header_image: app.header_image
    };
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log('Reading gamesDatabase.ts...');
  let content = fs.readFileSync(dbPath, 'utf8');

  // App IDs to update directly
  const keyAppIds = [
    292030, // Witcher 3
    1245620, // Elden Ring
    990080, // Hogwarts Legacy
    1174180, // RDR 2
    1086940, // BG 3
    1091500, // Cyberpunk 2077
    1716740, // Starfield
    2195250, // FC 24
    1145360, // Hades
    271590, // GTA V
    2050650, // RE 4 Remake
    582010, // Monster Hunter World
    1817070, // Spider-Man
    367520, // Hollow Knight
    1551360, // Forza 5
    814380, // Sekiro
    374320, // Dark Souls 3
    782330, // Doom Eternal
    1687950, // Persona 5
    1593500, // God of War
    1151640, // Horizon Zero Dawn
    1172620, // Sea of Thieves
    588650, // Dead Cells
    264710, // Subnautica
    252490, // Rust
    255710, // Cities Skylines
    377160, // Fallout 4
    489830, // Skyrim
    105600, // Terraria
    275850, // No Mans Sky
    397540, // Borderlands 3
    870780, // Control
    2215430, // Ghost of Tsushima
    1627720, // Lies of P
    1196590, // RE Village
    1850570, // Death Stranding
    646570, // Slay the Spire
    1057090, // Ori
    504230, // Celeste
    632470, // Disco Elysium
    1462040 // FF7 Remake
  ];

  console.log('Fetching live media for', keyAppIds.length, 'key games from Steam...');
  const mediaMap = {};

  for (const id of keyAppIds) {
    process.stdout.write(`Fetching ${id}... `);
    const data = await fetchSteamData(id);
    if (data) {
      mediaMap[id] = data;
      console.log(`OK (${data.screenshots.length} shots, ${data.videos.length} videos)`);
    } else {
      console.log('Skipped');
    }
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 200));
  }

  // Parse INITIAL_GAMES from content
  const startMarker = 'export const INITIAL_GAMES: Game[] = ';
  const endMarker = ';\n\nexport const INITIAL_POSTS';

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const jsonStr = content.substring(startIndex + startMarker.length, endIndex);
    const games = JSON.parse(jsonStr);

    let updatedCount = 0;
    for (const g of games) {
      if (g.steamAppId && mediaMap[g.steamAppId]) {
        const live = mediaMap[g.steamAppId];
        if (live.screenshots && live.screenshots.length > 0) {
          g.screenshots = live.screenshots;
        }
        if (live.videos && live.videos.length > 0) {
          g.videos = live.videos;
        }
        if (live.header_image) {
          g.coverImage = live.header_image;
        }
        updatedCount++;
      } else if (!g.screenshots || g.screenshots.length === 0 || g.screenshots[0].includes('ss_')) {
        // Fallback to high quality unsplash if it had fake ss_ hashes
        g.screenshots = [
          g.coverImage,
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80'
        ];
      }
    }

    console.log(`Updated ${updatedCount} games with real Steam live media!`);

    const newContent = content.substring(0, startIndex + startMarker.length) +
      JSON.stringify(games, null, 2) +
      content.substring(endIndex);

    fs.writeFileSync(dbPath, newContent);
    console.log('Successfully saved gamesDatabase.ts with real media!');
  }
}

run();
