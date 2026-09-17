import { QueryClient } from '@tanstack/react-query';

// Only retry on 503 (service unavailable). Do NOT retry on 429 (rate limit) —
// retrying a rate-limited request sends more calls and makes the limit worse.
// Cached data (placeholderData) is shown when a refetch fails, so failing fast
// on 429 is safe: the user sees the last good data instead of a retry storm.
function isRetryableQueryError(error) {
	const status =
		error?.status ||
		error?.statusCode ||
		error?.response?.status ||
		error?.data?.status;
	if (status === 503) return true;
	const msg = String(error?.message || error?.data?.message || "").toLowerCase();
	return (
		msg.includes("503") ||
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