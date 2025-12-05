import React, { useState, useEffect } from "react";
import { PlayMode } from "./components/types/PlayMode";
import { PlayerInfo } from "./components/types/PlayerInfo";
import { AvatarSelector } from "./components/AvatarSelector";

interface PlayModeSelectorProps {
  onModeSelect: (mode: PlayMode) => void;
  onPlayerInfosSelect: (players: PlayerInfo[]) => void;
}

const PlayModeSelector: React.FC<PlayModeSelectorProps> = ({ onModeSelect, onPlayerInfosSelect }) => {

  const [isPartyModeSelected, setIsPartyModeSelected] = useState<boolean>(false);
  const [playerInfos, setPlayerInfos] = useState<PlayerInfo[]> ([]);
  const [playerIndex, setPlayerIndex] = useState<number>(0);
  const [playerName, setPlayerName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState<boolean>(false);

  const handleAddPlayer = () => {
    if (!playerName.trim()) return;
    const newPlayer: PlayerInfo = {
      name: playerName,
      avatarUrl: avatarUrl || "",
      id: playerIndex,
      score: 0,
      color: ""
    };
    setPlayerInfos([...playerInfos, newPlayer]);
    setPlayerIndex(playerIndex + 1);
    setPlayerName("");
    setAvatarUrl(null);
  };

    
  return (
    <div>
      {isPartyModeSelected ? 
          (<div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Who's Playing?</h1>
              <div className="mb-4 flex items-center gap-4">
                <label className="font-semibold whitespace-nowrap">Player Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="🏣 KaraokeKing 🎤"
                  className="flex-1 px-3 py-2 border rounded"
                />
              </div>
              <div className="mb-4 flex items-center gap-4">
                <label className="font-semibold whitespace-nowrap">Player Avatar</label>
                <button
                  onClick={() => {

                      setShowAvatarSelector(true);
                    }
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Select...
                </button>
              </div>
              <button
                onClick={handleAddPlayer}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-6"
              >
                Add
              </button>
              {playerInfos.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-2">Players:</h2>
                  <ul className="mb-4">
                    {playerInfos.map((player) => (
                      <li key={player.id} className="py-1">
                        {player.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      onPlayerInfosSelect(playerInfos);
                      onModeSelect(PlayMode.Party);
                    }
                    }
                    className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Continue
                  </button>
                </div>
              )}
              {showAvatarSelector && (
                <AvatarSelector
                  onClose={() => setShowAvatarSelector(false)}
                  onSelect={(url) => {
                    setAvatarUrl(url);
                    setShowAvatarSelector(false);
                  }}
                />
              )}
          </div>)
        : (
          <div className="mb-4">
            <div>
              <img src="img/logo.png"></img>
            </div>
              <h1 className="text-2xl font-bold">Play Mode</h1>
              <p>Select your mode</p>
              <div className="flex gap-4 mt-6">
                <div 
                  onClick={() => onModeSelect(PlayMode.Free)}
                  className="flex-1 h-64 bg-cover bg-center rounded-lg cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800')" }}
                >
                  <h2 className="text-4xl font-bold text-white bg-black bg-opacity-50 px-6 py-3 rounded">Free Mode</h2>
                </div>
                <div 
                  onClick={() => setIsPartyModeSelected(true)}
                  className="flex-1 h-64 bg-cover bg-center rounded-lg cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800')" }}
                >
                  <h2 className="text-4xl font-bold text-white bg-black bg-opacity-50 px-6 py-3 rounded">Party Mode</h2>
                </div>
              </div>
          </div>
        )
      }
    </div>


  );
}

export default PlayModeSelector;

