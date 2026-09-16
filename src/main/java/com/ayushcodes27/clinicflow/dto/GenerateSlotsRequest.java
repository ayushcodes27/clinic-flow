package com.ayushcodes27.clinicflow.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class GenerateSlotsRequest {
    @NotNull
    private LocalDate startDate;
    @NotNull
    private LocalDate endDate;
}
