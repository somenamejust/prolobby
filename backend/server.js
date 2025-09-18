// --- 1. IMPORTS ---
const express = require('express');
const http = require('http'); // 👈 Import Node's built-in http module
const { Server } = require("socket.io"); // 👈 Import Server from socket.io
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const lobbyRoutes = require('./routes/lobbies');

// --- 2. APP INITIALIZATION ---
const app = express();
const server = http.createServer(app); // 👈 Create an http server using your Express app
const PORT = 5000;

// 👈 Configure Socket.IO to work with the server and allow your frontend origin
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your frontend URL
    methods: ["GET", "POST", "PUT"]
  }
});

app.set('socketio', io);

// --- 3. CORE MIDDLEWARE (This is the critical part) ---
// These helpers MUST come before the routes.

// Allows requests from your frontend (localhost:3000)
app.use(cors());

// Allows the server to parse incoming JSON data and create req.body
app.use(express.json()); 

// Optional: A simple logger for all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  // You can also log the body here to see if the parser worked
  // console.log('Request Body:', req.body); 
  next();
});

// --- 4. ROUTES ---
// Now that the middleware is set up, we can define the routes.
app.use('/api/auth', authRoutes);
app.use('/api/lobbies', lobbyRoutes);
app.use('/api/users', userRoutes);

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  console.log('🔌 A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });

  socket.on('joinLobbyRoom', (lobbyId) => {
    socket.join(lobbyId);
    console.log(`User ${socket.id} joined room ${lobbyId}`);
  });

  socket.on('leaveLobbyRoom', (lobbyId) => {
    socket.leave(lobbyId);
    console.log(`User ${socket.id} left room ${lobbyId}`);
  });
});

// --- 5. DATABASE CONNECTION & SERVER START ---
mongoose.connect('mongodb://localhost:27017/prolobby')
  .then(() => {
    console.log('Успешное подключение к MongoDB');
    // Start the server only after the database is connected
    server.listen(PORT, () => {
      console.log(`🚀 Server with Socket.IO is running on port ${PORT}`);
    });
  })
  .catch(err => console.error('Ошибка подключения к MongoDB:', err));