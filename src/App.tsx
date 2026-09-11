import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ProtectedRoute, AdminRoute, StaffRoute } from '@/components/ProtectedRoute';
import { FullPageSpinner } from '@/components/ui/Loading';

const HomePage = lazy(() => import('@/pages/public/HomePage'));
const CollectionPage = lazy(() => import('@/pages/public/CollectionPage'));
const ArtifactDetailPage = lazy(() => import('@/pages/public/ArtifactDetailPage'));
const ExhibitionsPage = lazy(() => import('@/pages/public/ExhibitionsPage'));
const ExhibitionDetailPage = lazy(() => import('@/pages/public/ExhibitionDetailPage'));
const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const FavoritesPage = lazy(() => import('@/pages/public/FavoritesPage'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminArtifacts = lazy(() => import('@/pages/admin/AdminArtifacts'));
const ArtifactForm = lazy(() => import('@/pages/admin/ArtifactForm'));
const AdminExhibitions = lazy(() => import('@/pages/admin/AdminExhibitions'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminArtists = lazy(() => import('@/pages/admin/AdminArtists'));
const AdminPeriods = lazy(() => import('@/pages/admin/AdminPeriods'));
const AdminLocations = lazy(() => import('@/pages/admin/AdminLocations'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/AdminAuditLogs'));
const AdminCart = lazy(() => import('@/pages/admin/AdminCart'));
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews'));

const CuratorDashboard = lazy(() => import('@/pages/curator/CuratorDashboard'));
const CuratorArtifacts = lazy(() => import('@/pages/curator/CuratorArtifacts'));
const CuratorExhibitions = lazy(() => import('@/pages/curator/CuratorExhibitions'));
const CuratorConservation = lazy(() => import('@/pages/curator/CuratorConservation'));
const CuratorProvenance = lazy(() => import('@/pages/curator/CuratorProvenance'));

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
              {/* Public routes — login required */}
              <Route path="/" element={<ProtectedRoute><PublicLayout><HomePage /></PublicLayout></ProtectedRoute>} />
              <Route path="/collection" element={<ProtectedRoute><PublicLayout><CollectionPage /></PublicLayout></ProtectedRoute>} />
              <Route path="/artifacts/:id" element={<ProtectedRoute><PublicLayout><ArtifactDetailPage /></PublicLayout></ProtectedRoute>} />
              <Route path="/exhibitions" element={<ProtectedRoute><PublicLayout><ExhibitionsPage /></PublicLayout></ProtectedRoute>} />
              <Route path="/exhibitions/:id" element={<ProtectedRoute><PublicLayout><ExhibitionDetailPage /></PublicLayout></ProtectedRoute>} />
              <Route path="/about" element={<ProtectedRoute><PublicLayout><AboutPage /></PublicLayout></ProtectedRoute>} />
              <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
              <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
              <Route path="/favorites" element={<ProtectedRoute><PublicLayout><FavoritesPage /></PublicLayout></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/artifacts" element={<StaffRoute><AdminArtifacts /></StaffRoute>} />
              <Route path="/admin/artifacts/new" element={<StaffRoute><ArtifactForm /></StaffRoute>} />
              <Route path="/admin/artifacts/:id/edit" element={<StaffRoute><ArtifactForm /></StaffRoute>} />
              <Route path="/admin/exhibitions" element={<StaffRoute><AdminExhibitions /></StaffRoute>} />
              <Route path="/admin/categories" element={<StaffRoute><AdminCategories /></StaffRoute>} />
              <Route path="/admin/artists" element={<StaffRoute><AdminArtists /></StaffRoute>} />
              <Route path="/admin/periods" element={<StaffRoute><AdminPeriods /></StaffRoute>} />
              <Route path="/admin/locations" element={<StaffRoute><AdminLocations /></StaffRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
              <Route path="/admin/cart" element={<AdminRoute><AdminCart /></AdminRoute>} />
              <Route path="/admin/reviews" element={<AdminRoute><AdminReviews /></AdminRoute>} />

              {/* Curator routes */}
              <Route path="/curator/dashboard" element={<StaffRoute><CuratorDashboard /></StaffRoute>} />
              <Route path="/curator/artifacts" element={<StaffRoute><CuratorArtifacts /></StaffRoute>} />
              <Route path="/curator/exhibitions" element={<StaffRoute><CuratorExhibitions /></StaffRoute>} />
              <Route path="/curator/conservation" element={<StaffRoute><CuratorConservation /></StaffRoute>} />
              <Route path="/curator/provenance" element={<StaffRoute><CuratorProvenance /></StaffRoute>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
