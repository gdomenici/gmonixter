# Guido-Monixter Board Game

## Running & playing the game

- To start a dev server: `npm run dev` then navigate to http://localhost:5173/
- Input a Spotify playlist URL, such as https://open.spotify.com/playlist/1Bpgr72vuJwYXYqbdahtOO
- Scan each QR code with a phone, and guess the song from the 30-second preview.

# TODO

- Look for previous releases of a certaing song [IN PROGRESS]
- Rename to gmonixter
- Handle the case where the token has expired differently (use refresh tokens, i.e. no need to reauthenticate)
- Show the album cover art (https://developer.spotify.com/documentation/web-api/reference/get-track, `songs[currentIndex].album.images`)
- Possibility to alternate between player view and QR code view (see doc/README.md)
