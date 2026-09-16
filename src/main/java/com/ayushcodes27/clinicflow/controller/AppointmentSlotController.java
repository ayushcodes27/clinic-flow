package com.ayushcodes27.clinicflow.controller;

import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import com.ayushcodes27.clinicflow.service.AppointmentSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/slots")
@RequiredArgsConstructor
public class AppointmentSlotController {

    private final AppointmentSlotService service;

    @GetMapping
    public ResponseEntity<List<AppointmentSlot>> getAvailableSlots(
            @RequestParam UUID doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(service.getAvailableSlots(doctorId, date));
    }
}
