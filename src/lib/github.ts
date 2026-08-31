// src/lib/github.ts
// Gets the JSON files out of my private github repos.
// IMPORTANT - server only!! Never import this into a 'use client' file
// or the token ends up in the browser.

export async function fetchRepoJson(repo: string, path: string, branch: string, tag: string) {
  const token = process.env.FROGWIZARD_READ_TOKEN;

  if (!token) {
    throw new Error('FROGWIZARD_READ_TOKEN is missing from .env.local. Remember to restart npm run dev!');
  }

  // NOTE: don't use raw.githubusercontent.com here! It doesn't work properly
  // with a token on private repos. This is the "contents" api instead.
  const url = 'https://api.github.com/repos/' + repo + '/contents/' + path + '?ref=' + branch;

  const response = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token,
      // this header is the bit that makes github send the actual file,
      // instead of a json description of the file
      Accept: 'application/vnd.github.raw+json',
    },
    // Next 16 does NOT cache by default. And because we send an Authorization
    // header you have to write force-cache or it ignores you.
    cache: 'force-cache',
    next: { revalidate: 3600, tags: [tag] },
  });

  const data = await response.json();
  return data;
}
