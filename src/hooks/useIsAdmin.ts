import { useAuth } from '../context/AuthContext';
import { isAdminEmail } from '../config/admins';

/** True, wenn der eingeloggte Nutzer in der Admin-Allowlist steht. */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return isAdminEmail(user?.email);
}
