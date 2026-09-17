package com.ayushcodes27.clinicflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntryDto {
    private UUID id;
    private UUID appointmentId;
    private UUID patientId;
    private int position;
    private String status;
}
