package com.ayushcodes27.clinicflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserNotification {
    private String message;
    private Instant timestamp;
}
