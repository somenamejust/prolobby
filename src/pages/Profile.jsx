// src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Состояние для формы смены аватара
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarUpdate = (e) => {
    e.preventDefault();
    if (!newAvatarUrl.startsWith('http')) {
        alert("Пожалуйста, введите корректную ссылку на изображение.");
        return;
    }
    // Здесь должна быть логика обновления аватара.
    // Пока мы не можем менять user из AuthContext напрямую, мы обновим его в localStorage.
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
        users[userIndex].avatarUrl = newAvatarUrl;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Также обновляем залогиненного пользователя, чтобы изменения применились сразу
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        loggedInUser.avatarUrl = newAvatarUrl;
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

        alert("Аватар успешно обновлен! Изменения могут примениться после перезагрузки страницы.");
        setIsEditingAvatar(false);
        setNewAvatarUrl('');
        window.location.reload(); // Простой способ обновить данные
    }
  };

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-dark-surface rounded-lg shadow-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-6">
                <img 
                    src={user.avatarUrl} 
                    alt="Аватар пользователя" 
                    className="w-24 h-24 rounded-full border-4 border-gray-600"
                />
                <div>
                    <h1 className="text-3xl font-bold text-white">{user.username}</h1>
                    <p className="text-gray-400">{user.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="ml-auto bg-brand-red hover:bg-red-400 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    Exit
                </button>
            </div>
        </div>
        
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Statistics</h2>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-white">{user.praises || 0}</p>
              <p className="text-sm text-gray-400">Likes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{user.reports || 0}</p>
              <p className="text-sm text-gray-400">Reports</p>
            </div>
          </div>
        </div>

        <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Change profile image</h2>
            {!isEditingAvatar ? (
                <button onClick={() => setIsEditingAvatar(true)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors">
                    Change
                </button>
            ) : (
                <form onSubmit={handleAvatarUpdate} className="flex items-center gap-2">
                    <input 
                        type="text"
                        value={newAvatarUrl}
                        onChange={(e) => setNewAvatarUrl(e.target.value)}
                        placeholder="Enter image link..."
                        className="flex-grow px-3 py-2 bg-dark-bg border border-gray-600 rounded-md text-gray-200"
                    />
                    <button type="submit" className="px-4 py-2 bg-brand-blue hover:bg-blue-400 text-white rounded">Save</button>
                    <button type="button" onClick={() => setIsEditingAvatar(false)} className="px-4 py-2 border border-gray-600 rounded text-white hover:bg-gray-700">Отмена</button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
}