package com.ayushcodes27.clinicflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class DefaultMessageGateway implements MessageGateway {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");

    @Override
    public void sendAppointmentReminder(
            String recipientPhone,
            String patientName,
            String doctorName,
            LocalDate appointmentDate,
            LocalTime slotStartTime,
            String clinicName
    ) {
        String formattedTime = slotStartTime != null ? slotStartTime.format(TIME_FORMATTER) : "scheduled time";
        String targetPhone = (recipientPhone != null && !recipientPhone.isBlank()) ? recipientPhone : "+91-XXXXXXXXXX";

        String message = String.format(
                "🏥 [%s Reminder] Hello %s, your appointment with %s is scheduled for today (%s) at %s. Please arrive 10 minutes early.",
                clinicName != null ? clinicName : "ClinicFlow",
                patientName != null ? patientName : "Patient",
                doctorName != null ? doctorName : "Doctor",
                appointmentDate != null ? appointmentDate.toString() : "today",
                formattedTime
        );

        // Simulation/Gateway dispatch: logs as SMS/WhatsApp delivery (extensible to Twilio/Gupshup/WhatsApp Cloud API)
        log.info("[SMS / WhatsApp Dispatch] TO: {} | MSG: \"{}\"", targetPhone, message);
    }
}
