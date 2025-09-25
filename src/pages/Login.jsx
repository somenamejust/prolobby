import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // 👇 2. Получаем функцию login и АКТУАЛЬНЫЙ список всех пользователей из контекста
  const { login } = useAuth(); 

  const handleSubmit = async (e) => {
      e.preventDefault();
      const success = await login(email, password);
      if (success) {
          navigate('/profile'); // Redirect to profile on successful login
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-dark-surface p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Login to your account</h2>
        {error && <p className="text-brand-red text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-dark-bg border border-gray-600 rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
              Log in
            </button>
          </div>
           <p className="text-center text-gray-400 text-sm mt-4">
            No account? <Link to="/register" className="font-bold text-brand-blue hover:text-blue-400">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}