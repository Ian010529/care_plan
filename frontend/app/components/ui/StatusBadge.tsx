type StatusType = "pending" | "processing" | "completed" | "failed" | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  processing: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-800",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colorClass = statusColors[status] || statusColors.pending;

  return (
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass} ${className}`}
    >
      {status}
    </span>
  );
}
