import { useState, useEffect, useCallback } from 'react';
import { Clock, User, BookmarkCheck, Calendar } from 'lucide-react';
import api from '../api';
import { formatTime12h, formatDateTime } from '../utils';
import { getDayOfWeekIndex, INITIAL_SCHEDULES } from '../mockData';

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
  const [date, setDate] = useState('2026-09-18');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reason, setReason] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [myAppointments, setMyAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'my-appointments'
  const [isCapped, setIsCapped] = useState(false);
  const [capLimit, setCapLimit] = useState(20);

  const todayStr = '2026-09-18'; // Mock current date

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
      const rawSlots = res.data || [];
      setSlots(rawSlots);

      // Check doctor daily cap
      const doc = doctors.find(d => d.id === selectedDoctor);
      const limit = doc?.maxDailyPatients || 20;
      setCapLimit(limit);

      // Check if slots were truncated by cap
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

  const handleBook = async (slotId) => {
    setToastMsg(null);
    const isConflictSimulated = localStorage.getItem('simulateConflict') === 'true';

    try {
      if (isConflictSimulated) {
        // 409 handling: toast and flip slot to taken immediately
        setToastMsg({
          type: 'error',
          text: 'That slot was just taken'
        });
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'BOOKED' } : s));
        return;
      }

      await api.post('/appointments/book', {
        slotId,
        reason: reason.trim() || 'General consultation'
      });

      setToastMsg({
        type: 'success',
        text: 'Appointment booked successfully'
      });
      searchSlots();
      fetchMyAppointments();
    } catch (err) {
      if (err.response?.status === 409) {
        setToastMsg({
          type: 'error',
          text: 'That slot was just taken'
        });
        // Flip slot to taken in grid
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'BOOKED' } : s));
      } else {
        setToastMsg({
          type: 'error',
          text: err.response?.data?.message || 'Unable to complete booking'
        });
      }
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

  const isSlotAvailable = (slot) => slot.status === 'AVAILABLE';

  return (
    <div>
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={activeTab === 'book' ? '' : 'btn-secondary'}
          onClick={() => setActiveTab('book')}
          style={{ fontSize: '0.875rem' }}
        >
          Book appointment
        </button>
        <button
          className={activeTab === 'my-appointments' ? '' : 'btn-secondary'}
          onClick={() => { setActiveTab('my-appointments'); fetchMyAppointments(); }}
          style={{ fontSize: '0.875rem' }}
        >
          <BookmarkCheck size={15} />
          <span>My appointments ({myAppointments.length})</span>
        </button>
      </div>

      {toastMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontWeight: 600,
          fontSize: '0.875rem',
          background: toastMsg.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: toastMsg.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${toastMsg.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {toastMsg.text}
        </div>
      )}

      {activeTab === 'book' ? (
        <div className="grid-2">
          {/* Left Column: Doctor Selection & Details */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Select doctor and date
            </h3>

            <div className="form-group">
              <label>Doctor</label>
              <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName.startsWith('Dr.') ? d.fullName : `Dr. ${d.fullName}`} — {d.specialization}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor info: slot length and daily limit only */}
            {selectedDoctorObj && (
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                fontSize: '0.8rem',
                color: '#475569'
              }}>
                <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                  <Clock size={12} /> {selectedDoctorObj.consultationMinutes || 15} min slots
                </span>
                <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                  <User size={12} /> Max {selectedDoctorObj.maxDailyPatients || 20} daily
                </span>
              </div>
            )}

            <div className="form-group">
              <label>Appointment date</label>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Reason for visit</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Regular health checkup, chest discomfort"
              />
            </div>
          </div>

          {/* Right Column: Time Slots */}
          <div className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Available slots
              </h3>
            </div>

            {/* Daily Cap Notice */}
            {isCapped && slots.length > 0 && (
              <div style={{
                padding: '0.5rem 0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.775rem',
                color: '#64748b',
                marginBottom: '1rem'
              }}>
                Daily cap reached: showing first {capLimit} slots.
              </div>
            )}

            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                Checking availability...
              </div>
            ) : slots.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1'
              }}>
                <Calendar size={32} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: 600, color: '#334155' }}>
                  {isWeekend
                    ? `Dr. ${selectedDoctorShortName} doesn't see patients on weekends`
                    : `No slots available for ${DAYS_MAP[dayOfWeekNumber]}`}
                </p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Please choose another weekday from the date picker.
                </p>
              </div>
            ) : (
              <div>
                {/* Morning Slots */}
                {morningSlots.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#64748b',
                      marginBottom: '0.5rem'
                    }}>
                      Morning ({morningSlots.filter(isSlotAvailable).length} available)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem' }}>
                      {morningSlots.map(slot => {
                        const available = isSlotAvailable(slot);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => available && handleBook(slot.id)}
                            disabled={!available}
                            style={{
                              background: available ? '#ffffff' : '#f8fafc',
                              border: `1px solid ${available ? '#0284c7' : '#e2e8f0'}`,
                              color: available ? '#0284c7' : '#94a3b8',
                              padding: '0.6rem 0.25rem',
                              borderRadius: '6px',
                              cursor: available ? 'pointer' : 'not-allowed',
                              textAlign: 'center',
                              textDecoration: available ? 'none' : 'line-through',
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {formatTime12h(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {afternoonSlots.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#64748b',
                      marginBottom: '0.5rem'
                    }}>
                      Afternoon ({afternoonSlots.filter(isSlotAvailable).length} available)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem' }}>
                      {afternoonSlots.map(slot => {
                        const available = isSlotAvailable(slot);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => available && handleBook(slot.id)}
                            disabled={!available}
                            style={{
                              background: available ? '#ffffff' : '#f8fafc',
                              border: `1px solid ${available ? '#0284c7' : '#e2e8f0'}`,
                              color: available ? '#0284c7' : '#94a3b8',
                              padding: '0.6rem 0.25rem',
                              borderRadius: '6px',
                              cursor: available ? 'pointer' : 'not-allowed',
                              textAlign: 'center',
                              textDecoration: available ? 'none' : 'line-through',
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {formatTime12h(slot.startTime)}
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
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            My booked appointments
          </h3>
          {myAppointments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1'
            }}>
              <BookmarkCheck size={32} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600 }}>No appointments booked</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Use the booking tab to reserve your appointment.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Booking ref</th>
                    <th>Doctor</th>
                    <th>Date and time</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myAppointments.map(apt => (
                    <tr key={apt.id}>
                      <td style={{ fontWeight: 600, color: '#0284c7', fontFamily: 'monospace' }}>
                        {apt.bookingRef || apt.id.substring(0, 8)}
                      </td>
                      <td>{apt.doctor?.fullName || 'Doctor'}</td>
                      <td>
                        {formatDateTime(apt.slot?.slotDate, apt.slot?.startTime)}
                      </td>
                      <td>{apt.reason || 'General checkup'}</td>
                      <td>
                        <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                          {apt.status === 'NO_SHOW' ? 'No-show' : apt.status.charAt(0) + apt.status.slice(1).toLowerCase()}
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
    </div>
  );
}

export default Booking;
