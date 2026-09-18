// Mock Data Engine for ClinicFlow fallback

export const DOCTORS = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    fullName: 'Dr. Rajesh Sharma',
    specialization: 'Cardiology',
    consultationMinutes: 15,
    maxDailyPatients: 20
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    fullName: 'Dr. Ananya Krishnan',
    specialization: 'General Medicine',
    consultationMinutes: 20,
    maxDailyPatients: 25
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    fullName: 'Dr. Marcus Vance',
    specialization: 'Pediatrics',
    consultationMinutes: 15,
    maxDailyPatients: 18
  }
];

export const INITIAL_SCHEDULES = {
  'd1111111-1111-1111-1111-111111111111': [
    { id: 'sch-1', dayOfWeek: 1, startTime: '09:00', endTime: '13:00', consultationDurationMinutes: 15 },
    { id: 'sch-2', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', consultationDurationMinutes: 15 },
    { id: 'sch-3', dayOfWeek: 3, startTime: '10:00', endTime: '16:00', consultationDurationMinutes: 15 },
    { id: 'sch-4', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', consultationDurationMinutes: 15 },
    { id: 'sch-5', dayOfWeek: 5, startTime: '09:00', endTime: '14:00', consultationDurationMinutes: 15 }
  ],
  'd2222222-2222-2222-2222-222222222222': [
    { id: 'sch-6', dayOfWeek: 1, startTime: '08:30', endTime: '16:30', consultationDurationMinutes: 20 },
    { id: 'sch-7', dayOfWeek: 3, startTime: '08:30', endTime: '16:30', consultationDurationMinutes: 20 },
    { id: 'sch-8', dayOfWeek: 5, startTime: '08:30', endTime: '15:00', consultationDurationMinutes: 20 }
  ],
  'd3333333-3333-3333-3333-333333333333': [
    { id: 'sch-9', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', consultationDurationMinutes: 15 },
    { id: 'sch-10', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', consultationDurationMinutes: 15 }
  ]
};

// Map JavaScript getDay() (0=Sun, 1=Mon, ..., 6=Sat) to standard 1..7 (1=Mon..7=Sun)
export const getDayOfWeekIndex = (dateStr) => {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  const day = d.getDay();
  return day === 0 ? 7 : day;
};

// Dynamic slot cache to preserve booking mutations in memory
const dynamicSlotStore = {};

export const generateDoctorSlotsForDate = (doctorId, dateStr) => {
  const cacheKey = `${doctorId}_${dateStr}`;
  if (dynamicSlotStore[cacheKey]) {
    return dynamicSlotStore[cacheKey];
  }

  const doctor = DOCTORS.find(d => d.id === doctorId) || DOCTORS[0];
  const schedules = INITIAL_SCHEDULES[doctor.id] || [];
  const dayOfWeek = getDayOfWeekIndex(dateStr);
  const shift = schedules.find(s => s.dayOfWeek === dayOfWeek);

  if (!shift) {
    const res = { slots: [], shift: null, capped: false, totalUncapped: 0, capLimit: doctor.maxDailyPatients };
    dynamicSlotStore[cacheKey] = res;
    return res;
  }

  const duration = shift.consultationDurationMinutes || doctor.consultationMinutes || 15;
  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const rawSlots = [];
  let index = 0;

  while (currentMinutes + duration <= endMinutes) {
    const slotStartH = Math.floor(currentMinutes / 60);
    const slotStartM = currentMinutes % 60;
    const slotEndMins = currentMinutes + duration;
    const slotEndH = Math.floor(slotEndMins / 60);
    const slotEndM = slotEndMins % 60;

    const startFormatted = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
    const endFormatted = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;

    // Seed realistic initial bookings on 2026-09-18
    let status = 'AVAILABLE';
    if (dateStr === '2026-09-18' && doctor.id === DOCTORS[0].id) {
      if (index === 0 || index === 1 || index === 2) {
        status = 'BOOKED';
      }
    }

    rawSlots.push({
      id: `slot-${doctor.id.substring(0, 4)}-${dateStr}-${startFormatted}`,
      doctorId: doctor.id,
      clinicId: 'c1111111-1111-1111-1111-111111111111',
      slotDate: dateStr,
      startTime: startFormatted,
      endTime: endFormatted,
      status,
      version: 0
    });

    currentMinutes += duration;
    index++;
  }

  const totalUncapped = rawSlots.length;
  const capLimit = doctor.maxDailyPatients || 20;
  const capped = totalUncapped > capLimit;
  const finalSlots = capped ? rawSlots.slice(0, capLimit) : rawSlots;

  const result = {
    slots: finalSlots,
    shift,
    capped,
    totalUncapped,
    capLimit
  };

  dynamicSlotStore[cacheKey] = result;
  return result;
};

// Prepopulate appointments with complete statuses: BOOKED, CHECKED_IN, WAITING, IN_CONSULTATION, COMPLETED, NO_SHOW, CANCELLED
let mockAppointments = [
  {
    id: 'apt-1001-uuid-demo',
    patientId: 'p1111111-1111-1111-1111-111111111111',
    patient: { id: 'p1111111-1111-1111-1111-111111111111', fullName: 'Priya Nair', email: 'priya.nair@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'IN_CONSULTATION',
    bookingRef: 'CF-20260918-R4T8',
    reason: 'Cardio checkup',
    slot: { id: 'slot-seeded-0', slotDate: '2026-09-18', startTime: '09:00', endTime: '09:15' },
    checkedInAt: '2026-09-18T09:02:00Z'
  },
  {
    id: 'apt-1002-uuid-demo',
    patientId: 'p2222222-2222-2222-2222-222222222222',
    patient: { id: 'p2222222-2222-2222-2222-222222222222', fullName: 'Amit Verma', email: 'amit.verma@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'WAITING',
    bookingRef: 'CF-20260918-B202',
    reason: 'Follow-up consultation',
    slot: { id: 'slot-seeded-1', slotDate: '2026-09-18', startTime: '09:15', endTime: '09:30' },
    checkedInAt: '2026-09-18T09:12:00Z'
  },
  {
    id: 'apt-1003-uuid-demo',
    patientId: 'p-sandeep-kulkarni',
    patient: { id: 'p-sandeep-kulkarni', fullName: 'Sandeep Kulkarni', email: 'patient@clinicflow.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'WAITING',
    bookingRef: 'CF-20260918-S303',
    reason: 'Blood pressure review',
    slot: { id: 'slot-seeded-2', slotDate: '2026-09-18', startTime: '09:30', endTime: '09:45' },
    checkedInAt: '2026-09-18T09:18:00Z'
  },
  {
    id: 'apt-1004-uuid-demo',
    patientId: 'p3333333-3333-3333-3333-333333333333',
    patient: { id: 'p3333333-3333-3333-3333-333333333333', fullName: 'Neha Gupta', email: 'neha.gupta@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'BOOKED',
    bookingRef: 'CF-20260918-C304',
    reason: 'Routine ECG',
    slot: { id: 'slot-seeded-3', slotDate: '2026-09-18', startTime: '10:00', endTime: '10:15' }
  },
  {
    id: 'apt-1005-uuid-demo',
    patientId: 'p4444444-4444-4444-4444-444444444444',
    patient: { id: 'p4444444-4444-4444-4444-444444444444', fullName: 'Vikram Singh', email: 'vikram.singh@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'NO_SHOW',
    bookingRef: 'CF-20260917-K7Q2',
    reason: 'Blood pressure monitoring',
    slot: { id: 'slot-prev-1', slotDate: '2026-09-17', startTime: '10:00', endTime: '10:15' }
  },
  {
    id: 'apt-1006-uuid-demo',
    patientId: 'p5555555-5555-5555-5555-555555555555',
    patient: { id: 'p5555555-5555-5555-5555-555555555555', fullName: 'Kavita Reddy', email: 'kavita.reddy@example.com' },
    doctor: DOCTORS[1],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'NO_SHOW',
    bookingRef: 'CF-20260917-M4X9',
    reason: 'Annual checkup',
    slot: { id: 'slot-prev-2', slotDate: '2026-09-17', startTime: '14:30', endTime: '14:50' }
  },
  {
    id: 'apt-1007-uuid-demo',
    patientId: 'p7777777-7777-7777-7777-777777777777',
    patient: { id: 'p7777777-7777-7777-7777-777777777777', fullName: 'Rahul Mehta', email: 'rahul.mehta@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'COMPLETED',
    bookingRef: 'CF-20260918-H111',
    reason: 'Chest pain evaluation',
    slot: { id: 'slot-comp-1', slotDate: '2026-09-18', startTime: '08:45', endTime: '09:00' }
  },
  {
    id: 'apt-1008-uuid-demo',
    patientId: 'p8888888-8888-8888-8888-888888888888',
    patient: { id: 'p8888888-8888-8888-8888-888888888888', fullName: 'Sunita Deshmukh', email: 'sunita.d@example.com' },
    doctor: DOCTORS[1],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'COMPLETED',
    bookingRef: 'CF-20260917-D222',
    reason: 'Thyroid profile check',
    slot: { id: 'slot-comp-2', slotDate: '2026-09-17', startTime: '11:30', endTime: '11:50' }
  },
  {
    id: 'apt-1009-uuid-demo',
    patientId: 'p9999999-9999-9999-9999-999999999999',
    patient: { id: 'p9999999-9999-9999-9999-999999999999', fullName: 'Deepak Patil', email: 'deepak.p@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'CANCELLED',
    bookingRef: 'CF-20260918-X999',
    reason: 'Rescheduled appointment',
    slot: { id: 'slot-canc-1', slotDate: '2026-09-18', startTime: '13:30', endTime: '13:45' }
  }
];

// Live Queue Engine with Sandeep Kulkarni at token #3
let mockQueues = {
  [DOCTORS[0].id]: {
    doctorId: DOCTORS[0].id,
    currentPatient: {
      id: 'q-1',
      appointmentId: 'apt-1001-uuid-demo',
      patientId: 'p1111111-1111-1111-1111-111111111111',
      patientName: 'Priya Nair',
      position: 1,
      status: 'IN_CONSULTATION'
    },
    waitingCount: 2,
    queue: [
      {
        id: 'q-2',
        appointmentId: 'apt-1002-uuid-demo',
        patientId: 'p2222222-2222-2222-2222-222222222222',
        patientName: 'Amit Verma',
        position: 2,
        status: 'WAITING'
      },
      {
        id: 'q-3',
        appointmentId: 'apt-1003-uuid-demo',
        patientId: 'p-sandeep-kulkarni',
        patientName: 'Sandeep Kulkarni',
        position: 3,
        status: 'WAITING'
      }
    ]
  },
  [DOCTORS[1].id]: {
    doctorId: DOCTORS[1].id,
    currentPatient: null,
    waitingCount: 0,
    queue: []
  },
  [DOCTORS[2].id]: {
    doctorId: DOCTORS[2].id,
    currentPatient: null,
    waitingCount: 0,
    queue: []
  }
};

export const mockBackend = {
  getDoctors: () => [...DOCTORS],

  getSlots: (doctorId, date) => {
    const docId = doctorId || DOCTORS[0].id;
    const targetDate = date || '2026-09-18';
    const gen = generateDoctorSlotsForDate(docId, targetDate);
    return gen.slots;
  },

  getSlotMetadata: (doctorId, date) => {
    const docId = doctorId || DOCTORS[0].id;
    const targetDate = date || '2026-09-18';
    return generateDoctorSlotsForDate(docId, targetDate);
  },

  bookSlot: (slotId, reason = 'Routine checkup') => {
    // Search across all cached slot days
    let foundSlot = null;
    let foundCacheKey = null;

    for (const key of Object.keys(dynamicSlotStore)) {
      const match = dynamicSlotStore[key].slots.find(s => s.id === slotId);
      if (match) {
        foundSlot = match;
        foundCacheKey = key;
        break;
      }
    }

    if (!foundSlot) {
      // Fallback search
      throw new Error('Slot not found');
    }

    if (foundSlot.status !== 'AVAILABLE') {
      const error = new Error('Slot is not available');
      error.response = { status: 409, data: { message: 'This slot was just booked by someone else — please pick another.' } };
      throw error;
    }

    foundSlot.status = 'BOOKED';

    const patientName = localStorage.getItem('fullName') || 'Sandeep Kulkarni';
    const patientId = localStorage.getItem('userId') || 'p-sandeep-kulkarni';

    const newApt = {
      id: `apt-${Date.now()}`,
      patientId,
      patient: { id: patientId, fullName: patientName, email: 'patient@clinicflow.com' },
      doctor: DOCTORS.find(d => d.id === foundSlot.doctorId) || DOCTORS[0],
      clinic: { id: 'c1', name: 'Main Health Clinic' },
      status: 'BOOKED',
      bookingRef: 'CF-' + foundSlot.slotDate.replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      reason,
      slot: foundSlot
    };

    mockAppointments.unshift(newApt);
    return newApt;
  },

  getAppointments: (status) => {
    if (status && status !== 'ALL') {
      return mockAppointments.filter(a => a.status === status);
    }
    return [...mockAppointments];
  },

  checkIn: (appointmentIdOrRef) => {
    const apt = mockAppointments.find(a => a.id === appointmentIdOrRef || a.bookingRef === appointmentIdOrRef);
    if (!apt) throw new Error('Appointment not found');
    apt.status = 'CHECKED_IN';
    apt.checkedInAt = new Date().toISOString();

    const docId = apt.doctor?.id || DOCTORS[0].id;
    if (!mockQueues[docId]) {
      mockQueues[docId] = { doctorId: docId, currentPatient: null, waitingCount: 0, queue: [] };
    }

    const currentQ = mockQueues[docId];
    const nextPos = (currentQ.queue.length || 0) + (currentQ.currentPatient ? 2 : 1);
    const newEntry = {
      id: `q-${Date.now()}`,
      appointmentId: apt.id,
      patientId: apt.patientId,
      patientName: apt.patient?.fullName || 'Patient',
      position: nextPos,
      status: 'WAITING'
    };

    currentQ.queue.push(newEntry);
    currentQ.waitingCount = currentQ.queue.length;
    return apt;
  },

  getQueue: (doctorId) => {
    return mockQueues[doctorId] || { doctorId, currentPatient: null, waitingCount: 0, queue: [] };
  },

  callNext: (doctorId) => {
    const qState = mockQueues[doctorId];
    if (!qState || qState.queue.length === 0) {
      throw new Error('Queue is empty');
    }

    // Complete previous patient
    if (qState.currentPatient) {
      const prevApt = mockAppointments.find(a => a.id === qState.currentPatient.appointmentId);
      if (prevApt) prevApt.status = 'COMPLETED';
    }

    const next = qState.queue.shift();
    next.status = 'IN_CONSULTATION';
    qState.currentPatient = next;
    qState.waitingCount = qState.queue.length;

    const apt = mockAppointments.find(a => a.id === next.appointmentId);
    if (apt) apt.status = 'IN_CONSULTATION';
    return qState;
  },

  getSchedules: (doctorId) => {
    return INITIAL_SCHEDULES[doctorId] || [];
  },

  addSchedule: (doctorId, schedule) => {
    if (!INITIAL_SCHEDULES[doctorId]) INITIAL_SCHEDULES[doctorId] = [];
    const newSch = { id: `sch-${Date.now()}`, ...schedule };
    INITIAL_SCHEDULES[doctorId].push(newSch);
    // Invalidate slot cache for this doctor
    for (const key of Object.keys(dynamicSlotStore)) {
      if (key.startsWith(doctorId)) delete dynamicSlotStore[key];
    }
    return newSch;
  },

  generateSlots: (doctorId, startDate, endDate) => {
    // Generate across the range
    let generatedCount = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cur = new Date(start);

    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const key = `${doctorId}_${dateStr}`;
      delete dynamicSlotStore[key];
      const gen = generateDoctorSlotsForDate(doctorId, dateStr);
      generatedCount += gen.slots.length;
      cur.setDate(cur.getDate() + 1);
    }

    return { generatedCount };
  }
};
