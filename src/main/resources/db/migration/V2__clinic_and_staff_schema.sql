-- Clinics
CREATE TABLE clinics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    address     TEXT,
    phone       VARCHAR(15),
    owner_id    UUID NOT NULL REFERENCES users(id),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clinic staff membership with roles (RBAC pivot table)
CREATE TABLE clinic_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    role        VARCHAR(20) NOT NULL,  -- ADMIN | DOCTOR | RECEPTIONIST
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(clinic_id, user_id)
);
