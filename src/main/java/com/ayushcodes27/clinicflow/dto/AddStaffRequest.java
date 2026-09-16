package com.ayushcodes27.clinicflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class AddStaffRequest {
    @NotNull
    private UUID userId;
    @NotBlank
    private String role;
}
