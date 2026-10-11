package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.entity.Appointment;
import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import com.ayushcodes27.clinicflow.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentReminderJob {

    private final AppointmentRepository appointmentRepo;
    private final MessageGateway messageGateway;
    private final NotificationService notificationService;

    private static final int REMINDER_WINDOW_HOURS = 2;

    @Scheduled(fixedRateString = "${clinicflow.reminders.interval:120000}")
    @SchedulerLock(name = "AppointmentReminderJob_sendReminders", lockAtLeastFor = "1m", lockAtMostFor = "3m")
    @Transactional
    public void sendUpcomingReminders() {
        Instant now = Instant.now();
        Instant reminderWindowEnd = now.plus(REMINDER_WINDOW_HOURS, ChronoUnit.HOURS);

        List<Appointment> upcoming = appointmentRepo.findUpcomingAppointmentsNeedingReminder(now, reminderWindowEnd);

        for (Appointment appointment : upcoming) {
            AppointmentSlot slot = appointment.getSlot();
            String patientPhone = appointment.getPatient() != null ? appointment.getPatient().getPhone() : null;
            String patientName = appointment.getPatient() != null ? appointment.getPatient().getFullName() : "Patient";
            String doctorName = appointment.getDoctor() != null && appointment.getDoctor().getUser() != null
                    ? appointment.getDoctor().getUser().getFullName()
                    : "Doctor";
            String clinicName = appointment.getClinic() != null ? appointment.getClinic().getName() : "ClinicFlow";

            // Dispatch SMS / WhatsApp notification via Gateway
            messageGateway.sendAppointmentReminder(
                    patientPhone,
                    patientName,
                    doctorName,
                    slot != null ? slot.getSlotDate() : null,
                    slot != null ? slot.getStartTime() : null,
                    clinicName
            );

            // Also push live in-app notification if patient is logged in
            if (appointment.getPatient() != null) {
                notificationService.pushUserNotification(
                        appointment.getPatient().getId(),
                        String.format("Reminder: Your appointment with %s is scheduled at %s today.",
                                doctorName,
                                slot != null ? slot.getStartTime().toString() : "scheduled time")
                );
            }

            appointment.setReminderSent(true);
            appointmentRepo.save(appointment);

            log.info("Dispatched appointment reminder: appointment={}, patient={}, slot={}",
                    appointment.getId(),
                    appointment.getPatient() != null ? appointment.getPatient().getId() : "unknown",
                    slot != null ? slot.getId() : "unknown");
        }

        if (!upcoming.isEmpty()) {
            log.info("Appointment reminder job complete: {} reminder(s) sent.", upcoming.size());
        }
    }
}
