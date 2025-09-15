// src/components/NotificationsDropdown.jsx
import React from 'react';

export default function NotificationsDropdown({ notifications, onClear }) {
  return (
    <div className="absolute top-full mt-2 right-0 w-80 bg-dark-surface rounded-md shadow-lg z-20 border border-gray-700">
      <div className="p-3 flex justify-between items-center border-b border-gray-700">
        <h3 className="font-semibold text-white">Notifications</h3>
        <button onClick={onClear} className="text-xs text-blue-400 hover:underline">Clear</button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {(notifications && notifications.length > 0) ? (
          notifications.map(notif => (
            <div key={notif.id} className="p-3 border-b border-gray-800 hover:bg-gray-700">
              <p className="text-sm text-gray-300">{notif.message}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-gray-500">There are no new notifications.</p>
        )}
      </div>
    </div>
  );
}