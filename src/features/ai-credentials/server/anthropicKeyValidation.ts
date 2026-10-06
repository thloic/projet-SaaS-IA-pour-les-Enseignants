export type AnthropicKeyValidationResult =
  | { valid: true }
  | { valid: false; reason: 'INVALID_KEY' | 'PROVIDER_UNAVAILABLE' }

export async function validateAnthropicApiKey(
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<AnthropicKeyValidationResult> {
  try {
    const response = await fetchImpl('https://api.anthropic.com/v1/models?limit=1', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (response.ok) return { valid: true }
    if (response.status === 401 || response.status === 403) {
      return { valid: false, reason: 'INVALID_KEY' }
    }
    return { valid: false, reason: 'PROVIDER_UNAVAILABLE' }
  } catch {
    return { valid: false, reason: 'PROVIDER_UNAVAILABLE' }
  }
}
