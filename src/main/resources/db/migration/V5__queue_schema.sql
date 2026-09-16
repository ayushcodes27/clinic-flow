-- Live queue (today's checked-in patients waiting for a doctor)
CREATE TABLE queue_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID NOT NULL REFERENCES appointments(id) UNIQUE,
    doctor_id       UUID NOT NULL REFERENCES doctors(id),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    patient_id      UUID NOT NULL REFERENCES users(id),
    position        INTEGER NOT NULL,       -- Queue position (1 = next)
    status          VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    entered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    called_at       TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_queue_doctor ON queue_entries(doctor_id, position)
    WHERE status = 'WAITING';
