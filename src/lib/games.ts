// src/lib/games.ts
// Which repo each game's data lives in.
// The repo names are private so they come out of .env.local, not from here.

export type GameId = 'aos' | '40k' | 'tow';

export function getGame(game: GameId) {
  if (game == 'aos') {
    return {
      label: 'Age of Sigmar',
      repo: getRepoName('DATA_REPO_AOS'),
      branch: 'master',
      extractRoot: 'authority-extract',
    };
  }

  if (game == '40k') {
    return {
      label: 'Warhammer 40,000',
      repo: getRepoName('DATA_REPO_40K'),
      branch: 'master',
      extractRoot: 'authority-extract',
    };
  }

  return {
    label: 'The Old World',
    repo: getRepoName('DATA_REPO_TOW'),
    branch: 'main',
    // this repo has 2 extract folders, "conformed" is the current one
    extractRoot: 'authority-extract-conformed',
  };
}

// I read these one at a time instead of all at the top, so a missing 40k repo
// doesn't stop the AoS pages from working.
function getRepoName(variable: string) {
  const repo = process.env[variable];

  if (!repo) {
    throw new Error(variable + ' is missing from .env.local. Remember to restart npm run dev!');
  }

  return repo;
}

// turns "warscrolls/ironjawz.json" into "ironjawz"
export function slugFromPath(path: string) {
  const filename = path.split('/')[path.split('/').length - 1];
  return filename.replace('.json', '');
}

// turns "ironjawz" into "Ironjawz", and "sons-of-behemat" into "Sons of Behemat"
export function titleFromSlug(slug: string) {
  const words = slug.split('-');
  const capitalised = [];

  for (const word of words) {
    // leave little words like "of" alone
    if (word.length <= 2) {
      capitalised.push(word);
    } else {
      capitalised.push(word[0].toUpperCase() + word.slice(1));
    }
  }

  return capitalised.join(' ');
}
