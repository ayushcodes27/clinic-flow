package com.ayushcodes27.clinicflow.repository;

import com.ayushcodes27.clinicflow.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    @Query(value = """
        SELECT a.* FROM appointments a
        JOIN appointment_slots s ON a.slot_id = s.id
        WHERE a.status = :status
        AND (s.slot_date + s.start_time) < :cutoff
    """, nativeQuery = true)
    List<Appointment> findNoShowCandidates(@Param("status") String status, @Param("cutoff") Instant cutoff);
}
