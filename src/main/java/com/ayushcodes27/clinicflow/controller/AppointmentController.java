package com.ayushcodes27.clinicflow.controller;

import com.ayushcodes27.clinicflow.dto.BookAppointmentRequest;
import com.ayushcodes27.clinicflow.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService service;

    @PostMapping("/book")
    public ResponseEntity<Void> bookAppointment(@Valid @RequestBody BookAppointmentRequest request) {
        service.bookAppointment(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/check-in")
    @org.springframework.security.access.prepost.PreAuthorize("@clinicSecurity.canCheckInPatients(@appointmentService.getClinicId(#id))")
    public ResponseEntity<Void> checkIn(@PathVariable java.util.UUID id) {
        service.checkIn(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable java.util.UUID id) {
        service.cancel(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<java.util.List<com.ayushcodes27.clinicflow.entity.Appointment>> getAppointments(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(service.getAppointments(status));
    }
}
