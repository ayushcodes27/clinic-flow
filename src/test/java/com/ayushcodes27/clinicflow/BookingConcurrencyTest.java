package com.ayushcodes27.clinicflow;

import com.ayushcodes27.clinicflow.dto.BookAppointmentRequest;
import com.ayushcodes27.clinicflow.entity.AppointmentSlot;
import com.ayushcodes27.clinicflow.entity.Clinic;
import com.ayushcodes27.clinicflow.entity.Doctor;
import com.ayushcodes27.clinicflow.entity.User;
import com.ayushcodes27.clinicflow.repository.AppointmentSlotRepository;
import com.ayushcodes27.clinicflow.repository.ClinicRepository;
import com.ayushcodes27.clinicflow.repository.DoctorRepository;
import com.ayushcodes27.clinicflow.repository.UserRepository;
import com.ayushcodes27.clinicflow.service.AppointmentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Testcontainers
public class BookingConcurrencyTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Container
    static org.testcontainers.containers.GenericContainer<?> redis = new org.testcontainers.containers.GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
        
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
    }

    @Autowired
    private AppointmentService appointmentService;
    @Autowired
    private AppointmentSlotRepository slotRepo;
    @Autowired
    private UserRepository userRepo;
    @Autowired
    private ClinicRepository clinicRepo;
    @Autowired
    private DoctorRepository doctorRepo;

    @Test
    public void testConcurrentBooking() throws InterruptedException {
        // Setup initial data
        User patient1 = userRepo.save(User.builder().fullName("P1").email("p1@test.com").password("p").userType("PATIENT").build());
        User patient2 = userRepo.save(User.builder().fullName("P2").email("p2@test.com").password("p").userType("PATIENT").build());
        User docUser = userRepo.save(User.builder().fullName("D1").email("d1@test.com").password("p").userType("DOCTOR").build());
        Clinic clinic = clinicRepo.save(Clinic.builder().name("Clinic").owner(docUser).build());
        Doctor doctor = doctorRepo.save(Doctor.builder().user(docUser).clinic(clinic).specialization("GP").build());
        AppointmentSlot slot = slotRepo.save(AppointmentSlot.builder().doctorId(doctor.getId()).clinicId(clinic.getId()).slotDate(LocalDate.now()).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(9, 15)).status("AVAILABLE").version(0L).build());

        int threadCount = 2;
        ExecutorService executorService = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        Runnable bookTask1 = () -> {
            try {
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(patient1, null, patient1.getAuthorities()));
                latch.await();
                BookAppointmentRequest req = new BookAppointmentRequest();
                req.setSlotId(slot.getId());
                appointmentService.bookAppointment(req);
                successCount.incrementAndGet();
            } catch (Exception e) {
                e.printStackTrace();
                failCount.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        };

        Runnable bookTask2 = () -> {
            try {
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(patient2, null, patient2.getAuthorities()));
                latch.await();
                BookAppointmentRequest req = new BookAppointmentRequest();
                req.setSlotId(slot.getId());
                appointmentService.bookAppointment(req);
                successCount.incrementAndGet();
            } catch (Exception e) {
                e.printStackTrace();
                failCount.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        };

        executorService.submit(bookTask1);
        executorService.submit(bookTask2);

        // Start threads simultaneously
        latch.countDown();
        doneLatch.await();

        assertEquals(1, successCount.get());
        assertEquals(1, failCount.get());
    }
}
