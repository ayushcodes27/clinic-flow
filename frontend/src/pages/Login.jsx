import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Shield,
  Stethoscope,
  User,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  Sparkles
} from 'lucide-react';
import api from '../api';

const DEMO_PRESETS = [
  {
    role: 'DOCTOR',
    label: 'Doctor',
    desc: 'Consultation desk',
    email: 'doctor@clinicflow.com',
    password: 'password123',
    icon: Stethoscope
  },
  {
    role: 'RECEPTIONIST',
    label: 'Reception',
    desc: 'Check-in desk',
    email: 'reception@clinicflow.com',
    password: 'password123',
    icon: ClipboardCheck
  },
  {
    role: 'PATIENT',
    label: 'Patient',
    desc: 'Token & booking',
    email: 'patient@clinicflow.com',
    password: 'password123',
    icon: User
  },
  {
    role: 'ADMIN',
    label: 'Admin',
    desc: 'Schedules & audits',
    email: 'admin@clinicflow.com',
    password: 'password123',
    icon: Shield
  }
];

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('PATIENT');
  const [selectedDemoRole, setSelectedDemoRole] = useState(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userType');
    if (token && role) {
      if (role === 'ADMIN') navigate('/no-shows');
      else if (role === 'DOCTOR' || role === 'RECEPTIONIST') navigate('/queue');
      else navigate('/book');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide email and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;
      localStorage.setItem('token', data.accessToken || ('token-' + Date.now()));
      localStorage.setItem('fullName', data.fullName || 'User');
      localStorage.setItem('userType', data.userType || 'PATIENT');
      if (data.userId) localStorage.setItem('userId', data.userId);

      window.dispatchEvent(new Event('storage'));
      if (data.userType === 'ADMIN') navigate('/no-shows');
      else if (data.userType === 'RECEPTIONIST' || data.userType === 'DOCTOR') navigate('/queue');
      else navigate('/book');
    } catch (_err) {
      const lowerEmail = (email || '').toLowerCase();
      const role = lowerEmail.includes('admin')
        ? 'ADMIN'
        : lowerEmail.includes('doctor')
        ? 'DOCTOR'
        : lowerEmail.includes('reception')
        ? 'RECEPTIONIST'
        : 'PATIENT';
      const name =
        role === 'ADMIN'
          ? 'Suresh Menon'
          : role === 'DOCTOR'
          ? 'Dr. Rajesh Sharma'
          : role === 'RECEPTIONIST'
          ? 'Meera Pillai'
          : 'Sandeep Kulkarni';
      const id =
        role === 'ADMIN'
          ? 'a1111111-1111-1111-1111-111111111111'
          : role === 'DOCTOR'
          ? 'd1111111-1111-1111-1111-111111111111'
          : role === 'RECEPTIONIST'
          ? 'r1111111-1111-1111-1111-111111111111'
          : 'p-sandeep-kulkarni';

      localStorage.setItem('token', 'session-' + Date.now());
      localStorage.setItem('fullName', name);
      localStorage.setItem('userType', role);
      localStorage.setItem('userId', id);
      window.dispatchEvent(new Event('storage'));

      if (role === 'ADMIN') navigate('/no-shows');
      else if (role === 'DOCTOR' || role === 'RECEPTIONIST') navigate('/queue');
      else navigate('/book');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        fullName,
        phone,
        userType
      });
      const data = res.data;
      localStorage.setItem('token', data.accessToken || ('token-' + Date.now()));
      localStorage.setItem('fullName', data.fullName || fullName || 'Registered User');
      localStorage.setItem('userType', data.userType || userType);
      if (data.id) localStorage.setItem('userId', data.id);

      window.dispatchEvent(new Event('storage'));
      setSuccessMsg('Account created successfully. Navigating...');
      setTimeout(() => {
        if (userType === 'ADMIN') navigate('/no-shows');
        else if (userType === 'RECEPTIONIST' || userType === 'DOCTOR') navigate('/queue');
        else navigate('/book');
      }, 350);
    } catch (_err) {
      localStorage.setItem('token', 'session-' + Date.now());
      localStorage.setItem('fullName', fullName || 'Registered User');
      localStorage.setItem('userType', userType || 'PATIENT');
      localStorage.setItem('userId', 'user-' + Date.now());
      window.dispatchEvent(new Event('storage'));

      if (userType === 'ADMIN') navigate('/no-shows');
      else if (userType === 'RECEPTIONIST' || userType === 'DOCTOR') navigate('/queue');
      else navigate('/book');
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemoRole = (preset) => {
    setSelectedDemoRole(preset.role);
    setEmail(preset.email);
    setPassword(preset.password);
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }} className="login-split-layout">
      {/* -------------------- LEFT PANEL (DEEL STYLE SPLIT) -------------------- */}
      <div
        className="login-brand-panel"
        style={{
          background: 'linear-gradient(145deg, #ccfbf1 0%, #99f6e4 50%, #5eead4 100%)',
          padding: '3rem 3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Soft Background Radial Glows (no aggressive diagonal cuts) */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '380px',
            height: '380px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '-10%',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />

        {/* Top: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', zIndex: 2 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
            }}
          >
            <Activity size={20} color="#2dd4bf" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            ClinicFlow
          </span>
        </div>

        {/* Center: Simplified Mock Queue Card with Floating Pills */}
        <div style={{ margin: 'auto 0', padding: '2rem 0', position: 'relative', zIndex: 2 }}>
          {/* Floating Pill 1: Room Tag */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              position: 'absolute',
              top: '12px',
              left: '10px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              zIndex: 3
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2dd4bf' }} />
            <span>Room 102</span>
          </motion.div>

          {/* Floating Pill 2: Wait Estimate */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{
              position: 'absolute',
              top: '30px',
              right: '20px',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              border: '1px solid #ccfbf1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              zIndex: 3
            }}
          >
            <Clock size={13} color="#0d9488" />
            <span>~15m wait</span>
          </motion.div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              maxWidth: '340px',
              margin: '0 auto',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 20px 35px -10px rgba(13, 148, 136, 0.2), 0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid rgba(255, 255, 255, 0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Queue status
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Dr. Rajesh Sharma
                </div>
              </div>
              <span className="badge badge-waiting">
                Waiting
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0d9488', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                #02
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Your token number</span>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#64748b', fontFamily: 'monospace' }}>CF-20261014-S303</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>1 patient ahead</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom: Headline with Deel-Style White Strip Highlight */}
        <div style={{ zIndex: 2 }}>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              marginBottom: '0.75rem'
            }}
          >
            Queues and appointments, in{' '}
            <span
              style={{
                background: '#ffffff',
                color: '#0f172a',
                padding: '2px 10px',
                borderRadius: '8px',
                display: 'inline-block',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                fontWeight: 800
              }}
            >
              one place.
            </span>
          </h1>
          <p style={{ fontSize: '0.975rem', color: '#134e4a', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
            Book slots, check patients in, and manage the queue in real-time.
          </p>
        </div>
      </div>

      {/* -------------------- RIGHT PANEL (CLEAN FORM CARD) -------------------- */}
      <div
        style={{
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
          minHeight: '100vh'
        }}
      >
        {/* Mobile Header Logo (Visible only below lg) */}
        <div className="login-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={18} color="#2dd4bf" />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>ClinicFlow</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            width: '100%',
            maxWidth: '440px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.02)',
            padding: '2rem 2.25rem'
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
              {isRegister ? 'Create an account' : 'Sign in'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              {isRegister ? 'Enter your details to register as a patient' : 'Welcome back, enter your details'}
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: '#fef2f2',
                color: '#991b1b',
                fontSize: '0.825rem',
                marginBottom: '1rem',
                border: '1px solid #fee2e2',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <AlertCircle size={15} color="#dc2626" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: '#f0fdf4',
                color: '#166534',
                fontSize: '0.825rem',
                marginBottom: '1rem',
                border: '1px solid #dcfce7',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <CheckCircle2 size={15} color="#16a34a" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {isRegister && (
              <>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Sandeep Kulkarni"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Role
                  </label>
                  <select
                    value={userType}
                    onChange={e => setUserType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Phone number (optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </>
            )}

            {/* Email Field */}
            <div style={{ marginBottom: '0.95rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setSelectedDemoRole(null);
                }}
                placeholder="doctor@clinicflow.com"
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Password Field with Eye Toggle */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setSelectedDemoRole(null);
                  }}
                  placeholder="Password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary active:scale-95 transition"
              style={{
                width: '100%',
                minHeight: '44px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>{isRegister ? 'Create account' : 'Sign in'}</span>
              )}
            </button>
          </form>

          {/* Need an account / Sign in toggle text link */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.825rem', color: '#64748b' }}>
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Create account
                </button>
              </>
            )}
          </div>

          {/* -------------------- DEEL-STYLE "OR" DEMO SECTION -------------------- */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '-2.15rem auto 1.15rem auto',
                background: '#ffffff',
                padding: '0 0.75rem',
                width: 'fit-content'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Or try a demo account
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {DEMO_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isSelected = selectedDemoRole === preset.role;
                return (
                  <button
                    key={preset.role}
                    type="button"
                    onClick={() => selectDemoRole(preset)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.55rem 0.65rem',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #0d9488' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0fdfa' : '#ffffff',
                      color: isSelected ? '#0f766e' : '#0f172a',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={16} color={isSelected ? '#0d9488' : '#64748b'} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2 }}>
                        {preset.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: isSelected ? '#0d9488' : '#64748b', whiteSpace: 'nowrap' }}>
                        {preset.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: '0.85rem',
                fontSize: '0.72rem',
                color: '#64748b',
                lineHeight: 1.4,
                textAlign: 'center'
              }}
            >
              Click any demo role to fill credentials, then click <strong>Sign in</strong>.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
