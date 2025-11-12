import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Encodes movie slug and source URL into a single URL-safe string
 * Uses base64url encoding for fast performance
 */
export function encodeMovieUrl(slug: string, sourceUrl: string): string {
  try {
    // Combine slug and source URL with a separator
    const combined = `${slug}|||${sourceUrl}`
    // Convert to base64url (URL-safe base64)
    const base64 = btoa(combined)
    // Make it URL-safe by replacing characters
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64url
  } catch (error) {
    console.error('Error encoding movie URL:', error)
    // Fallback to unencoded format
    return `${slug}?src=${encodeURIComponent(sourceUrl)}`
  }
}

/**
 * Decodes an encoded movie URL back to slug and source URL
 */
export function decodeMovieUrl(encoded: string): { slug: string; sourceUrl: string } | null {
  try {
    // Restore base64 padding and convert back from URL-safe format
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding
    while (base64.length % 4) {
      base64 += '='
    }
    // Decode base64
    const decoded = atob(base64)
    // Split by separator
    const parts = decoded.split('|||')
    if (parts.length === 2) {
      return {
        slug: parts[0],
        sourceUrl: parts[1]
      }
    }
    return null
  } catch (error) {
    console.error('Error decoding movie URL:', error)
    return null
  }
}

/**
 * Encodes VlyxDrive URL parameters into a secure key
 * Supports both driveid and link parameters
 */
export function encodeVlyxDriveParams(params: {
  link?: string
  driveid?: string
  tmdbid?: string
  season?: string
  server?: string
}): string {
  try {
    // Create a JSON string of non-null parameters
    const cleanParams: Record<string, string> = {}
    if (params.link) cleanParams.link = params.link
    if (params.driveid) cleanParams.driveid = params.driveid
    if (params.tmdbid) cleanParams.tmdbid = params.tmdbid
    if (params.season) cleanParams.season = params.season
    if (params.server) cleanParams.server = params.server

    const json = JSON.stringify(cleanParams)
    // Convert to base64url (URL-safe base64)
    const base64 = btoa(json)
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64url
  } catch (error) {
    console.error('Error encoding VlyxDrive params:', error)
    return ''
  }
}

/**
 * Decodes VlyxDrive key back to original parameters
 */
export function decodeVlyxDriveParams(key: string): {
  link?: string
  driveid?: string
  tmdbid?: string
  season?: string
  server?: string
} | null {
  try {
    // Restore base64 padding and convert back from URL-safe format
    let base64 = key.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    // Decode base64
    const decoded = atob(base64)
    // Parse JSON
    const params = JSON.parse(decoded)
    return params
  } catch (error) {
    console.error('Error decoding VlyxDrive params:', error)
    return null
  }
}

/**
 * Encodes N-Cloud URL parameters into a secure key
 */
export function encodeNCloudParams(params: {
  id: string
  title?: string
  poster?: string
  url?: string
}): string {
  try {
    const cleanParams: Record<string, string> = {}
    cleanParams.id = params.id
    if (params.title) cleanParams.title = params.title
    if (params.poster) cleanParams.poster = params.poster
    if (params.url) cleanParams.url = params.url

    const json = JSON.stringify(cleanParams)
    const base64 = btoa(json)
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64url
  } catch (error) {
    console.error('Error encoding N-Cloud params:', error)
    return ''
  }
}

/**
 * Decodes N-Cloud key back to original parameters
 */
export function decodeNCloudParams(key: string): {
  id: string
  title?: string
  poster?: string
  url?: string
} | null {
  try {
    let base64 = key.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const decoded = atob(base64)
    const params = JSON.parse(decoded)
    return params
  } catch (error) {
    console.error('Error decoding N-Cloud params:', error)
    return null
  }
}

/**
 * Replaces VCloud/HubCloud variations with N-Cloud in any text
 */
export function replaceVCloudText(text: string): string {
  if (!text) return text

  return text
    .replace(/\bHub-Cloud\b/g, 'N-Cloud')
    .replace(/\bHubCloud\b/g, 'N-Cloud')
    .replace(/\bhub-cloud\b/gi, 'N-Cloud')
    .replace(/\bHub cloud\b/g, 'N cloud')
    .replace(/\bV-Cloud\b/g, 'N-Cloud')
    .replace(/\bVCloud\b/g, 'N-Cloud')
    .replace(/\bvCloud\b/g, 'N-Cloud')
    .replace(/\bv-cloud\b/gi, 'N-Cloud')
    .replace(/\bV cloud\b/g, 'N cloud')
    .replace(/\bv cloud\b/g, 'n cloud')
}

/**
 * Replaces NextDrive variations with Vlyx-Drive in any text
 */
export function replaceNextDriveText(text: string): string {
  if (!text) return text

  return text
    .replace(/\bNext-Drive\b/g, 'Vlyx-Drive')
    .replace(/\bNextDrive\b/g, 'Vlyx-Drive')
    .replace(/\bNext-drive\b/g, 'Vlyx-Drive')
    .replace(/\bnext-drive\b/gi, 'vlyx-drive')
    .replace(/\bNext drive\b/g, 'Vlyx drive')
    .replace(/\bnext drive\b/g, 'vlyx drive')
    .replace(/\bNextdrive\b/g, 'Vlyxdrive')
}

/**
 * Replaces all branding text (VCloud and NextDrive)
 */
export function replaceBrandingText(text: string): string {
  if (!text) return text

  let result = replaceVCloudText(text)
  result = replaceNextDriveText(result)

  return result
}

/**
 * Cleans movie title for homepage display - shows only up to opening bracket (excludes year)
 * Example: "Following (2024) AMZN-WEB-DL Dual Audio {Hindi-Korean} 480p [370MB]"
 * Returns: "Following"
 */
export function cleanMovieTitleForHome(title: string): string {
  if (!title) return ""

  // Match everything before the first opening bracket
  const match = title.match(/^([^(]+)/)

  if (match) {
    return match[1].trim()
  }

  // Fallback: return original title
  return title.trim()
}

/**
 * Splits movie title for search results into title and subtitle
 * Title: Everything up to dual language indicators (Hindi, English, Dual Audio, etc.)
 * Subtitle: Rest of the technical information
 *
 * Example: "Panchayat (2020) Season 1 Hindi Complete Prime Video WEB Series 480p [90MB]"
 * Returns: { title: "Panchayat (2020) Season 1", subtitle: "Hindi Complete Prime Video WEB Series 480p [90MB]" }
 */
export function splitMovieTitle(title: string): { title: string; subtitle: string } {
  if (!title) return { title: "", subtitle: "" }

  // Language/format indicators that typically mark the start of technical info
  const indicators = [
    "Hindi",
    "English",
    "Tamil",
    "Telugu",
    "Malayalam",
    "Kannada",
    "Korean",
    "Japanese",
    "Chinese",
    "Dual Audio",
    "Multi Audio",
    "WEB-DL",
    "WEBRip",
    "HDRip",
    "BluRay",
    "DVDRip",
    "Prime Video",
    "Netflix",
    "Hotstar",
    "480p",
    "720p",
    "1080p",
    "2160p",
    "4K"
  ]

  // Find the first occurrence of any indicator
  let splitIndex = -1
  let matchedIndicator = ""

  for (const indicator of indicators) {
    const index = title.indexOf(indicator)
    if (index !== -1 && (splitIndex === -1 || index < splitIndex)) {
      splitIndex = index
      matchedIndicator = indicator
    }
  }

  if (splitIndex > 0) {
    // Split at the indicator
    const mainTitle = title.substring(0, splitIndex).trim()
    const subtitle = title.substring(splitIndex).trim()

    return {
      title: mainTitle,
      subtitle: subtitle
    }
  }

  // If no indicator found, try to split at common patterns
  // Look for patterns like "Season X" followed by technical info
  const seasonMatch = title.match(/^(.+?(?:Season\s+\d+|S\d+(?:E\d+)?))(.+)$/i)
  if (seasonMatch && seasonMatch[2].trim().length > 0) {
    return {
      title: seasonMatch[1].trim(),
      subtitle: seasonMatch[2].trim()
    }
  }

  // Fallback: return full title with empty subtitle
  return {
    title: title.trim(),
    subtitle: ""
  }
}

/**
 * Truncates subtitle to a maximum length with ellipsis
 */
export function truncateSubtitle(subtitle: string, maxLength: number = 80): string {
  if (!subtitle || subtitle.length <= maxLength) return subtitle

  return subtitle.substring(0, maxLength).trim() + "..."
}

/**
 * Transforms pixeldrain URLs from /u/{file-code} format to /api/file/{file-code}
 * Works with any pixeldrain domain (.dev, .com, .xyz, etc.)
 *
 * Example:
 * Input: https://pixeldrain.dev/u/abc123
 * Output: https://pixeldrain.dev/api/file/abc123
 */
export function transformPixeldrainUrl(url: string): string {
  if (!url) return url

  try {
    // Check if URL contains "pixeldrain" (case-insensitive)
    if (!/pixeldrain/i.test(url)) {
      return url
    }

    // Pattern to match pixeldrain URLs with /u/ format
    // Matches: https://pixeldrain.{any-tld}/u/{file-code}
    const pixeldrainPattern = /(https?:\/\/[^\/]*pixeldrain[^\/]*)(\/u\/)([^\/\?#]+)/i

    // Replace /u/ with /api/file/
    const transformed = url.replace(pixeldrainPattern, '$1/api/file/$3')

    return transformed
  } catch (error) {
    console.error('Error transforming pixeldrain URL:', error)
    return url
  }
}

/**
 * Scans a movie title for language keywords and determines the appropriate badge.
 *
 * Rules:
 * 1. If exactly one language is found, return that language's name.
 * 2. If two or more languages are found, return "Multi Audio".
 * 3. If no languages are found, return null.
 */
export function getLanguageBadge(title: string): string | null {
  if (!title) return null

  const languages = [
    "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
    "Bengali", "Marathi", "Punjabi", "Gujarati", "Odia",
    "Assamese", "Urdu", "Bhojpuri"
  ]

  const foundLanguages = new Set<string>()
  const lowercasedTitle = title.toLowerCase()

  for (const lang of languages) {
    // Use a regex to match the language as a whole word to avoid partial matches (e.g., "Mala" in "Malayalam")
    // The pattern accounts for word boundaries like spaces, parentheses, commas, etc.
    const regex = new RegExp(`\\b${lang.toLowerCase()}\\b`, 'i')
    if (regex.test(lowercasedTitle)) {
      foundLanguages.add(lang)
    }
  }

  if (foundLanguages.size > 1) {
    return "Multi Audio"
  }

  if (foundLanguages.size === 1) {
    return Array.from(foundLanguages)[0]
  }

  return null
}
