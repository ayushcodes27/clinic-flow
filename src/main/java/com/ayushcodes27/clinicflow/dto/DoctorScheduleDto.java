package com.ayushcodes27.clinicflow.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class DoctorScheduleDto {
    private UUID id;
    private int dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private int consultationDurationMinutes;
}
