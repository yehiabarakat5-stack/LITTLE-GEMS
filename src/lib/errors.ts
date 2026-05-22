type ErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

/** Read a human-readable message from Error instances and Supabase/PostgREST error objects. */
export function extractErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as ErrorLike).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

export function isMissingPostgrestColumnError(error: unknown, column: string): boolean {
  const message = extractErrorMessage(error, "").toLowerCase();
  const col = column.toLowerCase();
  return (
    message.includes(col) &&
    (message.includes("schema cache") ||
      message.includes("could not find") ||
      message.includes("column") && message.includes("does not exist"))
  );
}
