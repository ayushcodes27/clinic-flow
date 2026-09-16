package com.ayushcodes27.clinicflow.repository;

import com.ayushcodes27.clinicflow.entity.QueueEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface QueueEntryRepository extends JpaRepository<QueueEntry, UUID> {
    
    @Query("SELECT COALESCE(MAX(q.position), 0) FROM QueueEntry q WHERE q.doctor.id = :doctorId AND FUNCTION('DATE', q.enteredAt) = CURRENT_DATE")
    int findMaxPositionForDoctorToday(UUID doctorId);

    Optional<QueueEntry> findFirstByDoctorIdAndStatusOrderByPositionAsc(UUID doctorId, String status);
}
