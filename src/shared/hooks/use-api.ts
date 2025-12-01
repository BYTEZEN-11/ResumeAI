import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse } from "@/types";

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {

  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(data.message ?? "Request failed");
  }
  return data;
}

export function useApiQuery<T>(
  key: (string | number | undefined)[],
  url: string,
  options?: { enabled?: boolean; staleTime?: number }
) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiFetch<T>(url),
    enabled: options?.enabled !== false,
    staleTime: options?.staleTime,
  });
}

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: {
    onSuccess?: (data: ApiResponse<TData>) => void;
    onError?: (error: Error) => void;
    invalidateKeys?: string[][];
    successMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Something went wrong");
      options?.onError?.(error);
    },
  });
}
export { apiFetch };
