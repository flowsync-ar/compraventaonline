export const COMMUNITY_LANGUAGE_MESSAGE =
  "Ese texto no cumple las normas de vocabulario y trato de la comunidad. Reformulalo con respeto. Más info en Reglas de la Comunidad."

export type ViolationType = "insult" | "threat" | "discrimination" | "sexual" | "harassment"

export type LanguageCheck =
  | { violates: false }
  | { violates: true; type: ViolationType; matched: string[] }

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[3€]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/[7+]/g, "t")
    .replace(/8/g, "b")
}

function tokens(text: string): string[] {
  return fold(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function compact(text: string): string {
  return fold(text).replace(/[^a-z0-9]/g, "")
}

// pijaas → pijas, putoooo → puto, voooy → voy
function collapseRepeats(token: string): string {
  return token.replace(/(.)\1+/g, "$1")
}

// Isolated words only when they almost never appear in a listing title.
// Not here: negro, gordo, travesti, discapacitado, enfermo,
// forro, salame, nabo, paja, fantasma, payaso, basura, culo, orto, concha,
// chorro, ladrón — van en frases con contexto.
// puto/puta sí van como token exacto (nombre de producto). No van al
// includes compacto: tienen 4 letras y matchearían "computadora".
const WORD_TYPES: Record<string, ViolationType> = {
  pelotudo: "insult",
  pelotuda: "insult",
  pelotudos: "insult",
  pelotudas: "insult",
  boludo: "insult",
  boluda: "insult",
  boludos: "insult",
  boludas: "insult",
  estupido: "insult",
  estupida: "insult",
  estupidos: "insult",
  estupidas: "insult",
  idiota: "insult",
  idiotas: "insult",
  imbecil: "insult",
  imbeciles: "insult",
  tarado: "insult",
  tarada: "insult",
  tarados: "insult",
  taradas: "insult",
  pajero: "insult",
  pajera: "insult",
  pajeros: "insult",
  pajeras: "insult",
  gilastrun: "insult",
  otario: "insult",
  otaria: "insult",
  mamerto: "insult",
  mamerta: "insult",
  papafrita: "insult",
  papanatas: "insult",
  ridiculo: "insult",
  ridicula: "insult",
  cornudo: "insult",
  cornuda: "insult",
  cagador: "insult",
  cagadora: "insult",
  cagadores: "insult",
  cagadoras: "insult",
  garca: "insult",
  garcas: "insult",
  cagon: "insult",
  cagona: "insult",
  cagones: "insult",
  choto: "insult",
  chota: "insult",
  chotos: "insult",
  chotas: "insult",
  conchudo: "insult",
  conchuda: "insult",
  conchudos: "insult",
  conchudas: "insult",
  sorete: "insult",
  soreta: "insult",
  soretes: "insult",
  lacra: "insult",
  lacras: "insult",
  escoria: "insult",
  degenerado: "insult",
  degenerada: "insult",
  mogolico: "discrimination",
  mogolica: "discrimination",
  mogolicos: "discrimination",
  mogolicas: "discrimination",
  subnormal: "discrimination",
  trolo: "discrimination",
  trola: "discrimination",
  trolos: "discrimination",
  trolas: "discrimination",
  maricon: "discrimination",
  maricones: "discrimination",
  marimacho: "discrimination",
  marimachos: "discrimination",
  marica: "discrimination",
  maricas: "discrimination",
  gay: "discrimination",
  gays: "discrimination",
  lesbiana: "discrimination",
  lesbianas: "discrimination",
  lesbiano: "discrimination",
  lesbianos: "discrimination",
  lesbo: "discrimination",
  lesbos: "discrimination",
  lela: "discrimination",
  lelas: "discrimination",
  tortillera: "discrimination",
  tortilleras: "discrimination",
  bollera: "discrimination",
  bolleras: "discrimination",
  fleto: "discrimination",
  fletos: "discrimination",
  travelo: "discrimination",
  travelos: "discrimination",
  sarasa: "discrimination",
  sarasas: "discrimination",
  puto: "discrimination",
  puta: "discrimination",
  putos: "discrimination",
  putas: "discrimination",
  verga: "sexual",
  vergas: "sexual",
  pija: "sexual",
  pijas: "sexual",
  poronga: "sexual",
  porongas: "sexual",
  garchar: "sexual",
  garchando: "sexual",
  garchado: "sexual",
  mierda: "insult",
  mierdas: "insult",
  carajo: "insult",
  carajos: "insult",
  hdp: "insult",
  hpd: "insult",
  lcdtm: "insult",
  lcdll: "insult",
  lpm: "insult",
  lpqtp: "insult",
  lrpm: "insult",
  lrpmqtp: "insult",
  ctm: "insult",
  csm: "insult",
  hijodeputa: "insult",
  hijadeputa: "insult",
}

const BLOCKED_WORDS = new Set(Object.keys(WORD_TYPES))

const PHRASES: Array<{ phrase: string; type: ViolationType }> = [
  { phrase: "hijo de puta", type: "insult" },
  { phrase: "hija de puta", type: "insult" },
  { phrase: "hijos de puta", type: "insult" },
  { phrase: "hijas de puta", type: "insult" },
  { phrase: "la puta que te pario", type: "insult" },
  { phrase: "la puta que te", type: "insult" },
  { phrase: "la concha de tu madre", type: "insult" },
  { phrase: "concha de tu madre", type: "insult" },
  { phrase: "concha de tu hermana", type: "insult" },
  { phrase: "andate a la concha", type: "insult" },
  { phrase: "anda a la concha", type: "insult" },
  { phrase: "andate a cagar", type: "insult" },
  { phrase: "anda a cagar", type: "insult" },
  { phrase: "andate a la mierda", type: "insult" },
  { phrase: "anda a la mierda", type: "insult" },
  { phrase: "chupame un huevo", type: "insult" },
  { phrase: "chupame los huevos", type: "insult" },
  { phrase: "chupame la pija", type: "sexual" },
  { phrase: "chupame la verga", type: "sexual" },
  { phrase: "me chupa un huevo", type: "insult" },
  { phrase: "me chupas un huevo", type: "insult" },
  { phrase: "cerra el orto", type: "insult" },
  { phrase: "cerra el culo", type: "insult" },
  { phrase: "callate pelotudo", type: "harassment" },
  { phrase: "callate boludo", type: "harassment" },
  { phrase: "te voy a matar", type: "threat" },
  { phrase: "te voy a cagar a palos", type: "threat" },
  { phrase: "te voy a romper la cabeza", type: "threat" },
  { phrase: "te voy a romper todo", type: "threat" },
  { phrase: "te voy a hacer mierda", type: "threat" },
  { phrase: "te hago mierda", type: "threat" },
  { phrase: "te rompo la cabeza", type: "threat" },
  { phrase: "te rompo todo", type: "threat" },
  { phrase: "te cago a trompadas", type: "threat" },
  { phrase: "te cago a pinas", type: "threat" },
  { phrase: "te voy a prender fuego", type: "threat" },
  { phrase: "ojala te mueras", type: "threat" },
  { phrase: "negro de mierda", type: "discrimination" },
  { phrase: "negra de mierda", type: "discrimination" },
  { phrase: "gordo de mierda", type: "discrimination" },
  { phrase: "gorda de mierda", type: "discrimination" },
  { phrase: "viejo de mierda", type: "discrimination" },
  { phrase: "vieja de mierda", type: "discrimination" },
  { phrase: "puto de mierda", type: "discrimination" },
  { phrase: "trolo de mierda", type: "discrimination" },
  { phrase: "maricon de mierda", type: "discrimination" },
  { phrase: "marica de mierda", type: "discrimination" },
  { phrase: "gay de mierda", type: "discrimination" },
  { phrase: "lesbiana de mierda", type: "discrimination" },
  { phrase: "tortillera de mierda", type: "discrimination" },
  { phrase: "sos un puto", type: "discrimination" },
  { phrase: "sos un trolo", type: "discrimination" },
  { phrase: "sos un maricon", type: "discrimination" },
  { phrase: "sos un gay", type: "discrimination" },
  { phrase: "sos una lesbiana", type: "discrimination" },
  { phrase: "sos un travelo", type: "discrimination" },
  { phrase: "mogolico de mierda", type: "discrimination" },
  { phrase: "retrasado mental", type: "discrimination" },
  { phrase: "discapacitado de mierda", type: "discrimination" },
  { phrase: "sos un pelotudo", type: "harassment" },
  { phrase: "sos una pelotuda", type: "harassment" },
  { phrase: "sos un boludo", type: "harassment" },
  { phrase: "sos una boluda", type: "harassment" },
  { phrase: "sos un idiota", type: "harassment" },
  { phrase: "sos un imbecil", type: "harassment" },
  { phrase: "sos un tarado", type: "harassment" },
  { phrase: "sos una tarada", type: "harassment" },
  { phrase: "sos un forro", type: "harassment" },
  { phrase: "sos una forra", type: "harassment" },
  { phrase: "sos un sorete", type: "harassment" },
  { phrase: "sos una mierda", type: "harassment" },
  { phrase: "sos una basura", type: "harassment" },
  { phrase: "sos un garca", type: "harassment" },
  { phrase: "sos un estafador", type: "harassment" },
  { phrase: "sos una estafadora", type: "harassment" },
  { phrase: "te voy a escrachar", type: "harassment" },
  { phrase: "te escracho", type: "harassment" },
  { phrase: "te voy a quemar", type: "threat" },
]

function isBlockedToken(token: string): ViolationType | null {
  if (WORD_TYPES[token]) return WORD_TYPES[token]
  const collapsed = collapseRepeats(token)
  if (WORD_TYPES[collapsed]) return WORD_TYPES[collapsed]
  return null
}

function alreadyCovered(matched: string[], item: string): boolean {
  const key = collapseRepeats(compact(item))
  return matched.some((existing) => {
    const existingKey = collapseRepeats(compact(existing))
    return existingKey === key || existingKey.includes(key)
  })
}

export function checkCommunityLanguage(...parts: Array<string | null | undefined>): LanguageCheck {
  const text = parts.filter(Boolean).join(" ")
  if (!text.trim()) return { violates: false }

  const compactText = collapseRepeats(compact(text))
  const matched: string[] = []
  let type: ViolationType | null = null

  for (const { phrase, type: phraseType } of PHRASES) {
    if (compactText.includes(collapseRepeats(compact(phrase))) && !alreadyCovered(matched, phrase)) {
      matched.push(phrase)
      if (!type) type = phraseType
    }
  }

  for (const token of tokens(text)) {
    const tokenType = isBlockedToken(token)
    if (!tokenType) continue
    const canonical = collapseRepeats(token)
    if (alreadyCovered(matched, canonical)) continue
    matched.push(token)
    if (!type) type = tokenType
  }

  // Spaced-out insults: "v e r g a" / "p e l o t u d o". Only 5+ letters
  // so "puta", "orto", "culo" don't match inside words like computadora.
  for (const word of BLOCKED_WORDS) {
    if (word.length >= 5 && compactText.includes(word) && !alreadyCovered(matched, word)) {
      matched.push(word)
      if (!type) type = WORD_TYPES[word]
    }
  }

  if (!type || matched.length === 0) return { violates: false }
  return { violates: true, type, matched }
}

export function communityLanguageRejection(...parts: Array<string | null | undefined>): string | null {
  const check = checkCommunityLanguage(...parts)
  if (!check.violates) return null
  const quoted = check.matched.map((word) => `«${word}»`).join(", ")
  const label = check.matched.length === 1 ? "No se admite" : "No se admiten"
  return `${COMMUNITY_LANGUAGE_MESSAGE} ${label}: ${quoted}.`
}

export function violatesCommunityLanguage(...parts: Array<string | null | undefined>): boolean {
  return checkCommunityLanguage(...parts).violates
}

export function flaggedLanguageTerms(...parts: Array<string | null | undefined>): string[] {
  const check = checkCommunityLanguage(...parts)
  return check.violates ? check.matched : []
}

function isFoldedWordChar(ch: string): boolean {
  return /[a-z0-9]/.test(ch)
}

function matchTermFrom(text: string, start: number, term: string): number | null {
  const needBoundary = !term.includes(" ")
  if (needBoundary && start > 0 && isFoldedWordChar(fold(text[start - 1] ?? ""))) {
    return null
  }

  let ti = 0
  let i = start
  while (ti < term.length) {
    if (i >= text.length) return null
    if (term[ti] === " ") {
      let saw = false
      while (i < text.length && !isFoldedWordChar(fold(text[i] ?? ""))) {
        saw = true
        i++
      }
      if (!saw) return null
      ti++
      continue
    }
    const f = fold(text[i] ?? "")
    if (!f) {
      i++
      continue
    }
    if (!isFoldedWordChar(f)) return null
    if (f !== term[ti]) return null
    const letter = term[ti]
    ti++
    i++
    while (i < text.length && fold(text[i] ?? "") === letter) i++
  }

  if (needBoundary && i < text.length && isFoldedWordChar(fold(text[i] ?? ""))) {
    return null
  }
  return i
}

export function findLanguageHighlightRanges(
  text: string,
  terms: string[],
): Array<{ start: number; end: number }> {
  if (!text || terms.length === 0) return []
  const foldedTerms = [...new Set(terms.map((term) => collapseRepeats(fold(term)).trim()).filter(Boolean))]
  const found: Array<{ start: number; end: number }> = []

  for (let start = 0; start < text.length; start++) {
    for (const term of foldedTerms) {
      const end = matchTermFrom(text, start, term)
      if (end != null && end > start) found.push({ start, end })
    }
  }

  found.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: Array<{ start: number; end: number }> = []
  for (const range of found) {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }
  return merged
}
