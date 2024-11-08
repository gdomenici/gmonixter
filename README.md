# Guido-Monixter Board Game

## Development instructions
* Get your `client_id` and `client_secret` from https://developer.spotify.com/dashboard/8ff46945b7414e13a7cabb0e9ac3ca8d/settings
* Paste them in the right place in `tools/request-spotify-token.sh`
* Run that script
* Paste the result into `.env` as in `VITE_SPOTIFY_ACCESS_TOKEN=the_token`

## Running & playing the game
* To start a dev server: `npm run dev` then navigate to http://localhost:5173/
* Input a Spotify playlist URL, such as https://open.spotify.com/playlist/1Bpgr72vuJwYXYqbdahtOO
* Scan each QR code with a phone, and guess the song from the 30-second preview.

## Original dev instructions: Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

# TODO
* Shuffle the Spotify playlist
