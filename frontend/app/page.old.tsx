"use client";

import { useState, useEffect } from "react";
import { useOrderEvents } from "./hooks/useOrderEvents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Order {
  id: number;
  first_name: string;
  last_name: string;
  mrn: string;
  patient_date_of_birth?: string;
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

interface FormErrors {
  firstName?: string;
  lastName?: string;
  mrn?: string;
  dateOfBirth?: string;
  providerName?: string;
  providerNpi?: string;
  primaryDiagnosis?: string;
  medicationName?: string;
  patientRecords?: string;
}

interface DuplicateCheckResult {
  is_duplicate: boolean;
  should_block: boolean;
  warnings: string[];
  existing_record: unknown;
}

interface ApiErrorResponse {
  error: string;
  duplicate_check?: DuplicateCheckResult;
  warnings?: string[];
  needs_confirmation?: boolean;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<ApiErrorResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<object | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mrn: "",
    dateOfBirth: "",
    providerName: "",
    providerNpi: "",
    primaryDiagnosis: "",
    medicationName: "",
    additionalDiagnosis: "",
    medicationHistory: "",
    patientRecords: "",
  });

  // SSE 实时更新处理
  const handleOrderUpdate = (updatedOrder: Order) => {
    // 更新 orders 列表
    setOrders((prevOrders) => {
      const existingIndex = prevOrders.findIndex(
        (order) => order.id === updatedOrder.id,
      );

      if (existingIndex >= 0) {
        // 更新现有 order
        const newOrders = [...prevOrders];
        newOrders[existingIndex] = updatedOrder;
        return newOrders;
      } else {
        // 新增 order (添加到列表首部)
        return [updatedOrder, ...prevOrders];
      }
    });

    // 如果当前正在查看该 order，也更新 selectedOrder
    setSelectedOrder((prevSelected) => {
      if (prevSelected && prevSelected.id === updatedOrder.id) {
        return updatedOrder;
      }
      return prevSelected;
    });
  };

  // SSE 连接
  useOrderEvents({
    onOrderUpdate: handleOrderUpdate,
    onReconnect: () => {
      console.log("🔄 SSE reconnected, refreshing orders...");
      fetchOrders();
    },
  });

  // 初始加载 orders
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

  const handleFieldChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    const error = validateField(name, value);
    setFormErrors((prev) => ({ ...prev, [name]: error }));
    // Clear submit error when user starts editing
    if (submitError) setSubmitError(null);
  };

  const validateForm = (): boolean => {
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
      const error = validateField(
        field,
        formData[field as keyof typeof formData],
      );
      if (error) errors[field as keyof FormErrors] = error;
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitOrder = async (payload: object, confirm: boolean = false) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, confirm }),
      });

      if (response.ok) {
        setFormData({
          firstName: "",
          lastName: "",
          mrn: "",
          dateOfBirth: "",
          providerName: "",
          providerNpi: "",
          primaryDiagnosis: "",
          medicationName: "",
          additionalDiagnosis: "",
          medicationHistory: "",
          patientRecords: "",
        });
        setShowForm(false);
        setFormErrors({});
        fetchOrders();
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
  };

  const handleConfirmSubmit = async () => {
    if (pendingPayload) {
      await submitOrder(pendingPayload, true);
      setShowConfirmDialog(false);
      setPendingPayload(null);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setPendingPayload(null);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleDeleteOrder = async (orderId: number, orderInfo: string) => {
    if (
      !confirm(
        `Are you sure you want to delete order ${orderInfo}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state or refetch
        fetchOrders();
      } else {
        const error = await response.json();
        alert(`Failed to delete order: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order. Please try again.");
    }
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

  const formatDob = (value?: string) => {
    if (!value) return "-";
    if (value.includes("T")) {
      return value.split("T")[0];
    }
    return value;
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

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                ⚠️ Confirmation Required
              </h3>
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  A similar order already exists. Do you want to continue?
                </p>
                {submitError?.duplicate_check?.warnings?.map((warning, idx) => (
                  <p
                    key={idx}
                    className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded mb-2"
                  >
                    {warning}
                  </p>
                ))}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleFieldChange("firstName", e.target.value)
                    }
                    className={`w-full border rounded px-3 py-2 ${formErrors.firstName ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    maxLength={100}
                  />
                  {formErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleFieldChange("lastName", e.target.value)
                    }
                    className={`w-full border rounded px-3 py-2 ${formErrors.lastName ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    maxLength={100}
                  />
                  {formErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.lastName}
                    </p>
                  )}
                </div>

                {/* MRN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient MRN <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">
                      (6 digits)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.mrn}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      handleFieldChange("mrn", value);
                    }}
                    className={`w-full border rounded px-3 py-2 ${formErrors.mrn ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    placeholder="000001"
                    inputMode="numeric"
                  />
                  {formErrors.mrn && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.mrn}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleFieldChange("dateOfBirth", e.target.value)
                    }
                    max={new Date().toISOString().split("T")[0]}
                    className={`w-full border rounded px-3 py-2 ${formErrors.dateOfBirth ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                  />
                  {formErrors.dateOfBirth && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.dateOfBirth}
                    </p>
                  )}
                </div>

                {/* Primary Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Diagnosis <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">
                      (ICD-10)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.primaryDiagnosis}
                    onChange={(e) =>
                      handleFieldChange(
                        "primaryDiagnosis",
                        e.target.value.toUpperCase(),
                      )
                    }
                    className={`w-full border rounded px-3 py-2 ${formErrors.primaryDiagnosis ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    placeholder="G70.00"
                  />
                  {formErrors.primaryDiagnosis && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.primaryDiagnosis}
                    </p>
                  )}
                </div>

                {/* Provider Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.providerName}
                    onChange={(e) =>
                      handleFieldChange("providerName", e.target.value)
                    }
                    className={`w-full border rounded px-3 py-2 ${formErrors.providerName ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    placeholder="Dr. John Smith"
                  />
                  {formErrors.providerName && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.providerName}
                    </p>
                  )}
                </div>

                {/* Provider NPI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider NPI <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">
                      (10 digits)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.providerNpi}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      handleFieldChange("providerNpi", value);
                    }}
                    className={`w-full border rounded px-3 py-2 ${formErrors.providerNpi ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    placeholder="1234567890"
                    inputMode="numeric"
                  />
                  {formErrors.providerNpi && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.providerNpi}
                    </p>
                  )}
                </div>

                {/* Medication Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.medicationName}
                    onChange={(e) =>
                      handleFieldChange("medicationName", e.target.value)
                    }
                    className={`w-full border rounded px-3 py-2 ${formErrors.medicationName ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    placeholder="IVIG"
                  />
                  {formErrors.medicationName && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.medicationName}
                    </p>
                  )}
                </div>

                {/* Additional Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Diagnosis
                    <span className="text-gray-400 font-normal ml-1">
                      (comma-separated)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.additionalDiagnosis}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        additionalDiagnosis: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="I10, K21.9"
                  />
                </div>
              </div>

              {/* Medication History */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication History
                  <span className="text-gray-400 font-normal ml-1">
                    (one per line)
                  </span>
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

              {/* Patient Records */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Records <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.patientRecords}
                  onChange={(e) =>
                    handleFieldChange("patientRecords", e.target.value)
                  }
                  className={`w-full border rounded px-3 py-2 ${formErrors.patientRecords ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                  rows={8}
                  placeholder="Enter patient medical history and clinical information..."
                />
                {formErrors.patientRecords && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.patientRecords}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Creating..."
                  : "Create Order & Generate Care Plan"}
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
                      <button
                        onClick={() =>
                          handleDeleteOrder(
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
        </div>

        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Care Plan - {selectedOrder.first_name}{" "}
                  {selectedOrder.last_name} (MRN: {selectedOrder.mrn}
                  {selectedOrder.patient_date_of_birth
                    ? `, DOB: ${formatDob(selectedOrder.patient_date_of_birth)}`
                    : ""}
                  )
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
