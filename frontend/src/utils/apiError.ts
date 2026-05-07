export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const maybe = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return maybe?.response?.data?.message || maybe?.message || fallback;
}

export function logApiError(context: string, err: unknown): void {
  const maybe = err as {
    config?: { method?: string; url?: string; baseURL?: string };
    response?: { status?: number; data?: unknown };
    message?: string;
  };

  const method = maybe?.config?.method?.toUpperCase() || 'UNKNOWN_METHOD';
  const baseURL = maybe?.config?.baseURL || '';
  const url = maybe?.config?.url || 'UNKNOWN_URL';
  const status = maybe?.response?.status ?? 'NO_STATUS';
  const data = maybe?.response?.data;

  console.error(`[API ERROR] ${context}`, {
    request: `${method} ${baseURL}${url}`,
    status,
    message: maybe?.message,
    response: data,
  });
}
