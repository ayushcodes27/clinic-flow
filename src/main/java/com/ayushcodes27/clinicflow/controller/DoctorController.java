package com.ayushcodes27.clinicflow.controller;

import com.ayushcodes27.clinicflow.dto.CreateDoctorRequest;
import com.ayushcodes27.clinicflow.dto.GenerateSlotsRequest;
import com.ayushcodes27.clinicflow.dto.ScheduleRequest;
import com.ayushcodes27.clinicflow.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService service;

    @PostMapping("/clinics/{clinicId}/doctors")
    @PreAuthorize("@clinicSecurity.hasRole(#clinicId, 'ADMIN')")
    public ResponseEntity<Void> registerDoctor(
            @PathVariable UUID clinicId,
            @Valid @RequestBody CreateDoctorRequest request
    ) {
        service.registerDoctor(clinicId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/doctors/{doctorId}/schedule")
    public ResponseEntity<Void> addSchedule(
            @PathVariable UUID doctorId,
            @Valid @RequestBody ScheduleRequest request
    ) {
        service.addSchedule(doctorId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/doctors/{doctorId}/generate-slots")
    public ResponseEntity<Void> generateSlots(
            @PathVariable UUID doctorId,
            @Valid @RequestBody GenerateSlotsRequest request
    ) {
        service.generateSlots(doctorId, request);
        return ResponseEntity.ok().build();
    }
}
