import axios from 'axios';

// Создаем экземпляр axios с базовой конфигурацией
const instance = axios.create({
  baseURL: 'http://localhost:5000', // Указываем базовый URL вашего API
  withCredentials: true // 👈 САМАЯ ВАЖНАЯ СТРОКА
});

export default instance;