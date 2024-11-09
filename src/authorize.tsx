import { stat } from "fs";
import React from "react";
import ReactDOM from "react-dom/client";
// import { randomBytes } from "crypto";

// https://github.com/spotify/web-api-examples/blob/master/authorization/authorization_code/app.js
// const generateRandomString = (length: number) => {
//   return randomBytes(60).toString("hex").slice(0, length);
// };

const dec2hex = (dec: number) => {
  return dec.toString(16).padStart(2, "0");
};

const generateRandomString = (length: number) => {
  var arr = new Uint8Array((length || 40) / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join("");
};

const Authorize: React.FC = () => {
  const state = generateRandomString(16);
  const scope = "playlist-read-private";
  // https://developer.spotify.com/documentation/web-api/tutorials/code-flow
  const authParams = {
    response_type: "code",
    client_id: "8ff46945b7414e13a7cabb0e9ac3ca8d",
    scope: scope,
    redirect_uri: "http://localhost:5173?authorized=true",
    state: state,
  };

  // https://developer.mozilla.org/en-US/docs/Web/API/Window/open
  window.open(
    `https://accounts.spotify.com/authorize?${new URLSearchParams(
      authParams
    ).toString()}`,
    "spotify_auth",
    "popup=false"
  );

  // If successful, will return:
  // http://localhost:5173/?authorized=true&code=AQAjcIP_s_TXsjSoNG-tf-aPoQ-ocBlpG9fTRwQajaxFl2xCnZGj3FUI-bOeSFaisMsm6qKPrRwMg_box-0M8_9XXhA1BJ72Jir1tuSYcyU0ZCQDk_orZN_6Bb99tZaP39jNocOZeNhl44XgGlWyIPV5v1kWLvLeGpPlCpgC4mlVLcCCtcIyUUKyPs6lng7yTesVnVMCiBZ8u92nkUyk9A&state=b520e0863d534788

  return <></>;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Authorize />
  </React.StrictMode>
);
