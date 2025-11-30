# Gmonixter Board Game

## Running & playing the game

- To start a dev server: `npm run dev` then navigate to http://127.0.0.1:5173/ (note: don't use `localhost` or Spotify won't like it)
- Authenticate with Spotify if necessary
- Input a Spotify playlist URL, such as https://open.spotify.com/playlist/1Bpgr72vuJwYXYqbdahtOO
- Play!

## Dev notes

- Had to downgrade `@types/react` to `18.2.19` (`npm install @types/react@18.2.19`) on account of [this bug](https://github.com/creativetimofficial/material-tailwind/issues/528#issuecomment-1856348865).

