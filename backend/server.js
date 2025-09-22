const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const mongoose = require('mongoose');

// Модели и маршруты
const Lobby = require('./models/Lobby');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const lobbyRoutes = require('./routes/lobbies');

// Инициализация
const app = express();
const server = http.createServer(app);
const PORT = 5000;

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT"]
  }
});

// Мидлвары (помощники)
app.set('socketio', io); // Делаем io доступным в роутах
app.use(cors());
app.use(express.json());

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/lobbies', lobbyRoutes);
app.use('/api/users', userRoutes);

// Логика Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Пользователь подключился: ${socket.id}`);

  socket.on('registerUser', (userId) => {
    socket.data.userId = userId;
    console.log(`[Регистрация] Сокет ${socket.id} зарегистрирован для пользователя ${userId}`);
  });

  socket.on('joinLobbyRoom', (lobbyId) => {
    const roomName = String(lobbyId);
    socket.join(roomName);
    console.log(`[Комната] Сокет ${socket.id} вошел в комнату ${roomName}`);
  });

  socket.on('sendChatMessage', async ({ lobbyId, user, message }) => {
    try {
      const lobby = await Lobby.findOne({ id: lobbyId });
      if (lobby) {
        const newMessage = { user, message, timestamp: new Date() };
        lobby.chat.push(newMessage);
        lobby.markModified('chat');
        const updatedLobby = await lobby.save();
        io.in(String(lobbyId)).emit('lobbyUpdated', updatedLobby.toObject());
      }
    } catch (error) {
      console.error("Ошибка в чате:", error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Пользователь отключился: ${socket.id}`);
  });
});

// Подключение к БД и запуск сервера
mongoose.connect('mongodb://localhost:27017/prolobby')
  .then(() => {
    console.log('Успешное подключение к MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Сервер с Socket.IO запущен на порту ${PORT}`);
    });
  })
  .catch(err => console.error('Ошибка подключения к MongoDB:', err));