"use client";

import { useState, useEffect } from "react";
import { useOrderEvents } from "./hooks/useOrderEvents";
import { useOrders } from "./hooks/useOrders";
import { useOrderForm } from "./hooks/useOrderForm";
import { Button, SearchInput } from "./components/ui";
import { OrderForm, OrderTable, CarePlanModal } from "./components/orders";
import { PageHeader } from "./components/layout";

export default function Home() {
  const [showForm, setShowForm] = useState(false);

  // Orders state and handlers
  const {
    orders,
    selectedOrder,
    searchQuery,
    isSearching,
    fetchOrders,
    handleSearch,
    handleClearSearch,
    handleViewCarePlan,
    handleDownloadCarePlan,
    handleDeleteOrder,
    handleOrderUpdate,
    closeCarePlanModal,
  } = useOrders();

  // Form state and handlers
  const {
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
  } = useOrderForm({
    onSuccess: () => {
      setShowForm(false);
      fetchOrders();
    },
  });

  // SSE connection for real-time updates
  useOrderEvents({
    onOrderUpdate: handleOrderUpdate,
    onReconnect: () => {
      console.log("🔄 SSE reconnected, refreshing orders...");
      fetchOrders();
    },
  });

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleToggleForm = () => {
    if (showForm) {
      resetForm();
    }
    setShowForm(!showForm);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Care Plan Generator"
          action={
            <Button onClick={handleToggleForm} className="px-6">
              {showForm ? "Cancel" : "New Order"}
            </Button>
          }
        />

        {showForm && (
          <OrderForm
            formData={formData}
            formErrors={formErrors}
            submitError={submitError}
            isSubmitting={isSubmitting}
            showConfirmDialog={showConfirmDialog}
            onFieldChange={handleFieldChange}
            onFormDataChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
            onSubmit={handleSubmit}
            onConfirmSubmit={handleConfirmSubmit}
            onCancelConfirm={handleCancelConfirm}
          />
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Orders</h2>
              <SearchInput
                value={searchQuery}
                onChange={handleSearch}
                onClear={handleClearSearch}
                isLoading={isSearching}
                placeholder="Search by patient, MRN, provider, medication..."
                className="w-96"
              />
            </div>
            {searchQuery && (
              <div className="text-sm text-gray-600">
                {orders.length > 0
                  ? `Found ${orders.length} result(s)`
                  : "No results found"}
              </div>
            )}
          </div>

          <OrderTable
            orders={orders}
            onView={handleViewCarePlan}
            onDownload={handleDownloadCarePlan}
            onDelete={handleDeleteOrder}
          />
        </div>

        <CarePlanModal
          order={selectedOrder}
          onClose={closeCarePlanModal}
          onDownload={handleDownloadCarePlan}
        />
      </div>
    </main>
  );
}
