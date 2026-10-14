import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, X, MapPin, BookmarkCheck, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api';
import { formatTime12h, formatDateTime } from '../utils';
import { getDayOfWeekIndex, INITIAL_SCHEDULES, TODAY_STR } from '../mockData';

const DAYS_MAP = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
};

function Booking() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState(TODAY_STR);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [reason, setReason] = useState('');
  const [confirmingSlot, setConfirmingSlot] = useState(null);
  const [modalReason, setModalReason] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [myAppointments, setMyAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'my-appointments'
  const [isCapped, setIsCapped] = useState(false);

  useEffect(() => {
    api.get('/doctors')
      .then(res => {
        const docList = res.data || [];
        setDoctors(docList);
        if (docList.length > 0) {
          setSelectedDoctor(docList[0].id);
        }
      })
      .catch(console.error);

    fetchMyAppointments();
  }, []);

  const fetchMyAppointments = () => {
    api.get('/appointments')
      .then(res => setMyAppointments(res.data || []))
      .catch(console.error);
  };

  const searchSlots = useCallback(async () => {
    if (!selectedDoctor || !date) return;
    setLoadingSlots(true);
    try {
      const res = await api.get(`/slots?doctorId=${selectedDoctor}&date=${date}`);
      const rawSlots = res.data?.slots || res.data || [];
      setSlots(rawSlots);

      const doc = doctors.find(d => d.id === selectedDoctor);
      const limit = doc?.maxDailyPatients || 20;

      const schedules = INITIAL_SCHEDULES[selectedDoctor] || [];
      const dayIdx = getDayOfWeekIndex(date);
      const shift = schedules.find(s => s.dayOfWeek === dayIdx);
      if (shift) {
        const [sh, sm] = shift.startTime.split(':').map(Number);
        const [eh, em] = shift.endTime.split(':').map(Number);
        const totalDuration = (eh * 60 + em) - (sh * 60 + sm);
        const shiftSlotsCount = Math.floor(totalDuration / (shift.consultationDurationMinutes || 15));
        setIsCapped(shiftSlotsCount > limit && rawSlots.length <= limit);
      } else {
        setIsCapped(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor, date, doctors]);

  useEffect(() => {
    if (selectedDoctor && date) {
      searchSlots();
    }
  }, [selectedDoctor, date, searchSlots]);

  // Real-time broadcast listener: When a slot is booked by anyone, mark it taken on this screen
  useEffect(() => {
    const handleSlotBookedEvent = (e) => {
      const { slotId } = e.detail || {};
      if (slotId) {
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'BOOKED', booked: true } : s));
      }
    };
    window.addEventListener('clinicflow-slot-booked', handleSlotBookedEvent);
    return () => window.removeEventListener('clinicflow-slot-booked', handleSlotBookedEvent);
  }, []);

    const handleBook = async (slot, explicitReason) => {
    if (slot.status === 'BOOKED' || slot.booked || bookingSlotId) return;

    setBookingSlotId(slot.id);
    setToastMsg(null);
    const chosenReason = (explicitReason !== undefined ? explicitReason : reason).trim() || 'General consultation';

    // Optimistic UI update: immediately mark slot as booked
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, status: 'BOOKED', booked: true } : s));

    try {
      await api.post('/appointments/book', {
        slotId: slot.id,
        reason: chosenReason
      });

      setToastMsg({
        type: 'success',
        text: `Appointment reserved for ${formatTime12h(slot.startTime)}.`
      });
      setConfirmingSlot(null);
      fetchMyAppointments();
    } catch (err) {
      if (err.response?.status === 409) {
        setToastMsg({
          type: 'error',
          text: 'That slot was just booked by another user. Please choose another.'
        });
      } else {
        setToastMsg({
          type: 'error',
          text: err.response?.data?.message || 'Unable to complete booking'
        });
      }
      // Revert if error
      searchSlots();
    } finally {
      setBookingSlotId(null);
      searchSlots(); // Always refresh from server
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  const selectedDoctorObj = doctors.find(d => d.id === selectedDoctor);
  const selectedDoctorShortName = selectedDoctorObj?.fullName
    ? selectedDoctorObj.fullName.replace(/^Dr\.\s*/, '')
    : 'this doctor';

  const dayOfWeekNumber = getDayOfWeekIndex(date);
  const isWeekend = dayOfWeekNumber === 6 || dayOfWeekNumber === 7;

  const morningSlots = slots.filter(s => {
    const hour = parseInt(s.startTime?.split(':')[0] || '0', 10);
    return hour < 12;
  });

  const afternoonSlots = slots.filter(s => {
    const hour = parseInt(s.startTime?.split(':')[0] || '0', 10);
    return hour >= 12;
  });

  const isSlotBooked = (slot) => slot.status === 'BOOKED' || slot.booked;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('book')}
          style={{
            padding: '0.5rem 0.85rem',
            fontSize: '0.825rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: activeTab === 'book' ? '1px solid #0d9488' : '1px solid #e2e8f0',
            background: activeTab === 'book' ? '#0d9488' : '#ffffff',
            color: activeTab === 'book' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Book appointment
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('my-appointments'); fetchMyAppointments(); }}
          style={{
            padding: '0.5rem 0.85rem',
            fontSize: '0.825rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: activeTab === 'my-appointments' ? '1px solid #0d9488' : '1px solid #e2e8f0',
            background: activeTab === 'my-appointments' ? '#0d9488' : '#ffffff',
            color: activeTab === 'my-appointments' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s'
          }}
        >
          <BookmarkCheck size={14} />
          <span>My appointments ({myAppointments.length})</span>
        </button>
      </div>

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              fontSize: '0.825rem',
              fontWeight: 500,
              background: toastMsg.type === 'error' ? '#fef2f2' : '#f0fdfa',
              color: toastMsg.type === 'error' ? '#991b1b' : '#0f766e',
              border: `1px solid ${toastMsg.type === 'error' ? '#fee2e2' : '#ccfbf1'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {toastMsg.type === 'error' ? <AlertCircle size={15} color="#dc2626" /> : <CheckCircle2 size={15} color="#0d9488" />}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'book' ? (
        <div className="grid-2">
          {/* Left Column: Doctor Selection & Details */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem' }}>
              Select doctor and date
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={e => setSelectedDoctor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName.startsWith('Dr.') ? d.fullName : `Dr. ${d.fullName}`} — {d.specialization}
                  </option>
                ))}
              </select>
            </div>

            {selectedDoctorObj && (
              <div style={{
                display: 'flex',
                gap: '0.6rem',
                marginBottom: '1rem',
                fontSize: '0.75rem',
                color: '#64748b'
              }}>
                <span style={{ background: '#f0fdfa', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #ccfbf1' }}>
                  <Clock size={12} /> {selectedDoctorObj.consultationMinutes || 15}m slots
                </span>
                <span style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #e2e8f0' }}>
                  <User size={12} /> Max {selectedDoctorObj.maxDailyPatients || 20} daily
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                Appointment date
              </label>
              <input
                type="date"
                value={date}
                min={TODAY_STR}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                Reason for visit (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Regular health checkup"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Right Column: Time Slots */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Available consultation slots
              </div>
              {/* Visual Legend to Prevent Misclicks */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ffffff', border: '1px solid #0d9488' }} />
                  <span style={{ color: '#0f172a', fontWeight: 500 }}>Available</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f1f5f9', border: '1px dashed #cbd5e1' }} />
                  <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>Booked</span>
                </div>
              </div>
            </div>

            {loadingSlots ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem 0' }}>
                <div style={{ height: '36px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '36px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '36px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
              </div>
            ) : slots.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px dashed #cbd5e1'
              }}>
                <Calendar size={28} color="#94a3b8" style={{ marginBottom: '0.4rem' }} />
                <p style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                  {isWeekend
                    ? `Dr. ${selectedDoctorShortName} does not consult on weekends`
                    : `No available slots for ${DAYS_MAP[dayOfWeekNumber]}`}
                </p>
                <p style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                  Please select another upcoming weekday.
                </p>
              </div>
            ) : (
              <div>
                {morningSlots.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.45rem' }}>
                      Morning ({morningSlots.filter(s => !isSlotBooked(s)).length} open)
                    </div>
                    <div className="slot-grid">
                      {morningSlots.map(slot => {
                        const booked = isSlotBooked(slot);
                        const isCurrent = bookingSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => !booked && (setModalReason(reason || ''), setConfirmingSlot(slot))}
                            disabled={booked || isCurrent}
                            className={`slot-btn ${booked ? 'slot-btn-booked' : (isCurrent ? 'slot-btn-booking' : 'slot-btn-available')}`}
                          >
                            {isCurrent ? <Loader2 size={13} className="spin" /> : formatTime12h(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {afternoonSlots.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.45rem' }}>
                      Afternoon ({afternoonSlots.filter(s => !isSlotBooked(s)).length} open)
                    </div>
                    <div className="slot-grid">
                      {afternoonSlots.map(slot => {
                        const booked = isSlotBooked(slot);
                        const isCurrent = bookingSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => !booked && (setModalReason(reason || ''), setConfirmingSlot(slot))}
                            disabled={booked || isCurrent}
                            className={`slot-btn ${booked ? 'slot-btn-booked' : (isCurrent ? 'slot-btn-booking' : 'slot-btn-available')}`}
                          >
                            {isCurrent ? <Loader2 size={13} className="spin" /> : formatTime12h(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* My Appointments Tab */
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
            My booked appointments
          </div>
          {myAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
              No booked appointments found.
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ref</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Doctor</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date & Time</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myAppointments.map(apt => (
                    <tr key={apt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace', color: '#0f172a' }}>
                        {apt.bookingRef || 'CF-REF'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        {apt.doctor?.fullName || 'Dr. Rajesh Sharma'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>
                        {apt.slot?.slotDate ? `${apt.slot.slotDate}, ${formatTime12h(apt.slot.startTime)}` : '09:30 AM'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge badge-waiting">
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------- APPOINTMENT CONFIRMATION MODAL -------------------- */}
      <AnimatePresence>
        {confirmingSlot && (
          <div
            onClick={() => !bookingSlotId && setConfirmingSlot(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              style={{
                width: '100%',
                maxWidth: '460px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Confirm appointment
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Review your visit details before reserving
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !bookingSlotId && setConfirmingSlot(null)}
                  disabled={!!bookingSlotId}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: bookingSlotId ? 'not-allowed' : 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.25rem' }}>
                {/* Doctor & Clinic Details Card */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#ccfbf1',
                      color: '#0f766e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      Dr
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                        {selectedDoctorObj?.fullName.startsWith('Dr.') ? selectedDoctorObj?.fullName : ('Dr. ' + (selectedDoctorObj?.fullName || 'Physician'))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {selectedDoctorObj?.specialization || 'Cardiology'} ? Main Health Clinic
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>Date</span>
                      <strong style={{ color: '#0f172a' }}>{formatDateTime(confirmingSlot.slotDate || date)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>Time slot</span>
                      <strong style={{ color: '#0d9488' }}>
                        {formatTime12h(confirmingSlot.startTime)} - {formatTime12h(confirmingSlot.endTime)}
                      </strong>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.65rem', paddingTop: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Patient</span>
                    <strong style={{ color: '#0f172a' }}>{localStorage.getItem('fullName') || 'Sandeep Kulkarni'}</strong>
                  </div>
                </div>

                {/* Reason Input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Reason for visit (optional)
                  </label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={e => setModalReason(e.target.value)}
                    placeholder="e.g. Regular health checkup, follow-up"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.65rem'
              }}>
                <button
                  type="button"
                  onClick={() => setConfirmingSlot(null)}
                  disabled={!!bookingSlotId}
                  style={{
                    padding: '0.5rem 0.95rem',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    cursor: bookingSlotId ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBook(confirmingSlot, modalReason)}
                  disabled={!!bookingSlotId}
                  className="btn-primary"
                  style={{
                    padding: '0.5rem 1.15rem',
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: bookingSlotId ? 'not-allowed' : 'pointer'
                  }}
                >
                  {bookingSlotId ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      <span>Reserving slot...</span>
                    </>
                  ) : (
                    <span>Confirm & Book</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Booking;
