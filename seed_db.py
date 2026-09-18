import requests
import time
import uuid
import datetime
import subprocess

BASE_URL = "http://localhost:8081/api"

print("Seeding database...")

# 1. Register and Login Admin
admin_token = None
clinic_id = None
try:
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": "admin@clinicflow.com",
        "password": "password",
        "fullName": "Admin User",
        "userType": "ADMIN"
    })
    print("Admin registered:", res.status_code)
    
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@clinicflow.com",
        "password": "password"
    })
    if login_res.status_code == 200:
        admin_token = login_res.json().get('accessToken')
        print("Logged in as Admin.")
except Exception as e:
    print("Failed admin flow:", e)

if not admin_token:
    print("Exiting, no admin token.")
    exit(1)

headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

# 2. Create Clinic
try:
    res = requests.post(f"{BASE_URL}/clinics", json={
        "name": "Main City Clinic",
        "address": "123 Health Ave"
    }, headers=headers)
    print("Clinic created:", res.status_code)
    if res.status_code == 200:
        clinic_id = res.json().get('id')
except Exception as e:
    print("Failed to create clinic:", e)

# 3. Register Doctor User
doctor_user_id = None
try:
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": "doctor@clinicflow.com",
        "password": "password",
        "fullName": "John Smith",
        "userType": "DOCTOR"
    })
    print("Doctor user registered:", res.status_code)
    if res.status_code == 200:
        doctor_user_id = res.json().get('id')
except Exception as e:
    print("Failed to register doctor:", e)

# 4. Create Doctor Profile
if clinic_id and doctor_user_id:
    try:
        res = requests.post(f"{BASE_URL}/clinics/{clinic_id}/doctors", json={
            "userId": doctor_user_id,
            "specialization": "Cardiology",
            "consultationMinutes": 15,
            "maxDailyPatients": 20
        }, headers=headers)
        print("Doctor profile created:", res.status_code)
    except Exception as e:
        print("Failed to create doctor profile:", e)

# Let's get the doctor profile ID (which is different from user ID)
doctor_id = None
try:
    res = requests.get(f"{BASE_URL}/doctors", headers=headers)
    if res.status_code == 200 and len(res.json()) > 0:
        doctor_id = res.json()[0]['id']
        print(f"Found Doctor Profile ID: {doctor_id}")
except Exception as e:
    print("Failed to fetch doctors:", e)

# 5. Add Schedule & Generate Slots
if doctor_id:
    try:
        # Schedule for today
        today_date = datetime.datetime.now()
        day_of_week = today_date.isoweekday()
        
        req = requests.post(f"{BASE_URL}/doctors/{doctor_id}/schedule", json={
            "dayOfWeek": day_of_week,
            "startTime": "09:00",
            "endTime": "17:00"
        }, headers=headers)
        print("Schedule created:", req.status_code)
        
        start_date = today_date.strftime("%Y-%m-%d")
        end_date = (today_date + datetime.timedelta(days=7)).strftime("%Y-%m-%d")
        
        req2 = requests.post(f"{BASE_URL}/doctors/{doctor_id}/generate-slots", json={
            "startDate": start_date,
            "endDate": end_date
        }, headers=headers)
        print("Slots generated:", req2.status_code)
    except Exception as e:
        print("Failed to setup schedule/slots:", e)

# 6. Create Patients
patient_ids = []
patients = [
    {"email": "patient1@clinicflow.com", "name": "Jane Doe"},
    {"email": "patient2@clinicflow.com", "name": "Bob Smith"},
    {"email": "patient3@clinicflow.com", "name": "Alice Johnson"},
]

for p in patients:
    try:
        res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": p["email"],
            "password": "password",
            "fullName": p["name"],
            "userType": "PATIENT"
        })
        print(f"Patient {p['name']} registered:", res.status_code)
        if res.status_code == 200:
            patient_ids.append(res.json().get('id'))
    except Exception as e:
        print("Failed to create patient:", e)

# 7. Book and Check-in
if doctor_id and len(patient_ids) >= 3:
    try:
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        slots_res = requests.get(f"{BASE_URL}/slots?doctorId={doctor_id}&date={today_str}", headers=headers)
        print("Slots response:", slots_res.status_code, slots_res.text)
        slots = slots_res.json()
        available_slots = [s for s in slots if s.get('status') == 'AVAILABLE']
        
        if len(available_slots) >= 3:
            booked_apt_ids = []
            for i in range(3):
                p_login = requests.post(f"{BASE_URL}/auth/login", json={
                    "email": patients[i]["email"], "password": "password"
                })
                p_token = p_login.json().get('accessToken')
                p_headers = {"Authorization": f"Bearer {p_token}", "Content-Type": "application/json"}
                
                book_res = requests.post(f"{BASE_URL}/appointments/book", json={
                    "slotId": available_slots[i]['id'],
                    "reason": f"Checkup {i+1}"
                }, headers=p_headers)
                print(f"Booked slot {i+1}:", book_res.status_code)

            # We need to fetch the appointments to get their IDs
            apts_res = requests.get(f"{BASE_URL}/appointments", headers=headers)
            if apts_res.status_code == 200:
                all_apts = apts_res.json()
                booked_apt_ids = [a['id'] for a in all_apts if a['status'] == 'BOOKED']
            
            # Receptionist logs in to check in
            rec_res = requests.post(f"{BASE_URL}/auth/register", json={
                "email": "reception@clinicflow.com",
                "password": "password",
                "fullName": "Rec User",
                "userType": "RECEPTIONIST"
            })
            
            # Associate receptionist with clinic so they can check in patients
            rec_id = None
            if rec_res.status_code == 200:
                rec_id = rec_res.json().get('id')
            if rec_id and clinic_id:
                requests.post(f"{BASE_URL}/clinics/{clinic_id}/staff", json={
                    "userId": rec_id,
                    "role": "RECEPTIONIST"
                }, headers=headers)
                
            rec_login = requests.post(f"{BASE_URL}/auth/login", json={
                "email": "reception@clinicflow.com", "password": "password"
            })
            rec_token = rec_login.json().get('accessToken')
            rec_headers = {"Authorization": f"Bearer {rec_token}", "Content-Type": "application/json"}
            
            if len(booked_apt_ids) >= 2:
                for apt_id in booked_apt_ids[:2]:
                    ci_res = requests.post(f"{BASE_URL}/appointments/{apt_id}/check-in", headers=rec_headers)
                    print(f"Checked in appointment {apt_id}:", ci_res.status_code)
                
                # Doctor logs in to call next
                doc_login = requests.post(f"{BASE_URL}/auth/login", json={
                    "email": "doctor@clinicflow.com", "password": "password"
                })
                doc_token = doc_login.json().get('accessToken')
                doc_headers = {"Authorization": f"Bearer {doc_token}", "Content-Type": "application/json"}
                
                next_res = requests.post(f"{BASE_URL}/queue/doctors/{doctor_id}/next", headers=doc_headers)
                print("Called next patient:", next_res.status_code)
                
            # Inject No-Show via psql for demo purposes
            try:
                yesterday_str = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
                apt_id = str(uuid.uuid4())
                slot_id = str(uuid.uuid4())
                
                sql = f"""
                INSERT INTO appointment_slots (id, doctor_id, clinic_id, slot_date, start_time, end_time, status, created_at) 
                VALUES ('{slot_id}', '{doctor_id}', '{clinic_id}', '{yesterday_str}', '10:00', '10:30', 'BOOKED', NOW());
                
                INSERT INTO appointments (id, patient_id, slot_id, status, notes, created_at, updated_at)
                VALUES ('{apt_id}', '{patient_ids[2]}', '{slot_id}', 'NO_SHOW', 'Patient did not show up', NOW(), NOW());
                """
                subprocess.run([
                    "docker", "exec", "-i", "clinicflow-postgres", "psql", "-U", "clinic_user", "-d", "clinicflow", "-c", sql
                ], check=True, stdout=subprocess.DEVNULL)
                print("Mock NO_SHOW appointment injected for demo.")
                print("Mock NO_SHOW appointment injected for demo.")
            except Exception as e:
                print("Failed to inject NO_SHOW mock:", e)

    except Exception as e:
        print("Failed to book and check-in:", e)

print("\n--- SEEDING COMPLETE ---")
if patient_ids:
    print(f"TEST PATIENT UUIDs: {patient_ids}")
else:
    print("Check the database directly for Patient UUIDs if needed.")
