# ClinicFlow

ClinicFlow is a high-performance healthcare management platform built for modern clinics to handle real-time patient queues, automated appointment scheduling, and staff roles with robust security, concurrency control, and distributed background scheduling.

---

## Architecture

![ClinicFlow Architecture](frontend/ss/clinic_flow_archi.png)

ClinicFlow is built as a containerized, decoupled architecture across five core layers:
- **Presentation Layer**: Modern **React + Vite** single-page application with dedicated portals for Patients, Doctors, Receptionists, and Admins, alongside Swagger UI and external REST/EMR integrations.
- **API Gateway & Controller**: **Spring Boot 3.3** gateway featuring stateless JWT authentication, fine-grained Role-Based Access Control (**ADMIN, DOCTOR, RECEPTIONIST, PATIENT**), CORS, and standardized error handling.
- **Orchestration & Concurrency Engine**: Automated daily slot generation, optimistic concurrency control to prevent double-booking, and a real-time queue state machine (`WAITING` -> `CALLED` -> `IN_CONSULTATION` -> `COMPLETED`) with dynamic position and ETA calculations.
- **Real-Time & Automation Services**: **WebSocket (STOMP)** message broker broadcasting instant queue movements, accompanied by **ShedLock**-coordinated distributed monitors (`NoShowMonitorJob`) sweeping missed appointments.
- **Persistence & Cache Layer**: **PostgreSQL 15** with Flyway versioned migrations for transactional consistency, paired with **Redis 7** for fast lock coordination and queue state caching.

---

## Features

- **Real-Time Patient Queue**: Powered by WebSocket (STOMP) for immediate UI push notifications when patients check in, cancel, or are called into consultation.
- **Concurrency & Double-Booking Protection**: Database-level optimistic locking guarantees no conflicting bookings, returning clean HTTP `409 Conflict` responses for graceful client retries.
- **Automated Daily Slot Generator**: Instant daily slot calculation and creation configured by doctor consultation duration, buffer time, and capacity.
- **Distributed Background Scheduling (ShedLock)**: Periodic worker sweeps detect inactive appointments, automatically marking "No-Shows" across horizontal clusters without duplicate executions.
- **Role-Based Security (RBAC)**: Strict method- and endpoint-level security scoped per clinic using JWT access tokens across 4 distinct roles.
- **Interactive API Documentation**: Fully mapped OpenAPI/Swagger UI (`/swagger-ui.html`) with schema validation and test fixtures.

---

## Screenshots

### Patient Portal
| Real-Time Queue Tracker | Interactive Slot Booking |
|:---:|:---:|
| ![Patient Queue Tracker](frontend/ss/patient1.png) | ![Interactive Slot Booking](frontend/ss/patient2.png) |

### Doctor Consultation Desk
| Patient Consultation Queue | Status & Consultation Management |
|:---:|:---:|
| ![Doctor Consultation Queue](frontend/ss/doctor1.png) | ![Doctor Call Management](frontend/ss/doctor2.png) |

### Clinic Operations & Administration
| Receptionist Desk & Walk-in Check-In | Staff & Clinic Administration |
|:---:|:---:|
| ![Receptionist Desk](frontend/ss/reception.png) | ![Admin Clinic Management](frontend/ss/admin1.png) |

| Missed Appointments (ShedLock Monitor) |
|:---:|
| ![Admin No-Shows Dashboard](frontend/ss/admin2.png) |

---

## Technology Stack

- **Backend**: Java 21, Spring Boot 3.3.4, Spring Data JPA, Spring Security, Spring WebSocket (STOMP)
- **Database & Migrations**: PostgreSQL 15, Flyway
- **Distributed Caching & Locks**: Redis 7, ShedLock (Spring integration)
- **Frontend**: React 18, Vite, Tailwind CSS, SockJS & StompJS, Axios
- **Containerization & CI/CD**: Docker, Docker Compose, Multi-stage Dockerfile

---

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- Python 3.8+ (optional, for running the mock database seed script)

### 1. Start the Complete Stack
Run the following command from the project root:
```bash
docker-compose up -d --build
```

This launches:
- **Frontend SPA**: `http://localhost:5173`
- **Backend API**: `http://localhost:8081`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### 2. Access the Application
- **Frontend Web UI**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Interactive Swagger Docs**: Open [http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html).

### 3. Seed Mock Data (Optional)
To populate the database with clinics, doctors, daily schedules, and sample queue entries:
```bash
pip install requests
python seed_db.py
```

---

*Built to streamline modern clinical workflows with real-time transparency and zero scheduling conflicts.*
