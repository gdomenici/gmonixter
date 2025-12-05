import { PlayMode } from "./components/types/PlayMode";

interface PlayModeSelectorProps {
  onModeSelect: (mode: PlayMode) => void;
}

const PlayModeSelector: React.FC<PlayModeSelectorProps> = ({ onModeSelect }) => {

  return (
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
            onClick={() => onModeSelect(PlayMode.Party)}
            className="flex-1 h-64 bg-cover bg-center rounded-lg cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800')" }}
          >
            <h2 className="text-4xl font-bold text-white bg-black bg-opacity-50 px-6 py-3 rounded">Party Mode</h2>
          </div>
        </div>
    </div>
  );
}

export default PlayModeSelector;

