import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Activity,
  Users,
  Calendar,
  Clock,
  ShieldAlert,
  LogOut,
  Sparkles,
  Sliders
} from 'lucide-react';
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
  const userType = localStorage.getItem('userType') || 'PATIENT';
  const location = useLocation();
  const navigate = useNavigate();

  if (!token) return null;

  const permittedNav = NAV.filter(item => item.roles.includes(userType));

  const quickSwitchRole = (newRole) => {
    const roleMap = {
      PATIENT: { name: 'Sandeep Kulkarni', id: 'p-sandeep-kulkarni' },
      DOCTOR: { name: 'Dr. Rajesh Sharma', id: 'd1111111-1111-1111-1111-111111111111' },
      RECEPTIONIST: { name: 'Meera Pillai', id: 'r1111111-1111-1111-1111-111111111111' },
      ADMIN: { name: 'Suresh Menon', id: 'a1111111-1111-1111-1111-111111111111' }
    };

    const target = roleMap[newRole];
    localStorage.setItem('userType', newRole);
    localStorage.setItem('fullName', target.name);
    localStorage.setItem('userId', target.id);

    if (onRoleChange) onRoleChange(newRole);

    // If current path isn't allowed for the new role, redirect
    const activeConfig = NAV.find(n => n.to === location.pathname);
    if (!activeConfig || !activeConfig.roles.includes(newRole)) {
      const firstAllowed = NAV.find(n => n.roles.includes(newRole));
      navigate(firstAllowed ? firstAllowed.to : '/queue');
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <Activity size={20} color="white" />
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
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Demo: view as role switcher */}
      <div className="sidebar-footer">
        <div style={{
          fontSize: '0.75rem',
          color: '#64748b',
          fontWeight: 600,
          marginBottom: '0.6rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <Sparkles size={13} color="#0284c7" />
          <span>Demo: view as</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
          <button
            type="button"
            className="role-switch-btn"
            style={{
              background: userType === 'PATIENT' ? '#0284c7' : 'rgba(255,255,255,0.06)',
              color: userType === 'PATIENT' ? '#fff' : '#94a3b8'
            }}
            onClick={() => quickSwitchRole('PATIENT')}
          >
            Patient
          </button>
          <button
            type="button"
            className="role-switch-btn"
            style={{
              background: userType === 'DOCTOR' ? '#0284c7' : 'rgba(255,255,255,0.06)',
              color: userType === 'DOCTOR' ? '#fff' : '#94a3b8'
            }}
            onClick={() => quickSwitchRole('DOCTOR')}
          >
            Doctor
          </button>
          <button
            type="button"
            className="role-switch-btn"
            style={{
              background: userType === 'RECEPTIONIST' ? '#0284c7' : 'rgba(255,255,255,0.06)',
              color: userType === 'RECEPTIONIST' ? '#fff' : '#94a3b8'
            }}
            onClick={() => quickSwitchRole('RECEPTIONIST')}
          >
            Reception
          </button>
          <button
            type="button"
            className="role-switch-btn"
            style={{
              background: userType === 'ADMIN' ? '#0284c7' : 'rgba(255,255,255,0.06)',
              color: userType === 'ADMIN' ? '#fff' : '#94a3b8'
            }}
            onClick={() => quickSwitchRole('ADMIN')}
          >
            Admin
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const fullName = localStorage.getItem('fullName') || 'Sandeep Kulkarni';
  const userType = localStorage.getItem('userType') || 'PATIENT';

  if (!token || location.pathname === '/login') return null;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getPageTitle = (path) => {
    if (path.startsWith('/queue')) return 'Queue';
    if (path.startsWith('/book')) return 'Book appointment';
    if (path.startsWith('/schedules')) return 'Schedules';
    if (path.startsWith('/no-shows')) return 'No-shows';
    return 'ClinicFlow';
  };

  return (
    <header className="top-header">
      <div className="flex items-center gap-3">
        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#0f172a' }}>
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{fullName}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Main Health Clinic</div>
          </div>
          <span className="badge role-pill">
            {userType.charAt(0) + userType.slice(1).toLowerCase()}
          </span>
        </div>

        <button
          className="btn-secondary btn-sm"
          onClick={handleLogout}
          style={{ padding: '0.45rem 0.8rem' }}
          title="Sign out"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}

// Global Demo Tooling Panel (bottom-right drawer) for conflict simulation
function DemoPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [conflictSim, setConflictSim] = useState(() => localStorage.getItem('simulateConflict') === 'true');

  const toggleConflict = (val) => {
    setConflictSim(val);
    localStorage.setItem('simulateConflict', val ? 'true' : 'false');
    window.dispatchEvent(new Event('demo-conflict-toggle'));
  };

  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 100 }}>
      {isOpen ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)',
          minWidth: '280px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Demo tooling</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
            >
              ✕
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', cursor: 'pointer', color: '#334155' }}>
            <input
              type="checkbox"
              checked={conflictSim}
              onChange={e => toggleConflict(e.target.checked)}
              style={{ width: '16px', height: '16px', margin: 0 }}
            />
            <span>Simulate a conflicting booking</span>
          </label>
          <p style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
            Triggers 409 conflict when booking any slot.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="btn-secondary btn-sm"
          style={{
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '8px'
          }}
          title="Open Demo Tooling"
        >
          <Sliders size={13} color="#0284c7" />
          <span>Demo panel</span>
        </button>
      )}
    </div>
  );
}

function App() {
  const [, setRoleState] = useState(localStorage.getItem('userType'));

  useEffect(() => {
    // Default patient identity if none exists
    if (!localStorage.getItem('fullName')) {
      localStorage.setItem('fullName', 'Sandeep Kulkarni');
      localStorage.setItem('userType', 'PATIENT');
      localStorage.setItem('userId', 'p-sandeep-kulkarni');
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navigation onRoleChange={setRoleState} />
        <div className="main-content">
          <Header />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Navigate to="/queue" replace />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/queue"
                element={
                  <ProtectedRoute>
                    <RequireRole roles={['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN']}>
                      <QueueBoard />
                    </RequireRole>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book"
                element={
                  <ProtectedRoute>
                    <RequireRole roles={['PATIENT']}>
                      <Booking />
                    </RequireRole>
                  </ProtectedRoute>
                }
              />
              <Route path="/booking" element={<Navigate to="/book" replace />} />
              <Route
                path="/schedules"
                element={
                  <ProtectedRoute>
                    <RequireRole roles={['DOCTOR', 'ADMIN']}>
                      <Schedule />
                    </RequireRole>
                  </ProtectedRoute>
                }
              />
              <Route path="/schedule" element={<Navigate to="/schedules" replace />} />
              <Route
                path="/no-shows"
                element={
                  <ProtectedRoute>
                    <RequireRole roles={['ADMIN']}>
                      <NoShows />
                    </RequireRole>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/queue" replace />} />
            </Routes>
          </div>
        </div>
      </div>
      <DemoPanel />
    </BrowserRouter>
  );
}

export default App;
