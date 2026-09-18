import { useState, useEffect, useCallback } from 'react';
import { Calendar, UserX, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { formatDateTime, STATUS_LABELS } from '../utils';

const FILTER_TABS = [
  'ALL',
  'NO_SHOW',
  'BOOKED',
  'CHECKED_IN',
  'IN_CONSULTATION',
  'COMPLETED',
  'CANCELLED'
];

function NoShows() {
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all to compute unfiltered analytics
      const res = await api.get('/appointments');
      setAllAppointments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Global metrics computed from unfiltered dataset
  const totalCount = allAppointments.length;
  const noShowCount = allAppointments.filter(a => a.status === 'NO_SHOW').length;
  const completedCount = allAppointments.filter(a => a.status === 'COMPLETED').length;

  // Filtered appointments displayed in table
  const displayedAppointments = filterStatus === 'ALL'
    ? allAppointments
    : allAppointments.filter(a => a.status === filterStatus);

  return (
    <div>
      {/* Stat Metric Cards (no border-l-4 colored tell, clean 1px borders) */}
      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              Total appointments
            </span>
            <Calendar size={18} color="#64748b" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#0f172a' }}>
            {totalCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Across all doctors
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              No-shows
            </span>
            <UserX size={18} color="#64748b" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#0f172a' }}>
            {noShowCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Missed appointments
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              Completed
            </span>
            <CheckCircle2 size={18} color="#64748b" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#0f172a' }}>
            {completedCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Fulfilled consultations
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Status Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          {FILTER_TABS.map(tabKey => (
            <button
              key={tabKey}
              type="button"
              className={filterStatus === tabKey ? 'btn-sm' : 'btn-secondary btn-sm'}
              onClick={() => setFilterStatus(tabKey)}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {STATUS_LABELS[tabKey] || tabKey}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
            Loading records...
          </div>
        ) : displayedAppointments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}>
            <Calendar size={28} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontWeight: 600, color: '#334155' }}>No matching records found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              There are no appointments with status &quot;{STATUS_LABELS[filterStatus] || filterStatus}&quot;.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking ref</th>
                  <th>Patient name</th>
                  <th>Doctor</th>
                  <th>Slot date and time</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedAppointments.map(apt => (
                  <tr key={apt.id}>
                    <td style={{ fontWeight: 600, color: '#0284c7', fontFamily: 'monospace' }}>
                      {apt.bookingRef || apt.id.substring(0, 8)}
                    </td>
                    <td>
                      <strong>{apt.patient?.fullName || apt.patientId?.substring(0, 8) || 'Patient'}</strong>
                    </td>
                    <td>{apt.doctor?.fullName || 'Doctor'}</td>
                    <td>
                      {formatDateTime(apt.slot?.slotDate, apt.slot?.startTime)}
                    </td>
                    <td>{apt.reason || 'Routine checkup'}</td>
                    <td>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {STATUS_LABELS[apt.status] || apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default NoShows;
