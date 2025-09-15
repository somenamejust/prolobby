const express = require('express');
const router = express.Router();
const Lobby = require('../models/Lobby'); // Импортируем модель лобби

// Маршрут для получения ВСЕХ лобби
// GET /api/lobbies
router.get('/', async (req, res) => {
  try {
    const lobbies = await Lobby.find(); // Находит все лобби в базе
    res.status(200).json(lobbies);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для получения ОДНОГО лобби по ID
// GET /api/lobbies/:id
router.get('/:id', async (req, res) => {
  try {
    const lobby = await Lobby.findOne({ id: req.params.id });
    if (!lobby) {
      return res.status(404).json({ message: 'Лобби не найдено' });
    }
    res.status(200).json(lobby);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для создания НОВОГО лобби
// POST /api/lobbies
router.post('/', async (req, res) => {
  try {
    // req.body будет содержать все данные, которые мы отправим с фронтенда
    const newLobby = new Lobby(req.body); 
    await newLobby.save(); // Сохраняем новое лобби в базу
    res.status(201).json(newLobby);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при создании лобби' });
  }
});

// --- 👇 ИСПРАВЛЕННЫЙ МАРШРУТ ДЛЯ ВХОДА В ЛОББИ 👇 ---
router.put('/:id/join', async (req, res) => {
  try {
    const { user, isSpectator } = req.body;
    const lobbyId = req.params.id;

    const lobby = await Lobby.findOne({ id: lobbyId });
    if (!lobby) {
      return res.status(404).json({ message: 'Лобби не найдено' });
    }

    if (isSpectator) {
      lobby.spectators.push(user);
    } else {
      const freeSlotIndex = lobby.slots.findIndex(slot => !slot.user);
      if (freeSlotIndex !== -1) {
        // Создаем чистый объект для слота, чтобы избежать проблем
        lobby.slots[freeSlotIndex].user = { 
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isReady: false 
        };
        lobby.players = (lobby.players || 0) + 1;
      } else {
        return res.status(400).json({ message: 'Лобби уже полное' });
      }
    }

    // Сохраняем изменения и ждем, пока они применятся
    const updatedLobby = await lobby.save();

    // Отправляем на фронтенд уже 100% обновленное лобби
    res.status(200).json(updatedLobby);

  } catch (error) {
    console.error("Ошибка на сервере при входе в лобби:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;