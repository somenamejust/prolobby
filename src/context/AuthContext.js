// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const updateUserInStorage = (updatedUser) => {
    if (updatedUser) {
      localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
    } else {
      localStorage.removeItem('loggedInUser');
    }
  };

  const login = (userData) => {
    setUser(userData);
    updateUserInStorage(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('loggedInUser');
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`/api/users/${user.id}`);
      const freshUserData = response.data;
      setUser(freshUserData);
      updateUserInStorage(freshUserData);
      console.log("Данные пользователя обновлены!", freshUserData);
    } catch (error) {
      console.error("Не удалось обновить данные пользователя:", error);
    }
  };

  const sendFriendRequest = async (recipient) => {
    if (!user || !recipient) return;

    try {
      const response = await axios.post('/api/users/friends/request', {
        senderId: user.id,
        recipientId: recipient.id
      });
      
      // This will only run if the request was successful
      toast.success(`Friend request sent to ${recipient.username}`);
      await refreshUser();

    } catch (error) {
      // This will only run if there was an error
      console.error("Failed to send friend request:", error);
      toast.error(error.response?.data?.message || "Could not send request.");
    }
  };

  const acceptFriendRequest = async (request) => {
    // requester - это объект пользователя, который отправил заявку
    if (!user || !request) return;

  try {
    await axios.post('/api/users/friends/accept', {
      userId: user.id,
      requesterId: request.fromUserId
    });
    toast.success(`Вы добавили ${request.fromUsername} в друзья!`);
    await refreshUser();

    } catch (error) {
      console.error("Не удалось принять заявку:", error);
      toast.error(error.response?.data?.message || "Произошла ошибка");
    }
  };

  const declineFriendRequest = async (request) => {
    if (!user || !request) return;
    await axios.post('/api/users/friends/decline', {
      userId: user.id,
      requesterId: request.fromUserId
    });
      toast.success(`Заявка от ${request.fromUsername} отклонена.`);
      await refreshUser();
  };

  const removeFriend = async (friend) => {
    if (!user || !friend) return;
    await axios.post('/api/users/friends/remove', {
      userId: user.id,
      friendId: friend.id
    });
    toast.success(`Пользователь ${friend.username} удален из друзей.`);
    await refreshUser();
  };

  const praiseUser = async (targetUser) => {
    try {
      await axios.post('/api/users/praise', { targetUserId: targetUser.id });
    } catch (error) {
      toast.error("Не удалось похвалить пользователя.");
    }
  };

  const reportUser = async (targetUser) => {
    try {
      await axios.post('/api/users/report', { targetUserId: targetUser.id });
      toast.success(`Вы пожаловались на ${targetUser.username}`);
    } catch (error) {
      toast.error("Не удалось пожаловаться на пользователя.");
    }
  };

  const joinLobbySession = (lobbyId) => {
    setUser(currentUser => {
      const updatedUser = { ...currentUser, currentLobbyId: lobbyId };
      updateUserInStorage(updatedUser);
      return updatedUser;
    });
  };

  const leaveLobbySession = async () => {
    // 👇 ДОБАВЛЕНЫ ПОДРОБНЫЕ ЛОГИ 👇
    console.log('[AuthContext.js] Запущена функция leaveLobbySession.');
    console.log('[AuthContext.js] Текущий объект user:', user);
    console.log('[AuthContext.js] ID текущего лобби в сессии:', user?.currentLobbyId);

    if (!user || !user.currentLobbyId) {
      console.error('[AuthContext.js] ВЫХОД ПРЕРВАН: нет пользователя или ID лобби в сессии.');
      return;
    }

    const lobbyId = user.currentLobbyId;
    const userId = user.id;

    try {
      console.log(`[AuthContext.js] Отправляю PUT запрос на /api/lobbies/${lobbyId}/leave`);
      await axios.put(`/api/lobbies/${lobbyId}/leave`, { userId });

      // После успешного выхода на сервере, обновляем состояние на клиенте
      setUser(currentUser => {
        const updatedUser = { ...currentUser, currentLobbyId: null };
        updateUserInStorage(updatedUser);
        return updatedUser;
      });
    } catch (error) {
      console.error("Не удалось выйти из лобби (ошибка axios):", error);
    }
  };

  // 🎯 НОВАЯ ФУНКЦИЯ: ПОПОЛНЕНИЕ БАЛАНСА
  const depositBalance = async (amount) => {
    try {
      await axios.post('/api/users/deposit', { userId: user.id, amount });
      await refreshUser(); // Обновляем данные пользователя, чтобы увидеть новый баланс
      toast.success(`Баланс успешно пополнен на ${amount}$`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Ошибка при пополнении.");
    }
  };

  // 🎯 НОВАЯ ФУНКЦИЯ: ВЫВОД СРЕДСТВ
  const withdrawBalance = async (amount) => {
    try {
      await axios.post('/api/users/withdraw', { userId: user.id, amount });
      await refreshUser(); // Обновляем данные, чтобы увидеть новый баланс
      toast.success(`Вы успешно вывели ${amount}$`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Ошибка при выводе средств.");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      refreshUser,
      login, 
      logout, 
      joinLobbySession, 
      leaveLobbySession, 
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      removeFriend,
      praiseUser, 
      reportUser,
      depositBalance,
      withdrawBalance
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};