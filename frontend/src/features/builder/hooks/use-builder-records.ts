import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBuilderRecord,
  getBuilderRecord,
  listBuilderRecords,
  postBuilderAction,
  updateBuilderRecord,
} from "@/features/builder/api/builder.api";
import type { BuilderEntityConfig, BuilderQuery } from "@/features/builder/types/builder.types";

export const builderQueryKeys = {
  all: ["builder"] as const,
  list: (key: string, query: BuilderQuery) => ["builder", key, "list", query] as const,
  detail: (key: string, id: string) => ["builder", key, "detail", id] as const,
};

export function useBuilderRecords(config: BuilderEntityConfig, query: BuilderQuery) {
  return useQuery({
    queryKey: builderQueryKeys.list(config.key, query),
    queryFn: () => listBuilderRecords(config, query),
    staleTime: 30_000,
  });
}

export function useBuilderRecord(config: BuilderEntityConfig, id: string) {
  return useQuery({
    queryKey: builderQueryKeys.detail(config.key, id),
    queryFn: () => getBuilderRecord(config, id),
    staleTime: 30_000,
  });
}

export function useCreateBuilderRecord(config: BuilderEntityConfig) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => createBuilderRecord(config, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["builder", config.key] }),
  });
}

export function useUpdateBuilderRecord(config: BuilderEntityConfig, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => updateBuilderRecord(config, id, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["builder", config.key] }),
  });
}

export function useBuilderAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ endpoint, values }: { endpoint: string; values?: Record<string, unknown> }) =>
      postBuilderAction(endpoint, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: builderQueryKeys.all }),
  });
}

