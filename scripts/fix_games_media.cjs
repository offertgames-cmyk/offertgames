const fs = require('fs');
const path = require('path');

const gamesPath = path.resolve(__dirname, '../src/data/gamesData.json');
const rawData = fs.readFileSync(gamesPath, 'utf8');
const games = JSON.parse(rawData);

console.log(`Starting media audit and fix for ${games.length} games...`);

// Helper to sanitize screenshots
function getCleanScreenshots(game, fetchedScreenshots = []) {
  const appId = String(game.steamAppId);
  const cleanList = [];

  // First add fetched real screenshots from Steam API if any
  if (fetchedScreenshots && fetchedScreenshots.length > 0) {
    fetchedScreenshots.forEach(s => {
      if (s && s.includes(appId) && !cleanList.includes(s)) {
        cleanList.push(s);
      }
    });
  }

  // Next add existing screenshots that legitimately belong to this appId
  if (Array.isArray(game.screenshots)) {
    game.screenshots.forEach(s => {
      if (typeof s === 'string' && s.includes(appId) && !cleanList.includes(s)) {
        cleanList.push(s);
      }
    });
  }

  // Ensure high quality steam asset URLs
  const cdnAssets = [
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`,
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/page_bg_generated_v6b.jpg`,
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`
  ];

  cdnAssets.forEach(asset => {
    if (!cleanList.includes(asset)) {
      cleanList.push(asset);
    }
  });

  return cleanList;
}

// Helper to get clean videos
function getCleanVideos(game, fetchedMovies = []) {
  const appId = String(game.steamAppId);
  const cleanVideos = [];

  // If Steam API returned movies, use them!
  if (fetchedMovies && fetchedMovies.length > 0) {
    fetchedMovies.forEach(m => {
      const vidUrl = m.hls_h264 || m.mp4?.max || m.mp4?.['480'] || m.webm?.max || '';
      if (vidUrl) {
        cleanVideos.push({
          id: `v-steam-${game.steamAppId}-${m.id}`,
          title: `${game.title} - ${m.name || 'Tráiler Oficial'}`,
          videoUrl: vidUrl,
          thumbnail: m.thumbnail || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
          type: 'trailer'
        });
      }
    });
  }

  // If it's Elden Ring itself, keep existing Elden Ring trailer
  if (appId === '1245620') {
    if (Array.isArray(game.videos) && game.videos.length > 0) {
      return game.videos;
    }
  }

  // If existing videos belong to THIS game's appId and do NOT contain 1245620 (unless Elden Ring)
  if (cleanVideos.length === 0 && Array.isArray(game.videos)) {
    game.videos.forEach(v => {
      if (v && v.videoUrl && (v.videoUrl.includes(`/${appId}/`) || v.videoUrl.includes('youtube'))) {
        if (!v.videoUrl.includes('1245620') || appId === '1245620') {
          cleanVideos.push({
            ...v,
            title: v.title.includes(game.title) ? v.title : `${game.title} - Tráiler Oficial`
          });
        }
      }
    });
  }

  // Fallback: Official YouTube Trailer search embed for this specific game
  if (cleanVideos.length === 0) {
    cleanVideos.push({
      id: `v-yt-${game.steamAppId}`,
      title: `${game.title} - Tráiler Oficial`,
      videoUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(game.title + ' official trailer')}`,
      thumbnail: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
      type: 'trailer'
    });
  }

  return cleanVideos;
}

async function run() {
  let cleanedScreenshots = 0;
  let cleanedVideos = 0;
  let fixedHeroes = 0;

  // Cache of fetched Steam details to avoid re-fetching
  const cachePath = path.resolve(__dirname, 'steam_media_cache.json');
  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {}
  }

  // Priority games to fetch from Steam API (top 150 most played/popular games)
  const priorityGames = games.filter(g => 
    g.ratingCount > 5000 || 
    g.discountPercent >= 80 || 
    g.title.toLowerCase().includes('far cry') ||
    g.title.toLowerCase().includes('cyberpunk') ||
    g.title.toLowerCase().includes('witcher') ||
    g.title.toLowerCase().includes('gta') ||
    g.title.toLowerCase().includes('baldurs') ||
    g.title.toLowerCase().includes('assassin') ||
    g.title.toLowerCase().includes('resident evil') ||
    g.title.toLowerCase().includes('red dead')
  ).slice(0, 150);

  console.log(`Fetching live Steam media for ${priorityGames.length} priority titles...`);

  for (let i = 0; i < priorityGames.length; i++) {
    const g = priorityGames[i];
    const appId = String(g.steamAppId);
    if (!cache[appId]) {
      try {
        const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=spanish`);
        if (res.status === 200) {
          const json = await res.json();
          if (json[appId]?.success && json[appId]?.data) {
            const data = json[appId].data;
            cache[appId] = {
              name: data.name,
              movies: (data.movies || []).map(m => ({
                id: m.id,
                name: m.name,
                thumbnail: m.thumbnail,
                hls_h264: m.hls_h264,
                mp4: m.mp4,
                webm: m.webm
              })),
              screenshots: (data.screenshots || []).map(s => s.path_full)
            };
            process.stdout.write(`+`);
          } else {
            process.stdout.write(`-`);
          }
        } else if (res.status === 429) {
          console.log(`\nRate limit hit at index ${i}, continuing with cache and resilient fallbacks...`);
          break;
        }
      } catch (err) {
        process.stdout.write(`x`);
      }
      await new Promise(r => setTimeout(r, 120));
    }
  }

  // Save updated cache
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nSteam media cache updated with ${Object.keys(cache).length} entries.`);

  // Audit and update all 3,050 games
  const updatedGames = games.map((game, idx) => {
    const appId = String(game.steamAppId);
    const cachedData = cache[appId];

    // 1. Hero Image
    let hero = game.heroImage;
    if (!hero || !hero.includes(appId)) {
      hero = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
      fixedHeroes++;
    }

    // 2. Cover Image
    const cover = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`;

    // 3. Screenshots
    const oldScreensCount = game.screenshots?.length || 0;
    const cleanScreens = getCleanScreenshots(game, cachedData?.screenshots);
    if (JSON.stringify(cleanScreens) !== JSON.stringify(game.screenshots)) {
      cleanedScreenshots++;
    }

    // 4. Videos
    const hadFakeVideo = game.videos?.some(v => v.videoUrl && v.videoUrl.includes('1245620') && appId !== '1245620');
    const cleanVids = getCleanVideos(game, cachedData?.movies);
    if (hadFakeVideo || JSON.stringify(cleanVids) !== JSON.stringify(game.videos)) {
      cleanedVideos++;
    }

    return {
      ...game,
      coverImage: cover,
      heroImage: hero,
      screenshots: cleanScreens,
      videos: cleanVids
    };
  });

  fs.writeFileSync(gamesPath, JSON.stringify(updatedGames, null, 2), 'utf8');

  console.log(`\nAUDIT & FIX COMPLETED:`);
  console.log(`- Fixed Heroes: ${fixedHeroes}`);
  console.log(`- Cleaned Screenshots: ${cleanedScreenshots}`);
  console.log(`- Cleaned Videos: ${cleanedVideos}`);
  console.log(`- Total Games: ${updatedGames.length}`);

  // Verification
  const badVids = updatedGames.filter(g => g.steamAppId !== 1245620 && g.videos?.some(v => v.videoUrl?.includes('1245620')));
  console.log(`- Remaining non-Elden-Ring games with Elden Ring video: ${badVids.length} (MUST BE 0)`);
}

run();
