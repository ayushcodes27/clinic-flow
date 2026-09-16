package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.dto.AddStaffRequest;
import com.ayushcodes27.clinicflow.dto.ClinicDto;
import com.ayushcodes27.clinicflow.dto.CreateClinicRequest;
import com.ayushcodes27.clinicflow.entity.Clinic;
import com.ayushcodes27.clinicflow.entity.ClinicMember;
import com.ayushcodes27.clinicflow.entity.User;
import com.ayushcodes27.clinicflow.repository.ClinicMemberRepository;
import com.ayushcodes27.clinicflow.repository.ClinicRepository;
import com.ayushcodes27.clinicflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClinicService {

    private final ClinicRepository clinicRepo;
    private final ClinicMemberRepository memberRepo;
    private final UserRepository userRepo;

    @Transactional
    public ClinicDto createClinic(CreateClinicRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User owner = userRepo.findByEmail(email).orElseThrow();

        Clinic clinic = Clinic.builder()
                .name(request.getName())
                .address(request.getAddress())
                .phone(request.getPhone())
                .owner(owner)
                .isActive(true)
                .build();
        
        clinic = clinicRepo.save(clinic);

        ClinicMember member = ClinicMember.builder()
                .clinic(clinic)
                .user(owner)
                .role("ADMIN")
                .build();
        memberRepo.save(member);

        return mapToDto(clinic);
    }

    public ClinicDto getClinic(UUID id) {
        Clinic clinic = clinicRepo.findById(id).orElseThrow();
        return mapToDto(clinic);
    }

    @Transactional
    public void addStaff(UUID clinicId, AddStaffRequest request) {
        Clinic clinic = clinicRepo.findById(clinicId).orElseThrow();
        User user = userRepo.findById(request.getUserId()).orElseThrow();
        
        ClinicMember member = ClinicMember.builder()
                .clinic(clinic)
                .user(user)
                .role(request.getRole().toUpperCase())
                .build();
        memberRepo.save(member);
    }

    @Transactional
    public void removeStaff(UUID clinicId, UUID userId) {
        memberRepo.deleteByClinicIdAndUserId(clinicId, userId);
    }

    private ClinicDto mapToDto(Clinic clinic) {
        return ClinicDto.builder()
                .id(clinic.getId())
                .name(clinic.getName())
                .address(clinic.getAddress())
                .phone(clinic.getPhone())
                .isActive(clinic.isActive())
                .build();
    }
}
