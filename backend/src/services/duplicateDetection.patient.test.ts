import pool from "../db";
import { detectPatientDuplicate } from "./duplicateDetection";

jest.mock("../db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockedPool = pool as unknown as { query: jest.Mock };

describe("detectPatientDuplicate", () => {
  beforeEach(() => {
    mockedPool.query.mockReset();
  });

  it("returns NO_MATCH when database is empty", async () => {
    mockedPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await detectPatientDuplicate({
      firstName: "Alice",
      lastName: "Doe",
      mrn: "MRN-1",
      dateOfBirth: "1990-01-01",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.existing_record).toBeNull();
  });

  it("returns EXACT_MATCH when MRN + name + DOB all match", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          first_name: "Alice",
          last_name: "Doe",
          mrn: "MRN-1",
          date_of_birth: "1990-01-01",
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = await detectPatientDuplicate({
      firstName: "Alice",
      lastName: "Doe",
      mrn: "MRN-1",
      dateOfBirth: "1990-01-01T12:34:56.000Z",
    });

    expect(result.is_duplicate).toBe(true);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.existing_record?.id).toBe(1);
  });

  it("returns WARNING when MRN matches but name differs", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 2,
          first_name: "Alice",
          last_name: "Doe",
          mrn: "MRN-2",
          date_of_birth: "1990-01-01",
          created_at: "2024-01-02T00:00:00.000Z",
        },
      ],
    });

    const result = await detectPatientDuplicate({
      firstName: "Bob",
      lastName: "Doe",
      mrn: "MRN-2",
      dateOfBirth: "1990-01-01",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.existing_record?.id).toBe(2);
  });

  it("returns WARNING when MRN matches but last name differs", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 5,
          first_name: "Alice",
          last_name: "Smith",
          mrn: "MRN-6",
          date_of_birth: "1990-01-01",
          created_at: "2024-01-05T00:00:00.000Z",
        },
      ],
    });

    const result = await detectPatientDuplicate({
      firstName: "Alice",
      lastName: "Doe",
      mrn: "MRN-6",
      dateOfBirth: "1990-01-01",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.existing_record?.id).toBe(5);
  });

  it("returns WARNING when MRN matches but DOB differs", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 6,
          first_name: "Alice",
          last_name: "Doe",
          mrn: "MRN-7",
          date_of_birth: "1991-02-02",
          created_at: "2024-01-06T00:00:00.000Z",
        },
      ],
    });

    const result = await detectPatientDuplicate({
      firstName: "Alice",
      lastName: "Doe",
      mrn: "MRN-7",
      dateOfBirth: "1990-01-01",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.existing_record?.id).toBe(6);
  });

  it("returns WARNING when name + DOB match but MRN differs", async () => {
    mockedPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            first_name: "Alice",
            last_name: "Doe",
            mrn: "MRN-3",
            date_of_birth: "1990-01-01",
            created_at: "2024-01-03T00:00:00.000Z",
          },
        ],
      });

    const result = await detectPatientDuplicate({
      firstName: "Alice",
      lastName: "Doe",
      mrn: "MRN-4",
      dateOfBirth: "1990-01-01",
    });

    expect(result.is_duplicate).toBe(false);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.existing_record?.id).toBe(3);
  });

  it("matches names case-insensitively for EXACT_MATCH", async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 4,
          first_name: "ALICE",
          last_name: "DOE",
          mrn: "MRN-5",
          date_of_birth: "1990-01-01",
          created_at: "2024-01-04T00:00:00.000Z",
        },
      ],
    });

    const result = await detectPatientDuplicate({
      firstName: "alice",
      lastName: "doe",
      mrn: "MRN-5",
      dateOfBirth: "1990-01-01",
    });

    expect(result.is_duplicate).toBe(true);
    expect(result.should_block).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.existing_record?.id).toBe(4);
  });
});
