import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ambassadorCodeCandidates,
  ambassadorCouponEnvVarName,
  ambassadorDiscountPercent,
  normalizeNameForCode,
} from '../../src/features/billing/server/ambassadorCore.ts'

test('normalise un prénom simple en base de code majuscule', () => {
  assert.equal(normalizeNameForCode('Marie'), 'MARIE')
})

test('retire les accents et les caractères non alphabétiques', () => {
  assert.equal(normalizeNameForCode('Éloïse-Anne 2e'), 'ELOISEANNEE')
})

test('tronque une base trop longue à 12 caractères', () => {
  assert.equal(normalizeNameForCode('Anne-Marie-Christelle'), 'ANNEMARIECHR')
  assert.equal(normalizeNameForCode('Anne-Marie-Christelle').length, 12)
})

test('retombe sur une base par défaut si le prénom ne contient aucune lettre', () => {
  assert.equal(normalizeNameForCode('123'), 'PROF')
})

test('génère des candidats de code déterministes et distincts pour un même prénom', () => {
  const candidates = ambassadorCodeCandidates('Marie')
  assert.equal(candidates[0], 'MARIE01')
  assert.equal(candidates[1], 'MARIE02')
  assert.equal(new Set(candidates).size, candidates.length)
})

test('le nombre de candidats est suffisant pour absorber des collisions raisonnables', () => {
  const candidates = ambassadorCodeCandidates('Marie')
  assert.ok(candidates.length >= 99)
})

test('0 filleul = 0% de réduction', () => {
  assert.equal(ambassadorDiscountPercent(0), 0)
})

test('chaque filleul ajoute 10 points de réduction', () => {
  assert.equal(ambassadorDiscountPercent(1), 10)
  assert.equal(ambassadorDiscountPercent(3), 30)
})

test('la réduction est plafonnée à 100% quel que soit le nombre de filleuls', () => {
  assert.equal(ambassadorDiscountPercent(10), 100)
  assert.equal(ambassadorDiscountPercent(25), 100)
})

test('un nombre de filleuls négatif (donnée corrompue) ne produit jamais une réduction négative', () => {
  assert.equal(ambassadorDiscountPercent(-1), 0)
})

test('le nom de variable d’environnement du coupon suit un format prévisible par palier', () => {
  assert.equal(ambassadorCouponEnvVarName(10), 'STRIPE_COUPON_ID_AMBASSADOR_10')
  assert.equal(ambassadorCouponEnvVarName(100), 'STRIPE_COUPON_ID_AMBASSADOR_100')
})
