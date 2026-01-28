import pool from "../db";
import {
  DuplicateCheckResult,
  detectOrderDuplicate,
  detectProviderDuplicate,
} from "./duplicateDetection";

jest.mock("../db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockedPool = pool as unknown as { query: jest.Mock };

describe("detectProviderDuplicate", () => {
  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  it("uses default warnings and existing_record when omitted", () => {
    const result = new DuplicateCheckResult(true, false);

    expect(result.is_duplicate).toBe(true);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.existing_record).toBeNull();
  });

  it("returns NO_MATCH when no provider with NPI exists", async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await detectProviderDuplicate({
      name: "Dr. Alice",
      npi: "123",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.existing_record).toBeNull();
  });

  it("returns EXACT_MATCH when NPI and name match (case-insensitive)", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        { id: 10, name: "DR. ALICE", npi: "123", created_at: "2024-01-01" },
      ],
    });

    const result = await detectProviderDuplicate({
      name: "dr. alice",
      npi: "123",
    });

    expect(result.is_duplicate).toBe(true);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.existing_record?.id).toBe(10);
  });

  it("returns WARNING when NPI matches but name differs", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        { id: 11, name: "Dr. Bob", npi: "999", created_at: "2024-01-02" },
      ],
    });

    const result = await detectProviderDuplicate({
      name: "Dr. Alice",
      npi: "999",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.existing_record?.id).toBe(11);
  });
});

describe("detectOrderDuplicate", () => {
  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  it("uses default createdAt when not provided", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2024-01-06T00:00:00.000Z"));
    mockedPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await detectOrderDuplicate({
      patientId: 1,
      medicationName: "Amoxicillin",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(mockedPool.query).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      [1, "amoxicillin", "2024-01-06"],
    );

    jest.useRealTimers();
  });

  it("returns NO_MATCH when no duplicate orders exist", async () => {
    mockedPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await detectOrderDuplicate({
      patientId: 1,
      medicationName: "  Amoxicillin  ",
      createdAt: "2024-01-03T10:20:30.000Z",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.existing_record).toBeNull();
    expect(mockedPool.query).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      [1, "amoxicillin", "2024-01-03"],
    );
  });

  it("returns BLOCK when same-day duplicate exists", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 20,
          patient_id: 1,
          medication_name: "Amoxicillin",
          created_at: "2024-01-03T09:00:00.000Z",
          patient_first_name: "Alice",
          patient_last_name: "Doe",
          patient_mrn: "MRN-1",
          patient_date_of_birth: "1990-01-01",
        },
      ],
    });

    const result = await detectOrderDuplicate({
      patientId: 1,
      medicationName: "Amoxicillin",
      createdAt: "2024-01-03T10:20:30.000Z",
    });

    expect(result.is_duplicate).toBe(true);
    expect(result.should_block).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.existing_record?.id).toBe(20);
  });

  it("returns WARNING for other-day duplicate when confirm is false", async () => {
    mockedPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 21,
            patient_id: 1,
            medication_name: "Amoxicillin",
            created_at: "2024-01-02T09:00:00.000Z",
            patient_first_name: "Alice",
            patient_last_name: "Doe",
            patient_mrn: "MRN-1",
            patient_date_of_birth: "1990-01-01",
          },
        ],
      });

    const result = await detectOrderDuplicate({
      patientId: 1,
      medicationName: "Amoxicillin",
      createdAt: "2024-01-03T10:20:30.000Z",
      confirm: false,
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.existing_record?.id).toBe(21);
  });

  it("returns OK for other-day duplicate when confirm is true", async () => {
    mockedPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 22,
            patient_id: 1,
            medication_name: "Amoxicillin",
            created_at: "2024-01-02T09:00:00.000Z",
            patient_first_name: "Alice",
            patient_last_name: "Doe",
            patient_mrn: "MRN-1",
            patient_date_of_birth: "1990-01-01",
          },
        ],
      });

    const result = await detectOrderDuplicate({
      patientId: 1,
      medicationName: "Amoxicillin",
      createdAt: "2024-01-03T10:20:30.000Z",
      confirm: true,
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.existing_record?.id).toBe(22);
  });
});
