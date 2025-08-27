import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem("auth-token");
  const userEmail = localStorage.getItem("user-email");
  const currentTeamId = localStorage.getItem("current-team-id");
  
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Prefer JWT token authentication
  if (token && !url.includes('/api/public/')) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (userEmail && !url.includes('/api/public/')) {
    headers['x-user-email'] = userEmail;
  }
  
  if (currentTeamId && !url.includes('/api/public/')) {
    headers['x-team-id'] = currentTeamId;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const token = localStorage.getItem("auth-token");
    const userEmail = localStorage.getItem("user-email");
    const currentTeamId = localStorage.getItem("current-team-id");
    
    const headers: Record<string, string> = {};
    
    // Prefer JWT token authentication
    if (token && !url.includes('/api/public/')) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (userEmail && !url.includes('/api/public/')) {
      headers['x-user-email'] = userEmail;
    }
    
    if (currentTeamId && !url.includes('/api/public/')) {
      headers['x-team-id'] = currentTeamId;
    }

    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
