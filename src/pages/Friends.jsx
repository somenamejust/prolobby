// src/pages/FriendsPage.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';

export default function Friends() {
  const { user, allUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalUser, setModalUser] = useState(null);

  // --- 👇 ЛОГИКА ПОИСКА И ФИЛЬТРАЦИИ 👇 ---
  const displayedUsers = useMemo(() => {
    const friendsMap = new Map((user?.friends || []).map(friendId => [friendId, true]));

    if (searchQuery.trim() === '') {
      // Если поиск пуст, показываем только друзей
      return allUsers.filter(u => friendsMap.has(u.id));
    } else {
      // Если в поиске что-то есть, ищем по всей базе
      return allUsers.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }, [searchQuery, allUsers, user]);

  const handleRemoveFriend = (friend) => {
    if (window.confirm(`Are you sure to delete ${friend.username} from your friends?`)) {
      removeFriend(friend);
    }
  };


  if (!user) return <p>Загрузка...</p>;

  return (
    // Модальное окно и фон страницы уже должны быть темными из-за предыдущих правок
    <>
      <UserProfileModal userToShow={modalUser} onClose={() => setModalUser(null)} />
      
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-white">Друзья</h1>

          {/* --- Вкладки --- */}
          <div className="flex border-b border-gray-700 mb-6">
            <button 
              onClick={() => setActiveTab('friends')}
              className={`py-2 px-4 font-semibold transition-colors ${
                activeTab === 'friends' 
                  ? 'border-b-2 border-brand-blue text-brand-blue' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Мои друзья
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-4 font-semibold transition-colors relative ${
                activeTab === 'requests' 
                  ? 'border-b-2 border-brand-blue text-brand-blue' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Заявки в друзья
              {(user.friendRequests?.length || 0) > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-red text-white text-xs justify-center items-center">
                    {(user.friendRequests?.length || 0)}
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* --- Содержимое вкладки "Мои друзья" --- */}
          {activeTab === 'friends' && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-white">Поиск и список друзей</h2>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по логину..."
                className="w-full px-4 py-2 bg-dark-surface border border-gray-600 rounded-lg mb-6 text-gray-200 focus:ring-brand-blue focus:border-brand-blue"
              />
              <div className="space-y-3">
                {displayedUsers.length > 0 ? displayedUsers.map(foundUser => {
                  if (foundUser.id === user.id) return null;
                  
                  const isFriend = (user.friends || []).includes(foundUser.id);
                  const hasSentRequest = (user.outgoingRequests || []).some(req => req.toUserId === foundUser.id);
                  const hasReceivedRequest = (user.friendRequests || []).some(req => req.fromUserId === foundUser.id);

                  return (
                    <div key={foundUser.id} className="flex items-center justify-between bg-dark-surface p-3 rounded-lg border border-gray-700">
                      <div className="flex items-center gap-3">
                        <img src={foundUser.avatarUrl} alt="Аватар" className="w-12 h-12 rounded-full" />
                        <div>
                          <p className="font-bold text-white">{foundUser.username}</p>
                          <p className="text-sm text-gray-400">{foundUser.email}</p>
                        </div>
                      </div>
                      <div>
                        {isFriend ? (
                          <button onClick={() => handleRemoveFriend(foundUser)} className="px-4 py-2 text-sm bg-brand-red hover:bg-red-400 text-white rounded-lg transition-colors">Удалить</button>
                        ) : hasSentRequest ? (
                          <button className="px-4 py-2 text-sm bg-gray-600 text-gray-300 rounded-lg cursor-not-allowed">Заявка отправлена</button>
                        ) : hasReceivedRequest ? (
                          <button onClick={() => acceptFriendRequest(hasReceivedRequest)} className="px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600">Принять заявку</button>
                        ) : (
                          <button onClick={() => sendFriendRequest(foundUser)} className="px-4 py-2 text-sm bg-brand-green hover:bg-green-400 text-white rounded-lg transition-colors">Добавить</button>
                        )}
                      </div>
                    </div>
                  )
                }) : <p className="text-gray-500">Ничего не найдено.</p>}
              </div>
            </div>
          )}

          {/* --- Содержимое вкладки "Заявки" --- */}
          {activeTab === 'requests' && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-white">Входящие заявки</h2>
              <div className="space-y-3">
                {(user.friendRequests || []).length > 0 ? (
                  (user.friendRequests || []).map(request => (
                    <div key={request.fromUserId} className="flex items-center justify-between bg-dark-surface p-3 rounded-lg border border-gray-700">
                      <div className="flex items-center gap-3">
                        <img src={request.fromAvatarUrl} alt="Аватар" className="w-10 h-10 rounded-full" />
                        <p className="text-gray-300">Заявка от <span className="font-bold text-white">{request.fromUsername}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptFriendRequest(request)} className="px-4 py-2 text-sm bg-brand-green hover:bg-green-400 text-white rounded-lg">Принять</button>
                        <button onClick={() => declineFriendRequest(request)} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-lg">Отклонить</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Пока нет новых заявок.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}