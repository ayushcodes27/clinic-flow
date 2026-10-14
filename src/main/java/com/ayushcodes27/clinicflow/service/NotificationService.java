package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.dto.QueueEntryDto;
import com.ayushcodes27.clinicflow.dto.QueueStateDto;
import com.ayushcodes27.clinicflow.dto.UserNotification;
import com.ayushcodes27.clinicflow.entity.Doctor;
import com.ayushcodes27.clinicflow.entity.QueueEntry;
import com.ayushcodes27.clinicflow.repository.DoctorRepository;
import com.ayushcodes27.clinicflow.repository.QueueEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final QueueEntryRepository queueRepo;
    private final DoctorRepository doctorRepo;

    @Transactional(readOnly = true)
    public QueueStateDto getQueueState(UUID doctorId) {
        List<QueueEntry> waiting = queueRepo.findByDoctorIdAndStatusOrderByPositionAsc(doctorId, "WAITING");
        Optional<QueueEntry> current = queueRepo.findFirstByDoctorIdAndStatusOrderByPositionAsc(doctorId, "IN_CONSULTATION");

        int avgConsultationMinutes = 15;
        if (doctorId != null) {
            avgConsultationMinutes = doctorRepo.findById(doctorId)
                    .map(Doctor::getConsultationMinutes)
                    .filter(m -> m > 0)
                    .orElse(15);
        }

        // Calculate remaining minutes for the current patient in consultation
        int remainingCurrentMinutes = 0;
        QueueEntryDto currentDto = null;
        if (current.isPresent()) {
            QueueEntry currentEntry = current.get();
            Instant calledAt = currentEntry.getCalledAt();
            if (calledAt != null) {
                long elapsed = Duration.between(calledAt, Instant.now()).toMinutes();
                remainingCurrentMinutes = (int) Math.max(0, avgConsultationMinutes - elapsed);
            } else {
                remainingCurrentMinutes = avgConsultationMinutes;
            }
            currentDto = mapToDto(currentEntry, 0, calledAt != null ? calledAt : Instant.now());
        }

        // Calculate wait time and estimated start time for each waiting patient
        List<QueueEntryDto> queueDtos = new ArrayList<>();
        int cumulativeWait = remainingCurrentMinutes;
        for (QueueEntry entry : waiting) {
            Instant estStart = Instant.now().plus(Duration.ofMinutes(cumulativeWait));
            queueDtos.add(mapToDto(entry, cumulativeWait, estStart));
            cumulativeWait += avgConsultationMinutes;
        }

        return QueueStateDto.builder()
                .doctorId(doctorId)
                .currentPatient(currentDto)
                .waitingCount(waiting.size())
                .queue(queueDtos)
                .avgConsultationMinutes(avgConsultationMinutes)
                .totalEstimatedWaitMinutes(cumulativeWait)
                .build();
    }

    public void pushQueueUpdate(UUID doctorId) {
        QueueStateDto state = getQueueState(doctorId);
        messagingTemplate.convertAndSend("/topic/queue/" + doctorId, state);
    }

    
    public void pushSlotBooked(UUID doctorId, UUID slotId) {
        messagingTemplate.convertAndSend("/topic/slots/" + doctorId, java.util.Map.of(
            "slotId", slotId.toString(),
            "status", "BOOKED"
        ));
    }

    public void pushUserNotification(UUID userId, String message) {
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                new UserNotification(message, Instant.now())
        );
    }

    private QueueEntryDto mapToDto(QueueEntry entry, Integer estimatedWaitMinutes, Instant estimatedStartTime) {
        return QueueEntryDto.builder()
                .id(entry.getId())
                .appointmentId(entry.getAppointment() != null ? entry.getAppointment().getId() : null)
                .patientId(entry.getPatient() != null ? entry.getPatient().getId() : null)
                .patientName(entry.getPatient() != null ? entry.getPatient().getFullName() : null)
                .position(entry.getPosition())
                .status(entry.getStatus())
                .estimatedWaitMinutes(estimatedWaitMinutes)
                .estimatedStartTime(estimatedStartTime)
                .build();
    }
}
