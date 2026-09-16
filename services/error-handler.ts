export enum ErrorSeverity {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
}

export interface ErrorContext {
  source: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuredLogContext {
  source: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorLogEntry {
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  source: string;
  sessionId: string;
  action?: string;
  operation?: string;
  context?: Record<string, unknown>;
  stack?: string;
  metadata?: Record<string, unknown>;
  originalError?: unknown;
}

let sessionId: string = generateSessionId();
const logHistory: ErrorLogEntry[] = [];
const MAX_LOG_HISTORY = 200;

let toastHandler: ((message: string) => void) | null = null;

export function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `s${ts}${rand}`;
}

export function resetSessionId() {
  sessionId = generateSessionId();
}

export function setToastHandler(handler: (message: string) => void) {
  toastHandler = handler;
}

function nowISO(): string {
  return new Date().toISOString();
}

function captureStack(): string | undefined {
  const obj = { stack: '' };
  Error.captureStackTrace?.(obj, captureStack);
  return obj.stack || undefined;
}

function addToHistory(entry: ErrorLogEntry) {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
}

function consolePrefix(entry: ErrorLogEntry): string {
  let prefix = `[${entry.severity}][${entry.source}]`;
  if (entry.action) prefix += `(${entry.action})`;
  return prefix;
}

export function captureError(error: unknown, context: ErrorContext): ErrorLogEntry {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const entry: ErrorLogEntry = {
    timestamp: nowISO(),
    severity: ErrorSeverity.ERROR,
    message,
    source: context.source,
    sessionId,
    action: context.action,
    metadata: context.metadata,
    originalError: error instanceof Error ? error : undefined,
    stack: error instanceof Error ? error.stack : captureStack(),
  };

  addToHistory(entry);
  console.error(consolePrefix(entry), error);

  if (toastHandler) {
    toastHandler(message);
  }

  return entry;
}

export function captureWarning(message: string, context: ErrorContext): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    timestamp: nowISO(),
    severity: ErrorSeverity.WARN,
    message,
    source: context.source,
    sessionId,
    action: context.action,
    metadata: context.metadata,
  };

  addToHistory(entry);
  console.warn(consolePrefix(entry), message);

  return entry;
}

export function captureMessage(message: string, context: ErrorContext): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    timestamp: nowISO(),
    severity: ErrorSeverity.INFO,
    message,
    source: context.source,
    sessionId,
    action: context.action,
    metadata: context.metadata,
  };

  addToHistory(entry);
  console.info(consolePrefix(entry), message);

  return entry;
}

export function logStructured(entry: {
  severity: ErrorSeverity;
  message: string;
  source: string;
  operation?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}): ErrorLogEntry {
  const logEntry: ErrorLogEntry = {
    timestamp: nowISO(),
    severity: entry.severity,
    message: entry.message,
    source: entry.source,
    sessionId,
    operation: entry.operation,
    context: entry.context,
    originalError: entry.error instanceof Error ? entry.error : undefined,
    stack: entry.error instanceof Error ? entry.error.stack : captureStack(),
  };

  addToHistory(logEntry);

  const prefix = `[${logEntry.severity}][${logEntry.source}]${entry.operation ? `(${entry.operation})` : ''}`;
  const method = entry.severity === ErrorSeverity.ERROR ? console.error
    : entry.severity === ErrorSeverity.WARN ? console.warn
    : console.info;

  if (entry.severity === ErrorSeverity.ERROR && entry.error) {
    method(prefix, entry.message, entry.error);
  } else {
    method(prefix, entry.message);
  }

  if (entry.severity === ErrorSeverity.ERROR && toastHandler) {
    toastHandler(entry.message);
  }

  return logEntry;
}

export function createStructuredLogger(source: string) {
  return {
    error: (message: string, opts?: { operation?: string; context?: Record<string, unknown>; error?: unknown }) =>
      logStructured({ severity: ErrorSeverity.ERROR, message, source, ...opts }),
    warn: (message: string, opts?: { operation?: string; context?: Record<string, unknown> }) =>
      logStructured({ severity: ErrorSeverity.WARN, message, source, ...opts }),
    info: (message: string, opts?: { operation?: string; context?: Record<string, unknown> }) =>
      logStructured({ severity: ErrorSeverity.INFO, message, source, ...opts }),
  };
}

export function formatLogEntry(entry: ErrorLogEntry): string {
  const lines: string[] = [];
  lines.push(`Timestamp: ${entry.timestamp}`);
  lines.push(`Severity:  ${entry.severity}`);
  lines.push(`Source:    ${entry.source}`);
  if (entry.action) lines.push(`Action:    ${entry.action}`);
  if (entry.operation) lines.push(`Operation: ${entry.operation}`);
  if (entry.sessionId) lines.push(`Session:   ${entry.sessionId}`);
  lines.push(`Message:   ${entry.message}`);
  if (entry.context && Object.keys(entry.context).length > 0) {
    lines.push(`Context:   ${JSON.stringify(entry.context)}`);
  }
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    lines.push(`Metadata:  ${JSON.stringify(entry.metadata)}`);
  }
  if (entry.stack) {
    lines.push(`Stack:`);
    lines.push(entry.stack);
  }
  if (entry.originalError && entry.originalError !== entry.stack) {
    lines.push(`Original:  ${String(entry.originalError)}`);
  }
  return lines.join('\n');
}

export function getErrorLog(): ErrorLogEntry[] {
  return [...logHistory];
}

export function clearErrorLog() {
  logHistory.length = 0;
  sessionId = generateSessionId();
}

export function getSessionId(): string {
  return sessionId;
}

export class AppError extends Error {
  public readonly source: string;
  public readonly action?: string;
  public readonly metadata?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly sessionId: string;

  constructor(message: string, context: ErrorContext) {
    super(message);
    this.name = 'AppError';
    this.source = context.source;
    this.action = context.action;
    this.metadata = context.metadata;
    this.timestamp = nowISO();
    this.sessionId = sessionId;
  }
}
