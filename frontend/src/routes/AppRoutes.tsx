import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { RootState, AppDispatch } from '../store';
import { loginSuccess } from '../store/authSlice';
import apiClient from '../services/apiClient';
import Navbar from '../components/Navbar';
import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import Pharmacies from '../pages/Pharmacies/Pharmacies';
import PharmacyDetail from '../pages/PharmacyDetail/PharmacyDetail';
import Medications from '../pages/Medications/Medications';
import Cart from '../pages/Cart/Cart';
import Orders from '../pages/Orders/Orders';
import OrderDetail from '../pages/OrderDetail/OrderDetail';
import Profile from '../pages/Profile/Profile';
import Dashboard from '../pages/Dashboard/Dashboard';
import PharmacistMedications from '../pages/PharmacistMedications/PharmacistMedications';
import PharmacistOrders from '../pages/PharmacistOrders/PharmacistOrders';
import Messages from '../pages/Messages/Messages';
import Notifications from '../pages/Notifications/Notifications';
import Analytics from '../pages/Analytics/Analytics';
import DeliveryTracking from '../pages/DeliveryTracking/DeliveryTracking';
import LivreurDashboard from '../pages/LivreurDashboard/LivreurDashboard';
import LivreurDelivery from '../pages/LivreurDelivery/LivreurDelivery';
import PharmacyDrivers from '../pages/PharmacyDrivers/PharmacyDrivers';
import PendingApproval from '../pages/PendingApproval/PendingApproval';
import AdminPanel from '../pages/AdminPanel/AdminPanel';
import Comparateur from '../pages/Comparateur/Comparateur';
import Ordonnances from '../pages/Ordonnances/Ordonnances';
import MedicationIdentify from '../pages/MedicationIdentify/MedicationIdentify';
import Favorites from '../pages/Favorites/Favorites';
import Reminders from '../pages/Reminders/Reminders';
import PrescriptionScannerPage from '../pages/PrescriptionScanner/PrescriptionScannerPage';

function useBootstrapUser() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      apiClient.get('/users/profile')
        .then(r => dispatch(loginSuccess({ user: r.data, token: localStorage.getItem('authToken')! })))
        .catch(() => {});
    }
  }, [isAuthenticated, user, dispatch]);
}

function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Attendre que le profil soit chargé avant d'évaluer les rôles (évite un accès temporaire)
  if (!user) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  );
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function NoNavRoute({ children }: { children: JSX.Element }) {
  return children;
}

export default function AppRoutes() {
  useBootstrapUser();
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (no navbar) */}
        <Route path="/login" element={<NoNavRoute><Login /></NoNavRoute>} />
        <Route path="/register" element={<NoNavRoute><Register /></NoNavRoute>} />
        <Route path="/pending-approval" element={<NoNavRoute><PendingApproval /></NoNavRoute>} />

        {/* Main routes (with navbar) */}
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pharmacies" element={<Pharmacies />} />
              <Route path="/pharmacies/:id" element={<PharmacyDetail />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/cart" element={
                <ProtectedRoute><Cart /></ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute><Orders /></ProtectedRoute>
              } />
              <Route path="/orders/:id" element={
                <ProtectedRoute><OrderDetail /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute roles={['pharmacist', 'admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/medications" element={
                <ProtectedRoute roles={['pharmacist', 'admin']}>
                  <PharmacistMedications />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/orders" element={
                <ProtectedRoute roles={['pharmacist', 'admin']}>
                  <PharmacistOrders />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute><Messages /></ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute><Notifications /></ProtectedRoute>
              } />
              <Route path="/dashboard/analytics" element={
                <ProtectedRoute roles={['pharmacist', 'admin']}>
                  <Analytics />
                </ProtectedRoute>
              } />
              <Route path="/delivery/:orderId" element={
                <ProtectedRoute><DeliveryTracking /></ProtectedRoute>
              } />
              <Route path="/livreur" element={
                <ProtectedRoute roles={['driver']}><LivreurDashboard /></ProtectedRoute>
              } />
              <Route path="/livreur/delivery/:deliveryId" element={
                <ProtectedRoute roles={['driver']}><LivreurDelivery /></ProtectedRoute>
              } />
              <Route path="/dashboard/drivers" element={
                <ProtectedRoute roles={['pharmacist', 'admin']}>
                  <PharmacyDrivers />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>
              } />
              <Route path="/comparateur" element={<Comparateur />} />
              <Route path="/identifier" element={<MedicationIdentify />} />
              <Route path="/favoris" element={<Favorites />} />
              <Route path="/rappels" element={
                <ProtectedRoute><Reminders /></ProtectedRoute>
              } />
              <Route path="/ordonnances" element={
                <ProtectedRoute><Ordonnances /></ProtectedRoute>
              } />
              <Route path="/scanner-ordonnance" element={
                <ProtectedRoute><PrescriptionScannerPage /></ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}
