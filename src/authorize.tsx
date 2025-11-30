const currentToken = {
    get access_token() {
        return localStorage.getItem("access_token") || null;
    },
    get expires() {
        return localStorage.getItem("expires") || null;
    },
    save: function (accessToken: string, expiresIn: number) {
        localStorage.setItem("access_token", accessToken);
        const now = new Date();
        const expiry = new Date(now.getTime() + expiresIn * 1000);
        localStorage.setItem("expires", expiry.toISOString());
    },
};

const CLIENT_ID = '8ff46945b7414e13a7cabb0e9ac3ca8d';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state playlist-read-private playlist-read-collaborative';

const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};


// The code is wrapped in an immediately invoked async function (IIFE) to allow top-level await usage.
(async () => {
    const params = new URLSearchParams(window.location.search);

    // See https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
    if (!params.get('code')) {
        const codeVerifier = generateCodeVerifier();
        localStorage.setItem('code_verifier', codeVerifier);
        
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
        window.location.href = authUrl;
    } else {
        const code = params.get('code')!;
        const codeVerifier = localStorage.getItem('code_verifier')!;
        
        try {
            // exchange the code for a token
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI,
                    code_verifier: codeVerifier,
                }),
            });
            const data = await response.json();
            currentToken.save(data.access_token, data.expires_in);
            localStorage.removeItem('code_verifier');
            window.location.href = '/';
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            alert('Authentication failed');
        }
    }
})();
