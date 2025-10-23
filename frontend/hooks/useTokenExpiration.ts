import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { checkTokenExpiration, logout } from '../redux/slices/authSlice';

export const useTokenExpiration = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, tokenExpiration } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isAuthenticated || !tokenExpiration) return;

    // Verificar inmediatamente si el token ya expiró
    const checkExpiration = () => {
      const now = Date.now();
      if (now > tokenExpiration) {
        console.log('🚨 [TOKEN CHECK] Token expirado - cerrando sesión');
        dispatch(logout());
        return;
      }

      // Calcular tiempo restante
      const timeRemaining = tokenExpiration - now;
      const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
      const hoursRemaining = Math.floor(minutesRemaining / 60);

      // Mostrar advertencias en momentos específicos
      if (minutesRemaining === 30) {
        console.log('⚠️ [TOKEN CHECK] Tu sesión expirará en 30 minutos');
        // Aquí podrías mostrar una notificación al usuario
      } else if (minutesRemaining === 10) {
        console.log('⚠️ [TOKEN CHECK] Tu sesión expirará en 10 minutos');
      } else if (minutesRemaining === 5) {
        console.log('⚠️ [TOKEN CHECK] Tu sesión expirará en 5 minutos');
      }
    };

    // Verificar inmediatamente
    checkExpiration();

    // Configurar verificación periódica cada minuto
    const interval = setInterval(checkExpiration, 60 * 1000); // Cada minuto

    return () => clearInterval(interval);
  }, [isAuthenticated, tokenExpiration, dispatch]);

  // Función para obtener información sobre la expiración
  const getExpirationInfo = () => {
    if (!tokenExpiration) return null;

    const now = Date.now();
    const timeRemaining = tokenExpiration - now;
    
    if (timeRemaining <= 0) {
      return { expired: true, timeRemaining: 0 };
    }

    const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
    const hoursRemaining = Math.floor(minutesRemaining / 60);
    const minutesInCurrentHour = minutesRemaining % 60;

    return {
      expired: false,
      timeRemaining,
      minutesRemaining,
      hoursRemaining,
      formattedTime: hoursRemaining > 0 
        ? `${hoursRemaining}h ${minutesInCurrentHour}m`
        : `${minutesRemaining}m`,
      expirationDate: new Date(tokenExpiration)
    };
  };

  return {
    getExpirationInfo,
    checkTokenExpiration: () => dispatch(checkTokenExpiration())
  };
};