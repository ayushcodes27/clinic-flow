package com.ayushcodes27.clinicflow.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class ClinicDto {
    private UUID id;
    private String name;
    private String address;
    private String phone;
    private boolean isActive;
}
