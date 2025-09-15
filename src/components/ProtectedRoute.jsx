// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth(); // Получаем информацию о пользователе

  // Если пользователя нет (он не вошел в систему)
  if (!user) {
    // Перенаправляем его на страницу входа
    return <Navigate to="/login" />;
  }

  // Если пользователь есть, показываем тот компонент, который мы защищали
  return children;
};

export default ProtectedRoute;