// src/pages/Friends.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios'; // 🎯 Импортируем axios для запросов
import UserProfileModal from '../components/UserProfileModal';

export default function Friends() {
  // --- 1. ОБНОВЛЯЕМ СОСТОЯНИЕ И КОНТЕКСТ ---
  // Убираем allUsers, так как он больше не нужен для поиска
  const { user, allUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } = useAuth();
  
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalUser, setModalUser] = useState(null);

  // 🎯 Новое состояние для хранения результатов поиска с сервера
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false); // Для индикатора загрузки

  const [friends, setFriends] = useState([]); // Для хранения полного списка друзей
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. useEffect: ЗАГРУЗКА СПИСКА ДРУЗЕЙ ---
  // Этот эффект срабатывает, когда меняется user.friends (например, после принятия заявки)
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.friends || user.friends.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await axios.post('/api/users/by-ids', { ids: user.friends });
        setFriends(response.data);
      } catch (error) {
        console.error("Не удалось загрузить список друзей:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFriends();
  }, [user]); // Зависимость от user, чтобы перезагружать друзей при обновлении

  // --- 2. useEffect: "ЖИВОЙ" ПОИСК ЧЕРЕЗ API ---
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        // --- 👇 DIAGNOSTIC LOG HERE 👇 ---
        console.log(`[Фронтенд] Отправка поискового запроса на сервер с term='${searchQuery}'`);

        const response = await axios.get(`/api/users/search`, {
          params: { 
            term: searchQuery,
            currentUserId: user.id 
          }
        });
        setSearchResults(response.data);
      } catch (error) {
        console.error("Ошибка поиска:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user.id]);

  // --- 3. Определяем, что показывать: результаты поиска или список друзей ---
  const displayedUsers = searchQuery.trim() ? searchResults : friends;

  const handleRemoveFriend = (friend) => {
    if (window.confirm(`Вы уверены, что хотите удалить ${friend.username} из друзей?`)) {
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
                placeholder="Поиск по логину или ID..."
                className="w-full px-4 py-2 bg-dark-surface border border-gray-600 rounded-lg mb-6 text-gray-200 focus:ring-brand-blue focus:border-brand-blue"
              />
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-gray-500 text-center">Loading...</p>
                ) : displayedUsers.length > 0 ? (
                  // The .map function is an expression, it needs to be contained properly
                  displayedUsers.map(foundUser => {
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
                            // --- 👇 POTENTIAL BUG FIX HERE TOO 👇 ---
                            // You were passing the whole request object, but acceptFriendRequest expects the request object from user.friendRequests.
                            // Let's find the correct request object to pass.
                            <button onClick={() => {
                                const request = user.friendRequests.find(req => req.fromUserId === foundUser.id);
                                acceptFriendRequest(request);
                            }} className="px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600">Принять заявку</button>
                          ) : (
                            <button onClick={() => sendFriendRequest(foundUser)} className="px-4 py-2 text-sm bg-brand-green hover:bg-green-400 text-white rounded-lg transition-colors">Добавить</button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : ( // <-- The syntax is now correct. The ternary continues after the .map() call.
                  <p className="text-gray-500 text-center">{searchQuery ? "Ничего не найдено." : "У вас пока нет друзей."}</p>
                )}
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