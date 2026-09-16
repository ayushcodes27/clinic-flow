package com.ayushcodes27.clinicflow.repository;

import com.ayushcodes27.clinicflow.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {
    List<Doctor> findByClinicId(UUID clinicId);
}
