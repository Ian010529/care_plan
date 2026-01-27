-- Database schema for Care Plan system

-- Providers table
CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    npi VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    mrn VARCHAR(6) NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    provider_id INTEGER NOT NULL REFERENCES providers(id),
    primary_diagnosis VARCHAR(10) NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    additional_diagnosis TEXT[],
    medication_history TEXT[],
    patient_records TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Care Plans table
CREATE TABLE care_plans (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
    content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_orders_patient_id ON orders(patient_id);
CREATE INDEX idx_orders_provider_id ON orders(provider_id);
CREATE INDEX idx_care_plans_order_id ON care_plans(order_id);
CREATE INDEX idx_care_plans_status ON care_plans(status);

-- Insert mock data

-- Mock Providers
INSERT INTO providers (name, npi) VALUES
('Dr. Sarah Johnson', '1234567890'),
('Dr. Michael Chen', '2345678901'),
('Dr. Emily Rodriguez', '3456789012');

-- Mock Patients
INSERT INTO patients (first_name, last_name, mrn, date_of_birth) VALUES
('John', 'Smith', '000001', '1979-06-08'),
('Mary', 'Williams', '000002', '1965-03-15'),
('Robert', 'Brown', '000003', '1988-11-22');

-- Mock Orders
INSERT INTO orders (patient_id, provider_id, primary_diagnosis, medication_name, additional_diagnosis, medication_history, patient_records) VALUES
(
    1,
    1,
    'G70.00',
    'IVIG',
    ARRAY['I10', 'K21.9'],
    ARRAY['Pyridostigmine 60 mg PO q6h PRN', 'Prednisone 10 mg PO daily', 'Lisinopril 10 mg PO daily'],
    'Name: John Smith
MRN: 000001
DOB: 1979-06-08 (Age 46)
Sex: Male
Weight: 72 kg
Allergies: None known to medications
Medication: IVIG

Primary diagnosis: Generalized myasthenia gravis (AChR antibody positive), MGFA class IIb
Secondary diagnoses: Hypertension (well controlled), GERD

Home meds:
- Pyridostigmine 60 mg PO q6h PRN
- Prednisone 10 mg PO daily
- Lisinopril 10 mg PO daily

Recent history:
Progressive proximal muscle weakness and ptosis over 2 weeks. Neurology recommends IVIG for rapid symptomatic control.'
),
(
    2,
    2,
    'E11.9',
    'Insulin Glargine',
    ARRAY['I25.10', 'E78.5'],
    ARRAY['Metformin 1000 mg PO BID', 'Atorvastatin 40 mg PO daily', 'Aspirin 81 mg PO daily'],
    'Name: Mary Williams
MRN: 000002
DOB: 1965-03-15 (Age 60)
Sex: Female
Weight: 85 kg
Allergies: Penicillin
Medication: Insulin Glargine

Primary diagnosis: Type 2 Diabetes Mellitus
Secondary diagnoses: Coronary artery disease, Hyperlipidemia

Home meds:
- Metformin 1000 mg PO BID
- Atorvastatin 40 mg PO daily
- Aspirin 81 mg PO daily

Recent history:
HbA1c elevated at 9.2%. Endocrinology recommends starting basal insulin.'
);

-- Create corresponding care plans with pending status
INSERT INTO care_plans (order_id, status) VALUES
(1, 'pending'),
(2, 'pending');
