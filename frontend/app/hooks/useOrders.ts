import { useState, useCallback } from "react";
import { Order } from "../types/order";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      setOrders(data);
      setSearchQuery("");
      setIsSearching(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
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
    },
    [fetchOrders],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    fetchOrders();
  }, [fetchOrders]);

  const handleViewCarePlan = useCallback(async (orderId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`);
      const data = await response.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  }, []);

  const handleDownloadCarePlan = useCallback((order: Order) => {
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
  }, []);

  const handleDeleteOrder = useCallback(
    async (orderId: number, orderInfo: string) => {
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
          fetchOrders();
        } else {
          const error = await response.json();
          alert(`Failed to delete order: ${error.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error deleting order:", error);
        alert("Failed to delete order. Please try again.");
      }
    },
    [fetchOrders],
  );

  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    setOrders((prevOrders) => {
      const existingIndex = prevOrders.findIndex(
        (order) => order.id === updatedOrder.id,
      );

      if (existingIndex >= 0) {
        const newOrders = [...prevOrders];
        newOrders[existingIndex] = updatedOrder;
        return newOrders;
      } else {
        return [updatedOrder, ...prevOrders];
      }
    });

    setSelectedOrder((prevSelected) => {
      if (prevSelected && prevSelected.id === updatedOrder.id) {
        return updatedOrder;
      }
      return prevSelected;
    });
  }, []);

  const closeCarePlanModal = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  return {
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
  };
}
