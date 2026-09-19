import { FileError } from "./validation";
export function apiError(error: unknown): Response {
  if (error instanceof FileError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  return Response.json(
    { error: "The file could not be saved or loaded. Please try again." },
    { status: 503 },
  );
}
