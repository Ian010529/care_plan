import { Button } from "../ui";
import { ApiResponse } from "../../types/order";

interface ConfirmDialogProps {
  isOpen: boolean;
  submitError: ApiResponse | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  submitError,
  isSubmitting,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-4">
          ⚠️ Confirmation Required
        </h3>
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            A similar order already exists. Do you want to continue?
          </p>
          {(submitError?.details?.duplicate_check?.warnings ||
            submitError?.warnings ||
            []).map((warning, idx) => (
            <p
              key={idx}
              className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded mb-2"
            >
              {warning}
            </p>
          ))}
        </div>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={onConfirm}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Confirm & Create
          </Button>
        </div>
      </div>
    </div>
  );
}
