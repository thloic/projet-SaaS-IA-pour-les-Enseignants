import { isNeedsConnectionOutput, type NeedsConnectionOutput } from './needsConnection.ts'
import type { DriveProposalToolOutput } from './driveAgentTools.ts'

// Décide quelle carte (s'il y en a une) un tour de chat Drive doit afficher,
// à partir de TOUS les résultats d'outils du tour (non streamé). Pourquoi : en
// streaming, un texte émis avant l'appel d'outil fait perdre la carte de
// confirmation ; en lisant le tour complet, la carte est toujours considérée.

export interface ToolResultLike {
  toolName: string
  output: unknown
}

export type DriveTurnOutcome =
  | { kind: 'proposal'; output: DriveProposalToolOutput }
  | { kind: 'needs_connection'; output: NeedsConnectionOutput }
  | { kind: 'text' }

export function decideDriveTurnOutcome(toolResults: readonly ToolResultLike[]): DriveTurnOutcome {
  // Une connexion manquante prime : sans elle, aucune proposition n'est fiable.
  const connection = toolResults.find((result) => isNeedsConnectionOutput(result.output))
  if (connection && isNeedsConnectionOutput(connection.output)) {
    return { kind: 'needs_connection', output: connection.output }
  }

  const proposal = toolResults.find(
    (result) =>
      result.toolName === 'drive_propose_change' &&
      typeof result.output === 'object' &&
      result.output !== null &&
      (result.output as { status?: unknown }).status === 'proposal'
  )
  if (proposal) {
    return { kind: 'proposal', output: proposal.output as DriveProposalToolOutput }
  }

  return { kind: 'text' }
}
