"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Order {
  id: number;
  first_name: string;
  last_name: string;
  mrn: string;
  provider_name: string;
  provider_npi: string;
  primary_diagnosis: string;
  medication_name: string;
  additional_diagnosis: string[];
  medication_history: string[];
  patient_records: string;
  care_plan_status: string;
  care_plan_content: string | null;
  error_message: string | null;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mrn: "",
    providerName: "",
    providerNpi: "",
    primaryDiagnosis: "",
    medicationName: "",
    additionalDiagnosis: "",
    medicationHistory: "",
    patientRecords: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      setOrders(data);
      setSearchQuery("");
      setIsSearching(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      fetchOrders();
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_URL}/api/orders/search?q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error searching orders:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchOrders();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      mrn: formData.mrn,
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

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormData({
          firstName: "",
          lastName: "",
          mrn: "",
          providerName: "",
          providerNpi: "",
          primaryDiagnosis: "",
          medicationName: "",
          additionalDiagnosis: "",
          medicationHistory: "",
          patientRecords: "",
        });
        setShowForm(false);
        fetchOrders();
      }
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const handleViewCarePlan = async (orderId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`);
      const data = await response.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  };

  const handleDownloadCarePlan = (order: Order) => {
    const content = order.care_plan_content || "No care plan available";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `care-plan-${order.mrn}-${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Care Plan Generator
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "New Order"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Order</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient MRN (6 digits)
                  </label>
                  <input
                    type="text"
                    value={formData.mrn}
                    onChange={(e) =>
                      setFormData({ ...formData, mrn: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Diagnosis (ICD-10)
                  </label>
                  <input
                    type="text"
                    value={formData.primaryDiagnosis}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryDiagnosis: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={formData.providerName}
                    onChange={(e) =>
                      setFormData({ ...formData, providerName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider NPI (10 digits)
                  </label>
                  <input
                    type="text"
                    value={formData.providerNpi}
                    onChange={(e) =>
                      setFormData({ ...formData, providerNpi: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name
                  </label>
                  <input
                    type="text"
                    value={formData.medicationName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        medicationName: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Diagnosis (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.additionalDiagnosis}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        additionalDiagnosis: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="I10, K21.9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication History (one per line)
                </label>
                <textarea
                  value={formData.medicationHistory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      medicationHistory: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="Pyridostigmine 60 mg PO q6h PRN&#10;Prednisone 10 mg PO daily"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Records
                </label>
                <textarea
                  value={formData.patientRecords}
                  onChange={(e) =>
                    setFormData({ ...formData, patientRecords: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={8}
                  required
                  placeholder="Enter patient medical history and clinical information..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Order & Generate Care Plan
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Orders</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by patient, MRN, provider, medication..."
                    className="border border-gray-300 rounded-lg px-4 py-2 pr-10 w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {searchQuery && (
              <div className="text-sm text-gray-600">
                {orders.length > 0
                  ? `Found ${orders.length} result(s)`
                  : "No results found"}
              </div>
            )}
          </div>
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
                      {order.provider_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.medication_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          order.care_plan_status,
                        )}`}
                      >
                        {order.care_plan_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleViewCarePlan(order.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {order.care_plan_status === "completed" && (
                        <button
                          onClick={() => handleDownloadCarePlan(order)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Care Plan - {selectedOrder.first_name}{" "}
                  {selectedOrder.last_name} (MRN: {selectedOrder.mrn})
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="mb-4">
                  <span
                    className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(
                      selectedOrder.care_plan_status,
                    )}`}
                  >
                    {selectedOrder.care_plan_status}
                  </span>
                </div>
                {selectedOrder.care_plan_status === "completed" &&
                  selectedOrder.care_plan_content && (
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                        {selectedOrder.care_plan_content}
                      </pre>
                    </div>
                  )}
                {selectedOrder.care_plan_status === "processing" && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">
                      Generating care plan...
                    </p>
                  </div>
                )}
                {selectedOrder.care_plan_status === "failed" && (
                  <div className="text-red-600 bg-red-50 p-4 rounded">
                    <p className="font-semibold">Error:</p>
                    <p>
                      {selectedOrder.error_message ||
                        "Failed to generate care plan"}
                    </p>
                  </div>
                )}
                {selectedOrder.care_plan_status === "pending" && (
                  <div className="text-gray-600 text-center py-8">
                    <p>Care plan generation is pending...</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
                {selectedOrder.care_plan_status === "completed" && (
                  <button
                    onClick={() => handleDownloadCarePlan(selectedOrder)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Download
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
