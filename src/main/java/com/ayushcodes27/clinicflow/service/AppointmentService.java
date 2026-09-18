package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.dto.BookAppointmentRequest;
import com.ayushcodes27.clinicflow.entity.Appointment;
import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import com.ayushcodes27.clinicflow.entity.User;
import com.ayushcodes27.clinicflow.repository.AppointmentRepository;
import com.ayushcodes27.clinicflow.repository.AppointmentSlotRepository;
import com.ayushcodes27.clinicflow.repository.DoctorRepository;
import com.ayushcodes27.clinicflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepo;
    private final AppointmentSlotRepository slotRepo;
    private final UserRepository userRepo;
    private final DoctorRepository doctorRepo;
    private final com.ayushcodes27.clinicflow.repository.QueueEntryRepository queueRepo;
    private final com.ayushcodes27.clinicflow.service.AppointmentSlotService slotService;
    private final NotificationService notificationService;

    @Transactional
    public void bookAppointment(BookAppointmentRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User patient = userRepo.findByEmail(email).orElseThrow();

        AppointmentSlot slot = slotRepo.findById(request.getSlotId()).orElseThrow();
        if (!"AVAILABLE".equals(slot.getStatus())) {
            throw new RuntimeException("Slot is not available");
        }

        slot.setStatus("BOOKED");
        slotRepo.save(slot); // This triggers optimistic locking check on flush
        
        slotService.evictCache(slot.getDoctorId(), slot.getSlotDate());

        String bookingRef = "CF-" + slot.getSlotDate().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

        Appointment appointment = Appointment.builder()
                .slot(slot)
                .patient(patient)
                .doctor(doctorRepo.findById(slot.getDoctorId()).orElseThrow())
                .clinic(doctorRepo.findById(slot.getDoctorId()).orElseThrow().getClinic())
                .status("BOOKED")
                .bookingRef(bookingRef)
                .reason(request.getReason())
                .build();
        
        appointmentRepo.save(appointment);
    }

    public UUID getClinicId(UUID appointmentId) {
        return appointmentRepo.findById(appointmentId).orElseThrow().getClinic().getId();
    }

    @Transactional
    public void checkIn(UUID appointmentId) {
        Appointment appointment = appointmentRepo.findById(appointmentId).orElseThrow();
        if (!"BOOKED".equals(appointment.getStatus())) {
            throw new RuntimeException("Can only check in a booked appointment");
        }
        appointment.setStatus("CHECKED_IN");
        appointment.setCheckedInAt(java.time.Instant.now());
        appointmentRepo.save(appointment);

        int maxPos = queueRepo.findMaxPositionForDoctorToday(appointment.getDoctor().getId());
        
        com.ayushcodes27.clinicflow.entity.QueueEntry queueEntry = com.ayushcodes27.clinicflow.entity.QueueEntry.builder()
                .appointment(appointment)
                .doctor(appointment.getDoctor())
                .clinic(appointment.getClinic())
                .patient(appointment.getPatient())
                .position(maxPos + 1)
                .status("WAITING")
                .build();
        queueRepo.save(queueEntry);

        // Push live queue update to all watchers
        notificationService.pushQueueUpdate(appointment.getDoctor().getId());
    }

    @Transactional
    public void cancel(UUID appointmentId) {
        Appointment appointment = appointmentRepo.findById(appointmentId).orElseThrow();
        if ("COMPLETED".equals(appointment.getStatus()) || "CANCELLED".equals(appointment.getStatus())) {
            throw new RuntimeException("Cannot cancel this appointment");
        }
        
        // Free up the slot
        AppointmentSlot slot = appointment.getSlot();
        slot.setStatus("AVAILABLE");
        slotRepo.save(slot);
        
        slotService.evictCache(slot.getDoctorId(), slot.getSlotDate());

        appointment.setStatus("CANCELLED");
        appointmentRepo.save(appointment);
    }

    public java.util.List<Appointment> getAppointments(String status) {
        if (status != null && !status.isEmpty()) {
            return appointmentRepo.findByStatus(status);
        }
        return appointmentRepo.findAll();
    }
}
