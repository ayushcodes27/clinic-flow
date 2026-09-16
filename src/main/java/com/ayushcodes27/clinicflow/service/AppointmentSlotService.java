package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import com.ayushcodes27.clinicflow.repository.AppointmentSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentSlotService {

    private final AppointmentSlotRepository slotRepo;

    @Cacheable(value = "available_slots", key = "#doctorId + '-' + #date")
    public List<AppointmentSlot> getAvailableSlots(UUID doctorId, LocalDate date) {
        return slotRepo.findByDoctorIdAndSlotDateAndStatus(doctorId, date, "AVAILABLE");
    }

    @CacheEvict(value = "available_slots", key = "#doctorId + '-' + #date")
    public void evictCache(UUID doctorId, LocalDate date) {
        // Just for eviction
    }
}
