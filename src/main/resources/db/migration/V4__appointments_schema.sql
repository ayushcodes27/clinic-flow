-- Appointments (a patient books a slot)
CREATE TABLE appointments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id         UUID NOT NULL REFERENCES appointment_slots(id),
    patient_id      UUID NOT NULL REFERENCES users(id),
    doctor_id       UUID NOT NULL REFERENCES doctors(id),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'BOOKED',
    booking_ref     VARCHAR(20) NOT NULL UNIQUE,
    reason          VARCHAR(300),
    notes           TEXT,
    checked_in_at   TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id, created_at DESC);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, created_at DESC);
CREATE INDEX idx_appointments_status ON appointments(status)
    WHERE status IN ('BOOKED', 'CHECKED_IN');
