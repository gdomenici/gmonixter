import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface Song {
  title: string;
  year: number;
  artist: string;
  previewUrl: string;
}

const SpotifyPlaylistCards: React.FC = () => {
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isInfoVisible, setIsInfoVisible] = useState<boolean>(false);

  const generateQRCode = (previewUrl: string): string => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(previewUrl)}`;
  };

  const handlePlaylistUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaylistUrl(e.target.value);
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

  const extractPlaylistId = (url: string): string => {
    // Remove any query parameters
    const baseUrl = url.split('?')[0];
    // Split by '/' and get the playlist ID
    const parts = baseUrl.split('/');
    return parts[4] || '';
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentIndex(0);
      setIsInfoVisible(false);

      const playlistId = extractPlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error('Invalid playlist URL');
      }

      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SPOTIFY_ACCESS_TOKEN}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist data');
      }

      const data = await response.json();
      
      // Filter out songs without preview URLs and map to our Song interface
      const validSongs = data.items
        .filter((item: any) => item.track && item.track.preview_url)
        .map((item: any) => ({
          title: item.track.name,
          year: new Date(item.track.album.release_date).getFullYear(),
          artist: item.track.artists[0].name,
          previewUrl: item.track.preview_url
        }));

      if (validSongs.length === 0) {
        throw new Error('No playable songs found in this playlist');
      }

      // Shuffle the filtered songs
      const shuffledSongs: Song[] = shuffleArray(validSongs);
      setSongs(shuffledSongs);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : songs.length - 1));
    setIsInfoVisible(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < songs.length - 1 ? prev + 1 : 0));
    setIsInfoVisible(false);
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (songs.length > 0) {
        if (event.key === 'ArrowLeft') {
          handlePrevious();
        } else if (event.key === 'ArrowRight') {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [songs.length]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Paste Spotify Playlist URL"
          value={playlistUrl}
          onChange={handlePlaylistUrlChange}
          className="p-2 border rounded w-full max-w-md"
        />
        <button 
          onClick={handleSubmit} 
          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Generate Cards
        </button>
      </div>

      {loading && (
        <div className="text-center p-4">Loading...</div>
      )}

      {error && (
        <div className="text-red-500 p-4">{error}</div>
      )}

      {songs.length > 0 && (
        <div className="flex flex-col items-center bg-white shadow-md rounded-md p-4 w-full max-w-md">
          <img 
            src={generateQRCode(songs[currentIndex].previewUrl)} 
            alt={`QR Code for ${songs[currentIndex].title}`} 
            className="w-full max-w-[200px] mb-4"
          />
          
          <button
            onClick={() => setIsInfoVisible(!isInfoVisible)}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-between"
          >
            <span>Click here to reveal info...</span>
            {isInfoVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {isInfoVisible && (
            <div className="w-full mt-2 p-2">
              <h3 className="text-lg font-medium">{songs[currentIndex].title}</h3>
              <p className="text-gray-500">
                {songs[currentIndex].year} - {songs[currentIndex].artist}
              </p>
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
        </div>
      )}
    </div>
  );
};

export default SpotifyPlaylistCards;