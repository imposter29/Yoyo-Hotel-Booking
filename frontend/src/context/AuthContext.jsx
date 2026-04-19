import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('yoyo_token') || null,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('yoyo_token', action.payload.token);
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
    case 'LOGOUT':
      localStorage.removeItem('yoyo_token');
      return { ...state, user: null, token: null, loading: false, error: null };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const rehydrate = async () => {
      if (!state.token) { dispatch({ type: 'SET_LOADING', payload: false }); return; }
      try {
        const data = await authAPI.getMe();
        dispatch({ type: 'SET_USER', payload: data.data?.user || null });
      } catch {
        dispatch({ type: 'LOGOUT' });
      }
    };
    rehydrate();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const data = await authAPI.login(credentials);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.data?.user, token: data.token } });
    return data.data?.user;
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const data = await authAPI.register(userData);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.data?.user, token: data.token } });
    return data.data?.user;
  };

  const logout = async () => {
    await authAPI.logout();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
