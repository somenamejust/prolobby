// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Добавили Link
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, get, set } from 'firebase/database';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // <-- Новое состояние для логина
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) { /* ...проверки... */ }
    if (password.length < 4) { /* ...проверки... */ }

    try {
      // 1. Отправляем данные на наш бэкенд
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      // 2. Проверяем ответ от сервера
      if (!response.ok) {
        // Если сервер вернул ошибку (например, "email занят"), показываем ее
        throw new Error(data.message || 'Не удалось зарегистрироваться');
      }

      // 3. Если все успешно, логиним пользователя и переходим в профиль
      console.log('Пользователь успешно зарегистрирован:', data.user);
      login(data.user);
      navigate('/profile');
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-dark-surface p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Register</h2>
        {error && <p className="text-brand-red text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          
          {/* 👇 НОВОЕ ПОЛЕ "ЛОГИН" 👇 */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="username">
              Login (uniqe)
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-dark-bg border border-gray-600 rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-blue"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-dark-bg border border-gray-600 rounded w-full py-2 px-3 text-gray-200 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-blue"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-dark-bg border border-gray-600 rounded w-full py-2 px-3 text-gray-200 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-blue"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-brand-blue hover:bg-blue-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            >
              Register
            </button>
          </div>
          <p className="text-center text-gray-400 text-sm mt-4">
            Already have account? <Link to="/login" className="font-bold text-brand-blue hover:text-blue-400">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}