import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Tournaments from "./pages/Tournaments";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import ProtectedRoute from './components/ProtectedRoute';
import Balance from './pages/Balance';
import LobbyIn from './pages/LobbyIn';
import PersistentLobbyWidget from './components/PersistentLobbyWidget';
import Friends from './pages/Friends';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Navbar /> 
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<ProtectedRoute>
            <Profile />
          </ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/balance" 
          element={
            <ProtectedRoute>
              <Balance />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/lobby/:lobbyId" // lobbyId будет ID конкретного лобби
          element={
            <ProtectedRoute>
              <LobbyIn />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/friends" 
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PersistentLobbyWidget />
    </Router>
  );
}

export default App;
