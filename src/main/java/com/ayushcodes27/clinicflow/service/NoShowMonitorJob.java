package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.entity.Appointment;
import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import com.ayushcodes27.clinicflow.repository.AppointmentRepository;
import com.ayushcodes27.clinicflow.repository.AppointmentSlotRepository;
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
public class NoShowMonitorJob {

    private final AppointmentRepository appointmentRepo;
    private final AppointmentSlotRepository slotRepo;
    private final NotificationService notificationService;
    private final AppointmentSlotService slotService;

    private static final int NO_SHOW_THRESHOLD_MINUTES = 15;

    @Scheduled(fixedRateString = "${clinicflow.noshow.interval:300000}")
    @SchedulerLock(name = "NoShowMonitorJob_detectNoShows", lockAtLeastFor = "2m", lockAtMostFor = "4m")
    @Transactional
    public void detectNoShows() {
        Instant cutoff = Instant.now().minus(NO_SHOW_THRESHOLD_MINUTES, ChronoUnit.MINUTES);

        List<Appointment> noShows = appointmentRepo.findNoShowCandidates("BOOKED", cutoff);

        for (Appointment appointment : noShows) {
            appointment.setStatus("NO_SHOW");
            appointmentRepo.save(appointment);

            AppointmentSlot slot = appointment.getSlot();
            slot.setStatus("AVAILABLE");
            slotRepo.save(slot);

            slotService.evictCache(slot.getDoctorId(), slot.getSlotDate());

            notificationService.pushUserNotification(
                    appointment.getDoctor().getUser().getId(),
                    "No-show: Patient did not arrive for " + slot.getStartTime() + " appointment. Slot has been freed."
            );

            log.info("No-show detected: appointment={}, patient={}, slot freed={}",
                    appointment.getId(), appointment.getPatient().getId(), slot.getId());
        }

        if (!noShows.isEmpty()) {
            log.info("No-show check complete. {} detected.", noShows.size());
        }
    }
}
