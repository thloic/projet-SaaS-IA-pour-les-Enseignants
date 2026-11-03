import assert from 'node:assert/strict'
import test from 'node:test'

import { landingTranslations } from '../../src/features/landing/i18n/landingTranslations.ts'

test('la landing présente une seule participation BYOK à 10 $ US dans les trois langues', () => {
  for (const locale of ['fr', 'en', 'es'] as const) {
    const pricing = landingTranslations[locale].pricing
    assert.equal(pricing.tiers.length, 1)
    assert.equal(pricing.tiers[0].price, locale === 'en' ? '$10 US' : '10 $ US')
    assert.match(pricing.tiers[0].features.join(' '), /BYOK/)
  }
})

test('la landing précise que les données peuvent transiter par le fournisseur IA', () => {
  for (const locale of ['fr', 'en', 'es'] as const) {
    const privacyCopy = landingTranslations[locale].why.items[0].description
    const pricingCopy = landingTranslations[locale].pricing.tiers[0].features.join(' ')
    assert.match(`${privacyCopy} ${pricingCopy}`.toLowerCase(), /provider|fournisseur|proveedor/)
  }
})
