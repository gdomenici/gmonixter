// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
    get access_token() {
        return localStorage.getItem("access_token") || null;
    },
    get expires() {
        return localStorage.getItem("expires") || null;
    },

    save: function (accessToken: any) {
        localStorage.setItem("access_token", accessToken);

        console.log(`token is ${JSON.stringify(accessToken)}`);

        const now = new Date();
        const expiry = new Date(now.getTime() + 60 * 60 * 1000); // expires in 1h
        localStorage.setItem("expires", expiry.toISOString());
    },
};

const CLIENT_ID = '8ff46945b7414e13a7cabb0e9ac3ca8d';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state playlist-read-private playlist-read-collaborative';

let accessToken;

// Check if we're returning from Spotify auth
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);

if (!params.get('access_token')) {
    /*
    * PHASE 1: we go to obtain the code from Spotify
    */
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;

} else {

    /*
    * PHASE 2: we have obtained the code from Spotify
    */
    accessToken = params.get('access_token');
    var container = document.getElementById("root")!;
    container.innerHTML = `<div>Authenticated. Redirecting...</div>`;
    currentToken.save(accessToken);
    window.location.href = "/";
}
