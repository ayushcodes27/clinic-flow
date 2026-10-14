// Mock Data Engine for ClinicFlow with dynamic relative dates and real-time client simulation

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
export const TODAY_STR = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const yDate = new Date(now);
yDate.setDate(now.getDate() - 1);
export const YESTERDAY_STR = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;

const tDate = new Date(now);
tDate.setDate(now.getDate() + 1);
export const TOMORROW_STR = `${tDate.getFullYear()}-${pad(tDate.getMonth() + 1)}-${pad(tDate.getDate())}`;

const dateDigits = TODAY_STR.replace(/-/g, '');

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

export const getDayOfWeekIndex = (dateStr) => {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  const day = d.getDay();
  return day === 0 ? 7 : day;
};

// Global slot registry tracking booked status across all days
const dynamicSlotStore = {};
const bookedSlotIds = new Set(['slot-d111-seeded-0', 'slot-d111-seeded-1', 'slot-d111-seeded-2', 'slot-d111-seeded-3']);

export const generateSlotsForDoctor = (doctor, dateStr) => {
  const cacheKey = `${doctor.id}-${dateStr}`;
  if (dynamicSlotStore[cacheKey]) {
    // Ensure all booked IDs reflect in cached list
    dynamicSlotStore[cacheKey].slots.forEach(s => {
      if (bookedSlotIds.has(s.id)) {
        s.status = 'BOOKED';
        s.booked = true;
      }
    });
    return dynamicSlotStore[cacheKey];
  }

  const dayOfWeek = getDayOfWeekIndex(dateStr);
  const docSchedules = INITIAL_SCHEDULES[doctor.id] || [];
  const shift = docSchedules.find(s => s.dayOfWeek === dayOfWeek) || {
    startTime: '09:00',
    endTime: '17:00',
    consultationDurationMinutes: doctor.consultationMinutes || 15
  };

  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const duration = shift.consultationDurationMinutes || 15;

  const rawSlots = [];
  let currentMinutes = startMinutes;
  let index = 0;

  while (currentMinutes + duration <= endMinutes) {
    const slotStartH = Math.floor(currentMinutes / 60);
    const slotStartM = currentMinutes % 60;
    const slotEndMins = currentMinutes + duration;
    const slotEndH = Math.floor(slotEndMins / 60);
    const slotEndM = slotEndMins % 60;

    const startFormatted = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
    const endFormatted = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;
    const slotId = `slot-${doctor.id.substring(0, 4)}-${dateStr}-${startFormatted}`;

    let isBooked = bookedSlotIds.has(slotId);
    if (dateStr === TODAY_STR && doctor.id === DOCTORS[0].id) {
      if (index === 0 || index === 1 || index === 2 || index === 3) {
        isBooked = true;
        bookedSlotIds.add(slotId);
      }
    }

    rawSlots.push({
      id: slotId,
      doctorId: doctor.id,
      clinicId: 'c1111111-1111-1111-1111-111111111111',
      slotDate: dateStr,
      startTime: startFormatted,
      endTime: endFormatted,
      status: isBooked ? 'BOOKED' : 'AVAILABLE',
      booked: isBooked,
      version: 0
    });

    currentMinutes += duration;
    index++;
  }

  const capLimit = doctor.maxDailyPatients || 20;
  const capped = rawSlots.length > capLimit;
  const finalSlots = capped ? rawSlots.slice(0, capLimit) : rawSlots;

  const result = {
    slots: finalSlots,
    shift,
    capped,
    totalUncapped: rawSlots.length,
    capLimit
  };

  dynamicSlotStore[cacheKey] = result;
  return result;
};

// Seed realistic appointments relative to today
let mockAppointments = [
  {
    id: 'apt-1001-uuid-demo',
    patientId: 'p1111111-1111-1111-1111-111111111111',
    patient: { id: 'p1111111-1111-1111-1111-111111111111', fullName: 'Priya Nair', email: 'priya.nair@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'IN_CONSULTATION',
    bookingRef: `CF-${dateDigits}-R4T8`,
    reason: 'Cardio evaluation',
    slot: { id: `slot-d111-${TODAY_STR}-09:00`, slotDate: TODAY_STR, startTime: '09:00', endTime: '09:15' },
    checkedInAt: `${TODAY_STR}T09:02:00Z`
  },
  {
    id: 'apt-1002-uuid-demo',
    patientId: 'p2222222-2222-2222-2222-222222222222',
    patient: { id: 'p2222222-2222-2222-2222-222222222222', fullName: 'Amit Verma', email: 'amit.verma@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'WAITING',
    bookingRef: `CF-${dateDigits}-B202`,
    reason: 'Follow-up consultation',
    slot: { id: `slot-d111-${TODAY_STR}-09:15`, slotDate: TODAY_STR, startTime: '09:15', endTime: '09:30' },
    checkedInAt: `${TODAY_STR}T09:12:00Z`
  },
  {
    id: 'apt-1003-uuid-demo',
    patientId: 'p-sandeep-kulkarni',
    patient: { id: 'p-sandeep-kulkarni', fullName: 'Sandeep Kulkarni', email: 'patient@clinicflow.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'WAITING',
    bookingRef: `CF-${dateDigits}-S303`,
    reason: 'Blood pressure review',
    slot: { id: `slot-d111-${TODAY_STR}-09:30`, slotDate: TODAY_STR, startTime: '09:30', endTime: '09:45' },
    checkedInAt: `${TODAY_STR}T09:18:00Z`
  },
  {
    id: 'apt-1004-uuid-demo',
    patientId: 'p3333333-3333-3333-3333-333333333333',
    patient: { id: 'p3333333-3333-3333-3333-333333333333', fullName: 'Tanya Sen', email: 'tanya.sen@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'WAITING',
    bookingRef: `CF-${dateDigits}-T404`,
    reason: 'Chest tightness follow-up',
    slot: { id: `slot-d111-${TODAY_STR}-09:45`, slotDate: TODAY_STR, startTime: '09:45', endTime: '10:00' },
    checkedInAt: `${TODAY_STR}T09:25:00Z`
  },
  {
    id: 'apt-1005-uuid-demo',
    patientId: 'p4444444-4444-4444-4444-444444444444',
    patient: { id: 'p4444444-4444-4444-4444-444444444444', fullName: 'Neha Gupta', email: 'neha.gupta@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'BOOKED',
    bookingRef: `CF-${dateDigits}-N505`,
    reason: 'Routine ECG review',
    slot: { id: `slot-d111-${TODAY_STR}-10:00`, slotDate: TODAY_STR, startTime: '10:00', endTime: '10:15' }
  },
  {
    id: 'apt-1006-uuid-demo',
    patientId: 'p5555555-5555-5555-5555-555555555555',
    patient: { id: 'p5555555-5555-5555-5555-555555555555', fullName: 'Arjun Kapoor', email: 'arjun.k@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'BOOKED',
    bookingRef: `CF-${dateDigits}-A606`,
    reason: 'Cholesterol consultation',
    slot: { id: `slot-d111-${TODAY_STR}-10:15`, slotDate: TODAY_STR, startTime: '10:15', endTime: '10:30' }
  },
  {
    id: 'apt-1007-uuid-demo',
    patientId: 'p6666666-6666-6666-6666-666666666666',
    patient: { id: 'p6666666-6666-6666-6666-666666666666', fullName: 'Rahul Mehta', email: 'rahul.mehta@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'COMPLETED',
    bookingRef: `CF-${dateDigits}-H111`,
    reason: 'Post-op checkup',
    slot: { id: `slot-comp-1`, slotDate: TODAY_STR, startTime: '08:45', endTime: '09:00' }
  },
  {
    id: 'apt-1008-uuid-demo',
    patientId: 'p7777777-7777-7777-7777-777777777777',
    patient: { id: 'p7777777-7777-7777-7777-777777777777', fullName: 'Vikram Singh', email: 'vikram.singh@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'NO_SHOW',
    bookingRef: `CF-${YESTERDAY_STR.replace(/-/g, '')}-K7Q2`,
    reason: 'Hypertension follow-up',
    slot: { id: 'slot-prev-1', slotDate: YESTERDAY_STR, startTime: '10:00', endTime: '10:15' }
  },
  {
    id: 'apt-1009-uuid-demo',
    patientId: 'p8888888-8888-8888-8888-888888888888',
    patient: { id: 'p8888888-8888-8888-8888-888888888888', fullName: 'Kavita Reddy', email: 'kavita.reddy@example.com' },
    doctor: DOCTORS[1],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'NO_SHOW',
    bookingRef: `CF-${YESTERDAY_STR.replace(/-/g, '')}-M4X9`,
    reason: 'Annual checkup',
    slot: { id: 'slot-prev-2', slotDate: YESTERDAY_STR, startTime: '14:30', endTime: '14:50' }
  },
  {
    id: 'apt-1010-uuid-demo',
    patientId: 'p9999999-9999-9999-9999-999999999999',
    patient: { id: 'p9999999-9999-9999-9999-999999999999', fullName: 'Deepak Chawla', email: 'deepak.c@example.com' },
    doctor: DOCTORS[0],
    clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
    status: 'CANCELLED',
    bookingRef: `CF-${dateDigits}-C909`,
    reason: 'Schedule conflict',
    slot: { id: 'slot-canc-1', slotDate: TODAY_STR, startTime: '13:30', endTime: '13:45' }
  }
];

let mockQueue = {
  [DOCTORS[0].id]: {
    doctorId: DOCTORS[0].id,
    currentPatient: {
      id: 'apt-1001-uuid-demo',
      patientId: 'p1111111-1111-1111-1111-111111111111',
      patientName: 'Priya Nair',
      patient: { fullName: 'Priya Nair', email: 'priya.nair@example.com' },
      bookingRef: `CF-${dateDigits}-R4T8`,
      status: 'IN_CONSULTATION',
      slot: { startTime: '09:00', endTime: '09:15', slotDate: TODAY_STR },
      checkedInAt: `${TODAY_STR}T09:02:00Z`
    },
    waitingCount: 3,
    avgConsultationMinutes: 15,
    totalEstimatedWaitMinutes: 45,
    queue: [
      {
        id: 'apt-1002-uuid-demo',
        patientId: 'p2222222-2222-2222-2222-222222222222',
        patientName: 'Amit Verma',
        patient: { fullName: 'Amit Verma', email: 'amit.verma@example.com' },
        bookingRef: `CF-${dateDigits}-B202`,
        status: 'WAITING',
        position: 1,
        slot: { startTime: '09:15', endTime: '09:30', slotDate: TODAY_STR },
        checkedInAt: `${TODAY_STR}T09:12:00Z`,
        estimatedWaitMinutes: 5
      },
      {
        id: 'apt-1003-uuid-demo',
        patientId: 'p-sandeep-kulkarni',
        patientName: 'Sandeep Kulkarni',
        patient: { fullName: 'Sandeep Kulkarni', email: 'patient@clinicflow.com' },
        bookingRef: `CF-${dateDigits}-S303`,
        status: 'WAITING',
        position: 2,
        slot: { startTime: '09:30', endTime: '09:45', slotDate: TODAY_STR },
        checkedInAt: `${TODAY_STR}T09:18:00Z`,
        estimatedWaitMinutes: 20
      },
      {
        id: 'apt-1004-uuid-demo',
        patientId: 'p3333333-3333-3333-3333-333333333333',
        patientName: 'Tanya Sen',
        patient: { fullName: 'Tanya Sen', email: 'tanya.sen@example.com' },
        bookingRef: `CF-${dateDigits}-T404`,
        status: 'WAITING',
        position: 3,
        slot: { startTime: '09:45', endTime: '10:00', slotDate: TODAY_STR },
        checkedInAt: `${TODAY_STR}T09:25:00Z`,
        estimatedWaitMinutes: 35
      }
    ]
  },
  [DOCTORS[1].id]: {
    doctorId: DOCTORS[1].id,
    currentPatient: null,
    waitingCount: 0,
    avgConsultationMinutes: 20,
    totalEstimatedWaitMinutes: 0,
    queue: []
  },
  [DOCTORS[2].id]: {
    doctorId: DOCTORS[2].id,
    currentPatient: null,
    waitingCount: 0,
    avgConsultationMinutes: 15,
    totalEstimatedWaitMinutes: 0,
    queue: []
  }
};

const notifyQueueUpdate = (docId) => {
  if (typeof window === 'undefined') return;
  const queueData = mockQueue[docId] || { doctorId: docId, currentPatient: null, waitingCount: 0, queue: [] };
  window.dispatchEvent(new CustomEvent('clinicflow-queue-update', {
    detail: { doctorId: docId, queueData }
  }));
};

const notifySlotBooked = (slotId, doctorId) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('clinicflow-slot-booked', {
    detail: { slotId, doctorId }
  }));
};

export const mockBackend = {
  resetDemo: () => {
    bookedSlotIds.clear();
    for (const key in dynamicSlotStore) {
      delete dynamicSlotStore[key];
    }
    mockAppointments = [
      {
        id: 'apt-1001-uuid-demo',
        patientId: 'p1111111-1111-1111-1111-111111111111',
        patient: { id: 'p1111111-1111-1111-1111-111111111111', fullName: 'Priya Nair', email: 'priya.nair@example.com' },
        doctor: DOCTORS[0],
        clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
        status: 'IN_CONSULTATION',
        bookingRef: `CF-${dateDigits}-R4T8`,
        reason: 'Cardio evaluation',
        slot: { id: `slot-d111-${TODAY_STR}-09:00`, slotDate: TODAY_STR, startTime: '09:00', endTime: '09:15' },
        checkedInAt: `${TODAY_STR}T09:02:00Z`
      },
      {
        id: 'apt-1002-uuid-demo',
        patientId: 'p2222222-2222-2222-2222-222222222222',
        patient: { id: 'p2222222-2222-2222-2222-222222222222', fullName: 'Amit Verma', email: 'amit.verma@example.com' },
        doctor: DOCTORS[0],
        clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
        status: 'WAITING',
        bookingRef: `CF-${dateDigits}-B202`,
        reason: 'Follow-up consultation',
        slot: { id: `slot-d111-${TODAY_STR}-09:15`, slotDate: TODAY_STR, startTime: '09:15', endTime: '09:30' },
        checkedInAt: `${TODAY_STR}T09:12:00Z`
      },
      {
        id: 'apt-1003-uuid-demo',
        patientId: 'p-sandeep-kulkarni',
        patient: { id: 'p-sandeep-kulkarni', fullName: 'Sandeep Kulkarni', email: 'patient@clinicflow.com' },
        doctor: DOCTORS[0],
        clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
        status: 'WAITING',
        bookingRef: `CF-${dateDigits}-S303`,
        reason: 'Blood pressure review',
        slot: { id: `slot-d111-${TODAY_STR}-09:30`, slotDate: TODAY_STR, startTime: '09:30', endTime: '09:45' },
        checkedInAt: `${TODAY_STR}T09:18:00Z`
      }
    ];
    mockQueue[DOCTORS[0].id] = {
      doctorId: DOCTORS[0].id,
      currentPatient: {
        id: 'apt-1001-uuid-demo',
        patientId: 'p1111111-1111-1111-1111-111111111111',
        patientName: 'Priya Nair',
        bookingRef: `CF-${dateDigits}-R4T8`,
        status: 'IN_CONSULTATION',
        position: 0,
        estimatedWaitMinutes: 0
      },
      waitingCount: 2,
      avgConsultationMinutes: 15,
      totalEstimatedWaitMinutes: 30,
      queue: [
        {
          id: 'apt-1002-uuid-demo',
          patientId: 'p2222222-2222-2222-2222-222222222222',
          patientName: 'Amit Verma',
          bookingRef: `CF-${dateDigits}-B202`,
          status: 'WAITING',
          position: 1,
          estimatedWaitMinutes: 15
        },
        {
          id: 'apt-1003-uuid-demo',
          patientId: 'p-sandeep-kulkarni',
          patientName: 'Sandeep Kulkarni',
          bookingRef: `CF-${dateDigits}-S303`,
          status: 'WAITING',
          position: 2,
          estimatedWaitMinutes: 30
        }
      ]
    };
    notifyQueueUpdate(DOCTORS[0].id);
    return { status: 'SUCCESS', message: 'Demo data reset successfully' };
  },

  getDoctors: () => DOCTORS,
  
  getSlots: (doctorId, date) => {
    const doc = DOCTORS.find(d => d.id === doctorId) || DOCTORS[0];
    const targetDate = date || TODAY_STR;
    return generateSlotsForDoctor(doc, targetDate);
  },

  getDoctorSlots: (doctorId, date) => {
    return mockBackend.getSlots(doctorId, date);
  },

  getAvailableSlots: (doctorId, date) => {
    const res = mockBackend.getSlots(doctorId, date);
    return res.slots.filter(s => s.status === 'AVAILABLE' && !s.booked);
  },

  getQueue: (doctorId) => {
    return mockQueue[doctorId] || {
      doctorId,
      currentPatient: null,
      waitingCount: 0,
      avgConsultationMinutes: 15,
      totalEstimatedWaitMinutes: 0,
      queue: []
    };
  },

  getAppointments: (statusFilter) => {
    let filtered = [...mockAppointments];
    if (statusFilter) {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    return filtered;
  },

  callNext: (doctorId) => {
    const currentQ = mockQueue[doctorId];
    if (!currentQ || currentQ.queue.length === 0) {
      if (currentQ) {
        if (currentQ.currentPatient) {
          const prevId = currentQ.currentPatient.id;
          const prevApt = mockAppointments.find(a => a.id === prevId);
          if (prevApt) prevApt.status = 'COMPLETED';
          currentQ.currentPatient = null;
        }
      }
      notifyQueueUpdate(doctorId);
      return { message: 'Queue is clear' };
    }

    if (currentQ.currentPatient) {
      const prevId = currentQ.currentPatient.id;
      const prevApt = mockAppointments.find(a => a.id === prevId);
      if (prevApt) prevApt.status = 'COMPLETED';
    }

    const next = currentQ.queue.shift();
    next.status = 'IN_CONSULTATION';
    currentQ.currentPatient = next;
    currentQ.waitingCount = currentQ.queue.length;
    currentQ.totalEstimatedWaitMinutes = currentQ.queue.length * (currentQ.avgConsultationMinutes || 15);

    currentQ.queue.forEach((item, idx) => {
      item.position = idx + 1;
      item.estimatedWaitMinutes = (idx + 1) * 15;
    });

    const apt = mockAppointments.find(a => a.id === next.id);
    if (apt) apt.status = 'IN_CONSULTATION';

    notifyQueueUpdate(doctorId);
    return { status: 'SUCCESS', currentPatient: next };
  },

  callNextPatient: (doctorId) => {
    return mockBackend.callNext(doctorId);
  },

  checkIn: (appointmentId) => {
    const apt = mockAppointments.find(a => a.id === appointmentId || a.bookingRef === appointmentId);
    if (!apt) {
      throw { response: { status: 404, data: { message: 'Appointment not found' } } };
    }

    apt.status = 'WAITING';
    apt.checkedInAt = new Date().toISOString();

    const docId = apt.doctor?.id || DOCTORS[0].id;
    if (!mockQueue[docId]) {
      mockQueue[docId] = { doctorId: docId, currentPatient: null, waitingCount: 0, queue: [] };
    }

    const currentQ = mockQueue[docId];
    const exists = currentQ.queue.some(q => q.id === apt.id);
    if (!exists) {
      const position = currentQ.queue.length + 1;
      currentQ.queue.push({
        id: apt.id,
        patientId: apt.patientId,
        patientName: apt.patient?.fullName || 'Patient',
        patient: apt.patient,
        bookingRef: apt.bookingRef,
        status: 'WAITING',
        position,
        slot: apt.slot,
        checkedInAt: apt.checkedInAt,
        estimatedWaitMinutes: position * 15
      });
      currentQ.waitingCount = currentQ.queue.length;
      currentQ.totalEstimatedWaitMinutes = currentQ.queue.length * 15;
    }

    notifyQueueUpdate(docId);
    return { status: 'SUCCESS', message: 'Patient checked in', appointment: apt };
  },

  checkInPatient: (appointmentId) => {
    return mockBackend.checkIn(appointmentId);
  },

  bookSlot: (slotId, reason) => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('simulateConflict') === 'true') {
      throw {
        response: {
          status: 409,
          data: {
            message: 'Slot was already booked by another user. Please choose another time.',
            errorCode: 'SLOT_CONFLICT'
          }
        }
      };
    }

    // Double-booking check: If slot is already marked booked, reject with 409
    if (bookedSlotIds.has(slotId)) {
      throw {
        response: {
          status: 409,
          data: {
            message: 'Slot was already booked by another user. Please choose another time.',
            errorCode: 'SLOT_CONFLICT'
          }
        }
      };
    }

    // Mark slot as booked globally
    bookedSlotIds.add(slotId);

    // Update in any active cached date store
    let targetSlotObj = null;
    let targetDoctorId = DOCTORS[0].id;
    for (const key in dynamicSlotStore) {
      const slotList = dynamicSlotStore[key]?.slots || [];
      const match = slotList.find(s => s.id === slotId);
      if (match) {
        match.status = 'BOOKED';
        match.booked = true;
        targetSlotObj = match;
        targetDoctorId = match.doctorId || targetDoctorId;
        break;
      }
    }

    const newId = `apt-${Date.now()}`;
    const newRef = `CF-${dateDigits}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newApt = {
      id: newId,
      patientId: (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null) || 'p-sandeep-kulkarni',
      patient: {
        id: (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null) || 'p-sandeep-kulkarni',
        fullName: (typeof localStorage !== 'undefined' ? localStorage.getItem('fullName') : null) || 'Sandeep Kulkarni',
        email: 'patient@clinicflow.com'
      },
      doctor: DOCTORS.find(d => d.id === targetDoctorId) || DOCTORS[0],
      clinic: { id: 'c1111111-1111-1111-1111-111111111111', name: 'Main Health Clinic' },
      status: 'BOOKED',
      bookingRef: newRef,
      reason: reason || 'General consultation',
      slot: targetSlotObj || {
        id: slotId || `slot-${Date.now()}`,
        slotDate: TODAY_STR,
        startTime: '11:00',
        endTime: '11:15',
        status: 'BOOKED',
        booked: true
      }
    };

    mockAppointments.unshift(newApt);
    notifySlotBooked(slotId, targetDoctorId);
    return newApt;
  },

  cancelAppointment: (id) => {
    const apt = mockAppointments.find(a => a.id === id);
    if (apt) {
      apt.status = 'CANCELLED';
      if (apt.slot?.id) {
        bookedSlotIds.delete(apt.slot.id);
        for (const key in dynamicSlotStore) {
          const match = dynamicSlotStore[key]?.slots?.find(s => s.id === apt.slot.id);
          if (match) {
            match.status = 'AVAILABLE';
            match.booked = false;
          }
        }
      }
      Object.keys(mockQueue).forEach(docId => {
        const q = mockQueue[docId];
        q.queue = q.queue.filter(item => item.id !== id);
        q.waitingCount = q.queue.length;
        notifyQueueUpdate(docId);
      });
    }
    return { status: 'CANCELLED' };
  },

  getSchedules: (doctorId) => {
    return INITIAL_SCHEDULES[doctorId] || [];
  },

  addSchedule: (doctorId, scheduleData) => {
    if (!INITIAL_SCHEDULES[doctorId]) {
      INITIAL_SCHEDULES[doctorId] = [];
    }
    const newSch = { id: `sch-${Date.now()}`, ...scheduleData };
    INITIAL_SCHEDULES[doctorId].push(newSch);
    return newSch;
  },

  generateSlots: (doctorId, startDate, endDate) => {
    const doc = DOCTORS.find(d => d.id === doctorId) || DOCTORS[0];
    const generated = generateSlotsForDoctor(doc, startDate || TODAY_STR);
    return { count: generated.slots.length, slots: generated.slots };
  },

  getNoShows: () => {
    return mockAppointments.filter(a => a.status === 'NO_SHOW');
  },

  runNoShowSweep: () => {
    return {
      status: 'SUCCESS',
      sweptAppointments: 2,
      jobRunAt: new Date().toISOString()
    };
  }
};
