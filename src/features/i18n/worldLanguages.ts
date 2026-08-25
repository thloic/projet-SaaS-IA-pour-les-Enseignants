import { DEFAULT_APP_LOCALE, type AppLocale } from './locale'

export interface WorldLanguageOption {
  code: string
  label: string
}

// Codes ISO 639-1 (norme stable, ~184 langues) — pas de dependance npm ni
// d'appel a une API externe pour une liste qui ne change quasiment jamais.
// Les libelles, eux, sont derives dynamiquement via Intl.DisplayNames (deja
// integre au moteur JS) dans la langue d'interface courante.
const ISO_639_1_CODES = [
  'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
  'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
  'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
  'da', 'de', 'dv', 'dz',
  'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
  'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
  'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
  'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
  'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
  'ja', 'jv',
  'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
  'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
  'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
  'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
  'oc', 'oj', 'om', 'or', 'os',
  'pa', 'pi', 'pl', 'ps', 'pt',
  'qu',
  'rm', 'rn', 'ro', 'ru', 'rw',
  'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw',
  'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
  'ug', 'uk', 'ur', 'uz',
  've', 'vi', 'vo',
  'wa', 'wo',
  'xh',
  'yi', 'yo',
  'za', 'zh', 'zu',
]

// Libelles derives via Intl.DisplayNames (integre au moteur JS, aucune
// dependance) dans la langue d'interface courante, plutot qu'une liste de
// noms maintenue a la main qui se desynchroniserait des langues de l'app.
//
// Attention SSR : les donnees ICU utilisees par Intl.DisplayNames peuvent
// differer entre le serveur (Node.js) et le navigateur pour des codes rares,
// ce qui casse l'hydratation React si ce resultat sert au premier rendu.
// N'appeler cette fonction que cote client, apres le montage du composant
// (voir getFallbackLanguageOptions pour le rendu stable avant hydratation).
export function listWorldLanguages(locale: AppLocale = DEFAULT_APP_LOCALE): WorldLanguageOption[] {
  const displayNames = new Intl.DisplayNames([locale], { type: 'language' })
  return ISO_639_1_CODES
    .map((code) => ({ code, label: displayNames.of(code) ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, locale))
}

// Rendu identique sur le serveur et au premier rendu client (avant
// hydratation) : le code lui-meme comme libelle, trie alphabetiquement.
// Aucune dependance a Intl ici, donc aucun risque de divergence.
export function getFallbackLanguageOptions(): WorldLanguageOption[] {
  return [...ISO_639_1_CODES].sort().map((code) => ({ code, label: code }))
}
