import pool from "../db";

export class DuplicateCheckResult<TExisting = unknown> {
  constructor(
    public readonly is_duplicate: boolean,
    public readonly should_block: boolean,
    public readonly warnings: string[] = [],
    public readonly existing_record: TExisting | null = null,
  ) {}
}

type ProviderRow = {
  id: number;
  name: string;
  npi: string;
  created_at: string;
};

type PatientRow = {
  id: number;
  first_name: string;
  last_name: string;
  mrn: string;
  date_of_birth: string;
  created_at: string;
};

type OrderRow = {
  id: number;
  patient_id: number;
  medication_name: string;
  created_at: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_mrn: string;
  patient_date_of_birth: string;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeMedication(value: string): string {
  return value.trim().toLowerCase();
}

function toDateOnly(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function formatProvider(row: ProviderRow): string {
  return `Provider(id=${row.id}, name="${row.name}", npi=${row.npi})`;
}

function formatPatient(row: PatientRow): string {
  return `Patient(id=${row.id}, name="${row.first_name} ${row.last_name}", mrn=${row.mrn}, dob=${row.date_of_birth})`;
}

function formatOrder(row: OrderRow): string {
  return `Order(id=${row.id}, patient="${row.patient_first_name} ${row.patient_last_name}"/${row.patient_mrn}, medication="${row.medication_name}", created_at=${row.created_at})`;
}

export async function detectProviderDuplicate(params: {
  name: string;
  npi: string;
}): Promise<DuplicateCheckResult<ProviderRow | null>> {
  const { name, npi } = params;

  const existing = await pool.query<ProviderRow>(
    `
      SELECT id, name, npi, created_at
      FROM providers
      WHERE npi = $1
      LIMIT 1
    `,
    [npi],
  );

  if (existing.rows.length === 0) {
    return new DuplicateCheckResult(false, false, [], null);
  }

  const row = existing.rows[0];
  const sameName = normalizeName(row.name) === normalizeName(name);

  if (sameName) {
    return new DuplicateCheckResult(true, false, [], row);
  }

  const warnings = [
    `Provider NPI conflict: input(name="${name}", npi=${npi}) does not match existing ${formatProvider(row)}. NPI must be globally unique, blocking create.`,
  ];

  return new DuplicateCheckResult(false, true, warnings, row);
}

export async function detectPatientDuplicate(params: {
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
}): Promise<DuplicateCheckResult<PatientRow | null>> {
  const { firstName, lastName, mrn, dateOfBirth } = params;

  const warnings: string[] = [];

  const byMrn = await pool.query<PatientRow>(
    `
      SELECT id, first_name, last_name, mrn, date_of_birth, created_at
      FROM patients
      WHERE mrn = $1
      LIMIT 1
    `,
    [mrn],
  );

  if (byMrn.rows.length > 0) {
    const row = byMrn.rows[0];
    const sameFirst =
      normalizeName(row.first_name) === normalizeName(firstName);
    const sameLast = normalizeName(row.last_name) === normalizeName(lastName);
    const sameDob = toDateOnly(row.date_of_birth) === toDateOnly(dateOfBirth);

    if (sameFirst && sameLast && sameDob) {
      return new DuplicateCheckResult(true, false, [], row);
    }

    warnings.push(
      `Patient MRN conflict: input(name="${firstName} ${lastName}", mrn=${mrn}, dob=${toDateOnly(dateOfBirth)}) differs from existing ${formatPatient(row)}.`,
    );

    return new DuplicateCheckResult(false, false, warnings, row);
  }

  const sameNameDob = await pool.query<PatientRow>(
    `
      SELECT id, first_name, last_name, mrn, date_of_birth, created_at
      FROM patients
      WHERE LOWER(first_name) = LOWER($1)
        AND LOWER(last_name) = LOWER($2)
        AND date_of_birth = $3::date
        AND mrn <> $4
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [firstName, lastName, toDateOnly(dateOfBirth), mrn],
  );

  if (sameNameDob.rows.length > 0) {
    const row = sameNameDob.rows[0];
    warnings.push(
      `Patient identity overlap: input(name="${firstName} ${lastName}", mrn=${mrn}, dob=${toDateOnly(dateOfBirth)}) matches existing name+DOB ${formatPatient(row)} but MRN differs.`,
    );

    return new DuplicateCheckResult(false, false, warnings, row);
  }

  return new DuplicateCheckResult(false, false, [], null);
}

export async function detectOrderDuplicate(params: {
  patientId: number;
  medicationName: string;
  createdAt?: string | Date;
  confirm?: boolean;
}): Promise<DuplicateCheckResult<OrderRow | null>> {
  const {
    patientId,
    medicationName,
    createdAt = new Date(),
    confirm = false,
  } = params;

  const dateOnly = toDateOnly(createdAt);

  const sameDay = await pool.query<OrderRow>(
    `
      SELECT
        o.id,
        o.patient_id,
        o.medication_name,
        o.created_at,
        p.first_name AS patient_first_name,
        p.last_name AS patient_last_name,
        p.mrn AS patient_mrn,
        p.date_of_birth AS patient_date_of_birth
      FROM orders o
      JOIN patients p ON p.id = o.patient_id
      WHERE o.patient_id = $1
        AND LOWER(o.medication_name) = LOWER($2)
        AND DATE(o.created_at) = $3::date
      ORDER BY o.created_at DESC
      LIMIT 1
    `,
    [patientId, medicationName, dateOnly],
  );

  if (sameDay.rows.length > 0) {
    const row = sameDay.rows[0];
    const warnings = [
      `Order duplicate blocked: same patient_id=${patientId}, medication="${medicationName}", date=${dateOnly} already exists as ${formatOrder(row)}.`,
    ];

    return new DuplicateCheckResult(true, true, warnings, row);
  }

  const otherDay = await pool.query<OrderRow>(
    `
      SELECT
        o.id,
        o.patient_id,
        o.medication_name,
        o.created_at,
        p.first_name AS patient_first_name,
        p.last_name AS patient_last_name,
        p.mrn AS patient_mrn,
        p.date_of_birth AS patient_date_of_birth
      FROM orders o
      JOIN patients p ON p.id = o.patient_id
      WHERE o.patient_id = $1
        AND LOWER(o.medication_name) = LOWER($2)
        AND DATE(o.created_at) <> $3::date
      ORDER BY o.created_at DESC
      LIMIT 1
    `,
    [patientId, medicationName, dateOnly],
  );

  if (otherDay.rows.length > 0) {
    const row = otherDay.rows[0];

    if (confirm) {
      return new DuplicateCheckResult(false, false, [], row);
    }

    const warnings = [
      `Order similar warning: patient_id=${patientId} already has medication="${medicationName}" on a different day. Existing ${formatOrder(row)}. Pass confirm=true to proceed.`,
    ];

    return new DuplicateCheckResult(false, false, warnings, row);
  }

  return new DuplicateCheckResult(false, false, [], null);
}
