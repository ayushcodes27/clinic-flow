package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.entity.Appointment;
import com.ayushcodes27.clinicflow.repository.AppointmentRepository;
import com.ayushcodes27.clinicflow.repository.QueueEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueEntryRepository queueRepo;
    private final AppointmentRepository appointmentRepo;
    private final NotificationService notificationService;

    @Transactional
    public void callNextPatient(UUID doctorId) {
        // Find if there's already a patient IN_CONSULTATION and mark them COMPLETED
        queueRepo.findFirstByDoctorIdAndStatusOrderByPositionAsc(doctorId, "IN_CONSULTATION")
                .ifPresent(current -> {
                    current.setStatus("COMPLETED");
                    current.setCompletedAt(java.time.Instant.now());
                    queueRepo.save(current);

                    Appointment appt = current.getAppointment();
                    appt.setStatus("COMPLETED");
                    appt.setCompletedAt(java.time.Instant.now());
                    appointmentRepo.save(appt);
                });

        // Find the next WAITING patient
        queueRepo.findFirstByDoctorIdAndStatusOrderByPositionAsc(doctorId, "WAITING")
                .ifPresent(next -> {
                    next.setStatus("IN_CONSULTATION");
                    next.setCalledAt(java.time.Instant.now());
                    queueRepo.save(next);

                    Appointment appt = next.getAppointment();
                    appt.setStatus("IN_CONSULTATION");
                    appointmentRepo.save(appt);
                });

        // Push live queue update to all watchers
        notificationService.pushQueueUpdate(doctorId);
    }
}
