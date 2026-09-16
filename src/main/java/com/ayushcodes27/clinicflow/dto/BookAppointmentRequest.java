package com.ayushcodes27.clinicflow.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class BookAppointmentRequest {
    @NotNull
    private UUID slotId;
    
    private String reason;
}
