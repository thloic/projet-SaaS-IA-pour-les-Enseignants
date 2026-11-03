export class PersonalAICredentialRequiredError extends Error {
  constructor() {
    super('PERSONAL_AI_CREDENTIAL_REQUIRED')
    this.name = 'PersonalAICredentialRequiredError'
  }
}

export function isPersonalAICredentialRequiredError(error: unknown): boolean {
  return error instanceof PersonalAICredentialRequiredError
    || (error instanceof Error && error.message === 'PERSONAL_AI_CREDENTIAL_REQUIRED')
}
