package com.ayushcodes27.clinicflow.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class DoctorDto {
    private UUID id;
    private String fullName;
    private String specialization;
}
