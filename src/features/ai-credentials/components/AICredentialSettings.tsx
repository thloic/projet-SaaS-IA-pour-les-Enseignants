'use client'

import { useState } from 'react'
import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { AICredentialPublicStatus } from '../schemas/aiCredentialSchema'
import {
  deleteAICredentialAction,
  saveAICredentialAction,
  setAICredentialActiveAction,
  testStoredAICredentialAction,
  type AICredentialActionResult,
} from '../server/aiCredential.actions'

const COPY = {
  fr: {
    section: 'Connexion IA', title: 'Choisissez votre source IA',
    description: 'Utilisez l’IA incluse avec EducAssist ou votre propre clé API. Cette option est disponible pour tous les comptes.',
    included: 'IA EducAssist', includedHint: 'Vos générations utilisent le quota inclus dans votre compte EducAssist.',
    personal: 'Ma clé API personnelle', personalHint: 'Les générations sont facturées directement sur votre compte fournisseur. Votre quota EducAssist reste intact.',
    key: 'Clé API personnelle', placeholder: 'Saisissez votre clé API', consent: 'Je comprends que les données nécessaires aux générations seront transmises à mon fournisseur IA.',
    save: 'Tester et enregistrer', saving: 'Vérification…', cancel: 'Annuler', connected: 'Clé personnelle connectée', suffix: 'Clé terminant par', active: 'Source active', usePersonal: 'Utiliser ma clé', useIncluded: 'Utiliser l’IA EducAssist', test: 'Tester', replace: 'Remplacer la clé', remove: 'Supprimer', saved: 'Clé personnelle enregistrée et activée.', tested: 'La connexion avec votre clé fonctionne.', removed: 'Clé personnelle supprimée.', switched: 'Source IA mise à jour.', invalid: 'La clé API est invalide.', unavailable: 'Le fournisseur IA est temporairement indisponible. Réessayez plus tard.', failed: 'La modification n’a pas pu être enregistrée.', createKey: 'Créer une clé API',
  },
  en: {
    section: 'AI connection', title: 'Choose your AI source',
    description: 'Use AI included with EducAssist or your own API key. This option is available to every account.',
    included: 'EducAssist AI', includedHint: 'Generations use the quota included with your EducAssist account.',
    personal: 'My personal API key', personalHint: 'Generations are billed directly through your provider account. Your EducAssist quota remains untouched.',
    key: 'Personal API key', placeholder: 'Enter your API key', consent: 'I understand that data required for generation will be sent to my AI provider.',
    save: 'Test and save', saving: 'Checking…', cancel: 'Cancel', connected: 'Personal key connected', suffix: 'Key ending in', active: 'Active source', usePersonal: 'Use my key', useIncluded: 'Use EducAssist AI', test: 'Test', replace: 'Replace key', remove: 'Delete', saved: 'Personal key saved and activated.', tested: 'The connection with your key works.', removed: 'Personal key deleted.', switched: 'AI source updated.', invalid: 'The API key is invalid.', unavailable: 'The AI provider is temporarily unavailable. Try again later.', failed: 'The change could not be saved.', createKey: 'Create an API key',
  },
  es: {
    section: 'Conexión IA', title: 'Elige tu fuente de IA',
    description: 'Usa la IA incluida con EducAssist o tu propia clave API. Esta opción está disponible para todas las cuentas.',
    included: 'IA EducAssist', includedHint: 'Las generaciones usan la cuota incluida en tu cuenta EducAssist.',
    personal: 'Mi clave API personal', personalHint: 'Las generaciones se facturan directamente en tu cuenta del proveedor. Tu cuota EducAssist permanece intacta.',
    key: 'Clave API personal', placeholder: 'Introduce tu clave API', consent: 'Entiendo que los datos necesarios para generar contenido se enviarán a mi proveedor de IA.',
    save: 'Probar y guardar', saving: 'Verificando…', cancel: 'Cancelar', connected: 'Clave personal conectada', suffix: 'Clave terminada en', active: 'Fuente activa', usePersonal: 'Usar mi clave', useIncluded: 'Usar la IA EducAssist', test: 'Probar', replace: 'Reemplazar clave', remove: 'Eliminar', saved: 'Clave personal guardada y activada.', tested: 'La conexión con tu clave funciona.', removed: 'Clave personal eliminada.', switched: 'Fuente de IA actualizada.', invalid: 'La clave API no es válida.', unavailable: 'El proveedor de IA no está disponible temporalmente. Inténtalo más tarde.', failed: 'No se pudo guardar el cambio.', createKey: 'Crear una clave API',
  },
} as const

export default function AICredentialSettings({ initialStatus }: { initialStatus: AICredentialPublicStatus }) {
  const { locale } = useAppLocale()
  const { showToast } = useToast()
  const copy = COPY[locale]
  const [status, setStatus] = useState(initialStatus)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [consent, setConsent] = useState(false)
  const [editing, setEditing] = useState(!initialStatus.connected)
  const [selectedSource, setSelectedSource] = useState(initialStatus.source)
  const [pending, setPending] = useState<string | null>(null)

  function handleResult(result: AICredentialActionResult, successMessage: string) {
    if (result.data) {
      setStatus(result.data)
      setSelectedSource(result.data.source)
      showToast(successMessage, 'success')
      return true
    }
    const message = result.error === 'INVALID_KEY' || result.error === 'INVALID_INPUT'
      ? copy.invalid
      : result.error === 'PROVIDER_UNAVAILABLE'
        ? copy.unavailable
        : copy.failed
    showToast(message, 'error')
    return false
  }

  async function saveKey() {
    if (!consent || pending) return
    setPending('save')
    try {
      const result = await saveAICredentialAction(apiKey)
      if (handleResult(result, copy.saved)) {
        setApiKey('')
        setConsent(false)
        setEditing(false)
      }
    } finally {
      setPending(null)
    }
  }

  async function switchSource(active: boolean): Promise<boolean> {
    if (pending) return false
    setPending('switch')
    try {
      const changed = handleResult(await setAICredentialActiveAction(active), copy.switched)
      if (!changed) setSelectedSource(status.source)
      return changed
    } finally {
      setPending(null)
    }
  }

  function selectIncluded() {
    setSelectedSource('included')
    setEditing(false)
    if (status.source !== 'included') void switchSource(false)
  }

  function selectPersonal() {
    setSelectedSource('personal')
    if (status.connected) {
      void switchSource(true)
    } else {
      setEditing(true)
    }
  }

  async function testKey() {
    if (pending) return
    setPending('test')
    try {
      handleResult(await testStoredAICredentialAction(), copy.tested)
    } finally {
      setPending(null)
    }
  }

  async function removeKey() {
    if (pending) return
    setPending('remove')
    try {
      if (handleResult(await deleteAICredentialAction(), copy.removed)) setEditing(false)
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-[#534AB7]" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#534AB7]">{copy.section}</h2>
      </div>
      <div className="space-y-5 rounded-2xl border border-border bg-muted/20 p-5">
        <div>
          <h3 className="font-bold">{copy.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={selectIncluded} disabled={pending !== null}
            className={`rounded-2xl border p-4 text-left transition ${selectedSource === 'included' ? 'border-[#534AB7] bg-[#534AB7]/5 ring-2 ring-[#534AB7]/10' : 'border-border bg-background hover:border-[#534AB7]/35'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold"><Bot size={17} /> {copy.included}</span>
              {selectedSource === 'included' && <CheckCircle2 size={17} className="text-emerald-500" />}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.includedHint}</p>
          </button>
          <button type="button" onClick={selectPersonal} disabled={pending !== null}
            className={`rounded-2xl border p-4 text-left transition ${selectedSource === 'personal' ? 'border-[#534AB7] bg-[#534AB7]/5 ring-2 ring-[#534AB7]/10' : 'border-border bg-background hover:border-[#534AB7]/35'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold"><KeyRound size={17} /> {copy.personal}</span>
              {selectedSource === 'personal' && <CheckCircle2 size={17} className="text-emerald-500" />}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.personalHint}</p>
          </button>
        </div>

        {status.connected && !editing ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={16} /> {copy.connected}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.suffix} •••• {status.keySuffix}</p>
              </div>
              <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold">{status.active ? copy.active : copy.included}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void testKey()} disabled={pending !== null}><RefreshCw size={14} /> {copy.test}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedSource('personal'); setEditing(true) }} disabled={pending !== null}>{copy.replace}</Button>
              {!status.active && <Button type="button" size="sm" onClick={selectPersonal} disabled={pending !== null}>{copy.usePersonal}</Button>}
              {status.active && <Button type="button" size="sm" variant="outline" onClick={selectIncluded} disabled={pending !== null}>{copy.useIncluded}</Button>}
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void removeKey()} disabled={pending !== null}><Trash2 size={14} /> {copy.remove}</Button>
            </div>
          </div>
        ) : selectedSource === 'personal' ? (
          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="anthropic-api-key">{copy.key}</Label>
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-xs font-medium text-[#534AB7] underline underline-offset-2">{copy.createKey}</a>
              </div>
              <div className="relative">
                <Input id="anthropic-api-key" type={showKey ? 'text' : 'password'} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={copy.placeholder} autoComplete="off" className="pr-11" />
                <button type="button" onClick={() => setShowKey((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground" aria-label={showKey ? 'Masquer' : 'Afficher'}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" />
              {copy.consent}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void saveKey()} disabled={!apiKey.trim() || !consent || pending !== null}>
                {pending === 'save' && <Loader2 size={15} className="animate-spin" />}{pending === 'save' ? copy.saving : copy.save}
              </Button>
              {status.connected && <Button type="button" variant="outline" onClick={() => { setSelectedSource(status.source); setEditing(false) }} disabled={pending !== null}>{copy.cancel}</Button>}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
