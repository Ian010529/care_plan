import { useEffect, useRef, useCallback } from "react";

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

interface UseOrderEventsOptions {
  onOrderUpdate: (order: Order) => void;
  onReconnect?: () => void;
}

export function useOrderEvents({
  onOrderUpdate,
  onReconnect,
}: UseOrderEventsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    // 防止重复连接
    if (isConnectingRef.current || eventSourceRef.current) {
      return;
    }

    isConnectingRef.current = true;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const eventSource = new EventSource(`${apiUrl}/api/events`);

    eventSource.addEventListener("order-update", (event) => {
      try {
        const order = JSON.parse(event.data) as Order;
        onOrderUpdate(order);
      } catch (error) {
        console.error("❌ SSE order-update parse error:", error);
      }
    });

    eventSource.addEventListener("connected", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("✅ SSE connected");
      } catch (error) {
        console.error("❌ SSE connected parse error:", error);
      }
    });

    eventSource.onopen = () => {
      isConnectingRef.current = false;
    };

    eventSource.onerror = (error) => {
      console.warn("⚠️ SSE connection lost, reconnecting...");
      eventSource.close();
      eventSourceRef.current = null;
      isConnectingRef.current = false;

      // 3秒后重连
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
        onReconnect?.();
      }, 3000);
    };

    eventSourceRef.current = eventSource;
  }, [onOrderUpdate, onReconnect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      isConnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时连接一次

  return {
    isConnected: eventSourceRef.current !== null,
  };
}
