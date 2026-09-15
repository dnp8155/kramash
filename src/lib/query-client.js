import { QueryClient } from '@tanstack/react-query';

// Only retry queries on transient errors (429 rate limit, 503 service unavailable).
// Non-retryable errors (404, 403, etc.) fail immediately — no wasted retries.
function isRetryableQueryError(error) {
	const status =
		error?.status ||
		error?.statusCode ||
		error?.response?.status ||
		error?.data?.status;
	if (status === 429 || status === 503) return true;
	const msg = String(error?.message || error?.data?.message || "").toLowerCase();
	return (
		msg.includes("429") ||
		msg.includes("503") ||
		msg.includes("rate limit") ||
		msg.includes("too many requests") ||
		msg.includes("service unavailable")
	);
}

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				if (failureCount >= 3) return false;
				return isRetryableQueryError(error);
			},
			retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 4000),
			staleTime: 60 * 1000,
			gcTime: 5 * 60 * 1000,
		},
	},
});