/**
 * Global error handler for debugging crashes
 */

let errorLog: string[] = [];
let errorCallback: ((errors: string[]) => void) | null = null;

/**
 * Setup global error handlers
 */
export function setupErrorHandlers() {
  // Handle uncaught JavaScript errors
  const originalErrorHandler = global.ErrorUtils?.getGlobalHandler();

  global.ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
    const errorMessage = `${isFatal ? 'FATAL: ' : ''}${error.name}: ${error.message}\n${error.stack || ''}`;
    console.error('Global error caught:', errorMessage);
    addErrorLog(errorMessage);

    // Call original handler
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });

  // Handle unhandled promise rejections
  const originalRejectionHandler = global.ErrorUtils?.getUnhandledPromiseRejectionTracker?.();

  if (typeof Promise !== 'undefined') {
    const rejectionTracking = require('promise/setimmediate/rejection-tracking');
    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (id: string, error: Error) => {
        const errorMessage = `Unhandled Promise Rejection: ${error.message}\n${error.stack || ''}`;
        console.error('Promise rejection:', errorMessage);
        addErrorLog(errorMessage);
      },
      onHandled: () => {},
    });
  }

  console.log('Error handlers initialized');
}

/**
 * Add error to log
 */
function addErrorLog(error: string) {
  const timestamp = new Date().toISOString();
  errorLog.push(`[${timestamp}] ${error}`);

  // Keep only last 50 errors
  if (errorLog.length > 50) {
    errorLog = errorLog.slice(-50);
  }

  // Notify callback
  if (errorCallback) {
    errorCallback(errorLog);
  }
}

/**
 * Get all error logs
 */
export function getErrorLogs(): string[] {
  return [...errorLog];
}

/**
 * Clear error logs
 */
export function clearErrorLogs() {
  errorLog = [];
  if (errorCallback) {
    errorCallback([]);
  }
}

/**
 * Set callback for error updates
 */
export function onErrorUpdate(callback: (errors: string[]) => void) {
  errorCallback = callback;
}

/**
 * Manual error logging
 */
export function logError(context: string, error: any) {
  const errorMessage = `${context}: ${error?.message || error}${error?.stack ? `\n${error.stack}` : ''}`;
  console.error(errorMessage);
  addErrorLog(errorMessage);
}
