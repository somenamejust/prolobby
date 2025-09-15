import React from 'react';

export default function GameInProgressModal({ hostControls }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-40">
      <div className="bg-dark-surface rounded-lg shadow-xl p-8 text-center border border-gray-700">
        <h2 className="text-3xl font-bold mb-4 text-white">Game started!</h2>
        <p className="text-gray-400 mb-6">Log into the game client and accept the invitation in the lobby..</p>
        
        {hostControls && (
          <div className="mt-6 border-t border-gray-700 pt-6">
            {hostControls}
          </div>
        )}
      </div>
    </div>
  );
}