package com.ayushcodes27.clinicflow.service;

import java.time.LocalDate;
import java.time.LocalTime;

public interface MessageGateway {
    void sendAppointmentReminder(
            String recipientPhone,
            String patientName,
            String doctorName,
            LocalDate appointmentDate,
            LocalTime slotStartTime,
            String clinicName
    );
}
