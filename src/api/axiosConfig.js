import axios from 'axios';

// Создаем экземпляр axios с базовой конфигурацией
const instance = axios.create({
  // Use the environment variable for production, fallback to localhost for development
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  withCredentials: true
});

export default instance;