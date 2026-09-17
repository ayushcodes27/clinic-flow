package com.ayushcodes27.clinicflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueStateDto {
    private UUID doctorId;
    private QueueEntryDto currentPatient;
    private int waitingCount;
    private List<QueueEntryDto> queue;
}
