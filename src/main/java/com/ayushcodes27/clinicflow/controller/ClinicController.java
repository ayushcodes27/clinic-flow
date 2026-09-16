package com.ayushcodes27.clinicflow.controller;

import com.ayushcodes27.clinicflow.dto.AddStaffRequest;
import com.ayushcodes27.clinicflow.dto.ClinicDto;
import com.ayushcodes27.clinicflow.dto.CreateClinicRequest;
import com.ayushcodes27.clinicflow.service.ClinicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/clinics")
@RequiredArgsConstructor
public class ClinicController {

    private final ClinicService service;

    @PostMapping
    public ResponseEntity<ClinicDto> createClinic(@Valid @RequestBody CreateClinicRequest request) {
        return ResponseEntity.ok(service.createClinic(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@clinicSecurity.isStaff(#id)")
    public ResponseEntity<ClinicDto> getClinic(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getClinic(id));
    }

    @PostMapping("/{id}/staff")
    @PreAuthorize("@clinicSecurity.hasRole(#id, 'ADMIN')")
    public ResponseEntity<Void> addStaff(@PathVariable UUID id, @Valid @RequestBody AddStaffRequest request) {
        service.addStaff(id, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/staff/{userId}")
    @PreAuthorize("@clinicSecurity.hasRole(#id, 'ADMIN')")
    public ResponseEntity<Void> removeStaff(@PathVariable UUID id, @PathVariable UUID userId) {
        service.removeStaff(id, userId);
        return ResponseEntity.ok().build();
    }
}
