import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["/api/payments/methods"],
    queryFn: async () => {
      const res = await fetch("/api/payments/methods");
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch payment methods");
      }
      return res.json();
    },
  });
}

export function useAddPaymentMethod() {
  return useMutation({
    mutationFn: async (method: any) => {
      const res = await apiRequest("POST", "/api/payments/methods", method);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/methods"] });
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["/api/payments/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/payments/invoices");
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch invoices");
      }
      return res.json();
    },
  });
}

export function usePayInvoice() {
  return useMutation({
    mutationFn: async (data: { invoiceId: number; methodId: number; customType?: string }) => {
      const res = await apiRequest("POST", "/api/payments/pay", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
  });
}
