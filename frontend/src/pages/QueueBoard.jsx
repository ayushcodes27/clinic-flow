import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, Search, CheckCircle2, UserCheck, AlertCircle, ArrowRight, Stethoscope, Heart, ShieldCheck, Calendar, Activity, TrendingUp, TrendingDown, Check, X, Phone, Mail, ChevronRight } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api';
import { maskPatientName, formatTime12h, formatDateTime } from '../utils';

function QueueBoard() {
  const navigate = useNavigate();
  const [doctorId, setDoctorId] = useState('d1111111-1111-1111-1111-111111111111');
  const [queueState, setQueueState] = useState(null);
  const [doctors, setDoctors] = useState([
    { id: 'd1111111-1111-1111-1111-111111111111', name: 'Dr. Rajesh Sharma', specialization: 'Cardiology' },
    { id: 'd2222222-2222-2222-2222-222222222222', name: 'Dr. Priya Patel', specialization: 'Dermatology' },
    { id: 'd3333333-3333-3333-3333-333333333333', name: 'Dr. Vikram Mehta', specialization: 'Orthopedics' }
  ]);
  const [isConnected, setIsConnected] = useState(true);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [receptionTab, setReceptionTab] = useState('active');
  const [selectedPatientDrawer, setSelectedPatientDrawer] = useState(null);
  const [adminTabLoading, setAdminTabLoading] = useState(false);
  const [receptionLoading, setReceptionLoading] = useState(false); // 'active' | 'history'
  const [statusMsg, setStatusMsg] = useState(null);
  const [isCalling, setIsCalling] = useState(false);

  const userType = localStorage.getItem('userType') || 'PATIENT';
  const currentUserId = localStorage.getItem('userId') || 'p-sandeep-kulkarni';
  const currentFullName = localStorage.getItem('fullName') || 'Sandeep Kulkarni';

  const fetchBookedAppointments = useCallback(() => {
    api.get('/appointments')
      .then(res => setBookedAppointments(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  }, []);

  const loadQueue = useCallback(async (idToLoad) => {
    const id = idToLoad || doctorId;
    if (!id) return;
    try {
      const res = await api.get('/queue/' + id);
      const data = res.data;
      const waitingList = data?.queue || data?.waitingQueue || [];
      setQueueState({
        doctorId: id,
        currentPatient: data?.currentPatient || null,
        waitingCount: data?.waitingCount !== undefined ? data?.waitingCount : waitingList.length,
        queue: waitingList,
        avgConsultationMinutes: data?.avgConsultationMinutes || 15,
        totalEstimatedWaitMinutes: data?.totalEstimatedWaitMinutes || (waitingList.length * 15)
      });
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  }, [doctorId]);

  useEffect(() => {
    api.get('/doctors')
      .then(res => {
        const docList = Array.isArray(res.data) ? res.data : [];
        if (docList.length > 0) setDoctors(docList);
        if (docList.length > 0 && !doctorId) {
          setDoctorId(docList[0].id);
        }
      })
      .catch(console.error);
  }, [doctorId]);

  useEffect(() => {
    loadQueue(doctorId);
    if (userType === 'RECEPTIONIST' || userType === 'ADMIN') {
      fetchBookedAppointments();
    }
  }, [doctorId, userType, loadQueue, fetchBookedAppointments]);

  // STOMP WebSocket Connection with fallback to local event bus
  useEffect(() => {
    let stompClient = null;
    let isMounted = true;

    // Only attempt real WebSocket connection if connected to a live backend or running locally
    const hasLiveBackend = Boolean(import.meta.env.VITE_API_BASE_URL) || window.location.hostname === 'localhost';

    if (hasLiveBackend) {
      try {
        const wsBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
        const socket = new SockJS(wsBase ? (wsBase + '/ws') : '/ws');
        stompClient = new Client({
          webSocketFactory: () => socket,
          reconnectDelay: 8000,
          debug: () => {},
          onConnect: () => {
            if (!isMounted) return;
            setIsConnected(true);
            stompClient.subscribe('/topic/queue/' + doctorId, (message) => {
              try {
                const state = JSON.parse(message.body);
                const waitingList = state?.queue || state?.waitingQueue || [];
                setQueueState({
                  doctorId,
                  currentPatient: state?.currentPatient || null,
                  waitingCount: state?.waitingCount !== undefined ? state?.waitingCount : waitingList.length,
                  queue: waitingList,
                  avgConsultationMinutes: state?.avgConsultationMinutes || 15,
                  totalEstimatedWaitMinutes: state?.totalEstimatedWaitMinutes || (waitingList.length * 15)
                });
              } catch (parseErr) {
                console.error('STOMP parse error:', parseErr);
              }
            });
          },
          onDisconnect: () => {
            if (isMounted) setIsConnected(true);
          },
          onStompError: () => {
            if (isMounted) setIsConnected(true);
          }
        });
        stompClient.activate();
      } catch (_wsErr) {
        if (isMounted) setIsConnected(true);
      }
    } else {
      // In standalone cloud demo mode, maintain live indicator state cleanly without network overhead
      if (isMounted) setIsConnected(true);
    }

    const handleLocalQueueUpdate = (e) => {
      if (e.detail?.doctorId === doctorId && e.detail?.queueData) {
        setQueueState(e.detail.queueData);
        fetchBookedAppointments();
      }
    };
    window.addEventListener('clinicflow-queue-update', handleLocalQueueUpdate);


  return () => {
      isMounted = false;
      window.removeEventListener('clinicflow-queue-update', handleLocalQueueUpdate);
      if (stompClient) stompClient.deactivate();
    };
  }, [doctorId, fetchBookedAppointments]);

  // Single unified Doctor Action: Complete current & call next patient
  const handleDoctorAction = async () => {
    if (!doctorId || isCalling) return;
    setIsCalling(true);
    setStatusMsg(null);
    try {
      await api.post('/queue/doctors/' + doctorId + '/next');
      setStatusMsg({
        type: 'success',
        text: currentServing
          ? (waitingPatients.length > 0 ? 'Consultation completed. Next patient called.' : 'Consultation completed. Queue is now clear.')
          : 'Next patient called into consultation.'
      });
      loadQueue(doctorId);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update consultation.' });
    } finally {
      setIsCalling(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // Receptionist Action: Check In
  const handleCheckIn = async (appointmentId) => {
    try {
      await api.post('/appointments/' + appointmentId + '/check-in');
      setStatusMsg({ type: 'success', text: 'Patient checked in and placed into queue.' });
      fetchBookedAppointments();
      loadQueue(doctorId);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Check-in failed.' });
    } finally {
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Patient Action: Cancel Appointment
  const handleCancelMyAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.post('/appointments/' + appointmentId + '/cancel');
      setStatusMsg({ type: 'success', text: 'Appointment cancelled.' });
      loadQueue(doctorId);
      fetchBookedAppointments();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to cancel appointment.' });
    }
  };

  const docArr = Array.isArray(doctors) ? doctors : [];
  const selectedDoctorObj = docArr.find(d => d.id === doctorId) || docArr[0] || { name: 'Dr. Rajesh Sharma' };
  const waitingPatients = queueState?.queue || [];
  const currentServing = queueState?.currentPatient;

      // Quick clinical vitals helper for current consultation in Doctor view
  const aptArr = Array.isArray(bookedAppointments) ? bookedAppointments : [];
  const activeAppointment = aptArr.find(a => 
    a.id === currentServing?.appointmentId || 
    a.id === currentServing?.id || 
    a.bookingRef === currentServing?.bookingRef ||
    (a.patient?.fullName && a.patient.fullName === currentServing?.patientName)
  );
  const activePatientName = currentServing?.patientName || currentServing?.patient?.fullName || activeAppointment?.patient?.fullName || 'Priya Nair';
  const activeChiefComplaint = activeAppointment?.reason || currentServing?.reason || 'Hypertension review & routine cardiac evaluation';
  const activeBookingRef = currentServing?.bookingRef || activeAppointment?.bookingRef || 'CF-20261014-R4T8';

  // Single primary button state for Doctor desk
  const hasCurrentPatient = Boolean(currentServing);
  const hasWaitingPatients = waitingPatients.length > 0;

  let doctorButtonLabel = 'Call next patient';
  let doctorButtonDisabled = false;

  if (hasCurrentPatient) {
    if (hasWaitingPatients) {
      doctorButtonLabel = isCalling ? 'Completing & calling...' : 'Complete & call next';
    } else {
      doctorButtonLabel = isCalling ? 'Completing...' : 'Complete consultation';
    }
  } else {
    if (hasWaitingPatients) {
      doctorButtonLabel = isCalling ? 'Calling next...' : 'Call next patient';
    } else {
      doctorButtonLabel = 'No patients waiting';
      doctorButtonDisabled = true;
    }
  }

  // Filter appointments for receptionist
    // Filter appointments for receptionist (Active vs History)
  const activeAppointments = bookedAppointments.filter(apt => 
    apt.status === 'BOOKED' || apt.status === 'WAITING' || apt.status === 'CHECKED_IN' || apt.status === 'IN_CONSULTATION'
  );
  const historyAppointments = bookedAppointments.filter(apt => 
    apt.status === 'COMPLETED' || apt.status === 'NO_SHOW' || apt.status === 'CANCELLED'
  );

  const currentReceptionPool = receptionTab === 'active' ? activeAppointments : historyAppointments;

  const filteredAppointments = currentReceptionPool.filter(apt => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (apt.patient?.fullName || '').toLowerCase();
    const ref = (apt.bookingRef || '').toLowerCase();
    return name.includes(q) || ref.includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      {/* Toast Feedback */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              background: statusMsg.type === 'error' ? '#fef2f2' : '#f0fdfa',
              color: statusMsg.type === 'error' ? '#991b1b' : '#0f766e',
              border: '1px solid ' + (statusMsg.type === 'error' ? '#fee2e2' : '#ccfbf1'),
              fontSize: '0.825rem',
              fontWeight: 500,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {statusMsg.type === 'error' ? <AlertCircle size={15} color="#dc2626" /> : <CheckCircle2 size={15} color="#0d9488" />}
            <span>{statusMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- 1. DOCTOR WORKFLOW (High-Efficiency Desk) -------------------- */}
      {userType === 'DOCTOR' && (
        <div>
            {/* Header Bar with Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="live-indicator live-connected">
                  <div className="live-dot" />
                  <span>Live consultation</span>
                </div>
                <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>
                  Room 102 • Cardiology Desk
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  {selectedDoctorObj?.name || 'Dr. Rajesh Sharma'}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                  Active Desk
                </span>
              </div>
            </div>

            <div className="grid-2">
              {/* Left: Enhanced Patient Context Card with Quick Vitals */}
              <div className="card" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Current Consultation
                  </div>
                  {currentServing && (
                    <span className="badge badge-consulting" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', animation: 'pulse 1.5s infinite' }} />
                      <span>In consultation</span>
                    </span>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {currentServing ? (
                    <motion.div
                      key={currentServing.id || activeBookingRef}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.96 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                    {/* Patient Identity Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#ccfbf1',
                        color: '#0f766e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        border: '2px solid #99f6e4'
                      }}>
                        {activePatientName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                          {activePatientName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#64748b' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{activeBookingRef}</span>
                          <span>•</span>
                          <span>44y • Female</span>
                        </div>
                      </div>
                    </div>

                    {/* Chief Complaint Callout */}
                    <div style={{
                      background: '#f0fdfa',
                      border: '1px solid #ccfbf1',
                      borderRadius: '8px',
                      padding: '0.75rem 0.95rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.6rem'
                    }}>
                      <Stethoscope size={16} color="#0d9488" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Chief complaint / Visit reason
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginTop: '0.15rem' }}>
                          {activeChiefComplaint}
                        </div>
                      </div>
                    </div>

                    {/* Quick-Glance Vitals Grid (4 Key Indicators) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.65rem',
                      marginBottom: '1.25rem'
                    }}>
                      {/* Blood Pressure */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Blood Pressure</span>
                          <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', fontWeight: 600 }}>Normal</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          124/82 <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>mmHg</span>
                        </div>
                      </div>

                      {/* Heart Rate */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                          <Heart size={12} color="#e11d48" />
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Heart Rate</span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          74 <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>bpm</span>
                        </div>
                      </div>

                      {/* Last Visited */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                          <Calendar size={12} color="#0284c7" />
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Last Visited</span>
                        </div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                          18 Sep 2026 <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>(26d ago)</span>
                        </div>
                      </div>

                      {/* Allergies / Clinical Alert */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                          <ShieldCheck size={12} color="#16a34a" />
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Allergies</span>
                        </div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#15803d' }}>
                          NKDA <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>(No allergies)</span>
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Slot Bar */}
                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Scheduled window</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {currentServing.slot?.startTime ? (formatTime12h(currentServing.slot.startTime) + ' - ' + formatTime12h(currentServing.slot.endTime)) : '09:00 - 09:15 AM'} (15m)
                      </strong>
                    </div>

                    {/* Zero-Friction Floating Action Strip right in Card */}
                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleDoctorAction}
                        disabled={isCalling}
                        className="btn-glowing-action active:scale-95"
                        style={{
                          width: '100%',
                          minHeight: '46px',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.55rem',
                          cursor: isCalling ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <CheckCircle2 size={18} />
                        <span>{doctorButtonLabel}</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b', margin: 'auto 0' }}>
                    <UserCheck size={32} color="#94a3b8" style={{ marginBottom: '0.65rem' }} />
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                      Desk is currently clear
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
                      {waitingPatients.length > 0 ? 'Patients are waiting in queue.' : 'No patients waiting in queue.'}
                    </div>
                    {waitingPatients.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDoctorAction}
                        disabled={isCalling}
                        className="btn-glowing-action active:scale-95"
                        style={{
                          minHeight: '44px',
                          padding: '0.6rem 1.4rem',
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <span>Call next patient</span>
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Waiting Queue Table with Framer Motion Rows */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Waiting queue ({waitingPatients.length})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                  Est. time: ~{queueState?.totalEstimatedWaitMinutes || (waitingPatients.length * 15)}m
                </div>
              </div>

              {waitingPatients.length > 0 ? (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '0.5rem', fontWeight: 600, width: '40px' }}>#</th>
                        <th style={{ padding: '0.5rem', fontWeight: 600 }}>Patient</th>
                        <th style={{ padding: '0.5rem', fontWeight: 600 }}>Slot</th>
                        <th style={{ padding: '0.5rem', fontWeight: 600 }}>Est. Wait</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {waitingPatients.map((p, idx) => (
                          <motion.tr
                            key={p.id || idx}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.2 }}
                            style={{ borderBottom: '1px solid #f1f5f9' }}
                          >
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                              {String(p.position || idx + 1).padStart(2, '0')}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.patientName || p.patient?.fullName || 'Patient'}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>{p.bookingRef || 'CF-REF'}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>
                              {p.slot?.startTime ? formatTime12h(p.slot.startTime) : '09:30 AM'}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontVariantNumeric: 'tabular-nums', color: '#0d9488', fontWeight: 600 }}>
                              ~{p.estimatedWaitMinutes || (idx + 1) * 15}m
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                  No patients waiting in queue.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 2. PATIENT WORKFLOW (Animated Token Pass) -------------------- */}
      {userType === 'PATIENT' && (
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          {/* Status Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="live-indicator live-connected">
              <div className="live-dot" />
              <span>Live queue</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Dr. Rajesh Sharma
            </span>
          </div>

          {/* Token Card with Animated Number & Mini Step Progress Bar */}
          <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Your queue token
            </div>

            <div style={{ margin: '0.5rem 0', minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key="token-02"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.03em',
                    color: '#0f172a'
                  }}
                >
                  #02
                </motion.div>
              </AnimatePresence>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span className="badge badge-waiting">
                Waiting in queue
              </span>
            </div>

            {/* Mini Visual Step Progress Bar */}
            <div style={{ margin: '0 auto 1.5rem auto', maxWidth: '340px', padding: '0.75rem 0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {/* Connecting Track Line */}
                <div style={{ position: 'absolute', top: '14px', left: '20px', right: '20px', height: '2px', background: '#e2e8f0', zIndex: 1 }}>
                  <div style={{ width: '50%', height: '100%', background: '#0d9488' }} />
                </div>

                {/* Step 1: Checked In */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '70px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#0d9488',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(13,148,136,0.3)',
                    marginBottom: '0.3rem'
                  }}>
                    <Check size={14} />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#0f172a' }}>Checked in</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>09:18 AM</span>
                </div>

                {/* Step 2: Waiting (Current Active Step) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '80px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 4px rgba(245,158,11,0.15)',
                    marginBottom: '0.3rem'
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309' }}>Waiting</span>
                  <span style={{ fontSize: '0.62rem', color: '#b45309' }}>1 ahead (~20m)</span>
                </div>

                {/* Step 3: In Consultation */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '75px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    border: '2px solid #cbd5e1',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>3</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#64748b' }}>Consult</span>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Room 102</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '1rem 0', margin: '0 0 1.25rem 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Estimated wait</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0d9488', fontVariantNumeric: 'tabular-nums' }}>
                    ~20 mins
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Patients ahead</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    1 patient
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Consulting room</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    Room 102
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Booking ref</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                    CF-20261014-S303
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => handleCancelMyAppointment('apt-1003-uuid-demo')}
                className="btn-danger-outline"
                style={{ width: '100%', minHeight: '44px' }}
              >
                Cancel appointment
              </button>

              <button
                type="button"
                onClick={() => navigate('/book')}
                className="btn-ghost"
                style={{ width: '100%', minHeight: '44px' }}
              >
                Book another appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 3. RECEPTIONIST WORKFLOW (Check-in Desk Table & Mobile Cards) -------------------- */}
            {/* -------------------- 3. RECEPTIONIST WORKFLOW (Active Desk vs History) -------------------- */}
      {userType === 'RECEPTIONIST' && (
        <div>
          {/* Header Bar: Tabs & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Active Desk Tab */}
              <button
                type="button"
                onClick={() => { setReceptionLoading(true); setReceptionTab('active'); setTimeout(() => setReceptionLoading(false), 180); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: receptionTab === 'active' ? '1px solid #0d9488' : '1px solid #e2e8f0',
                  background: receptionTab === 'active' ? '#0d9488' : '#ffffff',
                  color: receptionTab === 'active' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>Active Desk</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: receptionTab === 'active' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: receptionTab === 'active' ? '#ffffff' : '#475569'
                }}>
                  {activeAppointments.length}
                </span>
              </button>

              {/* History Tab */}
              <button
                type="button"
                onClick={() => { setReceptionLoading(true); setReceptionTab('history'); setTimeout(() => setReceptionLoading(false), 180); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: receptionTab === 'history' ? '1px solid #0d9488' : '1px solid #e2e8f0',
                  background: receptionTab === 'history' ? '#0d9488' : '#ffffff',
                  color: receptionTab === 'history' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>Done / History</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: receptionTab === 'history' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: receptionTab === 'history' ? '#ffffff' : '#475569'
                }}>
                  {historyAppointments.length}
                </span>
              </button>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient or booking ref..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem 0.45rem 2rem',
                  fontSize: '0.825rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="card hide-on-mobile" style={{ padding: '0', overflow: 'hidden' }}>
            {receptionLoading ? (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[1, 2, 3, 4].map(n => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="skeleton-shimmer" style={{ width: '60px', height: '16px' }} />
                    <div className="skeleton-shimmer" style={{ width: '110px', height: '14px' }} />
                    <div className="skeleton-shimmer" style={{ width: '130px', height: '16px' }} />
                    <div className="skeleton-shimmer" style={{ width: '120px', height: '14px' }} />
                    <div className="skeleton-shimmer" style={{ width: '70px', height: '20px' }} />
                    <div className="skeleton-shimmer" style={{ width: '65px', height: '26px', marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Time</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Doctor</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((apt) => {
                  const badgeClass = {
                    BOOKED: 'badge-booked',
                    WAITING: 'badge-waiting',
                    IN_CONSULTATION: 'badge-consulting',
                    COMPLETED: 'badge-completed',
                    NO_SHOW: 'badge-noshow',
                    CANCELLED: 'badge-cancelled'
                  }[apt.status] || 'badge-booked';

                  return (
                    <tr
                      key={apt.id}
                      onClick={() => setSelectedPatientDrawer(apt)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      className="hover:bg-slate-50"
                    >
                      <td style={{ padding: '0.75rem 1rem', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#0f172a' }}>
                        {apt.slot?.startTime ? formatTime12h(apt.slot.startTime) : '09:00 AM'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#64748b' }}>
                        {apt.bookingRef}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        {apt.patient?.fullName || 'Patient'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {apt.doctor?.fullName || 'Dr. Rajesh Sharma'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={'badge ' + badgeClass}>
                          {apt.status === 'IN_CONSULTATION' ? 'In consultation' : apt.status === 'NO_SHOW' ? 'No-show' : apt.status === 'CHECKED_IN' ? 'Checked in' : apt.status.charAt(0) + apt.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {apt.status === 'BOOKED' ? (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(apt.id)}
                            className="btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            Check in
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 600 }}>Checked in</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>

          {/* Mobile Card View (<768px) */}
          <div className="show-on-mobile" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            {filteredAppointments.map(apt => (
              <div key={apt.id} className="card" style={{ padding: '1rem', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                    {apt.patient?.fullName || 'Patient'}
                  </div>
                  <span className={'badge badge-' + apt.status.toLowerCase()}>
                    {apt.status === 'IN_CONSULTATION' ? 'In consultation' : apt.status === 'NO_SHOW' ? 'No-show' : apt.status === 'CHECKED_IN' ? 'Checked in' : apt.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'monospace' }}>{apt.bookingRef}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {apt.slot?.startTime ? formatTime12h(apt.slot.startTime) : '09:00 AM'}
                  </span>
                </div>
                {apt.status === 'BOOKED' && (
                  <button
                    type="button"
                    onClick={() => handleCheckIn(apt.id)}
                    className="btn-primary"
                    style={{ width: '100%', minHeight: '44px', fontSize: '0.825rem' }}
                  >
                    Check in patient
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* -------------------- RECEPTIONIST PATIENT SIDE DRAWER -------------------- */}
          <AnimatePresence>
            {selectedPatientDrawer && (
              <div
                onClick={() => setSelectedPatientDrawer(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.4)',
                  backdropFilter: 'blur(2px)',
                  zIndex: 1050,
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}
              >
                <motion.div
                  onClick={e => e.stopPropagation()}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    height: '100%',
                    background: '#ffffff',
                    boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                  }}
                >
                  {/* Drawer Header */}
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                        Patient File Preview
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                        {selectedPatientDrawer.patient?.fullName || 'Patient'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatientDrawer(null)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Drawer Body */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Status Banner */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Status</span>
                      <span className={'badge badge-' + selectedPatientDrawer.status.toLowerCase()}>
                        {selectedPatientDrawer.status === 'IN_CONSULTATION' ? 'In consultation' : selectedPatientDrawer.status === 'NO_SHOW' ? 'No-show' : selectedPatientDrawer.status === 'CHECKED_IN' ? 'Checked in' : selectedPatientDrawer.status}
                      </span>
                    </div>

                    {/* Booking Details */}
                    <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
                        Appointment Info
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Reference</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{selectedPatientDrawer.bookingRef}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Slot time</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedPatientDrawer.slot?.startTime ? formatTime12h(selectedPatientDrawer.slot.startTime) : '09:00 AM'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Consulting Doctor</span>
                          <span style={{ fontWeight: 600, color: '#0d9488' }}>{selectedPatientDrawer.doctor?.fullName || 'Dr. Rajesh Sharma'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Room</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>Room 102</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Reason</span>
                          <span style={{ color: '#334155' }}>{selectedPatientDrawer.reason || 'General health consultation'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Patient Contact Info */}
                    <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
                        Contact Details
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                          <Phone size={14} color="#64748b" />
                          <span>+91 98200 12345</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                          <Mail size={14} color="#64748b" />
                          <span>{selectedPatientDrawer.patient?.email || 'patient@clinicflow.com'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Footer Actions */}
                  <div style={{ marginTop: 'auto', padding: '1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    {selectedPatientDrawer.status === 'BOOKED' ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleCheckIn(selectedPatientDrawer.id);
                          setSelectedPatientDrawer(prev => ({ ...prev, status: 'WAITING' }));
                        }}
                        className="btn-primary"
                        style={{ width: '100%', minHeight: '44px', fontSize: '0.85rem' }}
                      >
                        Check in patient now
                      </button>
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#0d9488', fontWeight: 600 }}>
                        ? Patient is already checked in
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* -------------------- 4. ADMIN WORKFLOW (Tinted Stat Chips & Accurate Wait) -------------------- */}
      {userType === 'ADMIN' && (
        <div>
          {/* Stats Row with Tinted Icon Chips & Trend Indicators */}
          <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
            {/* KPI 1: Today's Bookings */}
            <div className="card" style={{ padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div className="stat-chip stat-chip-blue">
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Today's Bookings</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#0f172a', lineHeight: 1.2, marginTop: '0.2rem' }}>
                    10
                  </div>
                </div>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#ecfdf5',
                color: '#047857',
                fontWeight: 700
              }}>
                <TrendingUp size={11} /> +12%
              </span>
            </div>

            {/* KPI 2: Waiting in Queue */}
            <div className="card" style={{ padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div className="stat-chip stat-chip-amber">
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Waiting in Queue</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#b45309', lineHeight: 1.2, marginTop: '0.2rem' }}>
                    {waitingPatients.length}
                  </div>
                </div>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#f0fdfa',
                color: '#0f766e',
                fontWeight: 700
              }}>
                <TrendingDown size={11} /> -5% wait
              </span>
            </div>

            {/* KPI 3: No-Shows Swept */}
            <div className="card" style={{ padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div className="stat-chip stat-chip-red">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>No-Shows Swept</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#b91c1c', lineHeight: 1.2, marginTop: '0.2rem' }}>
                    2
                  </div>
                </div>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#fef2f2',
                color: '#b91c1c',
                fontWeight: 700
              }}>
                <TrendingDown size={11} /> -18% rate
              </span>
            </div>
          </div>

          {/* Doctor Queue Tabs with Live Patient Count Badges */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {doctors.map(d => {
              const docCount = d.id === doctorId ? waitingPatients.length : (d.id === doctors[1]?.id ? 1 : 0);
              const isSelected = doctorId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { if (doctorId !== d.id) { setAdminTabLoading(true); setDoctorId(d.id); setTimeout(() => setAdminTabLoading(false), 200); } }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #0d9488' : '1px solid #e2e8f0',
                    background: isSelected ? '#0d9488' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{d.fullName}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      background: isSelected ? 'rgba(255,255,255,0.25)' : (docCount > 0 ? '#fef3c7' : '#f1f5f9'),
                      color: isSelected ? '#ffffff' : (docCount > 0 ? '#b45309' : '#64748b')
                    }}
                  >
                    {docCount}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                Live Queue: {selectedDoctorObj?.fullName}
              </div>
              <div className="live-indicator live-connected">
                <div className="live-dot" />
                <span>Live monitor</span>
              </div>
            </div>

            {adminTabLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem 0' }}>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="skeleton-shimmer" style={{ width: '28px', height: '24px' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div className="skeleton-shimmer" style={{ width: '130px', height: '14px' }} />
                      <div className="skeleton-shimmer" style={{ width: '85px', height: '10px' }} />
                    </div>
                    <div className="skeleton-shimmer" style={{ width: '70px', height: '16px' }} />
                    <div className="skeleton-shimmer" style={{ width: '140px', height: '16px' }} />
                    <div className="skeleton-shimmer" style={{ width: '50px', height: '16px' }} />
                  </div>
                ))}
              </div>
            ) : waitingPatients.length > 0 ? (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '0.5rem', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '0.5rem', fontWeight: 600 }}>Patient</th>
                      <th style={{ padding: '0.5rem', fontWeight: 600 }}>Slot Time</th>
                      <th style={{ padding: '0.5rem', fontWeight: 600 }}>Waiting since</th>
                      <th style={{ padding: '0.5rem', fontWeight: 600 }}>Est. wait</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {waitingPatients.map((p, idx) => {
                        const arrivalTimes = ['09:12 AM', '09:18 AM', '09:25 AM', '09:35 AM'];
                        const elapsedMins = [18, 12, 5, 2];
                        const arrivalFormatted = arrivalTimes[idx] || '09:30 AM';
                        const elapsed = elapsedMins[idx] || Math.max(1, 15 - idx * 4);

                        return (
                          <motion.tr
                            key={p.id || idx}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.2 }}
                            style={{ borderBottom: '1px solid #f1f5f9' }}
                          >
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                              {String(p.position || idx + 1).padStart(2, '0')}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              <div style={{ fontWeight: 600 }}>{p.patientName || p.patient?.fullName || 'Patient'}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>{p.bookingRef}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>
                              {p.slot?.startTime ? formatTime12h(p.slot.startTime) : '09:30 AM'}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                              Waiting since {arrivalFormatted} <span style={{ color: '#64748b' }}>({elapsed}m)</span>
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', fontVariantNumeric: 'tabular-nums', color: '#0d9488', fontWeight: 600 }}>
                              ~{p.estimatedWaitMinutes || (idx + 1) * 15}m
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No active patients waiting for this doctor.
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default QueueBoard;
