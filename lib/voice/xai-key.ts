export function xaiApiKey(): string | undefined {
  return process.env.XAI_API_KEY?.trim() || process.env["XAI-API_KEY"]?.trim();
}
