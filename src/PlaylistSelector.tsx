import React, { useState } from "react";
import Song from "./components/types/Song";
import { getToken } from "./components/Utils";
import Loading from "./components/ui/Loading";
import ErrorUI from "./components/ui/ErrorUI";

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

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleRetrievePlaylist = async () => {
    try {
      setLoading(true);
      setError(null);

      const playlistId = extractPlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error("Invalid playlist URL");
      }

      const token = getToken();
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
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

      // Filter out songs without preview URLs and map to our Song interface
      const validSongs = playlist.tracks.items
        .filter((item: any) => item.track && item.track.preview_url)
        .map((item: any) => ({
          title: item.track.name,
          year: new Date(item.track.album.release_date).getFullYear(),
          artist: item.track.artists[0].name,
          previewUrl: item.track.preview_url,
          albumCoverArtUrl: item.track.album?.images?.[0]?.url,
        }));

      if (validSongs.length === 0) {
        throw new Error("No playable songs found in this playlist");
      }

      // Shuffle the filtered songs
      const shuffledSongs: Song[] = shuffleArray(validSongs);

      setPlaylistName(playlist.name);
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
      <button
        onClick={handleRetrievePlaylist}
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
