const SMALL_WORDS = new Set(["a", "al", "de", "del", "el", "la", "las", "los", "y", "e", "o", "u", "en", "con", "para", "por"])

function capitalizeFirstLetter(word: string): string {
  const chars = [...word]
  const idx = chars.findIndex((ch) => /\p{L}/u.test(ch))
  if (idx < 0) return word
  chars[idx] = chars[idx].toLocaleUpperCase("es-AR")
  return chars.join("")
}

function lettersOf(word: string): string {
  return [...word].filter((ch) => /\p{L}/u.test(ch)).join("")
}

/** Title case for listings. Blocks ALL CAPS; keeps mixed brands like iPhone. */
export function normalizeListingTitle(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ")
  if (!text) return ""

  return text
    .split(" ")
    .map((word, index) => {
      const letters = lettersOf(word)
      if (!letters) return word

      const lower = letters.toLocaleLowerCase("es-AR")
      const upper = letters.toLocaleUpperCase("es-AR")
      const isAllUpper = letters === upper && letters !== lower
      const isAllLower = letters === lower && letters !== upper
      const small = SMALL_WORDS.has(word.toLocaleLowerCase("es-AR"))

      if (isAllUpper) {
        if (small && index > 0) return word.toLocaleLowerCase("es-AR")
        if (letters.length <= 3) return word
        return capitalizeFirstLetter(word.toLocaleLowerCase("es-AR"))
      }

      if (isAllLower) {
        if (small && index > 0) return word
        return capitalizeFirstLetter(word)
      }

      if (index === 0) return capitalizeFirstLetter(word)
      return word
    })
    .join(" ")
}
