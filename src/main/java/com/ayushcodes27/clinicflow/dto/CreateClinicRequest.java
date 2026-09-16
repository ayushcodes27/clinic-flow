package com.ayushcodes27.clinicflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateClinicRequest {
    @NotBlank
    private String name;
    private String address;
    private String phone;
}
