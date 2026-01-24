import express, { Request, Response } from "express";
import pool from "../db";
import { generateCarePlan } from "../services/llm";

const router = express.Router();

// GET search orders with filters
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res
        .status(400)
        .json({ error: "Search query parameter 'q' is required" });
    }

    const searchTerm = `%${q}%`;

    const result = await pool.query(
      `
      SELECT 
        o.id,
        o.primary_diagnosis,
        o.medication_name,
        o.additional_diagnosis,
        o.medication_history,
        o.patient_records,
        o.created_at as order_created_at,
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.mrn,
        pr.id as provider_id,
        pr.name as provider_name,
        pr.npi as provider_npi,
        cp.id as care_plan_id,
        cp.content as care_plan_content,
        cp.status as care_plan_status,
        cp.error_message,
        cp.created_at as care_plan_created_at,
        cp.updated_at as care_plan_updated_at
      FROM orders o
      JOIN patients p ON o.patient_id = p.id
      JOIN providers pr ON o.provider_id = pr.id
      LEFT JOIN care_plans cp ON o.id = cp.order_id
      WHERE 
        LOWER(p.first_name) LIKE LOWER($1) OR
        LOWER(p.last_name) LIKE LOWER($1) OR
        LOWER(p.mrn) LIKE LOWER($1) OR
        LOWER(pr.name) LIKE LOWER($1) OR
        LOWER(pr.npi) LIKE LOWER($1) OR
        LOWER(o.medication_name) LIKE LOWER($1) OR
        LOWER(o.primary_diagnosis) LIKE LOWER($1)
      ORDER BY o.created_at DESC
    `,
      [searchTerm],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error searching orders:", error);
    res.status(500).json({ error: "Failed to search orders" });
  }
});

// GET all orders with patient, provider, and care plan info
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.primary_diagnosis,
        o.medication_name,
        o.additional_diagnosis,
        o.medication_history,
        o.patient_records,
        o.created_at as order_created_at,
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.mrn,
        pr.id as provider_id,
        pr.name as provider_name,
        pr.npi as provider_npi,
        cp.id as care_plan_id,
        cp.content as care_plan_content,
        cp.status as care_plan_status,
        cp.error_message,
        cp.created_at as care_plan_created_at,
        cp.updated_at as care_plan_updated_at
      FROM orders o
      JOIN patients p ON o.patient_id = p.id
      JOIN providers pr ON o.provider_id = pr.id
      LEFT JOIN care_plans cp ON o.id = cp.order_id
      ORDER BY o.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET single order by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT 
        o.id,
        o.primary_diagnosis,
        o.medication_name,
        o.additional_diagnosis,
        o.medication_history,
        o.patient_records,
        o.created_at as order_created_at,
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.mrn,
        pr.id as provider_id,
        pr.name as provider_name,
        pr.npi as provider_npi,
        cp.id as care_plan_id,
        cp.content as care_plan_content,
        cp.status as care_plan_status,
        cp.error_message,
        cp.created_at as care_plan_created_at,
        cp.updated_at as care_plan_updated_at
      FROM orders o
      JOIN patients p ON o.patient_id = p.id
      JOIN providers pr ON o.provider_id = pr.id
      LEFT JOIN care_plans cp ON o.id = cp.order_id
      WHERE o.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST create new order
router.post("/", async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      firstName,
      lastName,
      mrn,
      providerName,
      providerNpi,
      primaryDiagnosis,
      medicationName,
      additionalDiagnosis,
      medicationHistory,
      patientRecords,
    } = req.body;

    // Get or create patient
    let patientResult = await client.query(
      "SELECT id FROM patients WHERE mrn = $1",
      [mrn],
    );

    let patientId;
    if (patientResult.rows.length === 0) {
      patientResult = await client.query(
        "INSERT INTO patients (first_name, last_name, mrn) VALUES ($1, $2, $3) RETURNING id",
        [firstName, lastName, mrn],
      );
      patientId = patientResult.rows[0].id;
    } else {
      patientId = patientResult.rows[0].id;
    }

    // Get or create provider
    let providerResult = await client.query(
      "SELECT id FROM providers WHERE npi = $1",
      [providerNpi],
    );

    let providerId;
    if (providerResult.rows.length === 0) {
      providerResult = await client.query(
        "INSERT INTO providers (name, npi) VALUES ($1, $2) RETURNING id",
        [providerName, providerNpi],
      );
      providerId = providerResult.rows[0].id;
    } else {
      providerId = providerResult.rows[0].id;
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders 
        (patient_id, provider_id, primary_diagnosis, medication_name, additional_diagnosis, medication_history, patient_records)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        patientId,
        providerId,
        primaryDiagnosis,
        medicationName,
        additionalDiagnosis || [],
        medicationHistory || [],
        patientRecords,
      ],
    );

    const orderId = orderResult.rows[0].id;

    // Create care plan with pending status
    await client.query(
      "INSERT INTO care_plans (order_id, status) VALUES ($1, $2)",
      [orderId, "pending"],
    );

    await client.query("COMMIT");

    // Start generating care plan asynchronously
    generateCarePlanAsync(orderId, patientRecords, medicationName);

    // Return the created order
    const finalResult = await pool.query(
      `
      SELECT 
        o.id,
        o.primary_diagnosis,
        o.medication_name,
        o.additional_diagnosis,
        o.medication_history,
        o.patient_records,
        o.created_at as order_created_at,
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.mrn,
        pr.id as provider_id,
        pr.name as provider_name,
        pr.npi as provider_npi,
        cp.id as care_plan_id,
        cp.content as care_plan_content,
        cp.status as care_plan_status,
        cp.error_message,
        cp.created_at as care_plan_created_at,
        cp.updated_at as care_plan_updated_at
      FROM orders o
      JOIN patients p ON o.patient_id = p.id
      JOIN providers pr ON o.provider_id = pr.id
      LEFT JOIN care_plans cp ON o.id = cp.order_id
      WHERE o.id = $1
    `,
      [orderId],
    );

    res.status(201).json(finalResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  } finally {
    client.release();
  }
});

// Async function to generate care plan
async function generateCarePlanAsync(
  orderId: number,
  patientRecords: string,
  medicationName: string,
) {
  try {
    // Update status to processing
    await pool.query(
      "UPDATE care_plans SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2",
      ["processing", orderId],
    );

    // Generate care plan using LLM
    const carePlanContent = await generateCarePlan(
      patientRecords,
      medicationName,
    );

    // Update with completed status
    await pool.query(
      "UPDATE care_plans SET content = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE order_id = $3",
      [carePlanContent, "completed", orderId],
    );

    console.log(`Care plan generated successfully for order ${orderId}`);
  } catch (error) {
    console.error(`Error generating care plan for order ${orderId}:`, error);

    // Update with failed status
    await pool.query(
      "UPDATE care_plans SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE order_id = $3",
      [
        "failed",
        error instanceof Error ? error.message : "Unknown error",
        orderId,
      ],
    );
  }
}

export default router;
