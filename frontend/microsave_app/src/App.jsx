import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard';
import Groups from './pages/Groups';
import Loans from './pages/Loans';
import Transactions from './pages/Transactions';
import Members from './pages/Members';
import Chat from './pages/Assistant';
import AI from './pages/AI';
import FundWallet from './pages/FundWallet';

// Redirect to login if not authenticated
// Login stores user_id (not a token), so we check for that
const ProtectedRoute = ({ children }) => {
  const userId = localStorage.getItem('user_id');
  if (!userId) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/groups"       element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/loans"        element={<ProtectedRoute><Loans /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/members"      element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/chat"         element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/ai"           element={<ProtectedRoute><AI /></ProtectedRoute>} />
        <Route path="/fund-wallet"  element={<ProtectedRoute><FundWallet /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;