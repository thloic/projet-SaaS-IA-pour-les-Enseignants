export interface GradeLevelEquivalence {
  ageRange: string
  quebec: string
  ontario: string
}

// Contenu fourni par le client (correspondance d'age/niveau Quebec <-> Ontario).
// Le "*" sur "Grade 11" est reporte tel quel depuis le contenu fourni ;
// sa signification exacte (note de bas de tableau) n'a pas ete precisee par le client.
export const GRADE_LEVEL_EQUIVALENCE: GradeLevelEquivalence[] = [
  { ageRange: '4-5 ans', quebec: 'Maternelle 4 ans (optionnelle)', ontario: 'Kindergarten (Junior Kindergarten - JK)' },
  { ageRange: '5-6 ans', quebec: 'Maternelle 5 ans', ontario: 'Senior Kindergarten (SK)' },
  { ageRange: '6-7 ans', quebec: '1re annee', ontario: 'Grade 1' },
  { ageRange: '7-8 ans', quebec: '2e annee', ontario: 'Grade 2' },
  { ageRange: '8-9 ans', quebec: '3e annee', ontario: 'Grade 3' },
  { ageRange: '9-10 ans', quebec: '4e annee', ontario: 'Grade 4' },
  { ageRange: '10-11 ans', quebec: '5e annee', ontario: 'Grade 5' },
  { ageRange: '11-12 ans', quebec: '6e annee', ontario: 'Grade 6' },
  { ageRange: '12-13 ans', quebec: 'Secondaire 1', ontario: 'Grade 7' },
  { ageRange: '13-14 ans', quebec: 'Secondaire 2', ontario: 'Grade 8' },
  { ageRange: '14-15 ans', quebec: 'Secondaire 3', ontario: 'Grade 9' },
  { ageRange: '15-16 ans', quebec: 'Secondaire 4', ontario: 'Grade 10' },
  { ageRange: '16-17 ans', quebec: 'Secondaire 5', ontario: 'Grade 11*' },
  { ageRange: '17-18 ans', quebec: 'Cegep 1 (preuniversitaire) ou DEP', ontario: 'Grade 12' },
  { ageRange: '18-19 ans', quebec: 'Cegep 2 (preuniversitaire)', ontario: '1re annee universitaire (si Grade 12 termine)' },
]

export const QUEBEC_LEVELS: string[] = GRADE_LEVEL_EQUIVALENCE.map((entry) => entry.quebec)
export const ONTARIO_LEVELS: string[] = GRADE_LEVEL_EQUIVALENCE.map((entry) => entry.ontario)
