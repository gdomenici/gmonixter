import React, { useState, useEffect } from "react";
import Song from "./components/types/Song";
import Loading from "./components/ui/Loading";
import ErrorUI from "./components/ui/ErrorUI";

interface PlaylistSelectorProps {
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  setPlaylistName: React.Dispatch<React.SetStateAction<string>>;
  setPlaylistUrl: React.Dispatch<React.SetStateAction<string>>;
  setIsNewGame: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsInfoVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onStartPolling: (playlistId: string, server: string, playlistUrl: string) => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  setSongs,
  setPlaylistName,
  setPlaylistUrl: setParentPlaylistUrl,
  setIsNewGame,
  setCurrentIndex,
  setIsInfoVisible,
  onStartPolling,
}) => {
  const [playlistUrl, setPlaylistUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<string>("http://localhost:3000");
  const [showServerSelect, setShowServerSelect] = useState<boolean>(false);

  const handlePlaylistUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaylistUrl(e.target.value);
  };

  const extractYoutubePlaylistId = (url: string): string => {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('list') || '';
  };

  const handleRetrieveSongs = async () => {
    try {
      setLoading(true);
      setError(null);

      const playlistId = extractYoutubePlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error("Invalid playlist URL -- missing playlist ID (list=...)");
      }

      // Kickstart video content download
      fetch(`${server}/playlist-download?playlist_url=${encodeURIComponent(playlistUrl)}`);

      // Get playlist items
      const url = `${server}/playlist-items?playlist_url=${encodeURIComponent(playlistUrl)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      const songs: Song[] = data.video_items.map((item: any) => ({
        rawYouTubeTitle: item.title,
        videoId: item.id,
        title: undefined,
        year: undefined,
        artist: undefined,
        bestThumbnailUrl: item.thumbnails.reduce((best: any, current: any) => 
          (current.height * current.width) > (best.height * best.width) ? current : best
        ).url,
        isReadyForPlayback: false
      }));
      
      setSongs(songs);
      setPlaylistName('YouTube Playlist');
      setParentPlaylistUrl(playlistUrl);
      setIsNewGame(false);
      setCurrentIndex(0);
      setIsInfoVisible(false);
      
      // Start polling in parent
      onStartPolling(playlistId, server, playlistUrl);
      setLoading(false);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        setShowServerSelect(!showServerSelect);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showServerSelect]);

  return (
    <div className="mb-4">
      <div>
        <img src="img/logo.png"></img>
      </div>
      
      {showServerSelect && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Server:</label>
          <select 
            value={server} 
            onChange={(e) => setServer(e.target.value)}
            className="p-2 border rounded w-full max-w-md"
          >
            <option value="http://localhost:3000">Local Server</option>
            <option value="https://gmonixter-backend.onrender.com">Remote server gmonixter-backend</option>
          </select>
        </div>
      )}

      <input
        type="text"
        placeholder="Paste YouTube Playlist URL"
        value={playlistUrl}
        onChange={handlePlaylistUrlChange}
        className="p-2 border rounded w-full max-w-md"
      />
      <button
        onClick={handleRetrieveSongs}
        disabled={loading}
        className={`mt-2 px-4 py-2 rounded w-full ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        💃🏻 Get Songs 🕺🏻
      </button>

      <Loading loading={loading} />
      <ErrorUI error={error} />
    </div>
  );
};

export default PlaylistSelector;
