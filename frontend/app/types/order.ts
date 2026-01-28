export interface Order {
  id: number;
  first_name: string;
  last_name: string;
  mrn: string;
  patient_date_of_birth?: string;
  provider_name: string;
  provider_npi: string;
  primary_diagnosis: string;
  medication_name: string;
  additional_diagnosis: string[];
  medication_history: string[];
  patient_records: string;
  care_plan_status: "pending" | "processing" | "completed" | "failed";
  care_plan_content: string | null;
  error_message: string | null;
}

export interface OrderFormData {
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  providerName: string;
  providerNpi: string;
  primaryDiagnosis: string;
  medicationName: string;
  additionalDiagnosis: string;
  medicationHistory: string;
  patientRecords: string;
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  mrn?: string;
  dateOfBirth?: string;
  providerName?: string;
  providerNpi?: string;
  primaryDiagnosis?: string;
  medicationName?: string;
  patientRecords?: string;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  should_block: boolean;
  warnings: string[];
  existing_record: unknown;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  code: string;
  message: string;
  data?: T;
  warnings?: string[];
  details?: Record<string, any>;
  needs_confirmation?: boolean;
}

export const INITIAL_FORM_DATA: OrderFormData = {
  firstName: "",
  lastName: "",
  mrn: "",
  dateOfBirth: "",
  providerName: "",
  providerNpi: "",
  primaryDiagnosis: "",
  medicationName: "",
  additionalDiagnosis: "",
  medicationHistory: "",
  patientRecords: "",
};
