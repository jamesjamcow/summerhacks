export function isMockDataMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
}

export function getGenerationApiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_GENERATION_API_URL;
}
