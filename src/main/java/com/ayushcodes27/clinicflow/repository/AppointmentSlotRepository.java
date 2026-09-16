package com.ayushcodes27.clinicflow.repository;

import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentSlotRepository extends JpaRepository<AppointmentSlot, UUID> {
    List<AppointmentSlot> findByDoctorIdAndSlotDateAndStatus(UUID doctorId, LocalDate slotDate, String status);
}
