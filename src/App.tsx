import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

import PlaylistSelector from "./PlaylistSelector";
import Song from "./components/types/Song";
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVideoIdsCountRef = useRef<number>(0);

  const getMetadataForSong = async (currentSong: Song): Promise<Song | null> => {
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
    if (!title.trim()) return null;

    try {
      const query = artist ? `"${title}" AND artist:"${artist}"` : `"${title}"`;
      const params = new URLSearchParams({ query, fmt: "json", limit: "10" });
      const response = await fetch(`https://musicbrainz.org/ws/2/release?${params}`);
      const data = await response.json();
      
      if (!data.releases || data.releases.length === 0) return null;

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
      return null;
    }
  };

  const pollDownloadState = async (playlistId: string, server: string) => {
    const url = `${server}/playlist-download-state?playlist_id=${playlistId}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.track_index && data.total_tracks && data.video_ids) {
        if (data.video_ids.length > lastVideoIdsCountRef.current) {
          const newVideoId = data.video_ids[data.video_ids.length - 1];
          
          setSongs(prevSongs => {
            const targetSong = prevSongs.find(song => song.videoId === newVideoId);
            if (targetSong) {
              getMetadataForSong(targetSong).then(songWithMetadata => {
                setSongs(currentSongs => {
                  if (songWithMetadata) {
                    return currentSongs.map(song => song.videoId === newVideoId ? songWithMetadata : song);
                  } else {
                    return currentSongs.filter(song => song.videoId !== newVideoId);
                  }
                });
              });
            }
            return prevSongs;
          });
          
          lastVideoIdsCountRef.current = data.video_ids.length;
        }
        
        if (data.video_ids.length === data.total_tracks && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleStartPolling = (playlistId: string, server: string, playlistUrl: string) => {
    lastVideoIdsCountRef.current = 0;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(() => pollDownloadState(playlistId, server), 1000);
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
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [songs.length]);

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
      <PlaylistSelector
        setSongs={setSongs}
        setPlaylistName={setPlaylistName}
        setPlaylistUrl={setPlaylistUrl}
        setIsNewGame={setIsNewGame}
        setCurrentIndex={setCurrentIndex}
        setIsInfoVisible={setIsInfoVisible}
        onStartPolling={handleStartPolling}
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
