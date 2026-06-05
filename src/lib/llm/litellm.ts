export function createLiteLLMClient() {
  return {
    baseUrl: process.env.LITELLM_BASE_URL ?? '',
    apiKey: process.env.LITELLM_API_KEY ?? '',
  }
}
