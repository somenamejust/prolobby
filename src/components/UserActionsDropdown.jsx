import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function UserActionsDropdown({ targetUser, currentUser, lobby, onShowProfile }) {
  // Получаем все необходимые функции из контекста
  const { sendFriendRequest, praiseUser, reportUser, kickUser } = useAuth();
  
  // Локальное состояние, чтобы отслеживать, какие действия уже выполнены
  const [isPraised, setIsPraised] = useState(false);
  const [isReported, setIsReported] = useState(false);

  if (!currentUser || !targetUser || !lobby) {
    return null;
  }

  const isSelf = currentUser.id === targetUser.id;
  const isFriend = (currentUser.friends || []).includes(targetUser.id);
  const isHost = currentUser.email === lobby.host?.email;

  // Обработчики для кнопок
  const handlePraise = () => {
    praiseUser(targetUser);
    setIsPraised(true);
    toast.success(`Вы похвалили игрока ${targetUser.username}`);
  };

  const handleReport = () => {
    reportUser(targetUser);
    setIsReported(true);
    toast.error(`Вы пожаловались на игрока ${targetUser.username}`);
  };

  const handleKick = () => {
    if (window.confirm(`Вы уверены, что хотите выгнать ${targetUser.username} из лобби?`)) {
      kickUser(targetUser, lobby);
      toast(`${targetUser.username} был исключен из лобби.`);
    }
  };

  const handleAddFriend = () => {
    sendFriendRequest(targetUser);
    toast('Заявка в друзья отправлена!');
    // Здесь можно будет обновить состояние кнопки на "Заявка отправлена", если нужно
  };

  return (
    <div className="absolute top-full mt-2 right-0 w-48 bg-dark-surface rounded-md shadow-lg z-20 border border-gray-700 py-1">
      <button onClick={onShowProfile} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
        Profile
      </button>

      {!isSelf && (
        <>
          <div className="border-t border-gray-700 my-1"></div>
          
          {!isFriend && (
            <button onClick={handleAddFriend} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
              Add to friends
            </button>
          )}

          <button 
            onClick={handlePraise} 
            disabled={isPraised} 
            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
              isPraised 
                ? 'bg-green-500/10 text-brand-green cursor-not-allowed' // Полупрозрачный зеленый фон и яркий текст
                : 'text-gray-300 hover:bg-gray-700' // Стандартный стиль для темной темы
            }`}
          >
            {isPraised ? 'Liked 👍' : 'Like'}
          </button>

          <button 
            onClick={handleReport} 
            disabled={isReported} 
            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
              isReported 
                ? 'bg-red-500/10 text-brand-red cursor-not-allowed' // Полупрозрачный красный фон и яркий текст
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            {isReported ? 'Reported 👎' : 'Report'}
          </button>
          
          {isHost && (
            <>
              <div className="border-t border-gray-700 my-1"></div>
              <button onClick={handleKick} className="block w-full text-left px-4 py-2 text-sm text-brand-red hover:bg-red-500/10">
                Kick
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}