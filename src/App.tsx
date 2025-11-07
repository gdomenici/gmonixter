import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

import Song from "./components/types/Song";
import MetadataNotFoundError from "./components/types/MetadataNotFoundError";
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

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isInfoVisible, setIsInfoVisible] = useState<boolean>(false);
  const [isNewGame, setIsNewGame] = useState<boolean>(true);
  const [playlistName, setPlaylistName] = useState<string>("");
  const [playlistUrl, setPlaylistUrl] = useState<string>("");
  const [playlistUrlInput, setPlaylistUrlInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<string>("http://localhost:3000");
  const [showServerSelect, setShowServerSelect] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Cleans up the song title and artist from the raw YouTube title, and
   * subsequently fetches metadata from MusicBrainz
   * @param currentSong song to populate metadata for
   */
  const populateMetadataForSong = async (currentSong: Song) => {
    const rawYouTubeTitle = currentSong.rawYouTubeTitle;
    let artist: string | null = null;
    let title: string;
    let rest: string;

    if (rawYouTubeTitle.includes(" - ")) {
      [artist, rest] = rawYouTubeTitle.split(" - ", 2);
    } else if (rawYouTubeTitle.includes(" | ")) {
      [artist, rest] = rawYouTubeTitle.split(" | ", 2);
    } else if (rawYouTubeTitle.includes(": ")) {
      [artist, rest] = rawYouTubeTitle.split(": ", 2);
    } else {
      rest = rawYouTubeTitle;
    }

    title = rest.split(" (")[0].split(" [")[0].split(" ft")[0].split(" (feat")[0].split(" FEAT.")[0].replace(/"/g, '').replace(/'/g, '');
    if (!title.trim()) {
      throw new MetadataNotFoundError(`Metadata not found for ${rawYouTubeTitle}`);
    };

    const query = artist ? `"${title}" AND artist:"${artist}"` : `"${title}"`;
    const params = new URLSearchParams({ query, fmt: "json", limit: "10" });
    const response = await fetch(`https://musicbrainz.org/ws/2/release?${params}`);
    const data = await response.json();
    
    if (!data.releases || data.releases.length === 0) {
      throw new MetadataNotFoundError(`Metadata not found in MusicBrainz for ${rawYouTubeTitle}`);
    }

    const release = data.releases[0];
    const releaseDate = release.date || release["release-events"]?.[0]?.date;
    currentSong.title = release.title || title;
    currentSong.year = releaseDate ? parseInt(releaseDate.split('-')[0]) : undefined;
    currentSong.artist = release["artist-credit"]?.[0]?.name || artist || undefined;
    currentSong.isReadyForPlayback = true;

  };

  /**
   * Called periodically to poll the download state from the server
   * @param playlistId YouTube playlist ID
   * @param server Server base URL
   */
  const pollDownloadState = async (playlistId: string, server: string) => {
    const url = `${server}/playlist-download-state?playlist_id=${playlistId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.total_tracks || !data.video_ids || data.video_ids.length === 0) {
      return;
    }

    // Always look at the very last video ID the server added
    const latestVideoID = data.video_ids[data.video_ids.length - 1];
    const songThatNeedsMetadata = songs.find(oneSong => oneSong.videoId === latestVideoID);
    if (!songThatNeedsMetadata) {
      throw new Error(`Song with video ID ${latestVideoID} not present in downloaded playlist items`);
    }
    try {
      populateMetadataForSong(songThatNeedsMetadata);
    } catch (error) {
      if (error instanceof MetadataNotFoundError) {
        console.error(error);
        // Remove songThatNeedsMetadata from the songs array, because we effectively
        // don't "know" what it is, without having metadata
        setSongs(currentSongs => currentSongs.filter(song => song.videoId !== latestVideoID));
        return;
      }
    }   
    
    // End condition: we downloaded metadata for all songs. No need to
    // poll anymore after that.
    if (data.video_ids.length === data.total_tracks && pollIntervalRef.current) {
      // Sanity check: see if all videos in the list really have metadata
      const allHaveMetadata = songs.every(oneSong => oneSong.isReadyForPlayback);
      if (!allHaveMetadata) {
        throw new Error("Unexpected condition: not all songs have metadata")
      }

      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const extractYoutubePlaylistId = (url: string): string => {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('list') || '';
  };

  const handleRetrieveSongs = async () => {
    try {
      setLoading(true);
      setError(null);

      const playlistId = extractYoutubePlaylistId(playlistUrlInput);
      if (!playlistId) {
        throw new Error("Invalid playlist URL -- missing playlist ID (list=...)");
      }

      // No waiting for this fetch to complete - it starts the download process on the server
      fetch(`${server}/playlist-download?playlist_url=${encodeURIComponent(playlistUrlInput)}`);

      const url = `${server}/playlist-items?playlist_url=${encodeURIComponent(playlistUrlInput)}`;
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
        bestThumbnailUrl: item.thumbnails.reduce((best: any, current: any) => 
          (current.height * current.width) > (best.height * best.width) ? current : best
        ).url,
        isReadyForPlayback: false
      }));
      
      setSongs(songs);
      setPlaylistName('YouTube Playlist');
      setPlaylistUrl(playlistUrlInput);
      setIsNewGame(false);
      setCurrentIndex(0);
      setIsInfoVisible(false);
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(() => pollDownloadState(playlistId, server), 1000);
      
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

  const startPlayback = async (videoId: string) => {
    if (!videoRef.current) return;
    
    const server = localStorage.getItem('selectedServer') || 'http://localhost:3000';
    const url = `${server}/playlist-items?playlist_url=${encodeURIComponent(playlistUrl)}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch HLS playlist');
      
      const data = await response.json();
      const hlsUrl = data.hlsUrl; // Assuming the API returns an hlsUrl field
      
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        
        hlsRef.current = new Hls();
        hlsRef.current.loadSource(hlsUrl);
        hlsRef.current.attachMedia(videoRef.current);
        
        hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play();
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = hlsUrl;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error starting playback:', err);
      setError('Failed to start video playback');
    }
  };

  const handleLoadExtraReleases = async (title: string, artist: string) => {
    try {
      setLoading(true);
      setError(null);

      let truncatedTitle = title;
      const remasteredIndex = title.search(/\-?\s?remastered/i);
      if (remasteredIndex > 0) {
        truncatedTitle = title.substring(0, remasteredIndex).trim();
      }
      console.log(`truncatedTitle is ${truncatedTitle}`);

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

      // console.log(`Results:\n${JSON.stringify(tempReleases, null, 2)}`);
      setReleases(tempReleases);
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

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : songs.length - 1));
    setIsInfoVisible(false);
    setReleases([]);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < songs.length - 1 ? prev + 1 : 0));
    setIsInfoVisible(false);
    setReleases([]);
  };

  const renderReleasesRows = () => {
    const rows: any = [];
    releases.forEach((oneRelease: Release) => {
      rows.push(
        <tr>
          <td>{oneRelease.year}</td>
          <td>{oneRelease.country}</td>
          <td>{oneRelease.mediaFormat}</td>
          <td>{oneRelease.artistCredit}</td>
        </tr>
      );
    });
    return rows;
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (songs.length > 0) {
        if (event.key === "ArrowLeft") {
          handlePrevious();
        } else if (event.key === "ArrowRight") {
          handleNext();
        }
      }
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        setShowServerSelect(!showServerSelect);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [songs.length, showServerSelect]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (isNewGame) {
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
          value={playlistUrlInput}
          onChange={(e) => setPlaylistUrlInput(e.target.value)}
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
  }

  // Main game logic UI
  return (
    <div className="flex flex-col items-center">
      {songs.length > 0 && (
        <div className="flex flex-col items-center bg-white shadow-md rounded-md p-4 w-full max-w-md">
          <h1 className="text-blue-500 text-lg">Playlist: {playlistName}</h1>
          <div className="py-4 px-8">
            <video 
              ref={videoRef}
              controls
              className="w-full max-w-md rounded"
              style={{ display: songs[currentIndex].isReadyForPlayback ? 'block' : 'none' }}
            />
            {songs[currentIndex].isReadyForPlayback ? (
              <div onClick={() => startPlayback(songs[currentIndex].videoId)} className="cursor-pointer mt-2">
                <div className="bg-green-500 text-white p-4 rounded text-center hover:bg-green-600">
                  ▶️ Play Video
                </div>
              </div>
            ) : (
              <div className="bg-gray-300 text-gray-600 p-4 rounded text-center">
                Please wait... preparing video
              </div>
            )}
          </div>

          <button
            onClick={() => setIsInfoVisible(!isInfoVisible)}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-between"
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
                {songs[currentIndex].title || songs[currentIndex].rawYouTubeTitle}
              </h3>
              <p className="text-gray-500">
                {songs[currentIndex].year && songs[currentIndex].artist 
                  ? `${songs[currentIndex].year} - ${songs[currentIndex].artist}`
                  : 'Metadata loading...'}
              </p>

              {(songs[currentIndex].bestThumbnailUrl) && (
                <img src={songs[currentIndex].bestThumbnailUrl}></img>
              )}

              {songs[currentIndex].title && songs[currentIndex].artist && (
                <a
                  href="#"
                  onClick={() =>
                    handleLoadExtraReleases(
                      songs[currentIndex].title!,
                      songs[currentIndex].artist!
                    )
                  }
                  className="text-gray-500"
                >
                  Click to see other releases...
                </a>
              )}

              {releases.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Country</th>
                      <th>Format</th>
                      <th>Artist credit</th>
                    </tr>
                  </thead>
                  <tbody>{renderReleasesRows()}</tbody>
                </table>
              )}
            </div>
          )}

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

          <div className="text-gray-400 text-sm mt-2">
            Song {currentIndex + 1} of {songs.length}
          </div>
          <div className="w-full mt-2 p-2">
            <a
              href="#"
              onClick={() => {
                setIsNewGame(true);
              }}
              className="py-1 px-3 text-xs rounded hover:bg-blue-500"
            >
              <span>New Game</span>
            </a>
          </div>
        </div>
      )}

      <Loading loading={loading} />
      <ErrorUI error={error} />
    </div>
  );
};

export default App;
