// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Импортируем нашу модель

// Маршрут для регистрации: POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Проверяем, не занят ли email или username
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email или логином уже существует' });
    }

    const newUser = new User({
      id: Date.now(),
      email,
      username,
      password, // В реальном приложении пароль нужно хэшировать
      avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
    });

    await newUser.save(); // Сохраняем нового пользователя в базу данных

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован', user: newUser });

  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для входа: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Ищем пользователя по email в базе данных MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      // Если пользователь не найден
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    // 2. Проверяем, совпадает ли пароль
    if (user.password !== password) {
      // Если пароль неверный
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    // 3. Если все верно, отправляем данные пользователя на фронтенд
    res.status(200).json({ message: 'Успешный вход', user: user });

  } catch (error) {
    console.error("Ошибка на сервере при входе:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для обновления сессии лобби
// PUT /api/auth/session
router.put('/session', async (req, res) => {
  try {
    const { userId, lobbyId } = req.body; // Получаем ID пользователя и ID лобби

    // Находим пользователя и обновляем только его currentLobbyId
    const updatedUser = await User.findOneAndUpdate(
      { id: userId }, // Найти пользователя по его уникальному id
      { $set: { currentLobbyId: lobbyId } }, // Установить новое значение
      { new: true } // Вернуть обновленный документ
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.status(200).json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при обновлении сессии' });
  }
});

module.exports = router;