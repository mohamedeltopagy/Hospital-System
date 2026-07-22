import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertService } from "@shared/schema";

export function useClinics() {
  return useQuery({
    queryKey: [api.clinics.list.path],
    queryFn: async () => {
      const res = await fetch(api.clinics.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clinics");
      return api.clinics.list.responses[200].parse(await res.json());
    },
  });
}

export function useClinic(id: number) {
  return useQuery({
    queryKey: [api.clinics.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.clinics.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch clinic");
      return api.clinics.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: [api.users.doctors.path],
    queryFn: async () => {
      const res = await fetch(api.users.doctors.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return api.users.doctors.responses[200].parse(await res.json());
    },
  });
}

export function useServices(clinicId?: number) {
  return useQuery({
    queryKey: [api.services.list.path, clinicId],
    queryFn: async () => {
      const url = clinicId ? `${api.services.list.path}?clinicId=${clinicId}` : api.services.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch services");
      return api.services.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertService) => {
      const res = await fetch(api.services.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.services.list.path] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertService> }) => {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.services.list.path] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.services.list.path] });
    },
  });
}
