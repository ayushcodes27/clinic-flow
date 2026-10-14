import { motion, AnimatePresence } from 'framer-motion';
﻿import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Activity,
  Menu,
  X,
  Users,
  Calendar,
  Clock,
  ShieldAlert,
  LogOut,
  ChevronDown,
  Check
} from 'lucide-react';
import api from './api';
import Login from './pages/Login';
import QueueBoard from './pages/QueueBoard';
import Booking from './pages/Booking';
import Schedule from './pages/Schedule';
import NoShows from './pages/NoShows';

export const NAV = [
  { to: '/queue',     label: 'Queue',            roles: ['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN'], icon: Users },
  { to: '/book',      label: 'Book appointment', roles: ['PATIENT'],                                     icon: Calendar },
  { to: '/schedules', label: 'Schedules',        roles: ['DOCTOR', 'ADMIN'],                            icon: Clock },
  { to: '/no-shows',  label: 'No-shows',         roles: ['ADMIN'],                                      icon: ShieldAlert },
];

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireRole({ roles, children }) {
  const userType = localStorage.getItem('userType') || 'PATIENT';
  if (!roles.includes(userType)) {
    const allowed = NAV.find(n => n.roles.includes(userType));
    return <Navigate to={allowed ? allowed.to : "/queue"} replace />;
  }
  return children;
}

function Navigation({ onRoleChange }) {
  const token = localStorage.getItem('token');
  const [userType, setUserType] = useState(() => localStorage.getItem('userType') || 'PATIENT');
  const location = useLocation();

  useEffect(() => {
    const syncUser = () => {
      setUserType(localStorage.getItem('userType') || 'PATIENT');
    };
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  if (!token || location.pathname === '/login') return null;

  const permittedNav = NAV.filter(item => item.roles.includes(userType));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <Activity size={18} color="white" />
        </div>
        <div className="sidebar-brand-text">ClinicFlow</div>
      </div>

      <nav>
        {permittedNav.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '1rem 0.5rem', borderTop: '1px solid #1e293b' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Main Health Clinic v1.2
        </div>
      </div>
    </aside>
  );
}

function Header({ onRoleChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const [fullName, setFullName] = useState(() => localStorage.getItem('fullName') || 'Sandeep Kulkarni');
  const [userType, setUserType] = useState(() => localStorage.getItem('userType') || 'PATIENT');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const syncUser = () => {
      setFullName(localStorage.getItem('fullName') || 'Sandeep Kulkarni');
      setUserType(localStorage.getItem('userType') || 'PATIENT');
    };
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!token || location.pathname === '/login') return null;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const switchRole = (newRole) => {
    const roleMap = {
      PATIENT: { name: 'Sandeep Kulkarni', id: 'p-sandeep-kulkarni', path: '/book' },
      DOCTOR: { name: 'Dr. Rajesh Sharma', id: 'd1111111-1111-1111-1111-111111111111', path: '/queue' },
      RECEPTIONIST: { name: 'Meera Pillai', id: 'r1111111-1111-1111-1111-111111111111', path: '/queue' },
      ADMIN: { name: 'Suresh Menon', id: 'a1111111-1111-1111-1111-111111111111', path: '/no-shows' }
    };
    const target = roleMap[newRole] || roleMap.PATIENT;
    localStorage.setItem('userType', newRole);
    localStorage.setItem('fullName', target.name);
    localStorage.setItem('userId', target.id);
    setUserType(newRole);
    setFullName(target.name);
    setMenuOpen(false);
    window.dispatchEvent(new Event('storage'));
    if (onRoleChange) onRoleChange(newRole);

    const activeConfig = NAV.find(n => n.to === location.pathname);
    if (!activeConfig || !activeConfig.roles.includes(newRole)) {
      navigate(target.path);
    }
  };

  const getPageTitle = (path, role) => {
    if (path.startsWith('/queue')) {
      if (role === 'DOCTOR') return 'Consultation queue';
      if (role === 'RECEPTIONIST') return 'Patient check-in desk';
      if (role === 'PATIENT') return 'Your queue status';
      return 'Clinic queue';
    }
    if (path.startsWith('/book')) return 'Book appointment';
    if (path.startsWith('/schedules')) return 'Doctor schedules';
    if (path.startsWith('/no-shows')) return 'No-show audits & sweeps';
    return 'ClinicFlow';
  };

  const roleLabel = {
    DOCTOR: 'Doctor',
    RECEPTIONIST: 'Receptionist',
    PATIENT: 'Patient',
    ADMIN: 'Admin'
  }[userType] || userType;

    const permittedNav = NAV.filter(item => item.roles.includes(userType));

  return (
    <>
      <header className="top-header">
        <div className="top-header-inner">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="mobile-hamburger-btn show-on-mobile-inline"
              aria-label="Open mobile navigation"
              style={{
                display: 'none',
                background: 'none',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.4rem',
                cursor: 'pointer'
              }}
            >
              <Menu size={18} color="#0f172a" />
            </button>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {getPageTitle(location.pathname, userType)}
            </h2>
          </div>

          <div className="flex items-center gap-3" style={{ position: 'relative' }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                background: 'none',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.825rem', color: '#0f172a', lineHeight: 1.2 }}>
                  {fullName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {roleLabel}
                </div>
              </div>
              <ChevronDown size={14} color="#64748b" />
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '220px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                padding: '0.4rem',
                zIndex: 100
              }}>
                <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Switch demo role
                </div>
                {[
                  { id: 'DOCTOR', label: 'Doctor (Dr. Sharma)' },
                  { id: 'RECEPTIONIST', label: 'Receptionist (Meera)' },
                  { id: 'PATIENT', label: 'Patient (Sandeep)' },
                  { id: 'ADMIN', label: 'Admin (Suresh)' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => switchRole(r.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: userType === r.id ? '#f0fdfa' : 'transparent',
                      color: userType === r.id ? '#0d9488' : '#0f172a',
                      fontWeight: userType === r.id ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span>{r.label}</span>
                    {userType === r.id && <Check size={14} color="#0d9488" />}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '0.35rem', paddingTop: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: '#dc2626',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '260px',
              height: '100%',
              background: '#0f172a',
              color: '#ffffff',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 20px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem' }}>
                <Activity size={18} color="#0d9488" />
                <span>ClinicFlow</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
              {permittedNav.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileNavOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      background: isActive ? '#1e293b' : 'transparent',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      borderLeft: isActive ? '3px solid #0d9488' : '3px solid transparent'
                    }}
                  >
                    <Icon size={16} color={isActive ? '#0d9488' : '#94a3b8'} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                Quick switch role
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                {[
                  { id: 'DOCTOR', label: 'Doctor' },
                  { id: 'RECEPTIONIST', label: 'Reception' },
                  { id: 'PATIENT', label: 'Patient' },
                  { id: 'ADMIN', label: 'Admin' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => switchRole(r.id)}
                    style={{
                      padding: '0.45rem',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #334155',
                      background: userType === r.id ? '#0d9488' : '#1e293b',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AnimatedPageRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{ width: '100%' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/queue" replace />} />
          <Route
            path="/queue"
            element={
              <RequireRole roles={['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN']}>
                <QueueBoard />
              </RequireRole>
            }
          />
          <Route
            path="/book"
            element={
              <RequireRole roles={['PATIENT']}>
                <Booking />
              </RequireRole>
            }
          />
          <Route path="/booking" element={<Navigate to="/book" replace />} />
          <Route
            path="/schedules"
            element={
              <RequireRole roles={['DOCTOR', 'ADMIN']}>
                <Schedule />
              </RequireRole>
            }
          />
          <Route path="/schedule" element={<Navigate to="/schedules" replace />} />
          <Route
            path="/no-shows"
            element={
              <RequireRole roles={['ADMIN']}>
                <NoShows />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/queue" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const [, setRoleState] = useState(localStorage.getItem('userType'));

  useEffect(() => {
    if (!localStorage.getItem('fullName')) {
      localStorage.setItem('fullName', 'Sandeep Kulkarni');
      localStorage.setItem('userType', 'PATIENT');
      localStorage.setItem('userId', 'p-sandeep-kulkarni');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="app-layout">
                <Navigation onRoleChange={setRoleState} />
                <div className="main-content">
                  <Header onRoleChange={setRoleState} />
                  <div className="page-content">
                    <AnimatedPageRoutes />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
