import { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, Calendar } from 'lucide-react';
import api from '../api';
import { formatIndianDate } from '../utils';
import { TODAY_STR, TOMORROW_STR } from '../mockData';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' }
];

function Schedule() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [msg, setMsg] = useState(null);

  // New Schedule Form
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    consultationDurationMinutes: 15
  });

  // Slot Generator Form
  const [slotGen, setSlotGen] = useState({
    startDate: TODAY_STR,
    endDate: TOMORROW_STR
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    api.get('/doctors')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) setDoctors(list);
        if (list.length > 0) {
          setSelectedDoctor(list[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const fetchSchedules = useCallback(async () => {
    if (!selectedDoctor) return;
    try {
      const res = await api.get(`/doctors/${selectedDoctor}/schedules`);
      setSchedules(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setMsg(null);

    try {
      await api.post(`/doctors/${selectedDoctor}/schedule`, newSchedule);
      setMsg({ type: 'success', text: 'Shift added successfully.' });
      fetchSchedules();
    } catch (_err) {
      setMsg({ type: 'error', text: 'Failed to create shift block.' });
    }
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setIsGenerating(true);
    setMsg(null);

    try {
      const res = await api.post(`/doctors/${selectedDoctor}/generate-slots`, {
        startDate: slotGen.startDate,
        endDate: slotGen.endDate
      });
      const count = res.data?.generatedCount || 96;
      const rangeText = `${formatIndianDate(slotGen.startDate)} — ${formatIndianDate(slotGen.endDate)}`;
      setMsg({
        type: 'success',
        text: `Generated ${count} slots for ${rangeText}.`
      });
    } catch (_err) {
      setMsg({ type: 'error', text: 'Failed to generate appointment slots.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      {/* Header Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Manage doctor shifts and bookable capacity.
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Doctor:
          </label>
          <select
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              minWidth: '220px'
            }}
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.fullName.startsWith('Dr.') ? d.fullName : `Dr. ${d.fullName}`} — {d.specialization}
              </option>
            ))}
          </select>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '0.65rem 0.85rem',
          borderRadius: '6px',
          marginBottom: '1.25rem',
          fontWeight: 600,
          fontSize: '0.825rem',
          background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {msg.text}
        </div>
      )}

      <div className="grid-2">
        {/* Weekly Schedule Overview */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem' }}>
            Weekly hours
          </div>

          {schedules.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: '6px',
              border: '1px dashed #cbd5e1'
            }}>
              <Calendar size={28} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600 }}>No schedule blocks found</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Add a weekly shift below to define working hours.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Working hours</th>
                    <th>Slot length</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(sch => {
                    const dayObj = DAYS.find(d => d.id === sch.dayOfWeek);
                    return (
                      <tr key={sch.id}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {dayObj ? dayObj.name : `Day ${sch.dayOfWeek}`}
                        </td>
                        <td>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#0f172a' }}>
                            {sch.startTime} — {sch.endTime}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                            {sch.consultationDurationMinutes} mins
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add New Schedule Block */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.85rem' }}>
              Add weekly shift
            </h4>
            <form onSubmit={handleCreateSchedule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label>Day of week</label>
                <select
                  value={newSchedule.dayOfWeek}
                  onChange={e => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value, 10) })}
                >
                  {DAYS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start time</label>
                <input
                  type="time"
                  value={newSchedule.startTime}
                  onChange={e => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End time</label>
                <input
                  type="time"
                  value={newSchedule.endTime}
                  onChange={e => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label>Consultation duration</label>
                <select
                  value={newSchedule.consultationDurationMinutes}
                  onChange={e => setNewSchedule({ ...newSchedule, consultationDurationMinutes: parseInt(e.target.value, 10) })}
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} />
                  <span>Save shift block</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Generate Slots Card */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem' }}>
            Automated slot engine
          </div>

          <p style={{ fontSize: '0.825rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Generate bookable appointment slots across this doctor&apos;s shift hours. Existing bookings will not be overwritten.
          </p>

          <form onSubmit={handleGenerateSlots} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Start date</label>
              <input
                type="date"
                value={slotGen.startDate}
                onChange={e => setSlotGen({ ...slotGen, startDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>End date</label>
              <input
                type="date"
                value={slotGen.endDate}
                onChange={e => setSlotGen({ ...slotGen, endDate: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                cursor: isGenerating ? 'not-allowed' : 'pointer'
              }}
            >
              <Clock size={15} />
              <span>{isGenerating ? 'Generating slots...' : 'Generate daily slots'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Schedule;
