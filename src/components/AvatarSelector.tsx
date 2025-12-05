interface AvatarSelectorProps {
  onClose: () => void;
  onSelect: (avatarUrl: string) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Select Avatar</h2>
        <p>Avatar selection coming soon...</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded">
          Close
        </button>
      </div>
    </div>
  );
};
