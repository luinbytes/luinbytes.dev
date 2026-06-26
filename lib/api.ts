/**
 * API Utility with resilience features:
 * - Exponential backoff retry logic
 * - localStorage caching with TTL
 * - Rate limit handling
 * - Retry-After header support
 * - Request timeout handling
 * - User-friendly error messages
 */

// Cache configuration
const CACHE_PREFIX = 'api_cache_';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export interface ApiError {
    message: string;
    status?: number;
    isRateLimit?: boolean;
    retryAfter?: number;
    isCached?: boolean;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export interface FetchWithRetryOptions {
    maxRetries?: number;
    timeout?: number;
    cacheTTL?: number;
    skipCache?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Sleep utility for delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getBackoffDelay = (attempt: number): number => {
    return INITIAL_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
};

/**
 * Get cached data from localStorage
 */
const getCache = <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;

    try {
        const cached = localStorage.getItem(CACHE_PREFIX + key);
        if (!cached) return null;

        const entry: CacheEntry<T> = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - entry.timestamp > entry.ttl) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        return entry.data;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
};

/**
 * Set cached data in localStorage
 */
const setCache = <T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void => {
    if (typeof window === 'undefined') return;

    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
        console.error('Cache write error:', error);
        // Continue even if cache fails - don't break the app
    }
};

/**
 * Clear specific cache entry
 */
export const clearCache = (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CACHE_PREFIX + key);
};

/**
 * Fetch with timeout using AbortController
 */
const fetchWithTimeout = async (
    url: string,
    timeout: number = DEFAULT_TIMEOUT
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
};

/**
 * Parse Retry-After header (seconds or HTTP date)
 */
const parseRetryAfter = (retryAfter: string | null): number | null => {
    if (!retryAfter) return null;

    // Check if it's a number (seconds)
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
    }

    // Try to parse as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
    }

    return null;
};

/**
 * Create user-friendly error message
 */
const createErrorMessage = (error: Error, status?: number): ApiError => {
    const baseError: ApiError = {
        message: error.message,
        status,
    };

    // Rate limit error
    if (status === 403 || status === 429) {
        return {
            ...baseError,
            isRateLimit: true,
            message: 'API rate limit reached. Using cached data if available.',
        };
    }

    // Network errors
    if (error.message.includes('timeout')) {
        return {
            ...baseError,
            message: 'Request timed out. Please check your connection.',
        };
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        return {
            ...baseError,
            message: 'Network error. Please check your internet connection.',
        };
    }

    // Server errors
    if (status && status >= 500) {
        return {
            ...baseError,
            message: 'Server error. The service may be temporarily unavailable.',
        };
    }

    // Client errors
    if (status && status >= 400) {
        return {
            ...baseError,
            message: 'Request failed. The resource may not be available.',
        };
    }

    return baseError;
};

/**
 * Main fetch function with retry logic, caching, and resilience
 */
export const fetchWithRetry = async <T>(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<T> => {
    const {
        maxRetries = MAX_RETRIES,
        timeout = DEFAULT_TIMEOUT,
        cacheTTL = DEFAULT_CACHE_TTL,
        skipCache = false,
        onRetry,
    } = options;

    const cacheKey = url;

    // Try to get from cache first
    if (!skipCache) {
        const cached = getCache<T>(cacheKey);
        if (cached) {
            console.log(`Using cached data for: ${url}`);
            return cached;
        }
    }

    let lastError: Error | null = null;
    let retryAfterMs: number | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Wait for retry delay (exponential backoff)
            if (attempt > 0) {
                const delay = retryAfterMs || getBackoffDelay(attempt - 1);
                console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms for: ${url}`);

                if (onRetry) {
                    onRetry(attempt, lastError!);
                }

                await sleep(delay);
                retryAfterMs = null; // Reset after using
            }

            // Make the request with timeout
            const response = await fetchWithTimeout(url, timeout);

            // Handle rate limiting (429) with retry
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                retryAfterMs = parseRetryAfter(retryAfter);

                const cached = getCache<T>(cacheKey);
                if (cached) {
                    console.warn('Rate limited, using cached data');
                    return cached;
                }

                throw new Error(`Rate limit exceeded (429)`);
            }

            // Handle forbidden (403) — don't retry, it won't help
            if (response.status === 403) {
                const cached = getCache<T>(cacheKey);
                if (cached) {
                    console.warn('Forbidden, using cached data');
                    return cached;
                }

                const err = new Error('GitHub API rate limit reached. Try again later.');
                (err as Error & { status: number }).status = 403;
                throw err;
            }

            // Handle other HTTP errors
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Parse JSON response
            const data = await response.json();

            // Cache successful response
            if (!skipCache) {
                setCache(cacheKey, data, cacheTTL);
            }

            return data;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');

            // Don't retry on final attempt
            if (attempt === maxRetries) {
                // Try to return cached data as last resort
                const cached = getCache<T>(cacheKey);
                if (cached) {
                    console.warn('All retries failed, using stale cached data');
                    const apiError = createErrorMessage(lastError);
                    apiError.isCached = true;
                    // We still return cached data but could log the error
                    return cached;
                }

                // No cache available, throw error
                throw createErrorMessage(lastError);
            }

            // Continue to next retry attempt
            console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, lastError.message);
        }
    }

    // This should never be reached, but TypeScript needs it
    throw createErrorMessage(lastError || new Error('Request failed'));
};

/**
 * Specialized GitHub API fetch with authentication token support
 */
export const fetchGitHub = async <T>(
    endpoint: string,
    options: FetchWithRetryOptions = {}
): Promise<T> => {
    const url = endpoint.startsWith('http')
        ? endpoint
        : `https://api.github.com${endpoint}`;

    return fetchWithRetry<T>(url, {
        ...options,
        cacheTTL: options.cacheTTL || 10 * 60 * 1000, // 10 minutes for GitHub data
    });
};
