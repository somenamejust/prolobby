const express = require('express');
const router = express.Router();
const Lobby = require('../models/Lobby');
const User = require('../models/User');

// Маршрут для получения ВСЕХ лобби
// GET /api/lobbies
router.get('/', async (req, res) => {
  try {
    // Находим все лобби, у которых статус НЕ РАВЕН ($ne) 'finished'
    const lobbies = await Lobby.find({ status: { $ne: 'finished' } });
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
    const lobbyId = req.params.id;
    const { user: userFromRequest } = req.body;
    
    if (!userFromRequest || !userFromRequest.id) {
      return res.status(400).json({ message: 'Некорректные данные пользователя' });
    }

    const lobby = await Lobby.findOne({ id: lobbyId });
    if (!lobby) {
      return res.status(404).json({ message: 'Лобби не найдено' });
    }

    // --- All other checks are correct ---
    if (lobby.bannedUsers && lobby.bannedUsers.includes(String(userFromRequest.id))) {
      return res.status(403).json({ message: "Вы были исключены из этого лобби и не можете войти снова." });
    }
    const isAlreadyInSlot = lobby.slots.some(slot => slot.user?.id === userFromRequest.id);
    if (isAlreadyInSlot) {
      return res.status(200).json(lobby);
    }

    // --- 👇 CORRECTED LOGIC 👇 ---

    // 1. Find the index of the first free slot
    const freeSlotIndex = lobby.slots.findIndex(slot => !slot.user);

    // 2. If no free slot is found (findIndex returns -1), THEN send the error
    if (freeSlotIndex === -1) {
      return res.status(400).json({ message: 'Лобби уже заполнено' });
    }
    
    // 3. If a slot IS found, add the user to that slot
    lobby.slots[freeSlotIndex].user = { 
      id: userFromRequest.id,
      _id: userFromRequest._id,
      email: userFromRequest.email,
      username: userFromRequest.username,
      avatarUrl: userFromRequest.avatarUrl,
      isReady: false 
    };

    // 4. Update player count and save
    lobby.players = lobby.slots.filter(s => s.user).length;
    lobby.markModified('slots');
    
    const updatedLobby = await lobby.save();
    res.status(200).json(updatedLobby);

  } catch (error) {
    console.error("Критическая ошибка на сервере при входе в лобби:", error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

router.put('/:id/leave', async (req, res) => {
  try {
    const lobbyId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID not provided' });
    }

    const lobby = await Lobby.findOne({ id: lobbyId });
    if (!lobby) {
      return res.status(200).json({ message: "Lobby no longer exists." });
    }

    // --- 👇 DIAGNOSTIC "SPY" LOG 👇 ---
    console.log('--- CHECKING DELETE CONDITIONS ---');
    console.log('Lobby Host ID:', lobby.host.id, '| Type:', typeof lobby.host.id);
    console.log('Leaving User ID:', userId, '| Type:', typeof userId);
    
    const isHostLeaving = String(lobby.host.id) === String(userId);
    console.log('Is Host Leaving?:', isHostLeaving);

    const playersAfterLeave = lobby.slots.filter(s => s.user && s.user.id !== userId);
    const isLobbyEmpty = playersAfterLeave.length === 0 && lobby.spectators.length === 0;
    console.log('Will Lobby Be Empty?:', isLobbyEmpty);
    console.log('---------------------------------');
    // --- End of Log ---

    if (isHostLeaving || isLobbyEmpty) {
      await Lobby.deleteOne({ id: lobbyId });
      console.log(`[Auto-Delete] Lobby ${lobbyId} deleted.`);
      return res.status(200).json({ message: "Lobby successfully deleted." });
    } else {
      // If not deleting, just update the lobby state
      lobby.slots = playersAfterLeave;
      lobby.players = playersAfterLeave.length;
      lobby.markModified('slots');
      const updatedLobby = await lobby.save();
      return res.status(200).json(updatedLobby);
    }

  } catch (error) {
    console.error("Error on server when leaving lobby:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put('/:id/occupy', async (req, res) => {
  try {
    const { userId, slot: targetSlotInfo } = req.body; // Получаем ID юзера и инфо о слоте (team, position)
    const lobby = await Lobby.findOne({ id: req.params.id });

    if (!lobby) return res.status(404).json({ message: "Лобби не найдено" });

    // TODO: Здесь нужна проверка баланса пользователя. 
    // Эту логику нужно будет добавить, когда у вас будет модель User на бэкенде.
    // Пока мы её пропустим, но помним о ней.

    const targetSlot = lobby.slots.find(s => s.team === targetSlotInfo.team && s.position === targetSlotInfo.position);
    if (!targetSlot) return res.status(404).json({ message: "Целевой слот не найден" });
    if (targetSlot.user) return res.status(400).json({ message: "Целевой слот уже занят" });

    const currentSlotIndex = lobby.slots.findIndex(s => s.user?.id === userId);
    const userAsSpectator = lobby.spectators.find(spec => spec.id === userId);
    
    // Сценарий 1: Игрок уже в слоте и хочет переместиться
    if (currentSlotIndex !== -1) {
      console.log("Игрок перемещается из одного слота в другой.");
      const userToMove = lobby.slots[currentSlotIndex].user; // Сохраняем данные пользователя
      lobby.slots[currentSlotIndex].user = null; // Освобождаем старый слот
      targetSlot.user = userToMove; // Занимаем новый слот
    } 
    // Сценарий 2: Зритель занимает слот
    else if (userAsSpectator) {
      console.log("Зритель занимает слот.");
      targetSlot.user = { ...userAsSpectator, isReady: false }; // Занимаем слот
      lobby.spectators = lobby.spectators.filter(spec => spec.id !== userId); // Удаляем из зрителей
    } 
    // Если пользователь не найден ни в слотах, ни в зрителях
    else {
      return res.status(404).json({ message: "Пользователь не найден в этом лобби" });
    }

    // Обновляем состояние и сохраняем
    lobby.players = lobby.slots.filter(s => s.user).length;
    lobby.markModified('slots');
    lobby.markModified('spectators');

    const updatedLobby = await lobby.save();
    res.status(200).json(updatedLobby);

  } catch (error) {
    console.error("Ошибка при попытке занять слот:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/:id/vacate', async (req, res) => {
  try {
    const { userId } = req.body;
    const lobby = await Lobby.findOne({ id: req.params.id });

    if (!lobby) return res.status(404).json({ message: "Лобби не найдено" });

    const slotIndex = lobby.slots.findIndex(s => s.user?.id === userId);
    if (slotIndex === -1) return res.status(404).json({ message: "Игрок не найден в слоте" });

    const userToMove = lobby.slots[slotIndex].user;

    // TODO: Здесь должна быть логика возврата денег (lobby.entryFee) на баланс userToMove.
    // Это потребует доступа к модели User.

    // Перемещаем пользователя
    lobby.slots[slotIndex].user = null; // Освобождаем слот
    if (!lobby.spectators.some(spec => spec.id === userId)) {
        lobby.spectators.push(userToMove); // Добавляем в зрители, если его там еще нет
    }
    lobby.players = lobby.slots.filter(s => s.user).length;

    lobby.markModified('slots');
    lobby.markModified('spectators');

    const updatedLobby = await lobby.save();
    res.status(200).json(updatedLobby);

  } catch (error) {
    console.error("Ошибка при освобождении слота:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/:id/ready', async (req, res) => {
  try {
    const lobbyId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Не указан ID пользователя' });
    }

    const lobby = await Lobby.findOne({ id: lobbyId });
    if (!lobby) {
      return res.status(404).json({ message: "Лобби не найдено" });
    }

    const slot = lobby.slots.find(s => s.user?.id === userId);
    if (!slot || !slot.user) {
      return res.status(404).json({ message: "Игрок не найден в этом лобби" });
    }

    // 1. Переключаем статус готовности конкретного игрока
    slot.user.isReady = !slot.user.isReady;

    // --- 👇 ВОТ ГЛАВНОЕ ИСПРАВЛЕНИЕ 👇 ---
    
    // 2. После изменения, проверяем, готовы ли теперь ВСЕ игроки
    const playersInSlots = lobby.slots.filter(s => s.user);
    const areAllPlayersReady = playersInSlots.length === lobby.maxPlayers && playersInSlots.every(p => p.user.isReady);

    if (areAllPlayersReady) {
      // 3. Если все готовы - запускаем отсчет!
      lobby.status = 'countdown';
      lobby.countdownStartTime = Date.now();
      console.log(`[Лобби ${lobby.id}] Все готовы! Запуск отсчета.`);
    } else {
      // 4. Если кто-то отменил готовность - сбрасываем таймер
      lobby.status = 'waiting';
      lobby.countdownStartTime = null;
      console.log(`[Лобби ${lobby.id}] Отмена готовности. Отсчет остановлен.`);
    }
    // --- Конец исправления ---

    lobby.markModified('slots'); // Помечаем массив как измененный

    const updatedLobby = await lobby.save();
    res.status(200).json(updatedLobby);

  } catch (error) {
    console.error("Ошибка при смене статуса готовности:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/:id/kick', async (req, res) => {
  try {
    const lobbyId = req.params.id;
    // С фронтенда мы получим ID того, КОГО кикаем, и ID того, КТО кикает (хост)
    const { userIdToKick, hostId } = req.body;

    if (!userIdToKick || !hostId) {
      return res.status(400).json({ message: 'Недостаточно данных для кика' });
    }

    const lobby = await Lobby.findOne({ id: lobbyId });
    if (!lobby) {
      return res.status(404).json({ message: "Лобби не найдено" });
    }

    console.log('--- ПРОВЕРКА ХОСТА ---');
    console.log('ID хоста, сохранённый в лобби:', lobby.host.id, '| Тип:', typeof lobby.host.id);
    console.log('ID хоста, пришедший с фронтенда:', hostId, '| Тип:', typeof hostId);

    // --- 🔐 САМАЯ ВАЖНАЯ ПРОВЕРКА: АВТОРИЗАЦИЯ ---
    // Сравниваем ID хоста из запроса с ID хоста, записанным в лобби
    // Примечание: Убедитесь, что вы сравниваете правильные поля (например, user.id и lobby.host.id)
    if (String(lobby.host.id) !== String(hostId)) {
      console.log('--- ПРОВЕРКА ПРОВАЛЕНА ---'); // Добавим лог, чтобы видеть результат
      return res.status(403).json({ message: "Только хост может кикать игроков!" });
    }

    // Находим слот игрока, которого нужно кикнуть
    const slotIndex = lobby.slots.findIndex(s => s.user?.id === userIdToKick);

    if (slotIndex !== -1) {
      lobby.bannedUsers.push(userIdToKick);
      lobby.slots[slotIndex].user = null; // Очищаем слот
      lobby.players = lobby.slots.filter(s => s.user).length; // Обновляем счётчик
      lobby.markModified('slots'); // Помечаем массив как измененный
    } else {
        return res.status(404).json({ message: "Кикаемый игрок не найден в слоте" });
    }

    const updatedLobby = await lobby.save();
    res.status(200).json(updatedLobby);

  } catch (error) {
    console.error("Ошибка при кике игрока:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/:id/start', async (req, res) => {
  try {
    const lobbyId = req.params.id;
    const { hostId } = req.body;

    const lobby = await Lobby.findOne({ id: lobbyId });
    if (!lobby) {
      return res.status(404).json({ message: "Lobby not found" });
    }

    // 1. 🔐 Security Check: Only the host can start the game
    if (String(lobby.host.id) !== String(hostId)) {
      return res.status(403).json({ message: "Only the host can start the game!" });
    }

    // 2. Logic Check: The game shouldn't already be in progress or finished
    if (lobby.status === 'in_progress' || lobby.status === 'finished') {
        return res.status(400).json({ message: "The game has already started or is finished." });
    }

    // 3. Update the lobby status
    lobby.status = 'in_progress';
    lobby.countdownStartTime = null; // Clear the timer just in case

    const updatedLobby = await lobby.save();
    res.status(200).json(updatedLobby);

  } catch (error)
    {
    console.error("Error starting game:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/chat', async (req, res) => {
  try {
    const { user, message } = req.body; // Получаем юзера и его сообщение

    // Проверка на пустые сообщения
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: "Сообщение не может быть пустым" });
    }

    const lobby = await Lobby.findOne({ id: req.params.id });
    if (!lobby) return res.status(404).json({ message: "Лобби не найдено" });

    // Создаем объект сообщения
    const newMessage = {
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl
      },
      message: message,
      timestamp: new Date() // Используем дату для возможной сортировки в будущем
    };

    lobby.chat.push(newMessage);
    lobby.markModified('chat');

    const updatedLobby = await lobby.save();
    res.status(200).json(updatedLobby);

  } catch (error) {
    console.error("Ошибка при отправке сообщения:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/:id/declare-winner', async (req, res) => {
  try {
    const { hostId, winningTeam } = req.body;
    const lobby = await Lobby.findOne({ id: req.params.id });

    // --- Проверки остаются без изменений ---
    if (!lobby) return res.status(404).json({ message: "Лобби не найдено" });
    if (String(lobby.host.id) !== String(hostId)) {
      return res.status(403).json({ message: "Только хост может определять победителя!" });
    }
    if (lobby.status !== 'in_progress') {
      return res.status(400).json({ message: "Игра не находится в процессе" });
    }

    const entryFee = lobby.entryFee;
    const winners = lobby.slots.filter(s => s.user && s.team === winningTeam).map(s => s.user);
    const losers = lobby.slots.filter(s => s.user && s.team !== winningTeam).map(s => s.user);
    
    // --- 👇 НОВАЯ И ПРАВИЛЬНАЯ ЛОГИКА РАСПРЕДЕЛЕНИЯ ПРИЗОВ 👇 ---

    // 1. Списываем деньги с проигравших
    for (const loser of losers) {
      await User.updateOne({ id: loser.id }, { $inc: { balance: -entryFee } });
      console.log(`[Списано] С игрока ${loser.username} списано ${entryFee}$.`);
    }

    // 2. Начисляем деньги победителям (каждый победитель получает взнос одного проигравшего)
    // Эта логика работает для игр 1v1, 2v2, 5v5 и т.д.
    const amountToWin = entryFee * (losers.length / winners.length);
    for (const winner of winners) {
      await User.updateOne({ id: winner.id }, { $inc: { balance: amountToWin } });
      console.log(`[Начислено] Игроку ${winner.username} начислено ${amountToWin}$.`);
    }
    
    // 3. Обновляем статус лобби
    lobby.status = 'finished';
    const updatedLobby = await lobby.save();

    res.status(200).json({ message: `Команда ${winningTeam} победила!`, lobby: updatedLobby });

  } catch (error) {
    console.error("Ошибка при распределении призов:", error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;