# Guido-Monixter Board Game

## Running & playing the game

- To start a dev server: `npm run dev` then navigate to http://localhost:5173/
- Input a Spotify playlist URL, such as https://open.spotify.com/playlist/1Bpgr72vuJwYXYqbdahtOO
- Scan each QR code with a phone, and guess the song from the 30-second preview.

# TODO

- MRU of recently used playlists
- Allow selecting part of the title for "previous releases" lookups
- Handle the case where the token has expired differently (use refresh tokens, i.e. no need to reauthenticate)
- Party mode 🕺🏻
- Possibility to alternate between player view and QR code view (see doc/README.md)
