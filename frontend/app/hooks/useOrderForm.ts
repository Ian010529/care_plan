import { useState, useCallback } from "react";
import {
  Order,
  OrderFormData,
  FormErrors,
  ApiErrorResponse,
  INITIAL_FORM_DATA,
} from "../types/order";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Validation functions
const validateField = (name: string, value: string): string | undefined => {
  switch (name) {
    case "firstName":
    case "lastName":
      if (!value.trim()) return "This field is required";
      if (value.length > 100) return "Maximum 100 characters";
      return undefined;
    case "mrn":
      if (!value.trim()) return "MRN is required";
      if (!/^\d{6}$/.test(value)) return "MRN must be exactly 6 digits";
      return undefined;
    case "providerNpi":
      if (!value.trim()) return "NPI is required";
      if (!/^\d{10}$/.test(value)) return "NPI must be exactly 10 digits";
      return undefined;
    case "dateOfBirth":
      if (!value) return "Date of birth is required";
      const dob = new Date(value);
      const today = new Date();
      if (dob > today) return "Date of birth cannot be in the future";
      return undefined;
    case "providerName":
      if (!value.trim()) return "Provider name is required";
      return undefined;
    case "primaryDiagnosis":
      if (!value.trim()) return "Primary diagnosis is required";
      return undefined;
    case "medicationName":
      if (!value.trim()) return "Medication name is required";
      return undefined;
    case "patientRecords":
      if (!value.trim()) return "Patient records are required";
      return undefined;
    default:
      return undefined;
  }
};

interface UseOrderFormOptions {
  onSuccess?: () => void;
}

export function useOrderForm({ onSuccess }: UseOrderFormOptions = {}) {
  const [formData, setFormData] = useState<OrderFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<ApiErrorResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<object | null>(null);

  const handleFieldChange = useCallback(
    (name: string, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      const error = validateField(name, value);
      setFormErrors((prev) => ({ ...prev, [name]: error }));
      if (submitError) setSubmitError(null);
    },
    [submitError],
  );

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};
    const fields = [
      "firstName",
      "lastName",
      "mrn",
      "dateOfBirth",
      "providerName",
      "providerNpi",
      "primaryDiagnosis",
      "medicationName",
      "patientRecords",
    ];

    fields.forEach((field) => {
      const error = validateField(field, formData[field as keyof OrderFormData]);
      if (error) errors[field as keyof FormErrors] = error;
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const submitOrder = useCallback(
    async (payload: object, confirm: boolean = false): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, confirm }),
        });

        if (response.ok) {
          setFormData(INITIAL_FORM_DATA);
          setFormErrors({});
          onSuccess?.();
          return true;
        }

        const errorData: ApiErrorResponse = await response.json();

        if (response.status === 409) {
          if (errorData.needs_confirmation) {
            setPendingPayload(payload);
            setShowConfirmDialog(true);
            setSubmitError(errorData);
          } else {
            setSubmitError(errorData);
          }
        } else {
          setSubmitError({ error: errorData.error || "Failed to create order" });
        }
        return false;
      } catch (error) {
        console.error("Error creating order:", error);
        setSubmitError({ error: "Network error. Please try again." });
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        mrn: formData.mrn,
        dateOfBirth: formData.dateOfBirth,
        providerName: formData.providerName,
        providerNpi: formData.providerNpi,
        primaryDiagnosis: formData.primaryDiagnosis,
        medicationName: formData.medicationName,
        additionalDiagnosis: formData.additionalDiagnosis
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d),
        medicationHistory: formData.medicationHistory
          .split("\n")
          .map((m) => m.trim())
          .filter((m) => m),
        patientRecords: formData.patientRecords,
      };

      await submitOrder(payload);
    },
    [formData, validateForm, submitOrder],
  );

  const handleConfirmSubmit = useCallback(async () => {
    if (pendingPayload) {
      await submitOrder(pendingPayload, true);
      setShowConfirmDialog(false);
      setPendingPayload(null);
    }
  }, [pendingPayload, submitOrder]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingPayload(null);
    setSubmitError(null);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setSubmitError(null);
  }, []);

  return {
    formData,
    setFormData,
    formErrors,
    submitError,
    isSubmitting,
    showConfirmDialog,
    handleFieldChange,
    handleSubmit,
    handleConfirmSubmit,
    handleCancelConfirm,
    resetForm,
  };
}
