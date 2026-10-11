-- Migration V7: Add reminder tracking to appointments
ALTER TABLE appointments ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_appointments_reminders 
    ON appointments(status, reminder_sent) 
    WHERE status = 'BOOKED' AND reminder_sent = FALSE;
