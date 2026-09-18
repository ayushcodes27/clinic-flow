import { useState, useEffect, useCallback } from 'react';
import { Users, Volume2, UserCheck, Stethoscope, Bell, Sparkles } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api';
import { maskPatientName, formatDateTime } from '../utils';

function QueueBoard() {
  const [doctorId, setDoctorId] = useState('');
  const [queueState, setQueueState] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);
  const [audioChimeAlert, setAudioChimeAlert] = useState(false);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);

  const userType = localStorage.getItem('userType') || 'PATIENT';
  const currentUserId = localStorage.getItem('userId') || 'p-sandeep-kulkarni';
  const currentFullName = localStorage.getItem('fullName') || 'Sandeep Kulkarni';

  const fetchBookedAppointments = useCallback(() => {
    api.get('/appointments?status=BOOKED')
      .then(res => setBookedAppointments(res.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    api.get('/doctors')
      .then(res => {
        const docList = res.data || [];
        setDoctors(docList);
        if (docList.length > 0) {
          setDoctorId(docList[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (userType === 'RECEPTIONIST' || userType === 'ADMIN') {
      fetchBookedAppointments();
    }
  }, [userType, fetchBookedAppointments]);

  const loadQueue = useCallback(async (idToLoad) => {
    const id = idToLoad || doctorId;
    if (!id) return;
    try {
      const res = await api.get(`/queue/${id}`);
      const data = res.data;
      const waitingList = data?.queue || data?.waitingQueue || [];
      setQueueState({
        doctorId: id,
        currentPatient: data?.currentPatient || null,
        waitingCount: data?.waitingCount !== undefined ? data?.waitingCount : waitingList.length,
        queue: waitingList
      });
    } catch (_err) {
      setQueueState({ doctorId: id, currentPatient: null, waitingCount: 0, queue: [] });
    }
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) return;
    loadQueue(doctorId);

    let stompClient = null;
    try {
      const socket = new SockJS('/ws');
      stompClient = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        debug: () => {},
        onConnect: () => {
          setIsConnected(true);
          stompClient.subscribe(`/topic/queue/${doctorId}`, (message) => {
            try {
              const state = JSON.parse(message.body);
              const waitingList = state?.queue || state?.waitingQueue || [];
              setQueueState({
                doctorId,
                currentPatient: state?.currentPatient || null,
                waitingCount: state?.waitingCount !== undefined ? state?.waitingCount : waitingList.length,
                queue: waitingList
              });
              setHighlightPulse(true);
              setAudioChimeAlert(true);
              setTimeout(() => setHighlightPulse(false), 1200);
              setTimeout(() => setAudioChimeAlert(false), 3000);
            } catch (parseErr) {
              console.error('Failed to parse STOMP message:', parseErr);
            }
          });
        },
        onDisconnect: () => setIsConnected(false),
        onStompError: () => setIsConnected(false)
      });
      stompClient.activate();
    } catch (_wsErr) {
      setIsConnected(false);
    }

    return () => {
      if (stompClient) stompClient.deactivate();
    };
  }, [doctorId, loadQueue]);

  const handleCallNext = async () => {
    if (!doctorId) return;
    setStatusMsg(null);
    try {
      await api.post(`/queue/doctors/${doctorId}/next`);
      setStatusMsg({ type: 'success', text: 'Next patient called into consultation.' });
      loadQueue(doctorId);
      fetchBookedAppointments();
      setHighlightPulse(true);
      setAudioChimeAlert(true);
      setTimeout(() => setHighlightPulse(false), 1200);
      setTimeout(() => setAudioChimeAlert(false), 3000);
    } catch (_err) {
      setStatusMsg({ type: 'error', text: 'Queue is empty or no more waiting patients.' });
    }
  };

  const handleCheckIn = async (appointmentId) => {
    setStatusMsg(null);
    try {
      await api.post(`/appointments/${appointmentId}/check-in`);
      setStatusMsg({ type: 'success', text: 'Patient checked in and assigned queue token.' });
      loadQueue(doctorId);
      fetchBookedAppointments();
      setManualCode('');
    } catch (_err) {
      setStatusMsg({ type: 'error', text: 'Failed to check in. Check if appointment is valid.' });
    }
  };

  const selectedDoctorObj = doctors.find(d => d.id === doctorId);
  const waitingPatients = queueState?.queue || [];

  // Patient perspective identification
  const isCurrentPatientServing = queueState?.currentPatient && (
    queueState.currentPatient.patientId === currentUserId ||
    queueState.currentPatient.patientName === currentFullName
  );

  const patientQueueIndex = waitingPatients.findIndex(
    p => p.patientId === currentUserId || p.patientName === currentFullName
  );
  const patientQueueEntry = patientQueueIndex >= 0 ? waitingPatients[patientQueueIndex] : null;

  return (
    <div>
      {/* Action / Doctor Selection Bar (No duplicate hero card) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div className="flex items-center gap-2">
          <div className={`live-indicator ${isConnected ? 'live-connected' : 'live-offline'}`}>
            <div className="live-dot" />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {selectedDoctorObj?.specialization ? `${selectedDoctorObj.specialization} clinic` : 'General clinic'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Doctor:
          </label>
          <select
            value={doctorId}
            onChange={e => setDoctorId(e.target.value)}
            style={{ marginBottom: 0, padding: '0.45rem 0.75rem', fontSize: '0.875rem', minWidth: '220px' }}
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.fullName.startsWith('Dr.') ? d.fullName : `Dr. ${d.fullName}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Specific Notification Banner */}
      {userType === 'PATIENT' && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          background: isCurrentPatientServing ? '#f0fdf4' : (patientQueueEntry ? '#f0f9ff' : '#f8fafc'),
          border: `1px solid ${isCurrentPatientServing ? '#bbf7d0' : (patientQueueEntry ? '#bae6fd' : '#e2e8f0')}`,
          color: isCurrentPatientServing ? '#166534' : (patientQueueEntry ? '#0369a1' : '#475569'),
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Sparkles size={18} color={isCurrentPatientServing ? '#16a34a' : '#0284c7'} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {isCurrentPatientServing ? (
              <span>It is your turn! Please proceed to the consultation room.</span>
            ) : patientQueueEntry ? (
              <span>
                You&apos;re <strong>#{patientQueueEntry.position || (patientQueueIndex + 1)}</strong> in line ({patientQueueIndex === 0 ? 'next' : `${patientQueueIndex} ahead of you`}).
              </span>
            ) : (
              <span>You are not currently in this doctor&apos;s queue. Book an appointment or check in at the desk.</span>
            )}
          </div>
        </div>
      )}

      {statusMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontWeight: 600,
          fontSize: '0.875rem',
          background: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: statusMsg.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {statusMsg.text}
        </div>
      )}

      {audioChimeAlert && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          background: '#0284c7',
          color: 'white',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem'
        }}>
          <Bell size={16} />
          <span>Chime: Patient token called for consultation.</span>
        </div>
      )}

      {/* Main Queue Panels */}
      <div className="grid-2">
        {/* Now Serving Panel */}
        <div className={`serving-card ${highlightPulse ? 'highlight-flash' : ''}`}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#0284c7'
            }}>
              Now serving
            </span>
          </div>

          {queueState?.currentPatient ? (
            <div>
              <div className="token-huge">
                #{queueState.currentPatient.position || 1}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                {userType === 'PATIENT' && !isCurrentPatientServing
                  ? maskPatientName(queueState.currentPatient.patientName)
                  : (queueState.currentPatient.patientName || 'Patient')}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Consulting with {selectedDoctorObj?.fullName || 'Doctor'}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#64748b' }}>
              <Stethoscope size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                Consultation room ready
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                No patient currently in consultation.
              </div>
            </div>
          )}

          {/* Call Next Button: strictly DOCTOR and ADMIN only (NOT receptionist) */}
          {(userType === 'DOCTOR' || userType === 'ADMIN') && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={handleCallNext}
                disabled={waitingPatients.length === 0}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Volume2 size={18} />
                Call next patient ({waitingPatients.length} waiting)
              </button>
            </div>
          )}
        </div>

        {/* Waiting Queue List */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="#0284c7" />
              Waiting list ({waitingPatients.length})
            </h3>
          </div>

          {waitingPatients.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1'
            }}>
              <Users size={28} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600, color: '#334155' }}>No patients waiting</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                There are no patients currently in queue for this doctor.
              </p>
            </div>
          ) : (
            <ul className="queue-list">
              {waitingPatients.map((entry, index) => {
                const isUser = userType === 'PATIENT' && (
                  entry.patientId === currentUserId ||
                  entry.patientName === currentFullName
                );
                const displayName = userType === 'PATIENT'
                  ? (isUser ? entry.patientName : maskPatientName(entry.patientName))
                  : entry.patientName;

                return (
                  <li
                    key={entry.id || index}
                    className="queue-item"
                    style={{
                      background: isUser ? '#f0f9ff' : '#ffffff',
                      border: isUser ? '1px solid #bae6fd' : '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        background: isUser ? '#0284c7' : '#e0f2fe',
                        color: isUser ? '#ffffff' : '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem'
                      }}>
                        #{entry.position || index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.925rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{displayName}</span>
                          {isUser && (
                            <span style={{ fontSize: '0.675rem', background: '#0284c7', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              You
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                          Waiting
                        </div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>
                      {index === 0 ? 'Next' : `${index} ahead`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Reception Desk: Check-in Station for RECEPTIONIST & ADMIN */}
      {(userType === 'RECEPTIONIST' || userType === 'ADMIN') && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                <UserCheck size={18} color="#059669" />
                Receptionist check-in desk
              </h3>
              <p className="card-subtitle" style={{ fontSize: '0.8rem' }}>
                Check in patients as they arrive.
              </p>
            </div>
          </div>

          {bookedAppointments.length > 0 ? (
            <div className="table-container" style={{ marginBottom: '1.25rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Booking ref</th>
                    <th>Patient name</th>
                    <th>Scheduled slot</th>
                    <th>Doctor</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookedAppointments.map(apt => (
                    <tr key={apt.id}>
                      <td style={{ fontWeight: 600, color: '#0284c7', fontFamily: 'monospace' }}>
                        {apt.bookingRef || apt.id.substring(0, 8)}
                      </td>
                      <td>
                        <strong>{apt.patient?.fullName || 'Patient'}</strong>
                      </td>
                      <td>
                        {formatDateTime(apt.slot?.slotDate, apt.slot?.startTime)}
                      </td>
                      <td>{apt.doctor?.fullName || 'Doctor'}</td>
                      <td>
                        <button
                          className="btn-sm btn-success"
                          onClick={() => handleCheckIn(apt.id)}
                        >
                          <UserCheck size={14} /> Check in
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
              No pending booked appointments waiting for check-in today.
            </p>
          )}

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Or enter a booking reference
            </label>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="e.g. CF-20260918-A101"
                style={{ marginBottom: 0, flex: 1, minWidth: '220px', fontFamily: 'monospace' }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => manualCode && handleCheckIn(manualCode)}
              >
                Check in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QueueBoard;
