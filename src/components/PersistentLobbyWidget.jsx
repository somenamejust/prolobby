import React from 'react';
import { Link, useLocation  } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PersistentLobbyWidget() {
  const { user } = useAuth();
  const location = useLocation(); // <-- 2. Получаем информацию о текущем URL

  // --- 👇 3. ОБНОВЛЕННОЕ УСЛОВИЕ ДЛЯ ОТОБРАЖЕНИЯ 👇 ---
  // Показываем виджет, только если:
  // - Пользователь существует
  // - Он находится в лобби (currentLobbyId не null)
  // - И текущий путь НЕ является страницей этого лобби
  if (!user || !user.currentLobbyId || location.pathname === `/lobby/${user.currentLobbyId}`) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-dark-surface shadow-lg rounded-lg p-4 w-64 border border-gray-700 z-50">
      <p className="font-semibold text-white">You are already in the lobby.</p>
      <p className="text-sm text-gray-400 mb-2">Click to return</p>
      <Link 
        to={`/lobby/${user.currentLobbyId}`} 
        className="block text-center w-full bg-brand-blue text-white px-4 py-2 rounded hover:bg-blue-400 transition-colors"
      >
        Return
      </Link>
    </div>
  );
}