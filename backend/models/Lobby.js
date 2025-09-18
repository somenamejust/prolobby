const mongoose = require('mongoose');

// Эта "схема" описывает, как будет выглядеть каждое лобби в базе данных
const lobbySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  host: { type: Object, required: true },
  game: { type: String, required: true },
  mode: { type: String, required: true },
  region: { type: String, required: true },
  type: { type: String, default: 'public' },
  password: { type: String, default: null },
  entryFee: { type: Number, default: 0 },
  maxPlayers: { type: Number, required: true },
  status: { type: String, default: 'waiting' },
  countdownStartTime: { type: Number, default: null },
  players: { type: Number, default: 1 },
  slots: { type: Array, default: [] },
  spectators: { type: Array, default: [] },
  chat: { type: Array, default: [] },
  bannedUsers: { type: [String], default: [] }
});

const Lobby = mongoose.model('Lobby', lobbySchema);

module.exports = Lobby;