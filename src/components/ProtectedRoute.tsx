import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { FullPageSpinner } from '@/components/ui/Loading';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function RoleGuard({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!profile) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return <RoleGuard roles={['admin']}>{children}</RoleGuard>;
}

export function StaffRoute({ children }: { children: ReactNode }) {
  return <RoleGuard roles={['admin', 'curator']}>{children}</RoleGuard>;
}
