package com.ayushcodes27.clinicflow.controller;

import com.ayushcodes27.clinicflow.dto.AuthResponse;
import com.ayushcodes27.clinicflow.dto.LoginRequest;
import com.ayushcodes27.clinicflow.dto.RegisterRequest;
import com.ayushcodes27.clinicflow.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService service;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(service.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @Valid @RequestBody com.ayushcodes27.clinicflow.dto.RefreshRequest request
    ) {
        return ResponseEntity.ok(service.refresh(request));
    }
}
