/**
* This file provides a global patch for XMLHttpRequest to prevent setting unsafe headers.
 * Browser security restrictions prevent JavaScript from setting certain headers via XHR.
 * This patch intercepts attempts to set these headers and prevents them silently.
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

// Helper function to check if a header is unsafe (case-insensitive)
function isUnsafeHeader(header: string): boolean {
  return UNSAFE_HEADERS.some(unsafe =>
    unsafe.toLowerCase() === header.toLowerCase()
  );
}

// Save the original method
const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

// Override the method to filter out unsafe headers
XMLHttpRequest.prototype.setRequestHeader = function(this: XMLHttpRequest, header: string, value: string): void {
  if (isUnsafeHeader(header)) {
    // Skip setting this header, but don't throw an error to avoid breaking APIs
    console.debug(`Prevented setting unsafe header: ${header}`);
    return;
  }

  // Call the original method for safe headers
  return originalSetRequestHeader.call(this, header, value);
};

export {}; // This makes the file a module
