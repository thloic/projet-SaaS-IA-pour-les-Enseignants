import { redirect } from 'next/navigation'

export default function RegisterPage() {
  // Avec Google OAuth + magic link, il n'y a plus d'inscription distincte :
  // le compte est créé automatiquement à la première connexion.
  redirect('/login')
}
