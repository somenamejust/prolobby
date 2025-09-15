import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from "react-router-dom";
import "./navbar.css"; // твой файл со стилями
import { useAuth } from '../context/AuthContext';
import NotificationsDropdown from './NotificationsDropdown';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- 👇 ИЗМЕНЕНИЯ В УПРАВЛЕНИИ СОСТОЯНИЕМ 👇 ---
  // Состояние для дропдауна профиля
  const [isProfileOpen, setProfileOpen] = useState(false); 
  const profileRef = useRef(null); 
  
  // Новое состояние для "плавающего" меню уведомлений
  const [notificationsMenu, setNotificationsMenu] = useState({ isOpen: false, position: null });
  const notificationsRef = useRef(null);

  // --- 👇 ОБНОВЛЕННЫЙ useEffect ДЛЯ ЗАКРЫТИЯ ОБОИХ МЕНЮ 👇 ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Закрываем меню профиля
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      // Закрываем меню уведомлений
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsMenu({ isOpen: false, position: null });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileRef, notificationsRef]); // Теперь следим за обоими ref

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBellClick = (event) => {
    event.stopPropagation();
    if (notificationsMenu.isOpen) {
      setNotificationsMenu({ isOpen: false, position: null });
    } else {
      setNotificationsMenu({
        isOpen: true,
        position: { top: event.pageY, left: event.pageX }
      });
    }
  };

  return (
    <> {/* Оборачиваем, чтобы добавить плавающее меню уведомлений */}

      {/* --- ЕДИНОЕ "ПЛАВАЮЩЕЕ" МЕНЮ УВЕДОМЛЕНИЙ --- */}
      {notificationsMenu.isOpen && notificationsMenu.position && (
        <div 
          ref={notificationsRef}
          style={{ 
            position: 'absolute', 
            top: `${notificationsMenu.position.top + 20}px`, 
            left: `${notificationsMenu.position.left}px`,
            transform: 'translateX(-100%)',
            zIndex: 50
          }}
        >
          {/* Для дропдауна уведомлений тоже нужно будет сделать темную тему */}
          <NotificationsDropdown notifications={user.notifications} onClear={() => { /* логика очистки */ }} />
        </div>
      )}

      {/* 👇 Используем новые цвета для фона и рамки 👇 */}
      <header className="sticky top-0 z-40 backdrop-filter backdrop-blur-lg bg-dark-surface/80 border-b border-gray-700">
        {/* 👇 Создаем центральный контейнер с максимальной шириной и отступами 👇 */}
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* --- Левая часть --- */}
            <div className="flex items-center gap-8"> {/* Увеличили gap */}
              <Link to="/" className="font-orbitron text-2xl font-bold text-white transition-opacity hover:opacity-80">
                1Lobby
              </Link>
              {/* 👇 Улучшенные ссылки навигации 👇 */}
              <nav className="hidden md:flex items-center gap-4">
              <NavLink to="/lobby" className={({isActive}) => `px-4 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-brand-blue text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                Lobbies
              </NavLink>
              <NavLink to="/tournaments" className={({isActive}) => `px-4 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-brand-blue text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                Tournaments
              </NavLink>
              <NavLink to="/stats" className={({isActive}) => `px-4 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-brand-blue text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                Statistics
              </NavLink>
            </nav>
          </div>

            <div className="auth ml-auto flex items-center gap-5"> {/* Используем ml-auto для прижатия вправо */}
              {user ? (
                <> {/* Используем Фрагмент вместо лишнего div */}
                  <Link to="/balance" className="h-10 flex items-center text-sm font-semibold text-brand-green hover:opacity-80 transition-opacity">
                    ${user.balance ? user.balance.toFixed(2) : '0.00'}
                  </Link>

                  {/* Дропдаун профиля */}
                  <div className="relative h-10 flex items-center" ref={profileRef}>
                    <NavLink 
                      to="/profile"
                      className={({isActive}) => `dropdown-trigger ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setProfileOpen(!isProfileOpen);
                      }}
                    >
                      <div className="flex items-center gap-2 text-gray-200 hover:text-brand-blue">
                        <img src={user.avatarUrl} alt="Аватар" className="w-8 h-8 rounded-full border-2 border-gray-500" />
                        <span>{user.username}</span>
                      </div>
                    </NavLink>
                    {isProfileOpen && (
                      // 👇 ВОТ ИЗМЕНЕНИЯ 👇
                      <div className="absolute top-full right-0 mt-2 w-48 bg-dark-surface rounded-md shadow-lg z-20 border border-gray-700 p-1">
                        <Link 
                          to="/profile" 
                          className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md" 
                          onClick={() => setProfileOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link 
                          to="/friends" 
                          className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md" 
                          onClick={() => setProfileOpen(false)}
                        >
                          Friends
                        </Link>
                        <div className="border-t border-gray-700 my-1"></div> {/* Разделитель */}
                        <button 
                          onClick={handleLogout} 
                          className="block w-full text-left px-3 py-2 text-sm text-brand-red hover:bg-red-500/10 rounded-md"
                        >
                          Exit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* --- Колокольчик --- */}
                  <div className="relative h-10 flex items-center">
                    <button 
                      onClick={handleBellClick} 
                      className="relative text-gray-400 hover:text-brand-blue transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {(user.notifications?.length || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-red text-white text-xs justify-center items-center">
                            {user.notifications.length}
                          </span>
                        </span>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white">Вход</Link>
                  <Link to="/register" className="px-3 py-2 rounded-md text-sm font-medium bg-brand-blue text-white hover:bg-blue-400">Регистрация</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}