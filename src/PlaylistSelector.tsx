import React, { useState, useEffect } from "react";
import Song from "./components/types/Song";
import Loading from "./components/ui/Loading";
import ErrorUI from "./components/ui/ErrorUI";
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
  setPlaylistUrl: React.Dispatch<React.SetStateAction<string>>;
  setIsNewGame: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsInfoVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  setSongs,
  setPlaylistName,
  setPlaylistUrl: setParentPlaylistUrl,
  setIsNewGame,
  setCurrentIndex,
  setIsInfoVisible,
}) => {
  const [playlistUrl, setPlaylistUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<string>("http://localhost:3000");
  const [showServerSelect, setShowServerSelect] = useState<boolean>(false);
  const [validSongs, setValidSongs] = useState<Song[]>([]);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastVideoIdsCount, setLastVideoIdsCount] = useState<number>(0);

  const handlePlaylistUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaylistUrl(e.target.value);
  };

  const extractYoutubePlaylistId = (url: string): string => {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('list') || '';
  };

  const getMetadataForSong = async (currentSong: Song): Promise<Song | null> => {
    const rawYouTubeTitle = currentSong.rawYouTubeTitle;
    let artist: string | null = null;
    let title: string;
    let rest: string;

    // Parse YouTube title to extract artist and title
    if (rawYouTubeTitle.includes(" - ")) {
      [artist, rest] = rawYouTubeTitle.split(" - ", 2);
    } else if (rawYouTubeTitle.includes(" | ")) {
      [artist, rest] = rawYouTubeTitle.split(" | ", 2);
    } else if (rawYouTubeTitle.includes(": ")) {
      [artist, rest] = rawYouTubeTitle.split(": ", 2);
    } else {
      rest = rawYouTubeTitle;
    }

    // Clean up title
    title = rest.split(" (")[0];
    title = title.split(" [")[0];
    title = title.split(" ft")[0];
    title = title.split(" (feat")[0];
    title = title.split(" FEAT.")[0];
    title = title.replace(/"/g, '').replace(/'/g, '');

    if (!title.trim()) return null;

    try {
      const query = artist ? `"${title}" AND artist:"${artist}"` : `"${title}"`;
      const params = new URLSearchParams({
        query,
        fmt: "json",
        limit: "10"
      });
      
      const response = await fetch(`https://musicbrainz.org/ws/2/release?${params}`);
      const data = await response.json();
      
      if (!data.releases || data.releases.length === 0) {
        console.log('No MusicBrainz results for:', rawYouTubeTitle);
        return null;
      }

      const release = data.releases[0];
      const releaseDate = release.date || release["release-events"]?.[0]?.date;
      
      return {
        ...currentSong,
        title: release.title || title,
        year: releaseDate ? parseInt(releaseDate.split('-')[0]) : undefined,
        artist: release["artist-credit"]?.[0]?.name || artist || undefined,
        isReadyForPlayback: true
      };
    } catch (error) {
      console.error('MusicBrainz lookup error:', error);
      return null;
    }
  };

  const getPlaylistItems = async () => {
    const url = `${server}/playlist-items?playlist_url=${encodeURIComponent(playlistUrl)}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
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
        setValidSongs(songs);
      }
    } catch (error) {
      console.error('Error fetching playlist items:', error);
      setError('Failed to fetch playlist items');
    }
  };

  const pollDownloadState = async (playlistId: string) => {
    const url = `${server}/playlist-download-state?playlist_id=${playlistId}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.track_index && data.total_tracks) {
        if (data.video_ids && data.video_ids.length > lastVideoIdsCount) {
          const newVideoId = data.video_ids[data.video_ids.length - 1];
          
          setValidSongs(async prevSongs => {
            const targetSong = prevSongs.find(song => song.videoId === newVideoId);
            if (targetSong) {
              const songWithMetadata = await getMetadataForSong(targetSong);
              let updatedSongs;
              if (songWithMetadata) {
                // Update song array with lookup result
                updatedSongs = prevSongs.map(song => song.videoId === newVideoId ? songWithMetadata : song);
              } else {
                // Remove song if lookup failed
                updatedSongs = prevSongs.filter(song => song.videoId !== newVideoId);
              }
              
              // Check if at least one song is ready for playback
              if (updatedSongs.some(song => song.isReadyForPlayback)) {
                setSongs(updatedSongs);
                setPlaylistName('YouTube Playlist');
                setParentPlaylistUrl(playlistUrl);
                setIsNewGame(false);
                setCurrentIndex(0);
                setIsInfoVisible(false);
              }
              
              return updatedSongs;
            }
            return prevSongs;
          });
          
          setLastVideoIdsCount(data.video_ids.length);
        }
        
        // Stop polling when all tracks are downloaded
        if (data.track_index === data.total_tracks && pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
          setLoading(false);
        }
      } else {
        setError('Invalid download state response');
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleRetrieveSongs = async () => {
    try {
      setLoading(true);
      setError(null);

      const playlistId = extractYoutubePlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error("Invalid playlist URL -- missing playlist ID (list=...)");
      }

      // BEGIN PLACEHOLDER - Kickstart video content download
      const downloadResponse = await fetch(
        `${server}/playlist-download?playlist_url=${encodeURIComponent(playlistUrl)}`
      );
      // END PLACEHOLDER

      if (!downloadResponse.ok) {
        throw new Error("Failed to start playlist download");
      }

      // Get playlist items
      await getPlaylistItems();

      // Start polling for download state
      const interval = setInterval(() => pollDownloadState(playlistId), 1000);
      setPollInterval(interval);

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
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [showServerSelect, pollInterval]);

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

      {/* <Tabs value="dashboard">
        <TabsHeader>
          <Tab key="categorySelector" value="categorySelector">
          <div className="flex items-center gap-2">
              <img src="img/playlist-svgrepo-com.svg"></img>
              Pick a playlist from Spotify
            </div>
          </Tab>
          <Tab key="enterPlaylistUrl" value="enterPlaylistUrl">
          <div className="flex items-center gap-2">
              <img src="img/playlist-url.svg"></img>
              Enter a playist URL manually
            </div>
          </Tab>
        </TabsHeader>
        <TabsBody>
          <TabPanel key="categorySelector" value="categorySelector">
            <PlaylistSelectorAdvanced setLoading={setLoading} 
              setError={setError}
              setPlaylistUrl={setPlaylistUrl}
              setPlaylistName={setPlaylistName} />
          
          </TabPanel>
          <TabPanel key="enterPlaylistUrl" value="enterPlaylistUrl">
              <input
            type="text"
            placeholder="Paste Spotify Playlist URL"
            value={playlistUrl}
            onChange={handlePlaylistUrlChange}
            className="p-2 border rounded w-full max-w-md"
          />
          <button
            onClick={handleRetrieveSongs}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            💃🏻 Get Songs 🕺🏻
          </button>
          </TabPanel>

        </TabsBody>
      </Tabs> */}

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
