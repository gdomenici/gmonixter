import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

import Song from "./components/types/Song";
import Release from "./components/types/Release";

import Loading from "./components/ui/Loading";
import ErrorUI from "./components/ui/ErrorUI";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";



const App: React.FC = () => {
  const songsRef = useRef<Map<string, Song>>(new Map<string, Song>());
  const [songs, setSongs] = useState<Map<string, Song>>(new Map<string, Song>());
  const [videoIdPlaybackQueue, setVideoIdPlaybackQueue] = useState<string[]>([]);
  const videoIdPlaybackQueueRef = useRef<string[]>([]);
  const [videoIdIndexInQueue, setVideoIdIndexInQueue] = useState<number>(-1);
  const [isInfoVisible, setIsInfoVisible] = useState<boolean>(false);
  const [areExtraReleasesVisible, setAreExtraReleasesVisible] = useState<boolean>(false);
  const [isNewGame, setIsNewGame] = useState<boolean>(true);
  const [playlistName, setPlaylistName] = useState<string>("");
  const [playlistUrlInput, setPlaylistUrlInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<string>("http://localhost:3000");
  const [showServerSelect, setShowServerSelect] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Called periodically to poll the download state from the server. It will 
   * add the newly retrieved song to the video ID playback queue, and fetch
   * their metadata.
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
    console.log(`Data is:\n${JSON.stringify(data, null, 2)}`);
    console.log(`Latest video ID: ${latestVideoID}`);

    // See if we've already added this video ID to the playback queue
    if (videoIdPlaybackQueueRef.current.includes(latestVideoID)) {
      // No need to add it again in this case
      return;
    }

    const songToPopulate = songsRef.current.get(latestVideoID);
    if (!songToPopulate) {
      throw new Error(`Song with video ID ${latestVideoID} not present in downloaded playlist items`);
    }
    // Parses the raw title and retrieves metadata from MusicBrainz
    songToPopulate.populateMetadata();
    // Add this video ID to the playback queue
    const updatedQueue = [...videoIdPlaybackQueueRef.current, songToPopulate.videoId];
    videoIdPlaybackQueueRef.current = updatedQueue;
    setVideoIdPlaybackQueue(updatedQueue);
    
    // End condition: we received the callback for all songs. No need to
    // poll anymore after that.
    if (data.video_ids.length === data.total_tracks && pollIntervalRef.current) {
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

      const songsArray: Song[] = data.video_items.map((item: any) => {
        const newSong: Song = new Song(item.id, item.title);
        newSong.bestThumbnailUrl = item.thumbnails.reduce((best: any, current: any) => 
          (current.height * current.width) > (best.height * best.width) ? current : best
        ).url;
        return newSong;
      });

      // The songs map has the video ID as key, and the Song instance as value
      const songsMap = new Map(songsArray.map(song => [song.videoId, song]));

      setSongs(songsMap);
      songsRef.current = songsMap;
      setVideoIdPlaybackQueue([]);
      videoIdPlaybackQueueRef.current = [];
      setPlaylistName('YouTube Playlist');
      setIsNewGame(false);
      setVideoIdIndexInQueue(0); // This is a small lie for now (should be -1), but it simplifies our life later
      setIsInfoVisible(false);
      setAreExtraReleasesVisible(false);
      
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
    const hlsUrl = `${server}/hls-live/${videoId}`;
    
    try {
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

  const handlePrevious = () => {
    setVideoIdIndexInQueue((prev) => (prev > 0 ? prev - 1 : videoIdPlaybackQueue.length - 1));
    setIsInfoVisible(false);
    setAreExtraReleasesVisible(false);
  };

  const handleNext = () => {
    setVideoIdIndexInQueue((prev) => (prev < videoIdPlaybackQueue.length - 1 ? prev + 1 : 0));
    setIsInfoVisible(false);
    setAreExtraReleasesVisible(false);
  };

  const renderReleasesRows = () => {
    const rows: any = [];
    currentlyPlayingSong().allReleases.forEach((oneRelease: Release) => {
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
      if (songs.size > 0) {
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
  }, [songs.size, showServerSelect]);

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

  const currentlyPlayingSong = (): Song => {
    const toReturn = songs.get(videoIdPlaybackQueue[videoIdIndexInQueue]);
    if (!toReturn) {
      throw new Error(`Could not find song with video ID ${videoIdPlaybackQueue[videoIdIndexInQueue]}`);
    }
    return toReturn;
  }

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
            
            <label className="block text-sm font-medium mb-2 mt-4">Precooked Playlists:</label>
            <select 
              onChange={(e) => setPlaylistUrlInput(e.target.value)}
              className="p-2 border rounded w-full max-w-md"
            >
              <option value="">Select a playlist...</option>
              <option value="https://www.youtube.com/watch?v=djV11Xbc914&list=PLcMK01bSTnE43el39pnOjs9hFM3qtYRsN">gmonixter-test-01</option>
              <option value="https://www.youtube.com/watch?v=t99KH0TR-J4&list=PLcMK01bSTnE65yJUpsD4E3kAyy4kLBt7M">gmonixter-test-02</option>
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
      { videoIdPlaybackQueue.length === 0? (
          <div className="bg-gray-300 text-gray-600 p-4 rounded text-center">
            Please wait... preparing songs
          </div>)
          : (
        <div className="flex flex-col items-center bg-white shadow-md rounded-md p-4 w-full max-w-md">
          <h1 className="text-blue-500 text-lg">Playlist: {playlistName}</h1>
          <div className="py-4 px-8">
            <video 
              ref={videoRef}
              controls
              className="w-full max-w-md rounded"
            />
            <div onClick={() => startPlayback(videoIdPlaybackQueue[videoIdIndexInQueue])} className="cursor-pointer mt-2">
              <div className="bg-green-500 text-white p-4 rounded text-center hover:bg-green-600">
                ▶️ Play Video
              </div>
            </div>
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
                {currentlyPlayingSong().title || currentlyPlayingSong().rawYouTubeTitle}
              </h3>
              <p className="text-gray-500">
                {currentlyPlayingSong().year && currentlyPlayingSong().artist 
                  ? `${currentlyPlayingSong().year} - ${currentlyPlayingSong().artist}`
                  : 'No additional data available 🤷‍♂️'}
              </p>

              {(currentlyPlayingSong().bestThumbnailUrl) && (
                <img src={currentlyPlayingSong().bestThumbnailUrl}></img>
              )}

              {currentlyPlayingSong().title && currentlyPlayingSong().artist && (
                <a
                  href="#"
                  onClick={() =>
                    setAreExtraReleasesVisible(!areExtraReleasesVisible)
                  }
                  className="text-gray-500"
                >
                  Click to see other releases...
                </a>
              )}

              {areExtraReleasesVisible && (
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
            {/* Here we show the length of the playback queue, although
              the queue is potentially still growing and may change in size.  */}
            Song {videoIdIndexInQueue + 1} of {videoIdPlaybackQueue.length}
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
