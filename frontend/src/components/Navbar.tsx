import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Bike, Pill, Heart, AlarmClock, Hospital, User, Shield, ClipboardList } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/authSlice';
import { clearCartState } from '../store/cartSlice';
import { authService } from '../services/auth.service';
import { messageService } from '../services/message.service';
import { notificationService } from '../services/order.service';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import logo from '../assets/pharma.jpeg';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);
  const cart = useSelector((s: RootState) => s.cart.cart);
  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const isPharmacist = user?.role === 'pharmacist';
  const isDriver = user?.role === 'driver';
  const isAdmin = user?.role === 'admin';

  // Extraire le nom/statut de la pharmacie gérée (pharmacyId peut être populé ou juste un ID)
  const pharmacyObj = user?.pharmacyId && typeof user.pharmacyId === 'object' ? user.pharmacyId as any : null;
  const pharmacyName = pharmacyObj?.name ?? null;
  const pharmacyIsOpen = pharmacyObj?.isOpen ?? null;

  useEffect(() => {
    if (!isAuthenticated) { setUnreadMessages(0); setUnreadNotifs(0); return; }
    const fetchMsg = () => messageService.getUnreadCount().then(setUnreadMessages).catch(() => {});
    const fetchNotif = () => notificationService.getUnreadCount().then((d: any) => setUnreadNotifs(d?.count ?? 0)).catch(() => {});
    fetchMsg(); fetchNotif();
    const id1 = setInterval(fetchMsg, 15000);
    const id2 = setInterval(fetchNotif, 30000);
    return () => { clearInterval(id1); clearInterval(id2); };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try { await authService.logout(); } catch {}
    dispatch(logout());
    dispatch(clearCartState());
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
      ? 'text-green-600 font-semibold'
      : 'text-gray-600 hover:text-green-600';

  return (
    <nav className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-100 dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src={logo} alt="PharmaConnect" className="w-9 h-9 object-contain rounded-lg" />
            <span className="font-bold text-xl text-green-700 hidden sm:block">PharmaConnect</span>
          </Link>

          {/* ── Navigation desktop ── */}
          <div className="hidden md:flex items-center gap-1">
            {!isAuthenticated && (
              <>
                <NavLink to="/pharmacies" active={isActive('/pharmacies')}>Pharmacies</NavLink>
                <NavLink to="/medications" active={isActive('/medications')}>Médicaments</NavLink>
              </>
            )}

            {isAuthenticated && isPharmacist && (
              <>
                <NavLink to="/dashboard" active={isActive('/dashboard')}>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
                    </svg>
                    Tableau de bord
                  </span>
                </NavLink>
                <NavLink to="/dashboard/medications" active={isActive('/dashboard/medications')}>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Médicaments
                  </span>
                </NavLink>
                <NavLink to="/dashboard/orders" active={isActive('/dashboard/orders')}>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Commandes
                  </span>
                </NavLink>
                <NavLink to="/dashboard/analytics" active={isActive('/dashboard/analytics')}>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytiques
                  </span>
                </NavLink>
                <NavLink to="/dashboard/drivers" active={isActive('/dashboard/drivers')}>
                  <span className="flex items-center gap-1.5"><Bike className="w-4 h-4" /> Livreurs</span>
                </NavLink>
              </>
            )}

            {isAuthenticated && isAdmin && (
              <NavLink to="/admin" active={isActive('/admin')}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Administration
                </span>
              </NavLink>
            )}

            {isAuthenticated && isDriver && (
              <>
                <NavLink to="/livreur" active={isActive('/livreur')}>
                  <span className="flex items-center gap-1.5"><Bike className="w-4 h-4" /> Mes livraisons</span>
                </NavLink>
              </>
            )}

            {isAuthenticated && !isPharmacist && !isDriver && (
              <>
                <NavLink to="/pharmacies" active={isActive('/pharmacies')}>Pharmacies</NavLink>
                <NavLink to="/medications" active={isActive('/medications')}>Médicaments</NavLink>
                <NavLink to="/comparateur" active={isActive('/comparateur')}>
                  <span className="flex items-center gap-1"><Pill className="w-4 h-4" /> Comparer</span>
                </NavLink>
                <NavLink to="/favoris" active={isActive('/favoris')}>
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> Favoris</span>
                </NavLink>
                <NavLink to="/rappels" active={isActive('/rappels')}>
                  <span className="flex items-center gap-1"><AlarmClock className="w-4 h-4" /> Rappels</span>
                </NavLink>
                <NavLink to="/ordonnances" active={isActive('/ordonnances')}>Commandes</NavLink>
              </>
            )}

            {/* Comparateur accessible aux visiteurs non-connectés */}
            {!isAuthenticated && (
              <NavLink to="/comparateur" active={isActive('/comparateur')}>
                <span className="flex items-center gap-1"><Pill className="w-4 h-4" /> Comparer</span>
              </NavLink>
            )}
          </div>

          {/* ── Icônes droite ── */}
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link to="/notifications"
                  className="relative p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </Link>

                {/* Messages */}
                <Link to="/messages"
                  className="relative p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Panier — clients seulement */}
                {!isPharmacist && !isDriver && (
                  <Link to="/cart"
                    className="relative p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {itemCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {itemCount > 9 ? '9+' : itemCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Avatar dropdown */}
                <div className="relative ml-1">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isPharmacist ? 'bg-emerald-100' : isDriver ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <span className={`font-semibold text-sm ${isPharmacist ? 'text-emerald-700' : isDriver ? 'text-blue-700' : 'text-green-700'}`}>
                        {user?.firstName?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden md:block text-left max-w-[160px]">
                      <p className="text-sm font-medium text-gray-800 leading-none truncate">{user?.firstName}</p>
                      {isPharmacist && pharmacyName ? (
                        <p className="text-xs text-emerald-600 mt-0.5 font-medium truncate flex items-center gap-1"><Hospital className="w-3 h-3" /> {pharmacyName}</p>
                      ) : isDriver && pharmacyName ? (
                        <p className="text-xs text-blue-600 mt-0.5 truncate flex items-center gap-1"><Bike className="w-3 h-3" /> {pharmacyName}</p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isPharmacist ? 'Pharmacien' : isDriver ? 'Livreur' : 'Client'}
                        </p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 z-50">
                        <div className="px-4 py-3 border-b border-gray-50">
                          <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                          <span className={`inline-flex mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                            isPharmacist ? 'bg-emerald-100 text-emerald-700' : isDriver ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {isPharmacist ? <span className="flex items-center gap-1"><Hospital className="w-3 h-3" /> Pharmacien</span> : isDriver ? <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> Livreur</span> : <span className="flex items-center gap-1"><User className="w-3 h-3" /> Client</span>}
                          </span>
                          {/* Bandeau pharmacie */}
                          {pharmacyName && (
                            <div className={`mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium ${
                              isPharmacist ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              <Hospital className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{pharmacyName}</span>
                              {pharmacyIsOpen !== null && (
                                <span className={`ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full ${pharmacyIsOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                              )}
                            </div>
                          )}
                        </div>

                        <Link to="/profile" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Mon profil
                        </Link>

                        {isPharmacist && (
                          <>
                            <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
                              </svg>
                              Tableau de bord
                            </Link>
                            <Link to="/dashboard/medications" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                              Mes médicaments
                            </Link>
                            <Link to="/dashboard/orders" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Commandes clients
                            </Link>
                            <Link to="/dashboard/analytics" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Analytiques
                            </Link>
                            <Link to="/dashboard/drivers" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <Bike className="w-4 h-4 text-gray-400" />
                              Équipe livreurs
                            </Link>
                          </>
                        )}

                        {isAdmin && (
                          <Link to="/admin" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Administration
                          </Link>
                        )}

                        {isDriver && (
                          <Link to="/livreur" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Bike className="w-4 h-4 text-gray-400" />
                            Mes livraisons
                          </Link>
                        )}

                        {!isPharmacist && !isDriver && (
                          <>
                            <Link to="/ordonnances" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <ClipboardList className="w-4 h-4 text-gray-400" />
                              Mes commandes
                            </Link>
                            <Link to="/comparateur" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <Pill className="w-4 h-4 text-gray-400" />
                              Comparer les prix
                            </Link>
                            <Link to="/favoris" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <Heart className="w-4 h-4 text-red-400" />
                              Mes favoris
                            </Link>
                            <Link to="/rappels" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <AlarmClock className="w-4 h-4 text-gray-400" />
                              Rappels médicaments
                            </Link>
                            <Link to="/cart" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Mon panier
                              {itemCount > 0 && (
                                <span className="ml-auto bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                                  {itemCount}
                                </span>
                              )}
                            </Link>
                          </>
                        )}

                        <div className="border-t border-gray-50 mt-1">
                          <button onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Déconnexion
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="text-sm text-gray-600 hover:text-green-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  Connexion
                </Link>
                <Link to="/register"
                  className="text-sm bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors font-medium">
                  S'inscrire
                </Link>
              </div>
            )}

            {/* Burger mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl ml-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Menu mobile ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 px-4 py-3 space-y-1">
          {isAuthenticated && isPharmacist && (
            <>
              <MobileLink to="/dashboard" onClick={() => setMobileOpen(false)}>Tableau de bord</MobileLink>
              <MobileLink to="/dashboard/medications" onClick={() => setMobileOpen(false)}>Mes médicaments</MobileLink>
              <MobileLink to="/dashboard/orders" onClick={() => setMobileOpen(false)}>Commandes clients</MobileLink>
              <MobileLink to="/dashboard/analytics" onClick={() => setMobileOpen(false)}>Analytiques</MobileLink>
              <MobileLink to="/dashboard/drivers" onClick={() => setMobileOpen(false)}><Bike className="w-4 h-4 mr-1.5" /> Équipe livreurs</MobileLink>
              <MobileLink to="/messages" onClick={() => setMobileOpen(false)}>
                Messages {unreadMessages > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadMessages}</span>}
              </MobileLink>
            </>
          )}
          {isAuthenticated && isAdmin && (
            <MobileLink to="/admin" onClick={() => setMobileOpen(false)}><Shield className="w-4 h-4 mr-1.5" /> Administration</MobileLink>
          )}
          {isAuthenticated && isDriver && (
            <>
              <MobileLink to="/livreur" onClick={() => setMobileOpen(false)}><Bike className="w-4 h-4 mr-1.5" /> Mes livraisons</MobileLink>
              <MobileLink to="/messages" onClick={() => setMobileOpen(false)}>
                Messages {unreadMessages > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadMessages}</span>}
              </MobileLink>
            </>
          )}
          {isAuthenticated && !isPharmacist && !isDriver && (
            <>
              <MobileLink to="/pharmacies" onClick={() => setMobileOpen(false)}>Pharmacies</MobileLink>
              <MobileLink to="/medications" onClick={() => setMobileOpen(false)}>Médicaments</MobileLink>
              <MobileLink to="/ordonnances" onClick={() => setMobileOpen(false)}>
                <ClipboardList className="w-4 h-4 mr-1.5" /> Mes commandes
              </MobileLink>
              <MobileLink to="/messages" onClick={() => setMobileOpen(false)}>
                Messages {unreadMessages > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadMessages}</span>}
              </MobileLink>
              <MobileLink to="/cart" onClick={() => setMobileOpen(false)}>
                Panier {itemCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{itemCount}</span>}
              </MobileLink>
            </>
          )}
          {!isAuthenticated && (
            <>
              <MobileLink to="/pharmacies" onClick={() => setMobileOpen(false)}>Pharmacies</MobileLink>
              <MobileLink to="/medications" onClick={() => setMobileOpen(false)}>Médicaments</MobileLink>
              <MobileLink to="/login" onClick={() => setMobileOpen(false)}>Connexion</MobileLink>
              <MobileLink to="/register" onClick={() => setMobileOpen(false)}>S'inscrire</MobileLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

function NavLink({ to, active, children }: { to: string; active: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={`px-3 py-2 rounded-lg text-sm transition-colors ${active}`}>
      {children}
    </Link>
  );
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link to={to} onClick={onClick}
      className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
      {children}
    </Link>
  );
}
