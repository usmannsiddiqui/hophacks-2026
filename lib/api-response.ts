import { z } from "zod";
import { FileError } from "./validation";
export function apiError(error: unknown): Response {
  if (error instanceof FileError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  // A schema failure is the caller's mistake, not ours: say which field, and say 400.
  // Without this it falls through to 503 and reads as a server fault.
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    const path = issue?.path.join(".");
    return Response.json(
      { error: path ? `${path}: ${issue.message}` : (issue?.message ?? "Invalid request") },
      { status: 400 },
    );
  }
  return Response.json(
    { error: "The file could not be saved or loaded. Please try again." },
    { status: 503 },
  );
}
