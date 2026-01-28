import express, { Request, Response } from "express";
import pool from "../db";
import { carePlanQueue } from "../queue";
import {
  detectOrderDuplicate,
  detectPatientDuplicate,
  detectProviderDuplicate,
} from "../services/duplicateDetection";
import {
  ApiCodes,
  AppError,
  ConfirmationRequiredError,
  DuplicateBlockedError,
  NotFoundError,
  ValidationError,
  sendSuccess,
} from "../exceptions";

const router = express.Router();

// GET search orders with filters
router.get("/search", async (req: Request, res: Response, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      throw new ValidationError(
        "Search query parameter 'q' is required",
        { field: "q" },
      );
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
        p.date_of_birth as patient_date_of_birth,
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

    return sendSuccess(res, 200, {
      code: ApiCodes.ORDERS_FETCHED,
      message: "Orders fetched",
      data: result.rows,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Error searching orders:", error);
    }
    return next(error);
  }
});

// GET all orders with patient, provider, and care plan info
router.get("/", async (req: Request, res: Response, next) => {
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
        p.date_of_birth as patient_date_of_birth,
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

    return sendSuccess(res, 200, {
      code: ApiCodes.ORDERS_FETCHED,
      message: "Orders fetched",
      data: result.rows,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Error fetching orders:", error);
    }
    return next(error);
  }
});

// GET single order by ID
router.get("/:id", async (req: Request, res: Response, next) => {
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
        p.date_of_birth as patient_date_of_birth,
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
      throw new NotFoundError("Order not found", { id });
    }

    return sendSuccess(res, 200, {
      code: ApiCodes.ORDER_FETCHED,
      message: "Order fetched",
      data: result.rows[0],
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Error fetching order:", error);
    }
    return next(error);
  }
});

// DELETE order by ID
router.delete("/:id", async (req: Request, res: Response, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Check if order exists
    const orderCheck = await client.query(
      "SELECT id FROM orders WHERE id = $1",
      [id],
    );

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Order not found", { id });
    }

    // Delete care plan first (due to foreign key constraint)
    await client.query("DELETE FROM care_plans WHERE order_id = $1", [id]);

    // Delete order
    await client.query("DELETE FROM orders WHERE id = $1", [id]);

    await client.query("COMMIT");

    return sendSuccess(res, 200, {
      code: ApiCodes.ORDER_DELETED,
      message: "Order deleted successfully",
      data: { id: parseInt(id, 10) },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (!(error instanceof AppError)) {
      console.error("Error deleting order:", error);
    }
    return next(error);
  } finally {
    client.release();
  }
});

// POST create new order
router.post("/", async (req: Request, res: Response, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      firstName,
      lastName,
      mrn,
      dateOfBirth,
      providerName,
      providerNpi,
      primaryDiagnosis,
      medicationName,
      additionalDiagnosis,
      medicationHistory,
      patientRecords,
      confirm,
    } = req.body;

    if (!dateOfBirth) {
      await client.query("ROLLBACK");
      throw new ValidationError("dateOfBirth is required", {
        field: "dateOfBirth",
      });
    }

    const warnings: string[] = [];

    // Provider duplicate detection
    const providerCheck = await detectProviderDuplicate({
      name: providerName,
      npi: providerNpi,
    });

    if (providerCheck.should_block) {
      await client.query("ROLLBACK");
      throw new DuplicateBlockedError(
        "Provider duplicate check blocked the request",
        { duplicate_check: providerCheck },
      );
    }

    // Patient duplicate detection
    const patientCheck = await detectPatientDuplicate({
      firstName,
      lastName,
      mrn,
      dateOfBirth,
    });

    if (patientCheck.warnings.length > 0) {
      warnings.push(...patientCheck.warnings);
    }

    // Resolve provider id (reuse when NPI+name match)
    let providerId: number;
    if (providerCheck.is_duplicate && providerCheck.existing_record) {
      providerId = providerCheck.existing_record.id;
    } else {
      const providerResult = await client.query(
        "INSERT INTO providers (name, npi) VALUES ($1, $2) RETURNING id",
        [providerName, providerNpi],
      );
      providerId = providerResult.rows[0].id;
    }

    // Resolve patient id
    let patientId: number;
    const existingPatient = patientCheck.existing_record;
    const mrnMatchesExisting = existingPatient?.mrn === mrn;

    if (existingPatient && mrnMatchesExisting) {
      patientId = existingPatient.id;
    } else {
      const patientResult = await client.query(
        "INSERT INTO patients (first_name, last_name, mrn, date_of_birth) VALUES ($1, $2, $3, $4::date) RETURNING id",
        [firstName, lastName, mrn, dateOfBirth],
      );
      patientId = patientResult.rows[0].id;
    }

    // Order duplicate detection
    const orderCheck = await detectOrderDuplicate({
      patientId,
      medicationName,
      createdAt: new Date(),
      confirm: Boolean(confirm),
    });

    if (orderCheck.should_block) {
      await client.query("ROLLBACK");
      throw new DuplicateBlockedError(
        "Order duplicate check blocked the request",
        { duplicate_check: orderCheck },
      );
    }

    if (orderCheck.warnings.length > 0 && !confirm) {
      await client.query("ROLLBACK");
      const confirmationWarnings = [...warnings, ...orderCheck.warnings];
      throw new ConfirmationRequiredError(
        "Order duplicate check requires confirmation. Retry with confirm=true to proceed.",
        { duplicate_check: orderCheck },
        confirmationWarnings,
      );
    }

    if (orderCheck.warnings.length > 0) {
      warnings.push(...orderCheck.warnings);
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

    // Get the care_plan_id that was just created
    const carePlanResult = await pool.query(
      "SELECT id FROM care_plans WHERE order_id = $1",
      [orderId],
    );
    const carePlanId = carePlanResult.rows[0].id;

    // 使用 BullMQ 将任务加入队列
    await carePlanQueue.add(
      "generate-care-plan",
      { carePlanId: carePlanId.toString() },
      {
        jobId: `careplan-${carePlanId}`, // 防止重复任务
      },
    );

    console.log(
      `Care plan ${carePlanId} queued for processing (order ${orderId})`,
    );

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
        p.date_of_birth as patient_date_of_birth,
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

    return sendSuccess(res, 201, {
      code: ApiCodes.ORDER_CREATED,
      message: "Order created",
      data: finalResult.rows[0],
      warnings,
      details: {
        duplicate_checks: {
          provider: providerCheck,
          patient: patientCheck,
          order: orderCheck,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (!(error instanceof AppError)) {
      console.error("Error creating order:", error);
    }
    return next(error);
  } finally {
    client.release();
  }
});

export default router;
