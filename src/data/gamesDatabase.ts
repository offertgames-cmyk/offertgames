import { Game, CommunityPost, User, ReportItem } from '../types/game';
import rawGames from './gamesData.json';

export const INITIAL_GAMES: Game[] = rawGames as Game[];

export const INITIAL_POSTS: CommunityPost[] = [];


export const INITIAL_USERS: User[] = [];

export const INITIAL_REPORTS: ReportItem[] = [];

export const HERO_GAME: Game = INITIAL_GAMES[0];

export const FEATURED_GAMES: Game[] = INITIAL_GAMES.slice(1, 5);


