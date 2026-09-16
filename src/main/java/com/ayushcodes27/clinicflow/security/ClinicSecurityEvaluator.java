package com.ayushcodes27.clinicflow.security;

import com.ayushcodes27.clinicflow.repository.ClinicMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.UUID;

@Component("clinicSecurity")
@RequiredArgsConstructor
public class ClinicSecurityEvaluator {

    private final ClinicMemberRepository memberRepo;
    private final com.ayushcodes27.clinicflow.repository.UserRepository userRepo;

    private UUID getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email).orElseThrow().getId();
    }

    public boolean hasRole(UUID clinicId, String... roles) {
        UUID userId = getCurrentUserId();
        return memberRepo.findByClinicIdAndUserId(clinicId, userId)
                .map(member -> Arrays.asList(roles).contains(member.getRole()))
                .orElse(false);
    }

    public boolean isStaff(UUID clinicId) {
        UUID userId = getCurrentUserId();
        return memberRepo.existsByClinicIdAndUserId(clinicId, userId);
    }

    public boolean isDoctorOrAdmin(UUID clinicId) {
        return hasRole(clinicId, "ADMIN", "DOCTOR");
    }

    public boolean canCheckInPatients(UUID clinicId) {
        return hasRole(clinicId, "ADMIN", "RECEPTIONIST");
    }
}
