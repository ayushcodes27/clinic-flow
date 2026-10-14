import axios from 'axios';
import { mockBackend } from './mockData';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 5000
});

// Track whether backend is reachable
let isLiveBackend = true;
let statusListeners = [];

export const onBackendStatusChange = (fn) => {
  statusListeners.push(fn);
  fn(isLiveBackend);
  return () => {
    statusListeners = statusListeners.filter(l => l !== fn);
  };
};

const notifyStatus = (live) => {
  if (isLiveBackend !== live) {
    isLiveBackend = live;
    statusListeners.forEach(fn => fn(live));
  }
};

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token && !config.url?.startsWith('/auth/')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

const handleMockFallback = (config) => {
  const rawUrl = config?.url || '';
  const method = config?.method?.toLowerCase() || 'get';
  const data = config?.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {};
  const params = config?.params || {};

  // Auth Fallbacks
  if (rawUrl.includes('/auth/login') && method === 'post') {
    const email = (data.email || 'demo@clinicflow.com').toLowerCase();
    const role = email.includes('admin') ? 'ADMIN' : email.includes('doctor') ? 'DOCTOR' : email.includes('reception') ? 'RECEPTIONIST' : 'PATIENT';
    const name = role === 'ADMIN' ? 'Suresh Menon' : role === 'DOCTOR' ? 'Dr. Rajesh Sharma' : role === 'RECEPTIONIST' ? 'Meera Pillai' : 'Sandeep Kulkarni';
    return {
      data: {
        accessToken: 'mock-jwt-token-' + Date.now(),
        fullName: name,
        userType: role,
        userId: role === 'PATIENT' ? 'p-sandeep-kulkarni' : 'mock-user-id'
      }
    };
  }

  if (rawUrl.includes('/auth/register') && method === 'post') {
    return {
      data: {
        accessToken: 'mock-jwt-token-new',
        fullName: data.fullName || 'Registered User',
        userType: data.userType || 'PATIENT',
        userId: 'mock-user-id-' + Date.now()
      }
    };
  }

  // Doctors
  if (rawUrl.includes('/doctors') && !rawUrl.includes('/schedules') && !rawUrl.includes('/schedule') && !rawUrl.includes('/generate-slots') && method === 'get') {
    return { data: mockBackend.getDoctors() };
  }

  // Slots
  if (rawUrl.includes('/slots') && method === 'get') {
    let doctorId = params.doctorId;
    let date = params.date;
    if (!doctorId || !date) {
      try {
        const urlObj = new URL('http://dummy' + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl));
        doctorId = doctorId || urlObj.searchParams.get('doctorId');
        date = date || urlObj.searchParams.get('date');
      } catch (_e) {}
    }
    return { data: mockBackend.getSlots(doctorId, date) };
  }

  // Book appointment
  if (rawUrl.includes('/appointments/book') && method === 'post') {
    const booked = mockBackend.bookSlot(data.slotId, data.reason);
    return { data: booked };
  }

  // List appointments
  if (rawUrl.includes('/appointments') && !rawUrl.includes('/book') && !rawUrl.includes('/check-in') && method === 'get') {
    let statusFilter = params.status;
    try {
      const urlObj = new URL('http://dummy' + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl));
      statusFilter = statusFilter || urlObj.searchParams.get('status');
    } catch (_e) {}
    return { data: mockBackend.getAppointments(statusFilter) };
  }

  // Check in
  if (rawUrl.includes('/check-in') && method === 'post') {
    const match = rawUrl.match(/appointments\/([^/]+)\/check-in/);
    const aptId = match ? match[1] : '';
    const checked = mockBackend.checkIn(aptId);
    return { data: checked };
  }

  // Doctor next
  if (rawUrl.includes('/queue/doctors/') && rawUrl.includes('/next') && method === 'post') {
    const match = rawUrl.match(/queue\/doctors\/([^/]+)\/next/);
    const docId = match ? match[1] : '';
    const res = mockBackend.callNext(docId);
    return { data: res };
  }

  // Queue state
  if (rawUrl.includes('/queue/') && method === 'get') {
    const parts = rawUrl.split('/queue/');
    const docId = parts[1] || '';
    return { data: mockBackend.getQueue(docId) };
  }

  // Schedules
  if (rawUrl.includes('/schedules') && method === 'get') {
    const match = rawUrl.match(/doctors\/([^/]+)\/schedules/);
    const docId = match ? match[1] : '';
    return { data: mockBackend.getSchedules(docId) };
  }

  if (rawUrl.includes('/schedule') && method === 'post') {
    const match = rawUrl.match(/doctors\/([^/]+)\/schedule/);
    const docId = match ? match[1] : '';
    const added = mockBackend.addSchedule(docId, data);
    return { data: added };
  }

  if (rawUrl.includes('/generate-slots') && method === 'post') {
    const match = rawUrl.match(/doctors\/([^/]+)\/generate-slots/);
    const docId = match ? match[1] : '';
    return { data: mockBackend.generateSlots(docId, data.startDate, data.endDate) };
  }

  return { data: [] };
};

api.interceptors.response.use(
  response => {
    // If static host SPA rewrote /api to index.html, response.data will be HTML string
    const isHtml = typeof response.data === 'string' && (
      response.data.includes('<!doctype') ||
      response.data.includes('<!DOCTYPE') ||
      response.data.includes('<html')
    );
    if (isHtml) {
      notifyStatus(false);
      return handleMockFallback(response.config);
    }
    notifyStatus(true);
    return response;
  },
  async error => {
    notifyStatus(false);
    try {
      return handleMockFallback(error.config);
    } catch (_e) {
      return Promise.reject(error);
    }
  }
);

export default api;
