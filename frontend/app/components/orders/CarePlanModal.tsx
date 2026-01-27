import { Modal, Button, StatusBadge, LoadingSpinner } from "../ui";
import { Order } from "../../types/order";

interface CarePlanModalProps {
  order: Order | null;
  onClose: () => void;
  onDownload: (order: Order) => void;
}

const formatDob = (value?: string) => {
  if (!value) return "";
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

export function CarePlanModal({
  order,
  onClose,
  onDownload,
}: CarePlanModalProps) {
  if (!order) return null;

  const title = `Care Plan - ${order.first_name} ${order.last_name} (MRN: ${order.mrn}${
    order.patient_date_of_birth
      ? `, DOB: ${formatDob(order.patient_date_of_birth)}`
      : ""
  })`;

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          {order.care_plan_status === "completed" && (
            <Button variant="success" onClick={() => onDownload(order)}>
              Download
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="mb-4">
        <StatusBadge status={order.care_plan_status} className="px-3 py-1 text-sm" />
      </div>

      {order.care_plan_status === "completed" && order.care_plan_content && (
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
            {order.care_plan_content}
          </pre>
        </div>
      )}

      {order.care_plan_status === "processing" && (
        <div className="text-center py-8">
          <LoadingSpinner size="lg" className="mx-auto" />
          <p className="mt-4 text-gray-600">Generating care plan...</p>
        </div>
      )}

      {order.care_plan_status === "failed" && (
        <div className="text-red-600 bg-red-50 p-4 rounded">
          <p className="font-semibold">Error:</p>
          <p>{order.error_message || "Failed to generate care plan"}</p>
        </div>
      )}

      {order.care_plan_status === "pending" && (
        <div className="text-gray-600 text-center py-8">
          <p>Care plan generation is pending...</p>
        </div>
      )}
    </Modal>
  );
}
