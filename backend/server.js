const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000; // Порт, на котором будет работать наш сервер

const authRoutes = require('./routes/auth');
const lobbyRoutes = require('./routes/lobbies')

// Подключаемся к MongoDB
// 'mongodb://localhost:27017/prolobby' - это стандартный адрес для локальной базы.
// 'prolobby' - это название нашей базы данных, оно создастся автоматически.
mongoose.connect('mongodb://localhost:27017/prolobby', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Успешное подключение к MongoDB'))
.catch(err => console.error('Ошибка подключения к MongoDB:', err));

// --- Middlewares ---
app.use(cors()); // 2. "Используем" cors. Эта строка должна быть ДО маршрутов.
app.use(express.json()); // Позволяет нашему серверу понимать JSON в запросах

// --- 👇 НОВЫЙ БЛОК: MIDDLEWARE ДЛЯ ЛОГИРОВАНИЯ 👇 ---
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] Получен запрос: ${req.method} ${req.originalUrl}`);
  next(); // Передаем запрос дальше по цепочке
});

app.use('/api/auth', authRoutes);
app.use('/api/lobbies', lobbyRoutes);

app.get('/', (req, res) => {
  res.send('Бэкенд-сервер работает и подключен к базе данных!');
});

// Запускаем сервер, чтобы он начал "слушать" запросы
app.listen(PORT, () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});