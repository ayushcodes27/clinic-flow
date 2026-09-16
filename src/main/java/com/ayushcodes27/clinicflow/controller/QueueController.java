package com.ayushcodes27.clinicflow.controller;

import com.ayushcodes27.clinicflow.service.QueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/queue")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService service;

    @PostMapping("/doctors/{doctorId}/next")
    public ResponseEntity<Void> callNextPatient(@PathVariable UUID doctorId) {
        service.callNextPatient(doctorId);
        return ResponseEntity.ok().build();
    }
}
