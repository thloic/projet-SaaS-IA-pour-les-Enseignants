import { Loader2 } from 'lucide-react'

const BRAND = '#534AB7'

// Affiche automatiquement par Next.js (Suspense) pendant qu'une page du
// tableau de bord charge ses donnees — la sidebar/navbar (rendues par le
// layout parent) restent visibles, seul le contenu est remplace le temps du
// chargement. Evite un clic sans aucun retour visuel pendant la navigation.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{ color: BRAND }} />
    </div>
  )
}
