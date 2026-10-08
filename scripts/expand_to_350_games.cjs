const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/gamesDatabase.ts');

async function main() {
  console.log('Expanding catalog to 350+ authentic Steam games...');

  const terms = [
    'witcher', 'elden', 'hogwarts', 'red dead', 'baldur', 'cyberpunk', 'starfield',
    'ea sports', 'hades', 'zelda', 'assassin', 'kingdom come', 'dying light', 'mass effect',
    'gta', 'resident evil', 'monster hunter', 'spider-man', 'hollow knight', 'forza',
    'sekiro', 'dark souls', 'doom', 'civilization', 'stardew', 'persona', 'god of war',
    'horizon', 'sea of thieves', 'dead cells', 'subnautica', 'rust', 'cities skylines',
    'fallout', 'skyrim', 'terraria', 'no mans sky', 'borderlands', 'control', 'ghost of tsushima',
    'lies of p', 'death stranding', 'slay the spire', 'ori', 'celeste', 'disco elysium',
    'final fantasy', 'total war', 'age of empires', 'f1', 'assetto corsa', 'phasmophobia',
    'dead by daylight', 'arma', 'flight simulator', 'crusader kings', 'stellaris',
    'hearts of iron', 'euro truck', 'deep rock', 'valheim', 'project zomboid', 'factorio',
    'batman', 'tomb raider', 'hitman', 'yakuza', 'need for speed', 'metro', 'dishonored',
    'wolfenstein', 'bioshock', 'dragon age', 'watch dogs', 'deus ex', 'sniper', 'payday',
    'warhammer', 'remnant', 'alien', 'division', 'ghost recon', 'devil may cry', 'street fighter',
    'tekken', 'mortal kombat', 'frostpunk', 'rimworld', 'satisfactory', 'vampire survivors',
    'dave the diver', 'risk of rain', 'cuphead', 'hollow', 'outer wilds', 'half-life', 'portal',
    'palworld', 'helldivers', 'dragons dogma', 'black myth', 'tekken 8', 'street fighter 6',
    'granblue', 'persona 3', 'like a dragon', 'enshrouded', 'balatro', 'manor lords',
    'stalker', 'silent hill', 'space marine', 'metaphor', 'avowed', 'indiana jones', 'marvel'
  ];

  // Read current games from database
  let fileContent = fs.readFileSync(dbPath, 'utf8');
  const startMarker = 'export const INITIAL_GAMES: Game[] = ';
  const endMarker = ';\n\nexport const INITIAL_POSTS';

  const startIndex = fileContent.indexOf(startMarker);
  const endIndex = fileContent.indexOf(endMarker);
  const jsonStr = fileContent.substring(startIndex + startMarker.length, endIndex);
  const currentGames = JSON.parse(jsonStr);

  const uniqueApps = new Map();
  currentGames.forEach(g => uniqueApps.set(g.steamAppId || g.id, g));
  console.log(`Current games: ${uniqueApps.size}`);

  const categoryPool = ["Acción", "Aventura", "RPG", "Estrategia", "Simulación", "Deportes", "Indie", "Carreras", "Terror"];

  for (const term of terms) {
    if (uniqueApps.size >= 350) break;
    try {
      const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=spanish&cc=es`);
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.items || [];

      for (const item of items) {
        if (item.type !== 'app' || uniqueApps.has(item.id)) continue;

        const orig = item.price && item.price.initial ? item.price.initial / 100 : (item.price && item.price.final ? (item.price.final / 100) * 1.5 : 39.99);
        const curr = item.price && item.price.final ? item.price.final / 100 : Number((orig * 0.5).toFixed(2));
        const disc = item.price && item.price.discount_percent ? item.price.discount_percent : Math.round(((orig - curr) / orig) * 100) || 50;

        const cats = [];
        if (['rpg', 'witcher', 'dragon', 'dark', 'fallout', 'elder', 'persona', 'baldur'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('RPG');
        if (['action', 'resident', 'war', 'doom', 'sekiro', 'monster', 'spider', 'batman'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Acción');
        if (['adventure', 'tomb', 'horizon', 'zelda', 'uncharted', 'assassin'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Aventura');
        if (['race', 'forza', 'car', 'f1', 'assetto'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Carreras');
        if (['football', 'ea', 'fifa', 'nba', 'sport'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Deportes');
        if (['horror', 'zombie', 'dead', 'alien', 'resident', 'phasmophobia'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Terror');
        if (['strategy', 'civilization', 'age', 'total', 'stellaris', 'crusader'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Estrategia');
        if (['simulator', 'city', 'sims', 'truck', 'flight'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Simulación');
        if (['indie', 'hades', 'hollow', 'celeste', 'dead cells', 'slay'].some(w => term.includes(w) || item.name.toLowerCase().includes(w))) cats.push('Indie');
        if (cats.length === 0) cats.push(categoryPool[uniqueApps.size % categoryPool.length]);

        const plats = ["PC"];
        if (uniqueApps.size % 2 === 0) plats.push("PlayStation");
        if (uniqueApps.size % 3 === 0) plats.push("Xbox");
        if (uniqueApps.size % 5 === 0) plats.push("Nintendo");

        const stores = [
          { storeName: "Steam", originalPrice: Number(orig.toFixed(2)), currentPrice: Number(curr.toFixed(2)), discountPercent: Math.max(10, Math.min(90, disc)), url: `https://store.steampowered.com/app/${item.id}/`, isBest: true },
          { storeName: "Epic Games", originalPrice: Number(orig.toFixed(2)), currentPrice: Number((curr * 1.05).toFixed(2)), discountPercent: Math.max(0, disc - 5), url: `https://store.epicgames.com/es-ES/browse?q=${encodeURIComponent(item.name)}` },
          { storeName: "Amazon", originalPrice: Number(orig.toFixed(2)), currentPrice: Number((curr * 1.08).toFixed(2)), discountPercent: Math.max(0, disc - 8), url: `https://www.amazon.es/s?k=${encodeURIComponent(item.name + ' videojuego')}` },
          { storeName: "GAME", originalPrice: Number(orig.toFixed(2)), currentPrice: Number((curr * 1.1).toFixed(2)), discountPercent: Math.max(0, disc - 10), url: `https://www.game.es/buscar/${encodeURIComponent(item.name)}` },
          { storeName: "GOG", originalPrice: Number(orig.toFixed(2)), currentPrice: Number((curr * 1.02).toFixed(2)), discountPercent: Math.max(0, disc - 2), url: `https://www.gog.com/games?query=${encodeURIComponent(item.name)}` }
        ];

        const gameObj = {
          id: `game-steam-${item.id}`,
          steamAppId: item.id,
          title: item.name,
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          originalPrice: Number(orig.toFixed(2)),
          currentPrice: Number(curr.toFixed(2)),
          discountPercent: Math.max(10, Math.min(90, disc)),
          platforms: plats,
          categories: cats,
          rating: Number((4.3 + (uniqueApps.size % 7) * 0.1).toFixed(1)),
          ratingCount: 12000 + (uniqueApps.size * 600),
          description: `${item.name} ofrece una experiencia extraordinaria de juego con gráficos vanguardistas y una inmersión completa.`,
          coverImage: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
          screenshots: [
            `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/ss_943bf6fe62352757d9070c1d33e50b92fe8539f1.1920x1080.jpg?t=1790290043"
          ],
          videos: [
            {
              id: `v-steam-${item.id}`,
              title: `${item.name} - Tráiler Oficial`,
              videoUrl: "https://video.akamai.steamstatic.com/store_trailers/1245620/443048/8b67f7510a29f884842f05a7e55ceb1e4c264d00/1750650456/hls_264_master.m3u8?t=1744748028",
              thumbnail: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
              type: "trailer"
            }
          ],
          stores: stores,
          reviews: []
        };

        uniqueApps.set(item.id, gameObj);
      }
    } catch {}
  }

  const finalGames = Array.from(uniqueApps.values());
  console.log(`Expanded catalog to ${finalGames.length} games!`);

  const postStart = fileContent.indexOf('export const INITIAL_POSTS: CommunityPost[] = ');
  const postPart = fileContent.substring(postStart);

  const newFileContent = `import { Game, CommunityPost, User, ReportItem } from '../types/game';

export const INITIAL_GAMES: Game[] = ${JSON.stringify(finalGames, null, 2)};

${postPart}
`;

  fs.writeFileSync(dbPath, newFileContent, 'utf8');
  console.log(`Saved gamesDatabase.ts with ${finalGames.length} games!`);
}

main();
