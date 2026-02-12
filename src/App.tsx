import React, { useState, useEffect } from "react";

import PlaylistSelector from "./PlaylistSelector";
import Song from "./components/types/Song";
import { getToken } from "./components/Utils";
import Loading from "./components/ui/Loading";
import ErrorUI from "./components/ui/ErrorUI";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Release {
  year: number;
  country: string;
  mediaFormat: string;
  artistCredit: string;
}

const tokenHasExpired = () => {
  const expiration = localStorage.getItem("expires");
  if (!expiration || new Date() > new Date(expiration)) {
    return true;
  }
  return false;
};

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isInfoVisible, setIsInfoVisible] = useState<boolean>(false);
  const [isNewGame, setIsNewGame] = useState<boolean>(true);
  const [playlistName, setPlaylistName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string |null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [releasesSource, setReleasesSource] = useState<"musicbrainz" | "openai" | null>(null);
  const [pendingOpenAIQuery, setPendingOpenAIQuery] = useState<{ title: string; artist: string } | null>(null);
  const [openaiKeyInput, setOpenaiKeyInput] = useState<string>("");  

  const fetchReleasesFromOpenAI = async (title: string, artist: string): Promise<Release[]> => {
    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) return [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              `You are a music encyclopedia. Return a JSON array of known releases for a given song. 
              Each element must have exactly these fields: "year" (number), "country" (string, 2-letter ISO code), 
              "mediaFormat" (string, e.g. "Vinyl", "CD", "Digital Media", "Cassette"), "artistCredit" (string). 
              Return only the JSON array, no other text.`,
          },
          {
            role: "user",
            content: `List all known releases for the song "${title}" by ${artist}. If the title contains words 
            implying this is derivative content, return releases for the _original_ title. Examples of such words
            are, "Remaster", "Remastered", "Live", "Radio Edit", "Radio Version".`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("OpenAI API error:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content ?? "[]";

    // Strip markdown fences if present
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed: any[] = JSON.parse(content);
    return parsed
      .filter(
        (r) =>
          typeof r.year === "number" &&
          typeof r.country === "string" &&
          typeof r.mediaFormat === "string" &&
          typeof r.artistCredit === "string"
      )
      .sort((a, b) => a.year - b.year);
  };

  const handleLoadExtraReleases = async (songIndex: number) => {
    try {
      setLoading(true);
      setError(null);

      const title = songs[songIndex].title;
      const artist = songs[songIndex].artist;
      // currentIndex
      let truncatedTitle = title;
      const remasteredIndex = title.search(/\-?\s?remastered/i);
      if (remasteredIndex > 0) {
        truncatedTitle = title.substring(0, remasteredIndex).trim();
      }

      // https://musicbrainz.org/doc/MusicBrainz_API/Search
      const musicBrainzUrl = new URL("https://musicbrainz.org/ws/2/release");
      musicBrainzUrl.searchParams.set(
        "query",
        `"${truncatedTitle}" AND artist:"${artist}"`
      );
      musicBrainzUrl.searchParams.set("fmt", "json");
      musicBrainzUrl.searchParams.set("limit", "10");

      console.log(`Query is: ${musicBrainzUrl.toString()}`);
      const response = await fetch(musicBrainzUrl.toString());

      if (!response.ok) {
        throw new Error("Failed to fetch releases data");
      }

      const data = await response.json();

      // Filter out releases without date or which are unofficial
      const tempReleases: Release[] = data.releases
        .filter(
          (item: any) =>
            item.date && item.status === "Official" && item.score >= 85
        )
        .map((item: any) => ({
          year: new Date(item.date).getFullYear(),
          country: item.country,
          mediaFormat: item.media?.[0]?.format,
          artistCredit: item["artist-credit"]?.[0]?.name,
        }))
        .sort((a: Release, b: Release) => {
          return a.year - b.year;
        });

      if (tempReleases.length > 0) {
        setReleases(tempReleases);
        setReleasesSource("musicbrainz");
      } else {
        // MusicBrainz returned nothing — try OpenAI fallback
        const apiKey = localStorage.getItem("openai_api_key");
        if (apiKey) {
          try {
            const aiReleases = await fetchReleasesFromOpenAI(title, artist);
            setReleases(aiReleases);
            setReleasesSource(aiReleases.length > 0 ? "openai" : null);
          } catch (aiErr) {
            console.warn("OpenAI fallback error:", aiErr);
          }
        } else {
          setPendingOpenAIQuery({ title, artist });
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousNext = async (isNext: boolean) => {
    let newIndex;

    if (isNext) {
      newIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
    }
    setCurrentIndex(newIndex);
    setIsInfoVisible(false);
    setError(null);
    setReleases([]);
    setReleasesSource(null);
    setPendingOpenAIQuery(null);
    playTrack(songs[newIndex].trackId);
    await handleLoadExtraReleases(newIndex);
  }

  const handlePrevious = () => {
    handlePreviousNext(false);
  };

  const handleNext = () => {
    handlePreviousNext(true);
  };

  const handleAuthentication = () => {
    window.location.href = "authorize.html";
    return <></>;
  };

  const renderReleasesRows = () => {
    const rows: any = [];
    releases.forEach((oneRelease: Release) => {
      rows.push(
        <tr className="border-b border-gray-200 last:border-b-0">
          <td className="py-2 px-3">{oneRelease.year}</td>
          <td className="py-2 px-3">{oneRelease.country}</td>
          <td className="py-2 px-3">{oneRelease.mediaFormat}</td>
          <td className="py-2 px-3">{oneRelease.artistCredit}</td>
        </tr>
      );
    });
    return rows;
  };

  const initializePlayer = () => {
    const playerInstance = new (window as any).Spotify.Player({
      name: 'Gmonixter Player',
      getOAuthToken: (cb: (token: string) => void) => { cb(getToken()!); },
      volume: 0.5
    });

    playerInstance.addListener('ready', ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
    });

    playerInstance.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device has gone offline:', device_id);
    });

    try {
      playerInstance.connect();
      setPlayer(playerInstance);
    } catch (err) {
      setError(`Error connecting to the Spotify player: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenExpiration = async() => {
    if (tokenHasExpired()) {
      const popup = window.open('authorize.html', 'spotify-auth', 'width=600,height=800');
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          if (!tokenHasExpired()) {
            initializePlayer();
          }
        }
      }, 500);
      return;
    }
  }

  const getEarliestReleaseYear = () => {
    if (releases.length > 0) {
      return releases[0].year; // they're already sorted by year
    } else {
      return songs[currentIndex].year;
    }

  };

  const playTrack = async (trackId: string) => {

    try {
      await handleTokenExpiration();

      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`]
        })
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Error loading track: ${response.statusText} (${response.status})`);
      }

    } catch (error) {
      setError('Error: ' + (error as Error).message);
    }
  };

  const handlePauseResume = () => {
    player?.togglePlay();
  };


  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (songs.length > 0) {
        if (event.key === "ArrowLeft") {
          handlePrevious();
        } else if (event.key === "ArrowRight") {
          handleNext();
        } else if (event.key === " ") {
          event.preventDefault();
          handlePauseResume();
        } else if (event.key === "Enter") {
          setIsInfoVisible(!isInfoVisible);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [songs.length, isInfoVisible]);

  useEffect(() => {
    if (songs.length > 0) {
      // Load Spotify Web Playback SDK
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
      
      // Initialize Spotify Web Playback SDK
      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        if (getToken()) {
          initializePlayer();
        }
      };
    }
  }, [songs.length]);

  useEffect(() => {
    if (deviceId && songs.length > 0 && currentIndex === 0) {
      playTrack(songs[0].trackId);
    }
  }, [deviceId]);

  // The user doesn't have a valid token
  if (isNewGame && (!getToken() || tokenHasExpired())) {
    return (
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <button
            onClick={handleAuthentication}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-between"
          >
            <span>Click here to authorize with Spotify...</span>
          </button>
        </div>
      </div>
    );
  }

  // The user has a valid token - new game started
  if (isNewGame) {
    return (
      <PlaylistSelector
        setSongs={setSongs}
        setPlaylistName={setPlaylistName}
        setIsNewGame={setIsNewGame}
        setCurrentIndex={setCurrentIndex}
        setIsInfoVisible={setIsInfoVisible}
      />
    );
  }

  // Normal case - the user is logged on


  return (
    <div className="flex flex-col items-center">

      {songs.length > 0 && (
        <div className="flex flex-col items-center bg-white shadow-md rounded-md p-4 w-full max-w-md">
          <h1 className="text-blue-500 text-lg">Playlist: {playlistName}</h1>
          <div className="py-4 px-8">
            <div className="flex gap-2 mb-4">
              <button
                onClick={handlePauseResume}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Pause/Resume
              </button>
            </div>
          </div>

          <div className="flex justify-between w-full mt-4">
            <button
              onClick={handlePrevious}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
            >
              <ChevronLeft size={20} className="mr-1" /> Previous
            </button>
            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Next <ChevronRight size={20} className="ml-1" />
            </button>
          </div>



          <button
            onClick={() => setIsInfoVisible(!isInfoVisible)}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-between mt-4"
          >
            <span>Click here to reveal info...</span>
            {isInfoVisible ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </button>

          {isInfoVisible && (
            <div className="w-full mt-2 p-2">
              <h3 className="text-lg font-medium">
                {songs[currentIndex].title}
              </h3>
              <p className="text-gray-500">
                {getEarliestReleaseYear()} - {songs[currentIndex].artist}
              </p>

              {songs[currentIndex].albumCoverArtUrl && (
                <img src={songs[currentIndex].albumCoverArtUrl}></img>
              )}

              {releasesSource === "openai" && releases.length > 0 && (
                <div className="w-full mt-4 px-3 py-2 bg-amber-100 text-amber-800 text-sm rounded">
                  Release data provided by AI (may not be fully accurate)
                </div>
              )}

              {pendingOpenAIQuery && (
                <div className="w-full mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    No MusicBrainz results found. Enter an OpenAI API key to try AI-powered lookup:
                  </p>
                  <input
                    type="password"
                    value={openaiKeyInput}
                    onChange={(e) => setOpenaiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        localStorage.setItem("openai_api_key", openaiKeyInput);
                        const { title, artist } = pendingOpenAIQuery;
                        setPendingOpenAIQuery(null);
                        setOpenaiKeyInput("");
                        try {
                          const aiReleases = await fetchReleasesFromOpenAI(title, artist);
                          setReleases(aiReleases);
                          setReleasesSource(aiReleases.length > 0 ? "openai" : null);
                        } catch (aiErr) {
                          console.warn("OpenAI fallback error:", aiErr);
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                    >
                      Save &amp; Fetch
                    </button>
                    <button
                      onClick={() => {
                        setPendingOpenAIQuery(null);
                        setOpenaiKeyInput("");
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {releases.length > 0 && (
                <table className="w-full mt-4 bg-gray-50 rounded">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-3 text-left text-sm font-medium">Year</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Country</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Format</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Artist credit</th>
                    </tr>
                  </thead>
                  <tbody>{renderReleasesRows()}</tbody>
                </table>
              )}
            </div>
          )}
          <div className="text-gray-400 text-sm mt-2">
            Song {currentIndex + 1} of {songs.length}
          </div>
          <div className="w-full mt-2 p-2 flex items-center gap-3">
            <a
              href="#"
              onClick={() => {
                setIsNewGame(true);
              }}
              className="py-1 px-3 text-xs rounded hover:bg-blue-500"
            >
              <span>New Game</span>
            </a>
            {localStorage.getItem("openai_api_key") && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (window.confirm("Clear stored OpenAI API key?")) {
                    localStorage.removeItem("openai_api_key");
                    setReleasesSource(null);
                  }
                }}
                className="py-1 px-3 text-xs text-gray-400 hover:text-gray-600"
              >
                OpenAI key configured
              </a>
            )}
          </div>
        </div>
      )}

      <Loading loading={loading} />
      <ErrorUI error={error} />
    </div>
  );
};

export default App;
