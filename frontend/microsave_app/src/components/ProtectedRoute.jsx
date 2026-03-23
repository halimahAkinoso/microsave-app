import { Navigate } from "react-router-dom";
import { getStoredSession } from "../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const session = getStoredSession();
  if (!session?.accessToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;

