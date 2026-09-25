import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (typeof window === 'undefined' || initialized) return posthog

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    // Pageviews captures manuellement au changement de route (App Router),
    // pour éviter les doublons avec le comportement par défaut du SDK.
    capture_pageview: false,
    person_profiles: 'identified_only',
  })
  initialized = true

  return posthog
}

export { posthog }
