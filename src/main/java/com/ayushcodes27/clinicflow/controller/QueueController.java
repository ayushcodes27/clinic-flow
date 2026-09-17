package com.ayushcodes27.clinicflow.controller;

import com.ayushcodes27.clinicflow.service.QueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/queue")
@RequiredArgsConstructor
@Tag(name = "Queue Management", description = "Endpoints for managing the patient queue")
public class QueueController {

    private final QueueService service;

    @Operation(summary = "Call Next Patient", description = "Calls the next waiting patient in the doctor's queue")
    @PostMapping("/doctors/{doctorId}/next")
    public ResponseEntity<Void> callNextPatient(@PathVariable UUID doctorId) {
        service.callNextPatient(doctorId);
        return ResponseEntity.ok().build();
    }
}
