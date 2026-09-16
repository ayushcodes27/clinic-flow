-- Doctors (extended profile for users with DOCTOR role)
CREATE TABLE doctors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) UNIQUE,
    clinic_id           UUID NOT NULL REFERENCES clinics(id),
    specialization      VARCHAR(100) NOT NULL,
    consultation_minutes INTEGER NOT NULL DEFAULT 15,
    max_daily_patients  INTEGER NOT NULL DEFAULT 30,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctor weekly schedule (which days/hours they're available)
CREATE TABLE doctor_schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,       -- 1=Monday ... 7=Sunday
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(doctor_id, day_of_week)
);

-- Appointment slots (auto-generated from doctor schedules)
CREATE TABLE appointment_slots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID NOT NULL REFERENCES doctors(id),
    clinic_id   UUID NOT NULL REFERENCES clinics(id),
    slot_date   DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    status      VARCHAR(15) NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE | BOOKED | BLOCKED
    version     BIGINT NOT NULL DEFAULT 0,  -- Optimistic locking for concurrent booking
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(doctor_id, slot_date, start_time)
);

CREATE INDEX idx_slots_doctor_date ON appointment_slots(doctor_id, slot_date);
CREATE INDEX idx_slots_available ON appointment_slots(doctor_id, slot_date, status)
    WHERE status = 'AVAILABLE';
