import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard';
import Groups from './pages/Groups';
import Loans from './pages/Loans';
import Transactions from './pages/Transactions';
import Members from './pages/Members';
import Approvals from './pages/Approvals';
import Chat from './pages/Assistant';
import AI from './pages/AI';
import FundWallet from './pages/FundWallet';
import ProtectedRoute from './components/ProtectedRoute';

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
        <Route path="/approvals"    element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
        <Route path="/chat"         element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/ai"           element={<ProtectedRoute><AI /></ProtectedRoute>} />
        <Route path="/fund-wallet"  element={<ProtectedRoute><FundWallet /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
