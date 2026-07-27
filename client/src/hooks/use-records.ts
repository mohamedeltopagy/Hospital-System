import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useMedicalHistory() {
  return useQuery({
    queryKey: [api.medicalHistory.list.path],
    queryFn: async () => {
      const res = await fetch(api.medicalHistory.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch medical history");
      return api.medicalHistory.list.responses[200].parse(await res.json());
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: [api.reports.list.path],
    queryFn: async () => {
      const res = await fetch(api.reports.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return api.reports.list.responses[200].parse(await res.json());
    },
  });
}

export function useTreatmentPlans() {
  return useQuery({
    queryKey: [api.treatmentPlans.list.path],
    queryFn: async () => {
      const res = await fetch(api.treatmentPlans.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch treatment plans");
      return api.treatmentPlans.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { patientId: number; title: string; content: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create report");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reports.list.path] });
    },
  });
}

export function useCreateTreatmentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { patientId: number; title: string; details: string; startDate: string; endDate?: string }) => {
      const res = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create treatment plan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.treatmentPlans.list.path] });
    },
  });
}

export function usePrescriptions() {
  return useQuery({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => {
      const res = await fetch("/api/prescriptions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch prescriptions");
      return res.json();
    },
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { patientId: number; medicationName: string; dosage: string; frequency: string; duration: string; notes?: string }) => {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create prescription");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
  });
}

export function useLabRequests() {
  return useQuery({
    queryKey: ["/api/lab-requests"],
    queryFn: async () => {
      const res = await fetch("/api/lab-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lab requests");
      return res.json();
    },
  });
}

export function useCreateLabRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { patientId: number; testType: string; testName: string; instructions?: string }) => {
      const res = await fetch("/api/lab-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create lab request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-requests"] });
    },
  });
}
