const fs = require('fs');
const path = require('path');
const https = require('https');

const dbPath = path.join(__dirname, '../src/data/gamesDatabase.ts');

function checkHttp(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'HEAD',
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', () => resolve(500));
      req.on('timeout', () => { req.destroy(); resolve(408); });
      req.end();
    } catch {
      resolve(400);
    }
  });
}

async function fetchRealSteamApps(query) {
  return new Promise((resolve) => {
    https.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=spanish&cc=es`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.items || []);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function main() {
  console.log('Loading gamesDatabase.ts...');
  const fileContent = fs.readFileSync(dbPath, 'utf8');
  const match = fileContent.match(/export const INITIAL_GAMES: Game\[\] = (\[[\s\S]*?\]);\s*export/);
  if (!match) {
    console.error('Failed to parse INITIAL_GAMES');
    process.exit(1);
  }

  let games = JSON.parse(match[1]);
  console.log(`Current games count: ${games.length}`);

  const verifiedGames = [];
  const brokenGames = [];

  console.log('Verifying all covers one by one...');

  const batchSize = 15;
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    await Promise.all(batch.map(async (game) => {
      const capsuleUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId}/capsule_616x353.jpg`;
      const headerUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId}/header.jpg`;

      let status = await checkHttp(capsuleUrl);
      if (status === 200) {
        game.coverImage = capsuleUrl;
        verifiedGames.push(game);
        return;
      }

      status = await checkHttp(headerUrl);
      if (status === 200) {
        game.coverImage = headerUrl;
        verifiedGames.push(game);
        return;
      }

      console.log(`Broken game: [${game.steamAppId}] ${game.title} (status: ${status})`);
      brokenGames.push(game);
    }));

    process.stdout.write(`Verified ${Math.min(i + batchSize, games.length)} / ${games.length} games...\r`);
  }

  console.log(`\nVerification finished:`);
  console.log(`- Verified OK (200): ${verifiedGames.length}`);
  console.log(`- Broken (404/Err): ${brokenGames.length}`);

  if (brokenGames.length > 0 || verifiedGames.length < 320) {
    console.log('Fetching replacement blockbuster games from Steam to reach 350+ verified games...');
    const searchTerms = [
      'final fantasy', 'dragon quest', 'monster hunter', 'resident evil', 'devil may cry',
      'yakuza', 'persona', 'sonic', 'tomb raider', 'deus ex', 'dishonored', 'prey',
      'wolfenstein', 'fallout', 'elder scrolls', 'doom', 'quake', 'borderlands', 'bioshock',
      'mafia', 'civilization', 'xcom', 'batman', 'lego', 'hitman', 'payday', 'sniper',
      'metro', 'stalker', 'dead island', 'dying light', 'alan wake', 'control', 'quantum break',
      'street fighter', 'tekken', 'mortal kombat', 'guilty gear', 'soulcalibur', 'dragon ball',
      'naruto', 'one piece', 'attack on titan', 'nier', 'tales of', 'atelier', 'valkyria',
      'assassin', 'far cry', 'watch dogs', 'ghost recon', 'splinter cell', 'rainbow six',
      'for honor', 'the crew', 'rayman', 'prince of persia', 'south park', 'trackmania',
      'forza', 'gears of war', 'halo', 'fable', 'age of empires', 'state of decay',
      'ori', 'psychonauts', 'wasteland', 'hellblade', 'grounded', 'sea of thieves',
      'god of war', 'spider-man', 'horizon', 'uncharted', 'the last of us', 'ghost of tsushima',
      'days gone', 'death stranding', 'returnal', 'sackboy', 'ratchet', 'helldivers'
    ];

    const existingIds = new Set(verifiedGames.map(g => g.steamAppId));

    for (const term of searchTerms) {
      if (verifiedGames.length >= 350) break;
      const results = await fetchRealSteamApps(term);
      for (const item of results) {
        if (verifiedGames.length >= 350) break;
        if (item.type !== 'app' || existingIds.has(item.id)) continue;

        const capUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/capsule_616x353.jpg`;
        const headUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`;
        
        let cover = '';
        let st = await checkHttp(capUrl);
        if (st === 200) {
          cover = capUrl;
        } else {
          st = await checkHttp(headUrl);
          if (st === 200) cover = headUrl;
        }

        if (!cover) continue;

        existingIds.add(item.id);
        const origPrice = item.price?.initial ? item.price.initial / 100 : (item.price?.final ? (item.price.final / 100) * 1.5 : 49.99);
        const currPrice = item.price?.final ? item.price.final / 100 : Number((origPrice * 0.5).toFixed(2));
        const discPercent = item.price?.discount_percent ? item.price.discount_percent : Math.round(((origPrice - currPrice) / origPrice) * 100) || 50;

        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const newGame = {
          id: `game-steam-${item.id}`,
          steamAppId: item.id,
          title: item.name,
          slug: slug,
          originalPrice: Number(origPrice.toFixed(2)),
          currentPrice: Number(currPrice.toFixed(2)),
          discountPercent: discPercent,
          platforms: ["PC", "PlayStation", "Xbox"],
          categories: ["Acción", "Aventura"],
          rating: 4.7,
          ratingCount: Math.floor(Math.random() * 50000) + 5000,
          description: `${item.name} ofrece una experiencia inmersiva con gráficos de última generación y emocionante jugabilidad.`,
          coverImage: cover,
          screenshots: [],
          videos: [],
          stores: [
            {
              storeName: "Steam",
              originalPrice: Number(origPrice.toFixed(2)),
              currentPrice: Number(currPrice.toFixed(2)),
              discountPercent: discPercent,
              url: `https://store.steampowered.com/app/${item.id}/`,
              isBest: true
            },
            {
              storeName: "Epic Games",
              originalPrice: Number(origPrice.toFixed(2)),
              currentPrice: Number((currPrice * 1.05).toFixed(2)),
              discountPercent: Math.max(0, discPercent - 5),
              url: "https://store.epicgames.com/"
            },
            {
              storeName: "GOG",
              originalPrice: Number(origPrice.toFixed(2)),
              currentPrice: Number((currPrice * 1.08).toFixed(2)),
              discountPercent: Math.max(0, discPercent - 8),
              url: "https://www.gog.com/"
            },
            {
              storeName: "Amazon",
              originalPrice: Number(origPrice.toFixed(2)),
              currentPrice: Number((currPrice * 1.1).toFixed(2)),
              discountPercent: Math.max(0, discPercent - 10),
              url: "https://www.amazon.es/dp/videojuegos"
            },
            {
              storeName: "PlayStation Store",
              originalPrice: Number(origPrice.toFixed(2)),
              currentPrice: Number(currPrice.toFixed(2)),
              discountPercent: discPercent,
              url: "https://store.playstation.com/"
            }
          ],
          reviews: []
        };

        verifiedGames.push(newGame);
        console.log(`+ Added verified game: [${item.id}] ${item.name}`);
      }
    }
  }

  // Ensure priority games like Elden Ring, Witcher 3, Hogwarts Legacy, RDR2, Baldurs Gate 3 have pristine cover and hero/featured flags
  verifiedGames.forEach(g => {
    if (g.slug.includes('elden-ring') && g.steamAppId === 1245620) {
      g.coverImage = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/capsule_616x353.jpg';
      g.isFeatured = true;
    }
    if (g.slug.includes('witcher-3') && g.steamAppId === 292030) {
      g.coverImage = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/capsule_616x353.jpg';
      g.isHero = true;
      g.isFeatured = true;
    }
    if (g.slug.includes('hogwarts-legacy') && g.steamAppId === 990080) {
      g.coverImage = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/990080/capsule_616x353.jpg';
      g.isFeatured = true;
    }
    if (g.slug.includes('red-dead') && g.steamAppId === 1174180) {
      g.coverImage = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/capsule_616x353.jpg';
      g.isFeatured = true;
    }
    if (g.slug.includes('baldur') && g.steamAppId === 1086940) {
      g.coverImage = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/capsule_616x353.jpg';
      g.isFeatured = true;
    }
  });

  console.log(`Writing ${verifiedGames.length} verified games to ${dbPath}...`);

  const restOfFile = fileContent.substring(fileContent.indexOf('export const INITIAL_POSTS: CommunityPost[]'));
  const headerPart = fileContent.substring(0, fileContent.indexOf('export const INITIAL_GAMES: Game[]'));

  const newContent = `${headerPart}export const INITIAL_GAMES: Game[] = ${JSON.stringify(verifiedGames, null, 2)};\n\n${restOfFile}`;

  fs.writeFileSync(dbPath, newContent, 'utf8');
  console.log('Successfully updated gamesDatabase.ts with 100% verified covers!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
