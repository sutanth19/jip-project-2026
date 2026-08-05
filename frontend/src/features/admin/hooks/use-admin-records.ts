import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminRecord,
  getAdminRecord,
  listAdminRecords,
  resendSetup,
  updateAdminRecord,
  updateAdminRecordStatus,
} from "@/features/admin/api/admin.api";
import type { AdminEntityConfig, AdminListQuery } from "@/features/admin/types/admin.types";

export const adminQueryKeys = {
  all: ["admin"] as const,
  list: (key: string, query: AdminListQuery) => ["admin", key, "list", query] as const,
  detail: (key: string, id: string) => ["admin", key, "detail", id] as const,
};

export function useAdminRecords(config: AdminEntityConfig, query: AdminListQuery) {
  return useQuery({
    queryKey: adminQueryKeys.list(config.key, query),
    queryFn: () => listAdminRecords(config, query),
    staleTime: 30_000,
  });
}

export function useAdminRecord(config: AdminEntityConfig, id: string) {
  return useQuery({
    queryKey: adminQueryKeys.detail(config.key, id),
    queryFn: () => getAdminRecord(config, id),
    staleTime: 30_000,
  });
}

export function useCreateAdminRecord(config: AdminEntityConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Record<string, unknown>) => createAdminRecord(config, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", config.key] });
    },
  });
}

export function useUpdateAdminRecord(config: AdminEntityConfig, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Record<string, unknown>) => updateAdminRecord(config, id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", config.key] });
    },
  });
}

export function useUpdateAdminRecordStatus(config: AdminEntityConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAdminRecordStatus(config, id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", config.key] });
    },
  });
}

export function useResendSetup(config: AdminEntityConfig) {
  return useMutation({
    mutationFn: (id: string) => resendSetup(config, id),
  });
}

