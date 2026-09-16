package com.ayushcodes27.clinicflow.repository;

import com.ayushcodes27.clinicflow.entity.ClinicMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClinicMemberRepository extends JpaRepository<ClinicMember, UUID> {
    Optional<ClinicMember> findByClinicIdAndUserId(UUID clinicId, UUID userId);
    boolean existsByClinicIdAndUserId(UUID clinicId, UUID userId);
    void deleteByClinicIdAndUserId(UUID clinicId, UUID userId);
}
