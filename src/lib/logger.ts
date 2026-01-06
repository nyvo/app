/**
 * Development-only logger utility
 * Logs are automatically stripped in production builds
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug-level logging (only in development)
   * Use for detailed debugging information
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info-level logging
   * Use for general informational messages
   */
  info: (...args: unknown[]) => {
    console.info(...args);
  },

  /**
   * Warning-level logging
   * Use for warning messages
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Error-level logging
   * Use for error messages (always shown)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Group logging (development only)
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },
};
