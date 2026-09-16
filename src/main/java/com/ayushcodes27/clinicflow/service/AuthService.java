package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.dto.AuthResponse;
import com.ayushcodes27.clinicflow.dto.LoginRequest;
import com.ayushcodes27.clinicflow.dto.RegisterRequest;
import com.ayushcodes27.clinicflow.entity.User;
import com.ayushcodes27.clinicflow.repository.UserRepository;
import com.ayushcodes27.clinicflow.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        var user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .userType(request.getUserType().toUpperCase())
                .isActive(true)
                .build();
        repository.save(user);

        var extraClaims = Map.<String, Object>of("userType", user.getUserType());
        var jwtToken = jwtService.generateToken(extraClaims, user);
        var refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        var user = repository.findByEmail(request.getEmail())
                .orElseThrow();
                
        var extraClaims = Map.<String, Object>of("userType", user.getUserType());
        var jwtToken = jwtService.generateToken(extraClaims, user);
        var refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    public AuthResponse refresh(com.ayushcodes27.clinicflow.dto.RefreshRequest request) {
        String refreshToken = request.getRefreshToken();
        String userEmail = jwtService.extractUsername(refreshToken);
        
        if (userEmail != null) {
            var user = repository.findByEmail(userEmail)
                    .orElseThrow();
            if (jwtService.isTokenValid(refreshToken, user)) {
                var extraClaims = Map.<String, Object>of("userType", user.getUserType());
                var accessToken = jwtService.generateToken(extraClaims, user);
                return AuthResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build();
            }
        }
        throw new RuntimeException("Invalid refresh token");
    }
}
