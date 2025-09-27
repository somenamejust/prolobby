import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from '../api/axiosConfig';
import { io } from "socket.io-client";

import UserProfileModal from '../components/UserProfileModal';
import UserActionsDropdown from '../components/UserActionsDropdown';
import GameInProgressModal from '../components/GameInProgressModal';
import cs2Logo from '../assets/images/cs2_logo2.png';
import cs2Bg from '../assets/images/Cs2dust2.png';
import dota2Bg from '../assets/images/dota2_bg3.jpg';

const GAME_ASSETS = {
  'CS2': {
    logo: cs2Logo,
    bg: cs2Bg,
  },
  'Valorant': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/1280px-Valorant_logo_-_pink_color_version.svg.png',
    bg: 'https://images.alphacoders.com/132/1322237.png',
  },
  'Dota 2': {
    logo: 'https://upload.wikimedia.org/wikipedia/ru/b/b8/Dota_2_Logo.png',
    bg: dota2Bg,
  },
  // Добавь другие игры по аналогии
  'Fortnite': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Fortnite_F_lettermark_logo.svg/1024px-Fortnite_F_lettermark_logo.svg.png',
    bg: 'https://images.alphacoders.com/131/1319629.jpg',
  },
  'Custom Game': {
    logo: '', // Можно оставить пустым или добавить стандартную иконку
    bg: 'https://images.alphacoders.com/133/1330026.png',
  }
};

export default function LobbyIn() {
  // --- 1. ХУКИ И СОСТОЯНИЯ ---
  const { lobbyId } = useParams();
  const { user, leaveLobbySession, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [modalUser, setModalUser] = useState(null);
  const [timer, setTimer] = useState(null);
  
  const [menuData, setMenuData] = useState({ targetUser: null, position: null });
  const dropdownRef = useRef(null);
  
  const chatContainerRef = useRef(null);
  const socketRef = useRef(null);

  // --- 2. ЭФФЕКТЫ ---
  // --- 1. useEffect: ТОЛЬКО ДЛЯ ПЕРВОНАЧАЛЬНОЙ ЗАГРУЗКИ ДАННЫХ ---
  useEffect(() => {
    let isMounted = true;
    const fetchInitialLobbyData = async () => {
      try {
        const response = await axios.get(`/api/lobbies/${lobbyId}`);
        if (isMounted) setLobby(response.data);
      } catch (error) {
        if (isMounted) {
          toast.error("Лобби не найдено или было удалено.");
          navigate('/lobby');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInitialLobbyData();
    return () => { isMounted = false; };
  }, [lobbyId, navigate]);

  // --- 2. useEffect: ТОЛЬКО ДЛЯ УПРАВЛЕНИЯ WEBSOCKET ---
  useEffect(() => {
    if (!lobbyId || !user) return; // Ждём, пока загрузится и лобби, и юзер

    const socket = io("https://1lobby.xyz");
    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit('joinLobbyRoom', lobbyId);
      socket.emit('registerUser', user.id); // Сообщаем серверу наш ID
    };
    const handleLobbyUpdate = (updatedLobbyData) => setLobby(updatedLobbyData);
    const handleLobbyDeleted = (data) => {
      toast.error(data.message);
      leaveLobbySession();
      navigate('/lobby');
    };
    // --- 👇 НОВЫЙ ОБРАБОТЧИК КИКА 👇 ---
    const handleYouWereKicked = (data) => {
      toast.error(data.message);
      leaveLobbySession();
      navigate('/lobby');
    };

    socket.on('connect', handleConnect);
    socket.on('lobbyUpdated', handleLobbyUpdate);
    socket.on('lobbyDeleted', handleLobbyDeleted);
    socket.on('youWereKicked', handleYouWereKicked); // <-- Подписываемся на новое событие

    return () => {
      socket.off('connect', handleConnect);
      socket.off('lobbyUpdated', handleLobbyUpdate);
      socket.off('lobbyDeleted', handleLobbyDeleted);
      socket.off('youWereKicked', handleYouWereKicked); // <-- Отписываемся
      socket.disconnect();
    };
  }, [lobbyId, user, navigate, leaveLobbySession]);

  // --- 3. useEffect: Этот эффект следит за состоянием `lobby` и решает, нужно ли перенаправлять пользователя.
  useEffect(() => {
      // Этот эффект теперь отвечает ТОЛЬКО за редирект после завершения игры.
      if (!lobby || isRedirecting || lobby.status !== 'finished') return;

      setIsRedirecting(true);
      toast.success("Игра завершена. Возвращение в лобби...");
      
      refreshUser().then(() => {
          setTimeout(() => {
              leaveLobbySession();
              navigate('/lobby');
          }, 4000);
      });
  }, [lobby, isRedirecting, navigate, leaveLobbySession, refreshUser]);

  // --- 4. useEffect: эффект для МЕНЮ
  useEffect(() => {
    // Эта функция будет вызываться при любом клике на странице
    const handleClickOutside = (event) => {
      // Проверяем, есть ли ref у нашего меню И был ли клик сделан ВНЕ этого меню
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Если да - закрываем меню
        setMenuData({ targetUser: null, position: null });
      }
    };

    // Добавляем "слушателя" на документ, только если меню открыто
    if (menuData.targetUser) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Функция очистки: убираем "слушателя", когда компонент "умирает" или меню закрывается
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuData]); // Этот эффект будет перезапускаться каждый раз, когда меняется menuData

  // --- 5. useEffect: ТАЙМЕР ---
  useEffect(() => {
    if (lobby?.status !== 'countdown' || !lobby.countdownStartTime) {
      setTimer(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = 60 - Math.floor((Date.now() - lobby.countdownStartTime) / 1000);
      if (remaining <= 0) {
        setTimer(0);
        clearInterval(interval);
        // Логика авто-старта игры теперь полностью на сервере, клиент просто ждёт смены статуса
      } else {
        setTimer(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lobby]);

  // --- useMemo для вычисления готовности (без изменений) ---
  const { allPlayersReady } = useMemo(() => {
    if (!lobby?.slots) return { allPlayersReady: false };
    const playersInSlots = lobby.slots.filter(slot => slot.user);
    return {
      allPlayersReady: playersInSlots.length === lobby.maxPlayers && playersInSlots.every(p => p.user.isReady)
    };
  }, [lobby]);
  
  // --- useEffect для прокрутки чата (без изменений) ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [lobby?.chat]);

  // --- 3. ОБРАБОТЧИКИ СОБЫТИЙ ---

    // --- 👇 5. ДОБАВЛЯЕМ ЕДИНЫЙ ОБРАБОТЧИК КЛИКА ПО ЮЗЕРУ 👇 ---
  const handleUserClick = (event, targetUser) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (menuData.targetUser?.id === targetUser.id) {
      setMenuData({ targetUser: null, position: null }); // Закрыть, если уже открыто
    } else {
      setMenuData({
        targetUser: targetUser,
        position: { top: event.pageY, left: event.pageX } // Открыть по координатам клика
      });
    }
  };

  const handleOccupySlot = async (slotToOccupy) => {
      if (!user || !lobby) return;

      try {
          const payload = { 
              userId: user.id, 
              slot: { team: slotToOccupy.team, position: slotToOccupy.position } 
          };
          const response = await axios.put(`/api/lobbies/${lobby.id}/occupy`, payload);

          // With axios, the updated lobby is in response.data
          // No need to check response.ok, axios does it for you
          setLobby(response.data); 

      } catch (error) {
          console.error("Ошибка при попытке занять слот:", error);
          // Axios puts server error messages in error.response.data.message
          toast.error(error.response?.data?.message || "Не удалось занять слот");
      }
  };

  const handleLeaveLobby = async () => {
    if (!user || !lobby) return;
    try {
      await leaveLobbySession();
      navigate('/lobby');
      toast.success("Вы покинули лобби.");
    } catch (error) {
      toast.error("Не удалось покинуть лобби.");
    }
  };

  const handleLeaveSlot = async () => {
    if (!user || !lobby) return;

    try {
        const response = await axios.put(`/api/lobbies/${lobby.id}/vacate`, { userId: user.id });
          
        setLobby(response.data);

    } catch (error) {
        console.error("Ошибка при освобождении слота:", error);
        toast.error(error.response?.data?.message || "Не удалось освободить слот");
    }
  };

  const handleReadyToggle = async () => {
    try {
      // Все запросы теперь используют axios
      const response = await axios.put(`/api/lobbies/${lobby.id}/ready`, { userId: user.id });
      setLobby(response.data); // Оптимистичное обновление больше не нужно, WebSocket сделает это за нас
    } catch (error) {
      toast.error(error.response?.data?.message || "Не удалось изменить статус");
    }
  };

  const handleStartGame = async () => {
      if (!user || !lobby || user.email !== lobby.host.email) {
          toast.error("Only the host can start the game.");
          return;
      }

      try {
          const response = await axios.put(`/api/lobbies/${lobby.id}/start`, { hostId: user.id });
          
          setLobby(response.data);
          toast.success("The game has started!");

      } catch (error) {
          console.error("Error starting game:", error);
          toast.error(error.response?.data?.message || "Failed to start the game");
      }
  };

  const handleDeclareWinner = async (winningTeam) => {
      if (!user || !lobby || user.email !== lobby.host.email) return;

      try {
          const payload = { 
              hostId: user.id, 
              winningTeam: winningTeam 
          };
          const response = await axios.post(`/api/lobbies/${lobby.id}/declare-winner`, payload);

          // The toast now uses the message directly from the server's response
          toast.success(response.data.message);
          
          // The redirection logic remains in the useEffect hook, so we don't need to do anything else here.

      } catch (error) {
          console.error("Ошибка при завершении игры:", error);
          toast.error(error.response?.data?.message || "Не удалось завершить игру");
      }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user || !lobby || !socketRef.current) return;

    // --- 👇 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ 👇 ---

    // 1. Создаем объект нового сообщения для немедленного отображения
    const newMessage = {
      user: { 
        id: user.id, 
        username: user.username, 
        avatarUrl: user.avatarUrl 
      },
      message: chatMessage,
      timestamp: new Date().toISOString() // Используем стандартный формат времени
    };

    // 2. ОПТИМИСТИЧНО обновляем локальное состояние. 
    //    Ваше сообщение мгновенно появится на экране.
    setLobby(prevLobby => ({
      ...prevLobby,
      chat: [...prevLobby.chat, newMessage]
    }));

    // 3. Отправляем данные на сервер в фоновом режиме
    socketRef.current.emit('sendChatMessage', {
      lobbyId: lobby.id,
      user: newMessage.user,
      message: newMessage.message
    });

    // 4. Сразу очищаем поле ввода
    setChatMessage('');
  };

  const handleKickPlayer = async (userToKick) => {
      if (!user || !lobby || user.email !== lobby.host.email) {
          toast.error("Только хост может выполнять это действие.");
          return;
      }

      if (!window.confirm(`Вы уверены, что хотите выгнать ${userToKick.username} из лобби?`)) {
          return;
      }

      try {
          const payload = { 
              userIdToKick: userToKick.id,
              hostId: user.id
          };
          const response = await axios.put(`/api/lobbies/${lobby.id}/kick`, payload);

          // No need to call setLobby here, the WebSocket update will handle it.
          // But you can leave it for instant feedback if you prefer.
          // setLobby(response.data);
          
          toast.success(`Игрок ${userToKick.username} был исключён.`);

      } catch (error) {
          console.error("Ошибка при кике игрока:", error);
          toast.error(error.response?.data?.message || "Не удалось кикнуть игрока");
      }
  };

  const hostWinnerControls = (
    user?.email === lobby?.host.email && lobby?.status === 'in_progress' && (
      <div className="flex flex-col items-center gap-3">
        <p className="font-semibold">Определите победителя:</p>
        <div className="flex gap-4">
          <button onClick={() => handleDeclareWinner('A')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Победа Команды А</button>
          <button onClick={() => handleDeclareWinner('B')} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Победа Команды B</button>
        </div>
      </div>
    )
  );


  // --- 4. ПРОВЕРКИ И JSX ---
  if (isLoading) {
    return <div className="p-8 text-center">Загрузка данных лобби...</div>;
  }

  if (!lobby) {
    return (
      <div className="p-8 text-center">
        <h1>Лобби не найдено!</h1>
        <p>Возможно, оно было удалено. <Link to="/lobby" className="text-blue-500 hover:underline">Вернуться к списку лобби</Link></p>
      </div>
    );
  }

  const currentUserSlot = (lobby.slots ?? []).find(slot => slot.user?.email === user?.email);
  const isCurrentUserSpectator = (lobby.spectators ?? []).some(spec => spec.email === user?.email);

  console.log("%cРЕНДЕР КОМПОНЕНТА. Статус isReady:", "color: purple;", currentUserSlot?.user?.isReady);

return (
    <>
      <UserProfileModal userToShow={modalUser} onClose={() => setModalUser(null)} />

      {/* --- 👇 ЕДИНОЕ "ПЛАВАЮЩЕЕ" МЕНЮ 👇 --- */}
      {menuData.targetUser && menuData.position && (
        <div 
          ref={dropdownRef}
          style={{ 
            position: 'absolute', 
            top: `${menuData.position.top + 5}px`, 
            left: `${menuData.position.left + 5}px`,
            zIndex: 30
          }}
        >
          <UserActionsDropdown
            onKickPlayer={handleKickPlayer} 
            targetUser={menuData.targetUser} 
            currentUser={user}
            lobby={lobby}
            onShowProfile={() => {
              setModalUser(menuData.targetUser);
              setMenuData({ targetUser: null, position: null });
            }}
          />
        </div>
      )}

            {/* --- 👇 ДОБАВЛЯЕМ УСЛОВНЫЙ РЕНДЕР ПОП-АПА "ИГРА НАЧАЛАСЬ" 👇 --- */}
      {lobby.status === 'in_progress' && (
        <GameInProgressModal 
          hostControls={hostWinnerControls} />
      )}
            
      {/* --- 👇 НОВЫЙ БАННЕР ЛОББИ 👇 --- */}
       <div 
        className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center filter blur-md -z-10"
        style={{ backgroundImage: `url(${GAME_ASSETS[lobby.game]?.bg})` }}
      ></div>

            {/* --- 👇 ИЗМЕНЕНИЕ ЗДЕСЬ: Добавляем градиентное затемнение 👇 --- */}
      <div 
        className="fixed top-0 left-0 w-screen h-screen -z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(17, 24, 39, 0), rgba(17, 24, 39, 0.94) 90%)' }}
      ></div>

       <div className="relative z-0">

        <div className="relative h-64 w-full flex flex-col items-center justify-center text-white font-orbitron">
          <h1 className="text-7xl font-orbitron font-bold" style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.7)" }}>{lobby.title}</h1>
          <p className="text-gray-300 text-3xl" style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.7)" }}>{lobby.game} - {lobby.mode}</p>
        </div>
      </div>

      {/* --- 👇 ДОБАВЛЯЕМ УСЛОВНЫЙ "БЛЮР" ДЛЯ ФОНА 👇 --- */}
      <div 
        className={`min-h-screen p-4 sm:p-8 transition-filter duration-300 ${
          lobby.status === 'in_progress' ? 'filter blur-md pointer-events-none' : ''
        }`}
          ref={(el) => {
            if (el) {
              if (lobby.status === 'in_progress') {
                document.body.classList.add('overflow-hidden');
              } else {
                document.body.classList.remove('overflow-hidden');
              }
            }
          }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
            
            {/* --- 1. Левая колонка: Зрители --- */}
            <div className="lg:col-span-2 bg-dark-surface/60 rounded-lg shadow-lg border border-brand-blue p-4 flex flex-col h-[925px] w-[450px]">
              <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 text-white font-orbitron text-center">Spectators ({(lobby.spectators ?? []).length})</h2>
              <ul className="space-y-2 flex-grow overflow-y-auto pr-2">
                {(lobby.spectators ?? []).map((spectator) => ( 
                  <li key={spectator.id} className="text-sm"> 
                    <button 
                      onClick={(e) => handleUserClick(e, spectator)}
                      className="flex items-center gap-2 w-full text-left text-gray-300 p-2 bg-dark-bg rounded hover:bg-gray-700"
                    >
                      <img src={spectator.avatarUrl} alt="Аватар" className="w-6 h-6 rounded-full" />
                      <span>{spectator.username}</span>
                    </button>
                  </li> 
                ))}
              </ul>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">

            {/* --- 2. Центральная часть: Слоты --- */}
            <div className="lg:col-span-2 p-4">
              
              <div className="flex justify-around items-start">
                
                {/* --- Колонка Команды А --- */}
                <div className="w-full">
                  <h3 className="font-bold font-orbitron text-lg mb-2 text-blue-400 text-center"
                  style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.7)" }}
                  >Team A</h3>
                  <div className="space-y-2">
                    {(lobby.slots ?? [])
                      .filter(s => s.team === 'A')
                      .map((slot, index) => (
                        <div className="max-w-xs mx-auto">
                          <div 
                            key={`${'A'}-${index}`} 
                            className={`relative rounded-md transition-transform hover:scale-105 flex items-center justify-center bg-dark-bg h-12 border-2 transition-colors ${
                              !slot.user
                                ? 'border-gray-700'
                                : slot.user.isReady
                                  ? 'border-brand-green'
                                  : 'border-amber-500'
                            }`}
                          >
                            {slot.user ? (
                              <>
                                <button onClick={(e) => handleUserClick(e, slot.user)} className="flex items-center gap-2 cursor-pointer rounded-md p-1 hover:bg-gray-700">
                                  <img src={slot.user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${slot.user.username}`} alt="Аватар" className="w-6 h-6 rounded-full" />
                                  <span className={`font-semibold ${lobby.host?.email === slot.user.email ? 'text-purple-400' : 'text-gray-200'}`}>
                                    {slot.user.username} {lobby.host?.email === slot.user.email && '👑'}
                                  </span>
                                </button>
                                {user && slot.user.email === user.email && (
                                  <button onClick={() => handleLeaveSlot(slot)} className="absolute font-orbitron inset w-full h-full flex items-center justify-center bg-yellow-500 bg-opacity-80 text-white font-bold opacity-0 hover:opacity-100 transition-opacity">
                                    LEAVE
                                  </button>
                                )}
                              </>
                            ) : (
                              <button onClick={() => handleOccupySlot(slot)} className="absolute rounded-md font-orbitron inset-0 w-full h-full flex items-center justify-center bg-green-500 bg-opacity-70 text-white font-bold opacity-0 hover:opacity-100 transition-opacity">
                                ENTER
                              </button>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* --- Разделитель "VS" --- */}
                <div className="flex-shrink-0 pt-16 text-2xl font-bold font-orbitron text-gray-600 flex items-center justify-center w-48">
                  {lobby.status === 'countdown' && timer !== null ? (
                    // Если идет отсчет, показываем ТАЙМЕР
                    <div className="text-center pt-16"
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.7)" }}
                    >
                      <p className="text-gray-200 text-6x1">START IN:</p>
                      <p className="text-5xl font-bold text-brand-blue animate-pulse">{timer}</p>
                    </div>
                  ) : (
                    <div className="flex items-center transition-transform hover:scale-105 justify-center pt-16 text-6xl font-bold font-orbitron text-white"
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.7)" }}
                    >
                      VS
                    </div>
                  )}  
                </div>

                {/* --- Колонка Команды B --- */}
                <div className="w-full">
                  <h3 className="font-bold font-orbitron text-lg mb-2 text-red-500 text-center"
                  style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.7)" }}
                  >Team B</h3>
                  <div className="space-y-2">
                    {(lobby.slots ?? [])
                      .filter(s => s.team === 'B')
                      .map((slot, index) => (
                        <div className="max-w-xs mx-auto">
                          <div 
                            key={`${'B'}-${index}`} 
                            className={`relative rounded-md transition-transform hover:scale-105 flex items-center justify-center bg-dark-bg h-12 border-2 transition-colors ${
                              !slot.user
                                ? 'border-gray-700'
                                : slot.user.isReady
                                  ? 'border-brand-green'
                                  : 'border-amber-500'
                            }`}
                          >
                            {slot.user ? (
                              <>
                                <button onClick={(e) => handleUserClick(e, slot.user)} className="flex items-center gap-2 cursor-pointer rounded-md p-1 hover:bg-gray-700">
                                  <img src={slot.user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${slot.user.username}`} alt="Аватар" className="w-6 h-6 rounded-full" />
                                  <span className={`font-semibold ${lobby.host?.email === slot.user.email ? 'text-purple-400' : 'text-gray-200'}`}>
                                    {slot.user.username} {lobby.host?.email === slot.user.email && '👑'}
                                  </span>
                                </button>
                                {user && slot.user.email === user.email && (
                                  <button onClick={() => handleLeaveSlot(slot)} className="absolute font-orbitron inset-0 w-full h-full flex items-center justify-center bg-yellow-500 bg-opacity-80 text-white font-bold opacity-0 hover:opacity-100 transition-opacity">
                                    LEAVE
                                  </button>
                                )}
                              </>
                            ) : (
                              <button onClick={() => handleOccupySlot(slot)} className="absolute rounded-md font-orbitron inset-0 w-full h-full flex items-center justify-center bg-green-500 bg-opacity-70 text-white font-bold opacity-0 hover:opacity-100 transition-opacity">
                                ENTER
                              </button>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
                
              </div>
            </div>


                {/* --- 👇 ОБНОВЛЕННЫЙ БЛОК С КНОПКАМИ И ТАЙМЕРОМ 👇 --- */}
              {/* Этот блок будет виден, если ты в лобби (игрок или зритель) */}
              {(currentUserSlot || isCurrentUserSpectator) && (
                <div className="flex flex-col items-center gap-4">

                  {/* Основные кнопки управления, которые видны, пока игра не началась */}
                  {lobby.status !== 'in_progress' && (
                    <div className="flex justify-center items-center gap-4">
                      {/* Кнопка "Подтвердить" / "Отменить" для игрока в слоте */}
                      {currentUserSlot && (
                        <button 
                          onClick={handleReadyToggle} 
                          className={`px-6 py-2 rounded-md font-semibold text-white transition-colors font-orbitron transition-transform hover:scale-105 ${
                            currentUserSlot.user?.isReady 
                              ? 'bg-gray-600 hover:bg-gray-500' 
                              : 'bg-brand-green hover:bg-green-400'
                          }`}
                        >
                          {currentUserSlot.user?.isReady ? 'CANCEL' : 'READY'}
                        </button>
                      )}

                      {/* Кнопка "Начать игру" для хоста (появляется, когда все готовы) */}
                      {user?.email === lobby.host.email && allPlayersReady && (
                      <button onClick={handleStartGame} className="px-6 py-2 font-orbitron rounded-md font-semibold bg-brand-blue hover:bg-blue-400 text-white transition-colors transition-transform hover:scale-105">
                        START
                      </button>
                      )}
                      <button onClick={handleLeaveLobby} className="px-6 py-2 font-orbitron rounded-md font-semibold bg-brand-red hover:bg-red-400 text-white transition-colors transition-transform hover:scale-105">
                        LEAVE
                      </button>
                    </div>
                  )}
                </div>
              )}

            {/* --- 3. Центральная часть: Чат --- */}
            <div className="rounded-lg flex flex-col h-[500px] mt-auto">
              
              {/* 👇 Этот div теперь управляет отступами и для сообщений, и для формы 👇 */}
              <div className="flex flex-col flex-grow p-2 overflow-hidden">
                
                {/* Контейнер для сообщений */}
                <div ref={chatContainerRef} className="flex-grow space-y-3 overflow-y-auto pr-2 no-scrollbar">
                  {(lobby.chat ?? []).map((msg, index) => ( 
                    <div key={index} className="flex items-start gap-2">
                      <img src={msg.user.avatarUrl} alt="Аватар" className="w-8 h-8 rounded-full mt-1"/>
                      <div className="flex-grow">
                        <button 
                          onClick={(e) => handleUserClick(e, msg.user)}
                          className="font-bold text-sm text-left text-gray-200 hover:underline"
                        >
                          {msg.user.username}
                        </button>
                        <p className="text-gray-300 p-2 rounded-lg break-words">{msg.message}</p>
                      </div>
                    </div> 
                  ))}  
                </div>

                {/* Форма отправки сообщения */}
                <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
                  <input 
                    type="text" 
                    value={chatMessage} 
                    onChange={(e) => setChatMessage(e.target.value)} 
                    className="w-full bg-dark-bg border border-gray-600 rounded-md p-2 text-gray-200" 
                    placeholder="Your message..."
                  />
                  <button 
                    type="submit" 
                    className="text-2xl bg-brand-blue hover:bg-blue-400 text-white px-4 rounded-md flex-shrink-0"
                  >
                    »
                  </button>
                </form>
              </div>
            </div>
          </div>  

            {/* --- 4. Правая колонка: Друзья (2 из 8) --- */}
            <div className="lg:col-span-2 bg-dark-surface/60 ml-auto rounded-lg shadow-lg border border-brand-blue p-4 flex flex-col w-[450px]">
              <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 text-white font-orbitron text-center">Friends</h2>
              {/* Здесь будет контент для списка друзей */}
              <div className="flex-grow text-gray-500 flex items-center justify-center">
                <p>Скоро здесь появятся друзья...</p>
              </div>
            </div>
          </div> 

        </div>
      </div>
    </>
  );
}