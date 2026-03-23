import { useEffect, useState } from "react";

const SESSION_KEY = "microsave_session";

export function getStoredSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(accessToken, user) {
  const session = {
    accessToken,
    user,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem("token", accessToken);
  localStorage.setItem("user_id", String(user.id));
  localStorage.setItem("user_name", user.name);
  localStorage.setItem("user_email", user.email);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
}

export function useAuth() {
  const [session, setSession] = useState(() => getStoredSession());

  useEffect(() => {
    const onStorage = () => setSession(getStoredSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    session,
    user: session?.user ?? null,
    token: session?.accessToken ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    setSession: (accessToken, user) => {
      saveSession(accessToken, user);
      setSession({ accessToken, user });
    },
    clear: () => {
      clearSession();
      setSession(null);
    },
  };
}

