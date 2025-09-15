import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, set } from "firebase/database";
import toast from 'react-hot-toast';
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
  const { user, allUsers, deductBalance, refundBalance, joinLobbySession, leaveLobbySession, distributePrizes, processPayouts } = useAuth();
  const navigate = useNavigate();

  const [allLobbies, setAllLobbies] = useState([]);
  const [lobby, setLobby] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [modalUser, setModalUser] = useState(null);

  const allLobbiesRef = useRef([]);

  const [timer, setTimer] = useState(null);

  // --- 👇 3. ИЗМЕНЯЕМ СОСТОЯНИЕ ДЛЯ ДРОПДАУНА 👇 ---
  // Убираем activeDropdown, добавляем menuData
  const [menuData, setMenuData] = useState({ targetUser: null, position: null });
  const dropdownRef = useRef(null); // Ref для отслеживания кликов вне меню

  // --- 2. ЭФФЕКТЫ ---
  useEffect(() => {
    const fetchLobbyData = async () => {
      setIsLoading(true);
      try {
        // Запрашиваем у бэкенда инфо именно об этом лобби
        const response = await fetch(`http://localhost:5000/api/lobbies/${lobbyId}`);
        if (!response.ok) {
          throw new Error('Лобби не найдено');
        }
        const data = await response.json();
        setLobby(data);
      } catch (error) {
        console.error("Ошибка при загрузке данных лобби:", error);
        setLobby(null); // Если ошибка, лобби не найдено
      } finally {
        setIsLoading(false);
      }
    };

    fetchLobbyData();
    // Этот useEffect теперь не зависит от общего списка лобби
  }, [lobbyId]);

  useEffect(() => {
    if (lobby?.status !== 'countdown') {
      setTimer(null);
      return;
    }

    const interval = setInterval(() => {
      const startTime = lobby.countdownStartTime;
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = 60 - elapsed;

      if (remaining <= 0) {
        setTimer(0);
        // Если я хост, я запускаю игру, когда таймер истек
        if (user?.email === lobby.host.email) {
          handleStartGame();
        }
        clearInterval(interval);
      } else {
        setTimer(remaining);
      }
    }, 1000);

    return () => clearInterval(interval); // Очищаем интервал при уходе
  }, [lobby, user]); // Следим за изменениями в лобби

  const { playersInSlots, allPlayersReady } = useMemo(() => {
    if (!lobby || !lobby.slots) return { playersInSlots: [], allPlayersReady: false };
    
    const players = lobby.slots.filter(slot => slot.user);
    return {
      playersInSlots: players,
      allPlayersReady: players.length === lobby.maxPlayers && players.every(p => p.user.isReady)
    };
  }, [lobby]);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    // Если "якорь" привязан к элементу...
    if (chatContainerRef.current) {
      // ...прокручиваем его до самого низа
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [lobby?.chat]);

  // --- 3. ОБРАБОТЧИКИ СОБЫТИЙ ---

  const updateLobbiesInFirebase = (updatedLobbies) => {
    return set(ref(db, 'lobbies'), updatedLobbies);
  };

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

  const handleOccupySlot = (slotToOccupy) => {
    if (!user || !lobby) return;

    const updatedLobbies = JSON.parse(JSON.stringify(allLobbiesRef.current));
    const lobbyIndex = updatedLobbies.findIndex(l => l.id === lobby.id);
    if (lobbyIndex === -1) return;
    
    const currentLobby = updatedLobbies[lobbyIndex];
    if (!currentLobby.slots) currentLobby.slots = [];
    if (!currentLobby.spectators) currentLobby.spectators = [];

    const currentUserSlotIndex = currentLobby.slots.findIndex(s => s.user?.email === user.email);

    if (currentUserSlotIndex !== -1) {
      // Сценарий 1: Игрок перемещается (ничего не меняем, все верно)
      const newSlotIndex = currentLobby.slots.findIndex(s => s.team === slotToOccupy.team && s.position === slotToOccupy.position);
      if (currentUserSlotIndex === newSlotIndex) return;
      const oldUserData = currentLobby.slots[currentUserSlotIndex].user;
      currentLobby.slots[currentUserSlotIndex].user = null;
      if (newSlotIndex !== -1) {
        currentLobby.slots[newSlotIndex].user = oldUserData;
      }
    } else {
      // Сценарий 2: Зритель занимает слот
      const entryFee = lobby.entryFee;

      // 👇 ПРОВЕРКА БАЛАНСА ОСТАЕТСЯ 👇
      if (user.balance < entryFee) { 
        alert("Недостаточно средств!"); 
        return; 
      }
      
      // ❌ СПИСАНИЕ БАЛАНСА УБИРАЕМ ❌
      // deductBalance(entryFee);
      
      currentLobby.spectators = currentLobby.spectators.filter(spec => spec.email !== user.email);
      const slotIndex = currentLobby.slots.findIndex(s => s.team === slotToOccupy.team && s.position === slotToOccupy.position);
      if (slotIndex !== -1) {
        currentLobby.slots[slotIndex].user = { ...user, isReady: false };
        currentLobby.players = currentLobby.slots.filter(s => s.user).length;
      }
    }
    updateLobbiesInFirebase(updatedLobbies);
  };

  const handleLeaveLobby = async () => {
    if (!user || !lobby) return;

    let lobbiesToUpdate = JSON.parse(JSON.stringify(allLobbies));
    const lobbyIndex = lobbiesToUpdate.findIndex(l => l.id === lobby.id);
    if (lobbyIndex === -1) {
      leaveLobbySession();
      navigate('/lobby');
      return;
    }

    const currentLobby = lobbiesToUpdate[lobbyIndex];
    
    // ❌ УДАЛЯЕМ ВЕСЬ ЭТОТ БЛОК ❌
    /*
    const userSlot = (currentLobby.slots ?? []).find(slot => slot.user?.email === user.email);
    if (userSlot) {
      refundBalance(currentLobby.entryFee);
    }
    */
    
    const playersInLobby = (currentLobby.slots.filter(s => s.user).length + (currentLobby.spectators ?? []).length);
    
    if (playersInLobby <= 1) {
      lobbiesToUpdate = lobbiesToUpdate.filter(l => l.id !== lobby.id);
    } else {
      currentLobby.spectators = (currentLobby.spectators ?? []).filter(spec => spec.email !== user.email);
      currentLobby.slots = (currentLobby.slots ?? []).map(slot => {
        if (slot.user?.email === user.email) return { ...slot, user: null };
        return slot;
      });
      currentLobby.players = currentLobby.slots.filter(s => s.user).length;
    }
    
    try {
      await updateLobbiesInFirebase(lobbiesToUpdate);
      leaveLobbySession();
      navigate('/lobby');
    } catch (error) {
      console.error("Ошибка при выходе из лобби:", error);
      toast.error("Произошла ошибка при выходе из лобби.");
    }
  };

  const handleLeaveSlot = () => {
    if (!user || !lobby) return;

    // ❌ УДАЛЯЕМ ЭТУ СТРОКУ ❌
    // refundBalance(lobby.entryFee);
    
    // Используем данные из ref, а не из state
    const updatedLobbies = JSON.parse(JSON.stringify(allLobbiesRef.current));
    const lobbyIndex = updatedLobbies.findIndex(l => l.id === lobby.id);
    if (lobbyIndex === -1) return;
    
    const currentLobby = updatedLobbies[lobbyIndex];
    if (!currentLobby.slots) currentLobby.slots = [];
    if (!currentLobby.spectators) currentLobby.spectators = [];

    const slotIndex = currentLobby.slots.findIndex(s => s.user?.email === user.email);
    if (slotIndex !== -1) {
      currentLobby.slots[slotIndex].user = null;
      currentLobby.players = currentLobby.slots.filter(s => s.user).length;
    }
    
    const isAlreadySpectator = currentLobby.spectators.some(spec => spec.email === user.email);
    if (!isAlreadySpectator) {
      currentLobby.spectators.push(user);
    }
    
    updateLobbiesInFirebase(updatedLobbies);
  };

  const handleConfirmReady = () => {
    if (!user || !lobby) return;

    // Используем данные из ref для максимальной актуальности
    const updatedLobbies = JSON.parse(JSON.stringify(allLobbiesRef.current));
    const lobbyIndex = updatedLobbies.findIndex(l => l.id === lobby.id);
    if (lobbyIndex === -1) return;

    const currentLobby = updatedLobbies[lobbyIndex];
    const slotIndex = (currentLobby.slots || []).findIndex(s => s.user?.email === user.email);

    if (slotIndex !== -1) {
      // 1. Меняем статус готовности текущего игрока
      const currentState = currentLobby.slots[slotIndex].user.isReady;
      currentLobby.slots[slotIndex].user.isReady = !currentState;
      
      // --- 👇 НОВАЯ ЛОГИКА ДЛЯ ЗАПУСКА ТАЙМЕРА 👇 ---

      // 2. После изменения, проверяем, готовы ли теперь ВСЕ игроки
      const playersInSlots = currentLobby.slots.filter(slot => slot.user);
      const areAllPlayersReady = playersInSlots.length === currentLobby.maxPlayers && playersInSlots.every(p => p.user.isReady);

      if (areAllPlayersReady) {
        // 3. Если все готовы - запускаем отсчет!
        currentLobby.status = 'countdown';
        currentLobby.countdownStartTime = Date.now();
      } else {
        // 4. Если кто-то отменил готовность - сбрасываем таймер
        currentLobby.status = 'waiting';
        currentLobby.countdownStartTime = null;
      }
      // --- Конец новой логики ---

      // 5. Мгновенно обновляем интерфейс локально
      setLobby(currentLobby); 
      
      // 6. Отправляем все изменения в Firebase
      updateLobbiesInFirebase(updatedLobbies);
    }
  };

  const handleStartGame = () => {
    if (user?.email !== lobby?.host?.email) return;

    const updatedLobbies = JSON.parse(JSON.stringify(allLobbiesRef.current));

    const lobbyIndex = updatedLobbies.findIndex(l => l.id === lobby.id);
    if (lobbyIndex === -1) {
      console.error("Не удалось найти лобби для старта игры.");
      return;
    }

    updatedLobbies[lobbyIndex].status = 'in_progress';
    updateLobbiesInFirebase(updatedLobbies);
  };

  const handleDeclareWinner = async (winningTeam) => {
    if (!user || user.email !== lobby.host.email || !lobby) return;

    // 1. Получаем самый свежий список всех пользователей
    let allUsersToUpdate = JSON.parse(JSON.stringify(allUsers));
    
    // 2. Определяем победителей и проигравших
    const winners = (lobby.slots ?? []).filter(slot => slot.user && slot.team === winningTeam);
    const losers = (lobby.slots ?? []).filter(slot => slot.user && slot.team !== winningTeam);
    const entryFee = lobby.entryFee;

    // 3. Формируем призовой фонд, СПИСЫВАЯ деньги со ВСЕХ
    const prizePool = entryFee * (winners.length + losers.length);
    const prizePerWinner = winners.length > 0 ? prizePool / winners.length : 0;
    
    // 4. Обновляем балансы
    // Сначала проигравшие
    losers.forEach(loserSlot => {
      const userIndex = allUsersToUpdate.findIndex(u => u.id === loserSlot.user.id);
      if (userIndex !== -1) {
        allUsersToUpdate[userIndex].balance -= entryFee;
      }
    });

    // Затем победители
    winners.forEach(winnerSlot => {
      const userIndex = allUsersToUpdate.findIndex(u => u.id === winnerSlot.user.id);
      if (userIndex !== -1) {
        // Баланс = (текущий баланс - взнос) + выигрыш
        allUsersToUpdate[userIndex].balance = (allUsersToUpdate[userIndex].balance - entryFee) + prizePerWinner;
      }
    });
    
    try {
      // 5. Сохраняем обновленные балансы
      await set(ref(db, 'users'), allUsersToUpdate);
      toast.success(`Призы начислены команде ${winningTeam}!`);
      
      // 6. Удаляем лобби
      const updatedLobbies = allLobbies.filter(l => l.id !== lobby.id);
      await updateLobbiesInFirebase(updatedLobbies);
      
      // 7. Очищаем сессию (навигация сработает автоматически)
      leaveLobbySession();

    } catch (error) {
      console.error("Ошибка при завершении игры:", error);
      toast.error("Не удалось завершить игру.");
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user || !lobby) return;
    
    // 👇 Используем данные из ref, а не из state
    const updatedLobbies = JSON.parse(JSON.stringify(allLobbiesRef.current));
    const lobbyIndex = updatedLobbies.findIndex(l => l.id === lobby.id);
    if (lobbyIndex === -1) return;
    
    const currentLobby = updatedLobbies[lobbyIndex];
    if (!currentLobby.chat) currentLobby.chat = [];
    currentLobby.chat.push({ user, message: chatMessage });
    
    updateLobbiesInFirebase(updatedLobbies);
    setChatMessage('');
  };


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
                          onClick={handleConfirmReady} 
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