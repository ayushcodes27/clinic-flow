package com.ayushcodes27.clinicflow.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class CreateDoctorRequest {
    @NotNull
    private UUID userId;
    
    @NotBlank
    private String specialization;
    
    @Min(5)
    private int consultationMinutes = 15;
    
    @Min(1)
    private int maxDailyPatients = 30;
}
