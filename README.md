# Guido-Monixter Board Game

## Running & playing the game

- To start a dev server: `npm run dev` then navigate to http://localhost:5173/
- Authenticate with Spotify if necessary
- Input a Spotify playlist URL, such as https://open.spotify.com/playlist/1Bpgr72vuJwYXYqbdahtOO
- Play!

## Dev notes

- Had to downgrade `@types/react` to `18.2.19` (`npm install @types/react@18.2.19`) on account of [this bug](https://github.com/creativetimofficial/material-tailwind/issues/528#issuecomment-1856348865).

# TODO

- Address https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
- Continue playlists gallery
- MRU of recently used playlists
- Allow more than 100 songs
- Use customized audio player (see https://chatgpt.com/c/67336a30-b9e8-800b-bca0-28ee8dac587d)
- Style the "other releases" table
- Allow selecting part of the title for "previous releases" lookups
- Handle the case where the token has expired differently (use refresh tokens, i.e. no need to reauthenticate)
- Party mode 🕺🏻
- Possibility to alternate between player view and QR code view (see doc/README.md)
