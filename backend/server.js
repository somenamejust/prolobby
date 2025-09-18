// --- 1. IMPORTS ---
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const lobbyRoutes = require('./routes/lobbies');

// --- 2. APP INITIALIZATION ---
const app = express();
const PORT = 5000;

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

// --- 5. DATABASE CONNECTION & SERVER START ---
mongoose.connect('mongodb://localhost:27017/prolobby')
  .then(() => {
    console.log('Успешное подключение к MongoDB');
    // Start the server only after the database is connected
    app.listen(PORT, () => {
      console.log(`Сервер успешно запущен на порту ${PORT}`);
    });
  })
  .catch(err => console.error('Ошибка подключения к MongoDB:', err));