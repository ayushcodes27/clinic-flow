package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.dto.QueueEntryDto;
import com.ayushcodes27.clinicflow.dto.QueueStateDto;
import com.ayushcodes27.clinicflow.dto.UserNotification;
import com.ayushcodes27.clinicflow.entity.QueueEntry;
import com.ayushcodes27.clinicflow.repository.QueueEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final QueueEntryRepository queueRepo;

    public QueueStateDto getQueueState(UUID doctorId) {
        List<QueueEntry> waiting = queueRepo.findByDoctorIdAndStatusOrderByPositionAsc(doctorId, "WAITING");
        Optional<QueueEntry> current = queueRepo.findFirstByDoctorIdAndStatusOrderByPositionAsc(doctorId, "IN_CONSULTATION");

        return QueueStateDto.builder()
                .doctorId(doctorId)
                .currentPatient(current.map(this::mapToDto).orElse(null))
                .waitingCount(waiting.size())
                .queue(waiting.stream().map(this::mapToDto).collect(Collectors.toList()))
                .build();
    }

    public void pushQueueUpdate(UUID doctorId) {
        QueueStateDto state = getQueueState(doctorId);
        messagingTemplate.convertAndSend("/topic/queue/" + doctorId, state);
    }

    public void pushUserNotification(UUID userId, String message) {
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                new UserNotification(message, Instant.now())
        );
    }

    private QueueEntryDto mapToDto(QueueEntry entry) {
        return QueueEntryDto.builder()
                .id(entry.getId())
                .appointmentId(entry.getAppointment().getId())
                .patientId(entry.getPatient().getId())
                .patientName(entry.getPatient() != null ? entry.getPatient().getFullName() : null)
                .position(entry.getPosition())
                .status(entry.getStatus())
                .build();
    }
}
