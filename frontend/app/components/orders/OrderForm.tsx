import { FormInput, FormTextarea, Button } from "../ui";
import { OrderFormData, FormErrors, ApiErrorResponse } from "../../types/order";
import { ConfirmDialog } from "./ConfirmDialog";

interface OrderFormProps {
  formData: OrderFormData;
  formErrors: FormErrors;
  submitError: ApiErrorResponse | null;
  isSubmitting: boolean;
  showConfirmDialog: boolean;
  onFieldChange: (name: string, value: string) => void;
  onFormDataChange: (data: Partial<OrderFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onConfirmSubmit: () => void;
  onCancelConfirm: () => void;
}

export function OrderForm({
  formData,
  formErrors,
  submitError,
  isSubmitting,
  showConfirmDialog,
  onFieldChange,
  onFormDataChange,
  onSubmit,
  onConfirmSubmit,
  onCancelConfirm,
}: OrderFormProps) {
  return (
    <>
      <ConfirmDialog
        isOpen={showConfirmDialog}
        submitError={submitError}
        isSubmitting={isSubmitting}
        onConfirm={onConfirmSubmit}
        onCancel={onCancelConfirm}
      />

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Order</h2>

        {/* Submit Error Display */}
        {submitError && !showConfirmDialog && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-red-800 font-medium mb-2">
              ❌ {submitError.error}
            </h4>
            {submitError.duplicate_check?.warnings?.map((warning, idx) => (
              <p key={idx} className="text-sm text-red-700 mb-1">
                {warning}
              </p>
            ))}
            {submitError.warnings?.map((warning, idx) => (
              <p key={idx} className="text-sm text-yellow-700 mb-1">
                {warning}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => onFieldChange("firstName", e.target.value)}
              error={formErrors.firstName}
              maxLength={100}
            />

            <FormInput
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => onFieldChange("lastName", e.target.value)}
              error={formErrors.lastName}
              maxLength={100}
            />

            <FormInput
              label="Patient MRN"
              hint="6 digits"
              required
              value={formData.mrn}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                onFieldChange("mrn", value);
              }}
              error={formErrors.mrn}
              placeholder="000001"
              inputMode="numeric"
            />

            <FormInput
              label="Date of Birth"
              required
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => onFieldChange("dateOfBirth", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              error={formErrors.dateOfBirth}
            />

            <FormInput
              label="Primary Diagnosis"
              hint="ICD-10"
              required
              value={formData.primaryDiagnosis}
              onChange={(e) =>
                onFieldChange("primaryDiagnosis", e.target.value.toUpperCase())
              }
              error={formErrors.primaryDiagnosis}
              placeholder="G70.00"
            />

            <FormInput
              label="Provider Name"
              required
              value={formData.providerName}
              onChange={(e) => onFieldChange("providerName", e.target.value)}
              error={formErrors.providerName}
              placeholder="Dr. John Smith"
            />

            <FormInput
              label="Provider NPI"
              hint="10 digits"
              required
              value={formData.providerNpi}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                onFieldChange("providerNpi", value);
              }}
              error={formErrors.providerNpi}
              placeholder="1234567890"
              inputMode="numeric"
            />

            <FormInput
              label="Medication Name"
              required
              value={formData.medicationName}
              onChange={(e) => onFieldChange("medicationName", e.target.value)}
              error={formErrors.medicationName}
              placeholder="IVIG"
            />

            <FormInput
              label="Additional Diagnosis"
              hint="comma-separated"
              value={formData.additionalDiagnosis}
              onChange={(e) =>
                onFormDataChange({
                  additionalDiagnosis: e.target.value.toUpperCase(),
                })
              }
              placeholder="I10, K21.9"
            />
          </div>

          <FormTextarea
            label="Medication History"
            hint="one per line"
            value={formData.medicationHistory}
            onChange={(e) =>
              onFormDataChange({ medicationHistory: e.target.value })
            }
            rows={3}
            placeholder="Pyridostigmine 60 mg PO q6h PRN&#10;Prednisone 10 mg PO daily"
          />

          <FormTextarea
            label="Patient Records"
            required
            value={formData.patientRecords}
            onChange={(e) => onFieldChange("patientRecords", e.target.value)}
            error={formErrors.patientRecords}
            rows={8}
            placeholder="Enter patient medical history and clinical information..."
          />

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="w-full py-3"
          >
            Create Order & Generate Care Plan
          </Button>
        </form>
      </div>
    </>
  );
}
