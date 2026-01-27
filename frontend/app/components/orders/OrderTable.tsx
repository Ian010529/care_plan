import { StatusBadge } from "../ui";
import { Order } from "../../types/order";

interface OrderTableProps {
  orders: Order[];
  onView: (orderId: number) => void;
  onDownload: (order: Order) => void;
  onDelete: (orderId: number, orderInfo: string) => void;
}

const formatDob = (value?: string) => {
  if (!value) return "-";
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

export function OrderTable({
  orders,
  onView,
  onDownload,
  onDelete,
}: OrderTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              MRN
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Patient
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              DOB
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Medication
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {order.mrn}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {order.first_name} {order.last_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDob(order.patient_date_of_birth)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.provider_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.medication_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={order.care_plan_status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <button
                  onClick={() => onView(order.id)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  View
                </button>
                {order.care_plan_status === "completed" && (
                  <button
                    onClick={() => onDownload(order)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Download
                  </button>
                )}
                <button
                  onClick={() =>
                    onDelete(
                      order.id,
                      `${order.first_name} ${order.last_name} (MRN: ${order.mrn})`,
                    )
                  }
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
