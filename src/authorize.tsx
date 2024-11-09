const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
// const redirectUrl = "http://localhost:5173/authorize.html";
const clientID = "8ff46945b7414e13a7cabb0e9ac3ca8d";

const generateAuthUrl = async () => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = window.crypto.getRandomValues(new Uint8Array(64));
  const code_verifier = randomValues.reduce(
    (acc, x) => acc + possible[x % possible.length],
    ""
  );
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);
  const code_challenge_base64 = btoa(
    String.fromCharCode(...new Uint8Array(hashed))
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  window.localStorage.setItem("code_verifier", code_verifier);

  const authUrl = new URL(authorizationEndpoint);
  const scope = "playlist-read-private";
  const actualRedirectUrl = window.location.href;

  const params = {
    response_type: "code",
    client_id: clientID,
    scope: scope,
    code_challenge_method: "S256",
    code_challenge: code_challenge_base64,
    redirect_uri: actualRedirectUrl,
  };

  authUrl.search = new URLSearchParams(params).toString();
  return authUrl.toString();
};

// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
  get access_token() {
    return localStorage.getItem("access_token") || null;
  },
  get refresh_token() {
    return localStorage.getItem("refresh_token") || null;
  },
  get expires_in() {
    return localStorage.getItem("refresh_in") || null;
  },
  get expires() {
    return localStorage.getItem("expires") || null;
  },

  save: function (token: any) {
    const { access_token, refresh_token, expires_in } = token;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("expires_in", expires_in);

    console.log(`token is ${JSON.stringify(token)}`);

    const now = new Date();
    const expiry = new Date(now.getTime() + expires_in * 1000);
    localStorage.setItem("expires", expiry.toISOString());
  },
};

const getToken = async (code: string) => {
  // Saved during the 1st phase of authorization (i.e. before the callback)
  const code_verifier = localStorage.getItem("code_verifier");
  const actualRedirectUrl = window.location.href.split("?")[0];
  console.log(`actualRedirectUrl is ${actualRedirectUrl}`);
  const params = {
    client_id: clientID,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: actualRedirectUrl,
    code_verifier: code_verifier!,
  };
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  return await response.json();
};

const args = new URLSearchParams(window.location.search);
const code = args.get("code");
if (code) {
  /*
   * PHASE 2: we have obtained the code from Spotify
   */
  var container = document.getElementById("root")!;
  container.innerHTML = `<h1>Code obtained: ${code}</h1>`;
  // Callback's query string param:
  //  code=AQBl8SFUOXuPoFqs3_OyL_wrHxajZvb3oyofC3Eux7vpuJ2QubBJKzF5bB9wgtwgW6IfztEpF-hmn-YtQXH3jyZomSdaWk8y-Xw3ToS_D53jos19vW4OXaEnyPyfjLAb-_l0DYx0poy13wGy4TG7zf50Jrj3euE2NHq-jhP9N36n_PVZCBuwu4rRRtF1PGCDS8Zflludcf5t3b8BDQs7Vj0lQOtGWy3_ktsNGcJVU2v9e1dEiEt2XEGVuBFNiHoqgxlbRMkMtRXvgvxxBlR1ajCX
  const token = await getToken(code);
  // token should look like:
  //  { access_token, refresh_token, expires_in }
  // Saves it in local storage
  currentToken.save(token);
  window.open("index.html");
} else {
  /*
   * PHASE 1: we go to obtain the code from Spotify
   */
  const authUrl = await generateAuthUrl();
  console.log(`About to open ${authUrl}`);
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/open
  window.open(authUrl);
}

// ReactDOM.createRoot(document.getElementById("root")!).render(
//   <React.StrictMode>
//     <Authorize />
//   </React.StrictMode>
// );
