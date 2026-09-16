package com.ayushcodes27.clinicflow.service;

import com.ayushcodes27.clinicflow.dto.CreateDoctorRequest;
import com.ayushcodes27.clinicflow.dto.GenerateSlotsRequest;
import com.ayushcodes27.clinicflow.dto.ScheduleRequest;
import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import com.ayushcodes27.clinicflow.entity.Clinic;
import com.ayushcodes27.clinicflow.entity.Doctor;
import com.ayushcodes27.clinicflow.entity.DoctorSchedule;
import com.ayushcodes27.clinicflow.entity.User;
import com.ayushcodes27.clinicflow.repository.AppointmentSlotRepository;
import com.ayushcodes27.clinicflow.repository.ClinicRepository;
import com.ayushcodes27.clinicflow.repository.DoctorRepository;
import com.ayushcodes27.clinicflow.repository.DoctorScheduleRepository;
import com.ayushcodes27.clinicflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepo;
    private final DoctorScheduleRepository scheduleRepo;
    private final AppointmentSlotRepository slotRepo;
    private final ClinicRepository clinicRepo;
    private final UserRepository userRepo;

    @Transactional
    public void registerDoctor(UUID clinicId, CreateDoctorRequest request) {
        Clinic clinic = clinicRepo.findById(clinicId).orElseThrow();
        User user = userRepo.findById(request.getUserId()).orElseThrow();

        Doctor doctor = Doctor.builder()
                .clinic(clinic)
                .user(user)
                .specialization(request.getSpecialization())
                .consultationMinutes(request.getConsultationMinutes())
                .maxDailyPatients(request.getMaxDailyPatients())
                .build();
        doctorRepo.save(doctor);
    }

    @Transactional
    public void addSchedule(UUID doctorId, ScheduleRequest request) {
        Doctor doctor = doctorRepo.findById(doctorId).orElseThrow();

        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctor(doctor)
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .isActive(true)
                .build();
        scheduleRepo.save(schedule);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "available_slots", allEntries = true)
    public void generateSlots(UUID doctorId, GenerateSlotsRequest request) {
        Doctor doctor = doctorRepo.findById(doctorId).orElseThrow();
        List<DoctorSchedule> schedules = scheduleRepo.findByDoctorId(doctorId);

        LocalDate current = request.getStartDate();
        while (!current.isAfter(request.getEndDate())) {
            int dayOfWeek = current.getDayOfWeek().getValue();
            LocalDate finalCurrent = current;
            
            schedules.stream()
                .filter(s -> s.getDayOfWeek() == dayOfWeek && s.isActive())
                .findFirst()
                .ifPresent(schedule -> {
                    LocalTime time = schedule.getStartTime();
                    int count = 0;
                    List<AppointmentSlot> slots = new ArrayList<>();
                    while (time.plusMinutes(doctor.getConsultationMinutes()).isBefore(schedule.getEndTime()) 
                           || time.plusMinutes(doctor.getConsultationMinutes()).equals(schedule.getEndTime())) {
                        
                        if (count >= doctor.getMaxDailyPatients()) break;
                        
                        slots.add(AppointmentSlot.builder()
                                .doctorId(doctor.getId())
                                .clinicId(doctor.getClinic().getId())
                                .slotDate(finalCurrent)
                                .startTime(time)
                                .endTime(time.plusMinutes(doctor.getConsultationMinutes()))
                                .status("AVAILABLE")
                                .build());
                        
                        time = time.plusMinutes(doctor.getConsultationMinutes());
                        count++;
                    }
                    slotRepo.saveAll(slots);
                });
            current = current.plusDays(1);
        }
    }
}
