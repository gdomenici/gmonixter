import React, { useState } from "react";

interface GuessProps {
  onClose: () => void;
  onSelect: (
    guessedTitle: boolean,
    guessedArtist: boolean,
    guessedYearDistance: number
    ) => void;
}

export const Guess: React.FC<GuessProps> = ({ onClose, onSelect }) => {
  const [guessedTitle, setGuessedTitle] = useState<boolean>(false);
  const [guessedArtist, setGuessedArtist] = useState<boolean>(false);
  const [guessedYearDistance, setGuessedYearDistance] = useState<number>(0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Select Avatar</h2>
        <p>Did you guess any of the following?...</p>
        <div className="flex">
          <input type="checkbox" onChange={(e) => setGuessedTitle(e.target.checked)}>
          Did I guess the title?
          </input> 
          <input type="checkbox" onChange={(e) => setGuessedArtist(e.target.checked)}>
          Did I guess the artist?
          </input> 
          <input type="text" onChange={(e) => setGuessedYearDistance(Number(e.target.value))}>
          Did I guess the year by what distance?
          </input> 
        </div>

        <button onClick={() => {
          onSelect(guessedTitle, guessedArtist, guessedYearDistance);
          onClose();
        }} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded">
          Close
        </button>
      </div>
    </div>
  );
};
