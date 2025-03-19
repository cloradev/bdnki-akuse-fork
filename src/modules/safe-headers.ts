/**
 * Utility functions to sanitize request headers to prevent browser security errors.
 */

// List of headers that browsers don't allow to be set via XHR
const UNSAFE_HEADERS = [
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'user-agent',
  'via',
];

/**
 * Sanitizes headers by removing unsafe ones
 * @param headers - The headers object to sanitize
 * @returns A new headers object with unsafe headers removed
 */
export function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };

  // Remove any unsafe headers (case-insensitive)
  for (const unsafeHeader of UNSAFE_HEADERS) {
    // Check lowercase version
    if (sanitized[unsafeHeader] !== undefined) {
      delete sanitized[unsafeHeader];
    }

    // Check uppercase first letter (camelCase)
    const camelCase = unsafeHeader.replace(/-([a-z])/g, g => g[1].toUpperCase());
    if (sanitized[camelCase] !== undefined) {
      delete sanitized[camelCase];
    }

    // Check all words capitalized (Pascal-Case)
    const pascalCase = unsafeHeader
      .replace(/^([a-z])|-([a-z])/g, g => g.slice(-1).toUpperCase());
    if (sanitized[pascalCase] !== undefined) {
      delete sanitized[pascalCase];
    }

    // Check uppercase with dashes (HTTP-style)
    const httpStyle = unsafeHeader.toUpperCase();
    if (sanitized[httpStyle] !== undefined) {
      delete sanitized[httpStyle];
    }
  }

  return sanitized;
}

/**
 * Creates a safe fetch wrapper that automatically sanitizes headers
 * @returns A fetch wrapper function
 */
export function createSafeFetch(): typeof fetch {
  // Save the original fetch
  const originalFetch = window.fetch;

  // Return a wrapped version that sanitizes headers
  return function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (init && init.headers) {
      // Create a sanitized copy of the headers
      if (init.headers instanceof Headers) {
        const sanitized = new Headers();
        for (const [key, value] of (init.headers as Headers).entries()) {
          if (!UNSAFE_HEADERS.includes(key.toLowerCase())) {
            sanitized.append(key, value);
          }
        }
        init.headers = sanitized;
      } else if (Array.isArray(init.headers)) {
        init.headers = init.headers.filter(([key]) =>
          !UNSAFE_HEADERS.includes((key as string).toLowerCase())
        );
      } else {
        init.headers = sanitizeHeaders(init.headers as Record<string, any>);
      }
    }

    return originalFetch.call(window, input, init);
  };
}

// Apply the safe fetch wrapper
if (typeof window !== 'undefined' && window.fetch) {
  window.fetch = createSafeFetch();
}

export default sanitizeHeaders;
