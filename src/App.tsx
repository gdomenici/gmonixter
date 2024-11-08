import React, { useState } from 'react';
// import { Camera } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import './App.css';

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

  const generateQRCode = (previewUrl: string): string => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(previewUrl)}`;
  };

  const handlePlaylistUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaylistUrl(e.target.value);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Example: https://open.spotify.com/playlist/1Bpgr72vuJwYXYqbdahtOO
      const playlistId = playlistUrl.split('/').at(-1);
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          'Authorization': 'Bearer BQAQE1dCFKe61vSilKyRw8GlmTOE0B2C7zqD_mI0ILNx3clymwnTe8c_B3dD2JrKDND1xCWZHwenBC6xOul1nx9NGlgFQgFLICtTRGwi0ujKls9iZYc'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist data');
      }

      const data = await response.json();
      setSongs(data.items.map((item: any) => ({
        title: item.track.name,
        year: new Date(item.track.album.release_date).getFullYear(),
        artist: item.track.artists[0].name,
        previewUrl: item.track.preview_url
      })));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

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
        <button onClick={handleSubmit} className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          Generate Cards
        </button>
      </div>

      {loading && (
        <Alert variant="default">
          <AlertTitle>Loading...</AlertTitle>
          <AlertDescription>Fetching playlist data from Spotify.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {songs.map((song, index) => (
          <div key={index} className="bg-white shadow-md rounded-md p-4 flex flex-col items-center">
            <img src={generateQRCode(song.previewUrl)} alt={`QR Code for ${song.title}`} className="w-full max-w-[150px] mb-2" />
            <div className="w-full border-b border-gray-300 mb-2" />
            <h3 className="text-lg font-medium">{song.title}</h3>
            <p className="text-gray-500">{song.year} - {song.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpotifyPlaylistCards;