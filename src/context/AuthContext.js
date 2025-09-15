// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from "firebase/database";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    // 1. Сначала пытаемся быстро загрузить пользователя из localStorage, чтобы избежать "моргания"
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // 2. Подписываемся на обновления списка ВСЕХ пользователей из Firebase
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      const usersArray = usersData ? Object.values(usersData) : [];
      setAllUsers(usersArray);

      // 3. СИНХРОНИЗАЦИЯ: После получения свежих данных из Firebase,
      //    находим в них текущего пользователя и обновляем его локальное состояние.
      //    Это гарантирует, что `user` всегда будет самым актуальным.
      if (storedUser) {
        const currentUserFromStorage = JSON.parse(storedUser);
        const freshUserData = usersArray.find(u => u.id === currentUserFromStorage.id);
        if (freshUserData) {
          if (JSON.stringify(currentUserFromStorage) !== JSON.stringify(freshUserData)) {
            setUser(freshUserData);
            updateUserInStorage(freshUserData);
          }
        }
      }
    });
    
    // Отписываемся от слушателя при уходе со страницы
    return () => unsubscribe();
  }, []); // <-- Пустой массив [] ГАРАНТИРУЕТ, что этот код запустится только ОДИН РАЗ

  const sendFriendRequest = async (targetUser) => {
    if (!user) return;
    
    // Создаем копию, чтобы безопасно работать с данными
    let updatedUsers = JSON.parse(JSON.stringify(allUsers));
    const currentUserIndex = updatedUsers.findIndex(u => u.id === user.id);
    const targetUserIndex = updatedUsers.findIndex(u => u.id === targetUser.id);

    if (currentUserIndex === -1 || targetUserIndex === -1) return;

    // Инициализируем массивы, если их нет
    if (!updatedUsers[currentUserIndex].outgoingRequests) updatedUsers[currentUserIndex].outgoingRequests = [];
    if (!updatedUsers[targetUserIndex].friendRequests) updatedUsers[targetUserIndex].friendRequests = [];

    // Проверяем, не была ли заявка уже отправлена
    const isRequestAlreadySent = updatedUsers[currentUserIndex].outgoingRequests.some(req => req.toUserId === targetUser.id);
    if (isRequestAlreadySent) {
      console.log("Заявка этому пользователю уже отправлена.");
      return;
    }

    // Добавляем исходящую заявку себе
    updatedUsers[currentUserIndex].outgoingRequests.push({ toUserId: targetUser.id, toUsername: targetUser.username });
    
    // Добавляем входящую заявку цели (с аватаром для красивого отображения)
    updatedUsers[targetUserIndex].friendRequests.push({ 
      fromUserId: user.id, 
      fromUsername: user.username, 
      fromAvatarUrl: user.avatarUrl 
    });
    
    try {
      // Сохраняем обновленный список всех пользователей в Firebase
      await set(ref(db, 'users'), updatedUsers);

      // --- 👇 ВОТ ГЛАВНОЕ ИСПРАВЛЕНИЕ 👇 ---
      // После успешной записи в Firebase, обновляем локальное состояние текущего пользователя
      const updatedCurrentUser = updatedUsers[currentUserIndex];
      setUser(updatedCurrentUser); // Обновляем состояние в React
      updateUserInStorage(updatedCurrentUser); // Обновляем состояние в localStorage
      
      console.log("Заявка в друзья успешно отправлена!");
      addNotification(targetUser.id, `Пользователь ${user.username} отправил вам заявку в друзья.`);

    } catch (error) {
      console.error("Ошибка при отправке заявки в друзья:", error);
      alert("Не удалось отправить заявку.");
    }
  };

  const acceptFriendRequest = async (requestingUser) => {
    if (!user) return;

    let updatedUsers = JSON.parse(JSON.stringify(allUsers));
    const currentUserIndex = updatedUsers.findIndex(u => u.id === user.id);
    const requestingUserIndex = updatedUsers.findIndex(u => u.id === requestingUser.fromUserId);

    if (currentUserIndex === -1 || requestingUserIndex === -1) return;
    
    // Инициализируем массивы, если их нет
    if (!updatedUsers[currentUserIndex].friends) updatedUsers[currentUserIndex].friends = [];
    if (!updatedUsers[requestingUserIndex].friends) updatedUsers[requestingUserIndex].friends = [];
    
    // Добавляем друг друга в друзья
    updatedUsers[currentUserIndex].friends.push(requestingUser.fromUserId);
    updatedUsers[requestingUserIndex].friends.push(user.id);

    // Удаляем заявки
    updatedUsers[currentUserIndex].friendRequests = (updatedUsers[currentUserIndex].friendRequests || []).filter(req => req.fromUserId !== requestingUser.fromUserId);
    updatedUsers[requestingUserIndex].outgoingRequests = (updatedUsers[requestingUserIndex].outgoingRequests || []).filter(req => req.toUserId !== user.id);

    await set(ref(db, 'users'), updatedUsers);
  };

  const declineFriendRequest = async (requestingUser) => {
    if (!user) return;

    let updatedUsers = JSON.parse(JSON.stringify(allUsers));
    const currentUserIndex = updatedUsers.findIndex(u => u.id === user.id);
    const requestingUserIndex = updatedUsers.findIndex(u => u.id === requestingUser.fromUserId);

    if (currentUserIndex === -1 || requestingUserIndex === -1) return;

    // Просто удаляем заявки с обеих сторон
    updatedUsers[currentUserIndex].friendRequests = (updatedUsers[currentUserIndex].friendRequests || []).filter(req => req.fromUserId !== requestingUser.fromUserId);
    updatedUsers[requestingUserIndex].outgoingRequests = (updatedUsers[requestingUserIndex].outgoingRequests || []).filter(req => req.toUserId !== user.id);

    await set(ref(db, 'users'), updatedUsers);
  };

  const removeFriend = async (friendToRemove) => {
    if (!user) return;

    let updatedUsers = JSON.parse(JSON.stringify(allUsers));
    const currentUserIndex = updatedUsers.findIndex(u => u.id === user.id);
    const friendIndex = updatedUsers.findIndex(u => u.id === friendToRemove.id);

    if (currentUserIndex === -1 || friendIndex === -1) return;

    // Удаляем ID друг друга из списков друзей
    updatedUsers[currentUserIndex].friends = (updatedUsers[currentUserIndex].friends || []).filter(friendId => friendId !== friendToRemove.id);
    updatedUsers[friendIndex].friends = (updatedUsers[friendIndex].friends || []).filter(friendId => friendId !== user.id);
    
    await set(ref(db, 'users'), updatedUsers);
  };

  const updateUserInStorage = (updatedUser) => {
    if (updatedUser) {
      localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
      // Обновление общего списка `users` в localStorage больше не нужно,
      // так как Firebase теперь наш единственный источник правды для `allUsers`.
    } else {
      localStorage.removeItem('loggedInUser');
    }
  };

  const login = (userData) => {
    const userWithSession = { ...userData, currentLobbyId: null };
    setUser(userWithSession);
    updateUserInStorage(userWithSession);
  };

  const logout = () => {
    const currentUserEmail = user?.email;
    setUser(null);
    localStorage.removeItem('loggedInUser');

    if (!currentUserEmail) return;

    const allLobbies = JSON.parse(localStorage.getItem('lobbies')) || [];
    const cleanedLobbies = allLobbies.map(lobby => {
      const cleanedSpectators = (lobby.spectators || []).filter(spec => spec.email !== currentUserEmail);
      const cleanedSlots = (lobby.slots || []).map(slot => {
        if (slot.user?.email === currentUserEmail) {
          return { ...slot, user: null };
        }
        return slot;
      });
      // Пересчитываем игроков после очистки
      const players = cleanedSlots.filter(s => s.user).length;
      return { ...lobby, spectators: cleanedSpectators, slots: cleanedSlots, players: players };
    });
    localStorage.setItem('lobbies', JSON.stringify(cleanedLobbies));
  };
  
  const deductBalance = (amount) => {
    setUser(currentUser => {
      if (!currentUser || currentUser.balance < amount) {
        console.error("Попытка списать больше, чем на балансе, или нет пользователя");
        return currentUser;
      }
      const newBalance = currentUser.balance - amount;
      const updatedUser = { ...currentUser, balance: newBalance };
      
      console.log(`%c[Списано ${amount}] Стало: ${newBalance}`, 'color: red; font-weight: bold;');
      updateUserInStorage(updatedUser);
      return updatedUser;
    });
  };

  const refundBalance = (amount) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      const newBalance = currentUser.balance + amount;
      const updatedUser = { ...currentUser, balance: newBalance };
      
      console.log(`%c[Возвращено ${amount}] Стало: ${newBalance}`, 'color: green; font-weight: bold;');
      updateUserInStorage(updatedUser);
      return updatedUser;
    });
  };

  const depositBalance = (amount) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      const newBalance = (currentUser.balance || 0) + amount;
      const updatedUser = { ...currentUser, balance: newBalance };
      updateUserInStorage(updatedUser);
      return updatedUser;
    });
  };

  const withdrawBalance = (amount) => {
    setUser(currentUser => {
      if (!currentUser || (currentUser.balance || 0) < amount) {
        return currentUser;
      }
      const newBalance = currentUser.balance - amount;
      const updatedUser = { ...currentUser, balance: newBalance };
      updateUserInStorage(updatedUser);
      return updatedUser;
    });
  };
  
  const joinLobbySession = async (lobbyId) => {
    if (!user) return;

    try {
      // 1. Отправляем запрос на бэкенд, чтобы он сохранил currentLobbyId в MongoDB
      const response = await fetch('http://localhost:5000/api/auth/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, lobbyId: lobbyId }),
      });

      const updatedUserFromDB = await response.json();

      if (!response.ok) {
        throw new Error(updatedUserFromDB.message);
      }
      
      // 2. После успешного сохранения в базе, обновляем состояние на фронтенде
      setUser(updatedUserFromDB);
      updateUserInStorage(updatedUserFromDB);
      
      console.log(`Сессия обновлена. Текущее лобби: ${lobbyId}`);

    } catch (error) {
      console.error("Ошибка при обновлении сессии:", error);
    }
  };
  
  // --- 👇 ВОТ ИСПРАВЛЕННАЯ ФУНКЦИЯ 👇 ---
  const leaveLobbySession = () => {
    setUser(currentUser => {
      if (!currentUser) return null;
      const updatedUser = { ...currentUser, currentLobbyId: null };
      updateUserInStorage(updatedUser); // Используем единую функцию
      return updatedUser;
    });
  };

  const praiseUser = async (targetUser) => {
    let updatedUsers = JSON.parse(JSON.stringify(allUsers));
    const targetUserIndex = updatedUsers.findIndex(u => u.id === targetUser.id);
    if (targetUserIndex === -1) return;

    // Увеличиваем счетчик похвал
    if (!updatedUsers[targetUserIndex].praises) updatedUsers[targetUserIndex].praises = 0;
    updatedUsers[targetUserIndex].praises += 1;
    
    await set(ref(db, 'users'), updatedUsers);
  };

  const reportUser = async (targetUser) => {
    let updatedUsers = JSON.parse(JSON.stringify(allUsers));
    const targetUserIndex = updatedUsers.findIndex(u => u.id === targetUser.id);
    if (targetUserIndex === -1) return;

    // Увеличиваем счетчик жалоб
    if (!updatedUsers[targetUserIndex].reports) updatedUsers[targetUserIndex].reports = 0;
    updatedUsers[targetUserIndex].reports += 1;

    await set(ref(db, 'users'), updatedUsers);
  };


  const kickUser = async (targetUser, currentLobby) => {
    if (!currentLobby || !targetUser || !user) return; // Добавим проверку на user (хоста)

    // --- 👇 ЛОГИКА ВОЗВРАТА БАЛАНСА И УВЕДОМЛЕНИЯ 👇 ---
    // Нам нужно обновить данные другого пользователя, поэтому мы работаем с общим списком
    let allUsersFromDB = JSON.parse(JSON.stringify(allUsers));
    const targetUserIndex = allUsersFromDB.findIndex(u => u.id === targetUser.id);

    if (targetUserIndex !== -1) {
      const userToUpdate = allUsersFromDB[targetUserIndex];
      

      // 2. Добавляем уведомление для выгнанного игрока
      if (!userToUpdate.notifications) {
        userToUpdate.notifications = [];
      }
      const newNotification = {
        id: Date.now(),
        message: `Хост "${user.username}" выгнал вас из лобби "${currentLobby.title}".`,
        timestamp: Date.now(),
        isRead: false,
      };
      userToUpdate.notifications.unshift(newNotification); // Добавляем в начало

      // Сохраняем обновленные данные ВСЕХ пользователей в Firebase
      await set(ref(db, 'users'), allUsersFromDB);
    }
    // --- Конец новой логики ---

    // --- Логика удаления игрока из самого лобби (остается без изменений) ---
    const lobbiesRef = ref(db, 'lobbies');
    onValue(lobbiesRef, (snapshot) => {
      const allLobbies = snapshot.val() ? Object.values(snapshot.val()) : [];
      const lobbyIndex = allLobbies.findIndex(l => l.id === currentLobby.id);
      if (lobbyIndex === -1) return;

      const lobbyToUpdate = allLobbies[lobbyIndex];

      // Удаляем пользователя из слотов и зрителей
      lobbyToUpdate.spectators = (lobbyToUpdate.spectators || []).filter(spec => spec.id !== targetUser.id);
      lobbyToUpdate.slots = (lobbyToUpdate.slots || []).map(slot => {
        if (slot.user?.id === targetUser.id) {
          return { ...slot, user: null };
        }
        return slot;
      });
      lobbyToUpdate.players = lobbyToUpdate.slots.filter(s => s.user).length;

      set(ref(db, 'lobbies'), allLobbies);

    }, { onlyOnce: true });
  };

  const distributePrizes = async (winners, losers, prize, entryFee) => {
    let updatedUsers = JSON.parse(JSON.stringify(allUsers));

    // Начисляем выигрыш победителям
    winners.forEach(winnerEmail => {
      const userIndex = updatedUsers.findIndex(u => u.email === winnerEmail);
      if (userIndex !== -1) {
        updatedUsers[userIndex].balance = (updatedUsers[userIndex].balance || 0) + prize;
      }
    });

    // У проигравших уже списан entryFee, поэтому ничего не делаем.
    // Если бы логика была "списать после игры", мы бы списывали здесь.

    await set(ref(db, 'users'), updatedUsers);
  };

  const processPayouts = async (lobby) => {
    const winners = lobby.slots.filter(s => s.user && s.user.isReady); // Считаем победителями тех, кто был готов
    const prizePool = lobby.entryFee * lobby.players;
    const prizePerWinner = prizePool / winners.length;

    console.log(`Распределение призов для лобби ${lobby.id}. Призовой фонд: ${prizePool}`);

    let updatedUsers = JSON.parse(JSON.stringify(allUsers));
    
    winners.forEach(winnerSlot => {
      const userIndex = updatedUsers.findIndex(u => u.id === winnerSlot.user.id);
      if (userIndex !== -1) {
        updatedUsers[userIndex].balance += prizePerWinner;
        console.log(`Игроку ${winnerSlot.user.username} начислено ${prizePerWinner}`);
      }
    });

    await set(ref(db, 'users'), updatedUsers);
  };

  const addNotification = async (targetUserId, message) => {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      const allUsers = snapshot.val() || [];
      const targetUserIndex = allUsers.findIndex(u => u && u.id === targetUserId);

      if (targetUserIndex !== -1) {
        if (!allUsers[targetUserIndex].notifications) {
          allUsers[targetUserIndex].notifications = [];
        }
        const newNotification = {
          id: Date.now(),
          message: message,
          timestamp: Date.now(),
          isRead: false,
        };
        allUsers[targetUserIndex].notifications.unshift(newNotification); // Добавляем в начало
        set(ref(db, 'users'), allUsers);
      }
    }, { onlyOnce: true }); // Выполняем один раз
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      allUsers,
      login, 
      logout, 
      deductBalance, 
      refundBalance, 
      joinLobbySession, 
      leaveLobbySession, 
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      removeFriend,
      depositBalance, 
      withdrawBalance,
      praiseUser, 
      reportUser, 
      kickUser,
      addNotification,
      distributePrizes,
      processPayouts
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};