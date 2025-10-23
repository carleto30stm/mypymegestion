import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { debugAuthState } from '../redux/slices/authSlice';

export const useAuthDebug = () => {
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);
  
  const logCurrentUser = () => {
    const timeUntilExpiration = authState.tokenExpiration ? authState.tokenExpiration - Date.now() : null;
    console.log('👤 [useAuthDebug] Usuario actual:', {
      username: authState.user?.username,
      userType: authState.user?.userType,
      id: authState.user?.id,
      isAuthenticated: authState.isAuthenticated,
      status: authState.status,
      tokenExpiration: authState.tokenExpiration ? new Date(authState.tokenExpiration).toLocaleString() : null,
      timeUntilExpiration: timeUntilExpiration ? `${Math.round(timeUntilExpiration / (1000 * 60))} minutos` : null
    });
  };

  const logFullAuthState = () => {
    dispatch(debugAuthState());
  };

  const getPermissions = () => {
    const userType = authState.user?.userType;
    const permissions = {
      canEdit: userType !== 'oper',
      canDelete: userType === 'admin',
      canCancel: userType === 'oper_ad',
      showActions: userType !== 'oper'
    };
    
    console.log('🔐 [useAuthDebug] Permisos del usuario:', {
      userType,
      permissions
    });
    
    return permissions;
  };

  const getTokenInfo = () => {
    const tokenExpiration = authState.tokenExpiration;
    if (!tokenExpiration) return null;

    const now = Date.now();
    const timeRemaining = tokenExpiration - now;
    const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
    const hoursRemaining = Math.floor(minutesRemaining / 60);
    const minutesInCurrentHour = minutesRemaining % 60;

    return {
      expirationDate: new Date(tokenExpiration),
      minutesRemaining,
      hoursRemaining,
      formattedTime: hoursRemaining > 0 
        ? `${hoursRemaining}h ${minutesInCurrentHour}m`
        : `${minutesRemaining}m`,
      expired: timeRemaining <= 0
    };
  };

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    status: authState.status,
    tokenExpiration: authState.tokenExpiration,
    logCurrentUser,
    logFullAuthState,
    getPermissions,
    getTokenInfo
  };
};