// src/components/UserProfileModal.jsx
import React from 'react';

export default function UserProfileModal({ userToShow, onClose }) {
  if (!userToShow) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-surface rounded-lg shadow-xl w-full max-w-sm text-center p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
        <img src={userToShow.avatarUrl} alt="Аватар" className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-600" />
        <h2 className="text-2xl font-bold text-white">{userToShow.username}</h2>
        <p className="text-gray-400 mb-4">{userToShow.email}</p>
        <div className="flex justify-center gap-6 border-t border-gray-700 pt-4">
          <div>
            <p className="text-xl font-bold text-white">{userToShow.praises || 0}</p>
            <p className="text-sm text-gray-400">Likes</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{userToShow.reports || 0}</p>
            <p className="text-sm text-gray-400">Reports</p>
          </div>
        </div>
        <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}