import React, { useState, useMemo } from "react";
import Song from "./components/types/Song";
import { getToken } from "./components/Utils";
import Loading from "./components/ui/Loading";
import ErrorUI from "./components/ui/ErrorUI";
import playlistsData from "./playlists-curated.json";
// import {
//   Tabs,
//   TabsHeader,
//   TabsBody,
//   Tab,
//   TabPanel,
// } from "@material-tailwind/react";
// import PlaylistSelectorAdvanced from "./PlaylistSelectorAdvanced";

interface PlaylistSelectorProps {
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  setPlaylistName: React.Dispatch<React.SetStateAction<string>>;
  setIsNewGame: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsInfoVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  setSongs,
  setPlaylistName,
  setIsNewGame,
  setCurrentIndex,
  setIsInfoVisible,
}) => {
  const [playlistUrl, setPlaylistUrl] = useState<string>("");
  const [selectedCurated, setSelectedCurated] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaylistUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaylistUrl(e.target.value);
  };

  const extractPlaylistId = (url: string): string => {
    // Remove any query parameters
    const baseUrl = url.split("?")[0];
    // Split by '/' and get the playlist ID
    const parts = baseUrl.split("/");
    return parts[4] || "";
  };

  const curatedPlaylists = useMemo(() => {
    try {
      if (playlistsData && Array.isArray((playlistsData as any).playlists)) {
        return (playlistsData as any).playlists as { id: string; name: string }[];
      }
      return [];
    } catch (e) {
      console.error("Failed reading playlists-curated.json", e);
      return [];
    }
  }, [playlistsData]);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleRetrieveSongs = async (forcedPlaylistId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const playlistId = forcedPlaylistId ?? extractPlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error("Invalid playlist URL");
      }

      const MAX_ITEMS_IN_PLAYLIST = 1000;
      const validSongs: Song[] = [];
      let spotifyApiEndpoint = `https://api.spotify.com/v1/playlists/${playlistId}`;
      let playlistName;
      let endOfPlaylist = false;

      while (!endOfPlaylist && validSongs.length <= MAX_ITEMS_IN_PLAYLIST) {
        const token = getToken();
        const response = await fetch(
          spotifyApiEndpoint,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch playlist data");
        }

        const playlist = await response.json();
        if (!playlistName) {
          playlistName = playlist.name;
        }

        console.log(`playlist has the following properties: ${Object.keys(playlist)}`);
        // the second+ time around, we get no "tracks" property - the tracks object is at the top level
        const tracks = playlist.tracks? playlist.tracks.items: playlist.items;
        const next = playlist.tracks? playlist.tracks.next: playlist.next;

        validSongs.push(
          ...tracks 
            .filter((item: any) => item.track)
            .map((item: any) => ({
              trackId: item.track.id,
              title: item.track.name,
              year: new Date(item.track.album.release_date).getFullYear(),
              artist: item.track.artists[0].name,
              previewUrl: item.track.preview_url,
              albumCoverArtUrl: item.track.album?.images?.[0]?.url,
          })));

        if (validSongs.length === 0) {
          throw new Error("No playable songs found in this playlist");
        }

        if (next) {
          spotifyApiEndpoint = next;
        } else {
          endOfPlaylist = true;
        }
      }


      // Shuffle the filtered songs
      const shuffledSongs: Song[] = shuffleArray(validSongs);

      setPlaylistName(playlistName);
      setSongs(shuffledSongs);
      setIsNewGame(false);
      setCurrentIndex(0);
      setIsInfoVisible(false);
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

  return (
    <div className="mb-4">
      <div>
        <img src="img/logo.png"></img>
      </div>

      <input
        type="text"
        placeholder="Paste Spotify Playlist URL"
        value={playlistUrl}
        onChange={handlePlaylistUrlChange}
        className="p-2 border rounded w-full max-w-md"
      />
      {curatedPlaylists.length > 0 && (
        <select
          value={selectedCurated}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedCurated(id);
            if (id) {
              const url = `https://open.spotify.com/playlist/${id}`;
              setPlaylistUrl(url);
              // call handler using playlist id directly
              void handleRetrieveSongs(id);
            }
          }}
          className="mb-2 p-2 border rounded w-full max-w-md"
        >
          <option value="">Select a curated playlist (optional)</option>
          {curatedPlaylists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={() => void handleRetrieveSongs()}
        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        💃🏻 Get Songs 🕺🏻
      </button>

      <Loading loading={loading} />
      <ErrorUI error={error} />
    </div>
  );
};

export default PlaylistSelector;
