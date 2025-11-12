"use client"

import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { decodeNCloudParams, replaceBrandingText, transformPixeldrainUrl } from "@/lib/utils"
import { ChevronLeft, Download, Play, Sparkles, Loader2, CheckCircle2, AlertCircle, X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DownloadLink {
url: string
label: string
isTrusted: boolean
originalText: string
}

interface ProcessLog {
message: string
type: "info" | "success" | "error"
timestamp: Date
}

export default function NCloudPage() {
const location = useLocation()
const navigate = useNavigate()
const searchParams = new URLSearchParams(location.search)
const key = searchParams.get("key")
const directUrl = searchParams.get("url")
const action = searchParams.get("action") as "stream" | "download" | null

// Decode parameters from key (backward compatible) or use direct URL
let params: { id: string; title: string; poster: string; sourceUrl?: string }

if (directUrl) {
// Direct URL fallback method - use the full URL
params = {
id: "", // Not needed when we have full URL
title: action === "stream" ? "N-Cloud Stream" : "N-Cloud Download",
poster: "/placeholder.svg",
sourceUrl: directUrl, // Store the full URL
}
} else if (key) {
// Try to decode the key
const decoded = decodeNCloudParams(key)
if (decoded && decoded.url) {
// If we have the full URL, use it (PREFERRED)
params = {
id: decoded.id || "",
title: decoded.title || "Unknown Title",
poster: decoded.poster || "/placeholder.svg",
sourceUrl: decoded.url, // Use the full URL from the encoded params
}
} else if (decoded && decoded.id) {
// Fallback to ID only (legacy)
params = {
id: decoded.id,
title: decoded.title || "Unknown Title",
poster: decoded.poster || "/placeholder.svg",
sourceUrl: undefined,
}
} else {
// If decoding fails, fallback to empty
params = {
id: "",
title: "Unknown Title",
poster: "/placeholder.svg",
}
}
} else {
// Legacy direct parameters
const legacyUrl = searchParams.get("url")
params = {
id: searchParams.get("id") || "",
title: searchParams.get("title") || "Unknown Title",
poster: searchParams.get("poster") || "/placeholder.svg",
sourceUrl: legacyUrl || undefined,
}
}

const { id, title, poster, sourceUrl } = params

// Apply branding replacement to title
const displayTitle = replaceBrandingText(title)

const [logs, setLogs] = useState<ProcessLog[]>([])
const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([])
const [isProcessing, setIsProcessing] = useState(true)
const [error, setError] = useState<string | null>(null)
const [originalUrl, setOriginalUrl] = useState<string | undefined>()
const [selectedLink, setSelectedLink] = useState<DownloadLink | null>(null)
const [isZipFile, setIsZipFile] = useState(false)
const [showLogs, setShowLogs] = useState(false)
const [showMoreOptions, setShowMoreOptions] = useState(false)
const [showStreamingPopup, setShowStreamingPopup] = useState(false)
const [streamingUrl, setStreamingUrl] = useState<string | undefined>()
const [detectedOS, setDetectedOS] = useState<string | undefined>()
const [showMxProModal, setShowMxProModal] = useState(false)
const [showDesktopHelpModal, setShowDesktopHelpModal] = useState(false)
const [desktopHelpType, setDesktopHelpType] = useState<"windows" | "mac">("windows")
const statusRef = useRef<HTMLDivElement>(null)

const colorClasses = [
"bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700",
"bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700",
"bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700",
"bg-gradient-to-r from-sky-700 to-sky-600 hover:from-sky-800 hover:to-sky-700",
"bg-gradient-to-r from-fuchsia-700 to-fuchsia-600 hover:from-fuchsia-800 hover:to-fuchsia-700",
]

const trustedPatterns = [
{ name: "Pub-Dev", regex: /pub-.*?\.dev/i },
{ name: "FSL Server", regex: /fsl\.gigabytes\.click/i },
]

// Process the N-Cloud link on mount or when parameters change
useEffect(() => {
// Define addLog inside useEffect to avoid closure issues
const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
setLogs((prev) => [...prev, { message, type, timestamp: new Date() }])
setTimeout(() => {
if (statusRef.current) {
statusRef.current.scrollTop = statusRef.current.scrollHeight
}
}, 100)
}

const processLink = async () => {
console.log("useEffect triggered - id:", id, "sourceUrl:", sourceUrl)

// Check if we have either sourceUrl or id
if (!sourceUrl && !id) {
console.log("NOT processing - missing both id and sourceUrl")
setError("Missing N-Cloud URL or ID")
setIsProcessing(false)
return
}

try {
console.log("Starting processing...")
setIsProcessing(true)
setError(null)
addLog("Starting N-Cloud link processing...")

// Step 1: Determine the URL to fetch
let ncloudUrl: string

if (sourceUrl) {
// PREFERRED: Use the full URL directly (no reconstruction needed!)
ncloudUrl = sourceUrl
setOriginalUrl(sourceUrl) // Store for manual fallback
addLog(`Step 1: Using provided URL: ${ncloudUrl}`)

// Detect type for logging
try {
const hostname = new URL(sourceUrl).hostname.toLowerCase()
if (hostname.includes('hubcloud')) {
addLog(`Detected Hub-Cloud URL`)
} else if (hostname.includes('vcloud')) {
addLog(`Detected V-Cloud URL`)
}
} catch (e) {
console.error("Error parsing URL:", e)
}
} else if (id) {
// FALLBACK: Reconstruct URL from ID (legacy support)
addLog(`Step 1: Reconstructing URL from ID: ${id}`)
ncloudUrl = `https://vcloud.zip/${id}` // Default to vcloud
setOriginalUrl(ncloudUrl) // Store for manual fallback
addLog(`⚠️ Warning: Using fallback URL construction. Prefer passing full URL.`)
} else {
throw new Error("No URL or ID provided")
}

addLog(`Step 2: Fetching N-Cloud page...`)
addLog(`🔗 Source URL: ${ncloudUrl}`, "info")

const response = await fetch("/api/process-url", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ url: ncloudUrl }),
})

if (!response.ok) throw new Error("Failed to fetch N-Cloud page")

const data = await response.json()
addLog("Received response from N-Cloud page")

if (!data.success) {
  throw new Error(data.error || "Processing failed");
}

const { links, pageTitle, isZipFile: isZip } = data.data;

addLog(`📄 Page Title: ${pageTitle}`, "success")

setIsZipFile(isZip)

if (isZip) {
addLog("File type detected as ZIP, download only.")
} else {
addLog("Playable media detected, offering stream/download options.")
}

addLog("Parsing and sorting links...")

if (links.length === 0) {
throw new Error("No valid download links found after filtering")
}

// The links are already sorted by the backend
setDownloadLinks(links)
addLog("Process completed successfully!", "success")
setIsProcessing(false)
} catch (err: any) {
console.error("Processing failed:", err)
addLog(`Error: ${err.message}`, "error")
setError(err.message)
setIsProcessing(false)
}
}

processLink()
}, [id, sourceUrl])

const handleLinkClick = (link: DownloadLink) => {
if (isZipFile) {
window.open(link.url, "_blank")
} else if (action) {
// If action parameter is present, automatically perform that action
if (action === "stream") {
// Show streaming popup instead of direct action
setStreamingUrl(link.url)
setShowStreamingPopup(true)
} else if (action === "download") {
handleDownload(link.url)
}
} else {
// No action parameter, show the two-option prompt
setSelectedLink(link)
}
}

// OS Detection function
const detectOS = (): string => {
if (typeof window === 'undefined') return 'Other'

const userAgent = window.navigator.userAgent
const platform = window.navigator.platform
const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']
const iosPlatforms = ['iPhone', 'iPad', 'iPod']

if (macosPlatforms.indexOf(platform) !== -1) return 'Mac'
if (iosPlatforms.indexOf(platform) !== -1) return 'iOS'
if (windowsPlatforms.indexOf(platform) !== -1) return 'Windows'
if (/Android/.test(userAgent)) return 'Android'
return 'Other'
}

// Download M3U file function
const downloadM3u = (url: string) => {
const m3uContent = `#EXTM3U\n#EXTINF:-1,Stream\n${url}`
const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' })
const link = document.createElement('a')
link.href = URL.createObjectURL(blob)
link.download = 'stream.m3u'
document.body.appendChild(link)
link.click()
document.body.removeChild(link)
URL.revokeObjectURL(link.href)
}

// Detect OS when streaming popup opens
useEffect(() => {
if (showStreamingPopup && !detectedOS) {
setDetectedOS(detectOS())
}
}, [showStreamingPopup, detectedOS])

const handleWatchOnline = (url: string) => {
// Show streaming popup instead of directly launching
setStreamingUrl(url)
setShowStreamingPopup(true)
setSelectedLink(null)
}

const handleDownload = (url: string) => {
window.open(url, "_blank")
setSelectedLink(null)
}

if (!id && !sourceUrl) {
return (
<div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
<AlertCircle className="w-16 h-16 text-red-500 mb-4" />
<h1 className="text-2xl font-bold mb-2">Invalid URL</h1>
<p className="text-gray-400">Missing N-Cloud URL or ID parameter</p>
<Button onClick={() => navigate(-1)} className="mt-6">
Go Back
</Button>
</div>
)
}

// Blacklist filter - hide specific useless servers
const isBlacklistedServer = (link: DownloadLink): boolean => {
const blacklistedPatterns = [
/10gbps/i,
/gpdl2\.hubcdn\.fans/i,
/server.*:.*10gbps/i
]

return blacklistedPatterns.some(pattern =>
pattern.test(link.label) || pattern.test(link.url)
)
}

// Filter out blacklisted servers, but keep them if they're the only option
const filteredLinks = downloadLinks.length === 1
? downloadLinks
: downloadLinks.filter(link => !isBlacklistedServer(link))

const trustedLinks = filteredLinks.filter((l) => l.isTrusted)
const otherLinks = filteredLinks.filter((l) => !l.isTrusted)

return (
<div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
{/* Animated background elements */}
<div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05] z-0" />
<div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full filter blur-3xl animate-blob" />
<div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000" />
<div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000" />

<div className="relative z-10 w-full max-w-lg mx-auto">
{/* Header */}
<header className="flex justify-start w-full">
<Button
onClick={() => navigate(-1)}
variant="outline"
className="mb-6 bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
>
<ChevronLeft className="w-4 h-4 mr-2" />
Back
</Button>
</header>

{/* Hero Section */}
<section className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 w-full p-4">
{/* Poster */}
<div className="flex-shrink-0">
<div className="relative group">
<div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-60 group-hover:opacity-90 transition duration-500 animate-tilt"></div>
<img
src={poster}
alt={displayTitle}
className="relative w-40 sm:w-48 lg:w-56 h-auto rounded-xl shadow-2xl ring-1 ring-white/10"
/>
</div>
</div>

{/* Title and Status */}
<div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300">
{displayTitle}
</h1>

{/* Status Indicator */}
<div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-lg border border-white/10">
{isProcessing ? (
<>
<Loader2 className="w-4 h-4 animate-spin text-blue-400" />
<span className="text-gray-300">Processing your link...</span>
</>
) : error ? (
<>
<AlertCircle className="w-4 h-4 text-red-400" />
<span className="text-red-400">Processing failed</span>
</>
) : (
<>
<CheckCircle2 className="w-4 h-4 text-green-400" />
<span className="text-gray-200">
{action === "stream" ? "Ready to stream" : "Ready to download"}
</span>
</>
)}
</div>
</div>
</section>

{/* Server Options - Appears smoothly after processing */}
{!isProcessing && !error && downloadLinks.length > 0 && (
<section className="w-full mt-8 space-y-4">
{/* Show all servers directly if no trusted servers, otherwise show only trusted ones */}
{(trustedLinks.length > 0 ? trustedLinks : otherLinks).length > 0 && (
<div className="space-y-4">
{trustedLinks.length > 0 && (
<div className="text-center font-semibold text-lg text-gray-200 tracking-wide animate-fade-in-down">
<Sparkles className="w-5 h-5 inline-block mr-2 text-yellow-400" />
{action === "stream" ? "Recommended Servers • Streaming" : "Recommended Servers"}
<Sparkles className="w-5 h-5 inline-block ml-2 text-yellow-400" />
</div>
)}

{(trustedLinks.length > 0 ? trustedLinks : otherLinks).map((link, index) => (
<div
key={index}
className="group animate-slide-in-left"
style={{ animationDelay: `${index * 100}ms` }}
>
<button
onClick={() => handleLinkClick(link)}
className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl p-[2px] transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20"
>
<div className="flex items-center justify-between w-full bg-gray-900/80 backdrop-blur-xl rounded-2xl px-4 py-3">
<div className="flex items-center gap-4">
<div className="text-lg font-bold text-white bg-white/10 rounded-full w-8 h-8 flex items-center justify-center">
{action === "stream" ? (
<Play className="w-5 h-5 text-green-400" />
) : (
<Download className="w-5 h-5 text-blue-400" />
)}
</div>
<div>
<p className="text-lg font-bold text-white text-left">{link.label}</p>
<p className="text-xs text-gray-400 text-left">
{trustedLinks.length > 0
? (action === "stream" ? "Trusted • Fast Streaming" : "Trusted • Fast Download")
: (action === "stream" ? "Available Server • Stream" : "Available Server")}
</p>
</div>
</div>
<ChevronLeft className="w-6 h-6 text-gray-500 transform transition-transform duration-300 group-hover:translate-x-1" />
</div>
</button>

{/* Expanded actions for selected link */}
{selectedLink?.url === link.url && !isZipFile && (
<div className="mt-2 grid grid-cols-2 gap-2 animate-fade-in">
<button
onClick={() => handleWatchOnline(link.url)}
className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/30"
>
<Play className="w-5 h-5" /> Watch
</button>
<button
onClick={() => handleDownload(link.url)}
className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-sky-500/30"
>
<Download className="w-5 h-5" /> Download
</button>
</div>
)}
</div>
))}
</div>
)}

{/* Alternative Options - Only show if we have trusted servers AND other servers */}
{trustedLinks.length > 0 && otherLinks.length > 0 && (
<div className="pt-4">
<button
onClick={() => setShowMoreOptions(!showMoreOptions)}
className="w-full text-center py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-all duration-300 text-sm font-medium"
>
{showMoreOptions ? "Hide" : "Show"} {otherLinks.length} Alternative Server{otherLinks.length > 1 ? "s" : ""}
</button>

{showMoreOptions && (
<div className="mt-4 space-y-3">
{otherLinks.map((link, index) => (
<div
key={index}
className="group animate-slide-in-left"
style={{ animationDelay: `${index * 50}ms` }}
>
<button
onClick={() => handleLinkClick(link)}
className={`w-full ${colorClasses[index % colorClasses.length]} rounded-xl p-[2px] transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl`}
>
<div className="flex items-center justify-between w-full bg-gray-900/80 backdrop-blur-xl rounded-xl px-4 py-3">
<div className="flex items-center gap-3">
<div className="text-sm font-bold text-white bg-white/10 rounded-full w-6 h-6 flex items-center justify-center">
{action === "stream" ? (
<Play className="w-4 h-4 text-green-300" />
) : (
<>{index + 1}</>
)}
</div>
<div>
<p className="text-base font-semibold text-white text-left">{link.label}</p>
<p className="text-xs text-gray-400 text-left">
{action === "stream" ? "Alternative Server • Stream" : "Alternative Server"}
</p>
</div>
</div>
<ChevronLeft className="w-5 h-5 text-gray-500 transform transition-transform duration-300 group-hover:translate-x-1" />
</div>
</button>

{selectedLink?.url === link.url && !isZipFile && (
<div className="mt-2 grid grid-cols-2 gap-2 animate-fade-in">
<button
onClick={() => handleWatchOnline(link.url)}
className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-all duration-300"
>
<Play className="w-4 h-4" /> Watch
</button>
<button
onClick={() => handleDownload(link.url)}
className="flex items-center justify-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white text-sm font-medium transition-all duration-300"
>
<Download className="w-4 h-4" /> Download
</button>
</div>
)}
</div>
))}
</div>
)}
</div>
)}
</section>
)}

{/* Error State */}
{!isProcessing && error && (
<section className="mt-8 w-full bg-red-900/30 border border-red-500/50 rounded-2xl p-6 text-center animate-fade-in-down">
<div className="flex flex-col items-center gap-4">
<AlertCircle className="w-12 h-12 text-red-400" />
<h2 className="text-2xl font-bold text-white">We're Sorry!</h2>
<p className="text-red-300">Automatic extraction failed</p>
<p className="text-xs text-red-400/80 bg-black/30 rounded p-2 font-mono">
Error details: {error}
</p>

{originalUrl && (
<div className="mt-4 text-center">
<p className="text-gray-300 mb-4">
Don't worry! You can still proceed manually to download your content.
</p>
<button
onClick={() => window.open(originalUrl, "_blank")}
className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-3"
>
<Download className="w-5 h-5" />
Proceed Manually to Download
</button>
<p className="text-xs text-gray-500 mt-2">
This will open the original page where you can manually download the content
</p>
</div>
)}
</div>
</section>
)}

{/* Hidden Debug Logs - Click on footer text to reveal */}
<footer className="w-full text-center mt-12">
<button
onClick={() => setShowLogs(!showLogs)}
className="mx-auto block text-xs text-gray-600 hover:text-gray-400 transition-colors duration-300 opacity-30 hover:opacity-100"
>
{showLogs ? "Hide" : "Show"} Debug Info
</button>

{showLogs && (
<div className="mt-4 text-left max-w-full mx-auto animate-fade-in-up">
<h3 className="text-sm font-semibold text-gray-400 mb-2">Process Logs</h3>
<div
ref={statusRef}
className="bg-black/60 rounded-lg h-48 overflow-y-auto font-mono text-xs text-gray-400 p-3 custom-scrollbar"
>
{logs.length === 0 ? (
<span>No logs yet...</span>
) : (
logs.map((log, index) => (
<div
key={index}
className={
log.type === "error"
? "text-red-400"
: log.type === "success"
? "text-green-400"
: "text-gray-400"
}
>
[{log.timestamp.toLocaleTimeString()}] {log.message}
</div>
))
)}
</div>
</div>
)}
</footer>
</div>

{/* Streaming Popup Modal - Redesigned Beautiful Version */}
{showStreamingPopup && (
<Dialog open={showStreamingPopup} onOpenChange={setShowStreamingPopup}>
<DialogContent className="bg-transparent border-0 p-0 max-w-md w-full overflow-hidden">
<div className="relative bg-gray-900/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl text-white">
{/* Animated Background Gradient */}
<div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/20 via-transparent to-blue-600/20 z-0" />

{/* Close Button - Floating */}
<button
onClick={() => setShowStreamingPopup(false)}
className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 backdrop-blur-xl transition-all duration-300 group"
>
<X className="w-5 h-5 text-gray-300 group-hover:text-white" />
</button>

{/* Content Container */}
<div className="relative z-10 p-6 sm:p-8 space-y-6">
{/* Elegant Header */}
<div className="text-center">
<div className="inline-block p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-3 shadow-lg">
<Play className="w-8 h-8 text-white" />
</div>
<DialogHeader>
<DialogTitle className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300">
Choose Your Player
</DialogTitle>
<p className="text-gray-400 mt-1">Select the best option for your device</p>
</DialogHeader>
</div>

{/* Important Notice Banner */}
<div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-3 flex items-center gap-3">
<AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
<p className="text-sm text-yellow-300">
If playback fails, try selecting a different server from the previous page
</p>
</div>

{/* Device Selector - Premium Style */}
<div className="relative">
<select
value={detectedOS}
onChange={(e) => setDetectedOS(e.target.value)}
className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-xl px-4 py-3.5 pr-10 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none cursor-pointer hover:bg-white/10 text-base font-medium"
>
<option value="iOS">📱 iOS (iPhone/iPad)</option>
<option value="Android">🤖 Android</option>
<option value="Windows">🪟 Windows</option>
<option value="Mac">🍎 macOS</option>
<option value="Other">🐧 Other (Linux, etc)</option>
</select>
<ChevronLeft className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
</div>

{/* Player Options - Beautiful Cards */}
<div className="space-y-4">
{/* iOS Options */}
{detectedOS === 'iOS' && (
<div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-4 text-center">
<img src="/vlc-icon.png" alt="VLC" className="w-16 h-16" />
<h4 className="text-xl font-bold">VLC Player</h4>
<p className="text-sm text-gray-400">Best choice for iOS devices</p>
<div className="w-full bg-green-500/20 text-green-300 text-xs font-bold py-1 px-2 rounded-full">
Recommended
</div>
<div className="grid grid-cols-2 gap-3 w-full mt-2">
<a
href={`vlc://stream?url=${encodeURIComponent(streamingUrl!)}`}
className="text-center bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-8 py-3.5 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
>
Play Now
</a>
<a
href="https://apps.apple.com/us/app/vlc-for-mobile/id650377962"
target="_blank"
rel="noopener noreferrer"
className="text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl px-8 py-3 transition-all duration-300"
>
Install VLC
</a>
</div>
</div>
)}

{/* Android Options */}
{detectedOS === 'Android' && (
<div className="space-y-3">
{/* VLC */}
<div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3">
<div className="flex items-center gap-3">
<img src="/vlc-icon.png" alt="VLC" className="w-10 h-10" />
<div>
<h5 className="font-bold text-white">VLC Player</h5>
<p className="text-xs text-gray-400">Most Reliable</p>
</div>
</div>
<a
href={`intent://${streamingUrl!.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=org.videolan.vlc;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.videolan.vlc')};end`}
className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-6 py-2.5 transition-all duration-300 transform hover:scale-105 shadow-lg flex-shrink-0"
>
Play
</a>
</div>

{/* MX Player */}
<div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3">
<div className="flex items-center gap-3">
<img src="/mx-player-icon.png" alt="MX Player" className="w-10 h-10" />
<div>
<h5 className="font-bold text-white">MX Player</h5>
<p className="text-xs text-gray-400">Popular Android player</p>
</div>
</div>
<a
href={`intent://${streamingUrl!.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad')};end`}
className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl px-6 py-2.5 transition-all duration-300 transform hover:scale-105 shadow-lg flex-shrink-0"
>
Play
</a>
</div>

{/* Other Players */}
<div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 text-center">
<h4 className="text-lg font-bold">Other Players</h4>
<p className="text-sm text-gray-400">Choose from your installed apps</p>
<div className="grid grid-cols-2 gap-3 w-full mt-2">
<a
href={`intent://${streamingUrl!.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;type=video/*;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.videolan.vlc')};end`}
className="text-center bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl px-5 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg"
>
Choose Player
</a>
<button
onClick={() => setShowMxProModal(true)}
className="text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl px-5 py-3 transition-all duration-300"
>
Get MX Pro
</button>
</div>
</div>
</div>
)}

{/* Windows Options */}
{detectedOS === 'Windows' && (
<div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-4 text-center">
<img src="/vlc-icon.png" alt="VLC" className="w-16 h-16" />
<h4 className="text-xl font-bold">VLC Media Player</h4>
<p className="text-sm text-gray-400">Click below to open in VLC</p>
<a
href={`vlc://${streamingUrl}`}
className="w-full sm:w-auto text-center bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-10 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
>
Launch VLC
</a>
<button
onClick={() => {
downloadM3u(streamingUrl!)
setDesktopHelpType('windows')
setShowDesktopHelpModal(true)
}}
className="text-blue-400 hover:text-blue-300 text-sm font-medium underline"
>
Having trouble? Try the .m3u file method
</button>
</div>
)}

{/* Mac & Other Options */}
{(detectedOS === 'Mac' || detectedOS === 'Other') && (
<div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-4 text-center">
<img src="/vlc-icon.png" alt="VLC" className="w-16 h-16" />
<h4 className="text-xl font-bold">VLC Media Player</h4>
<p className="text-sm text-gray-400">Download playlist file to play in VLC</p>
<button
onClick={() => {
downloadM3u(streamingUrl!)
setDesktopHelpType('mac')
setShowDesktopHelpModal(true)
}}
className="w-full sm:w-auto text-center bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl px-10 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
>
Download .m3u File
</button>
</div>
)}
</div>
</div>
</div>
</DialogContent>
</Dialog>
)}

{/* MX Player Pro Download Modal - Beautiful Design */}
<Dialog open={showMxProModal} onOpenChange={setShowMxProModal}>
<DialogContent className="bg-transparent border-0 p-0 max-w-sm w-full">
<div className="relative bg-gray-900/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl text-white p-6 sm:p-8">
{/* Gradient Background */}
<div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/10 via-transparent to-blue-600/10 z-0" />

<div className="relative z-10 text-center">
<div className="inline-block p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-3 shadow-lg">
<Download className="w-6 h-6 text-white" />
</div>
<DialogHeader>
<DialogTitle className="text-2xl font-bold text-white">
Installation Guide
</DialogTitle>
</DialogHeader>

<p className="text-sm text-gray-400 mt-4 mb-6">
MX Player Pro has been removed from the Play Store. You can download the APK from trusted third-party sources.
</p>

<div className="text-left bg-black/30 rounded-lg p-4 space-y-3">
<h4 className="font-semibold text-white">Installation Steps:</h4>
<ol className="text-sm text-gray-300 list-decimal list-inside space-y-2">
<li>Click the button below to visit a trusted source</li>
<li>Search for "MX Player Pro" on the website</li>
<li>Download the latest APK file</li>
<li>Install and allow from unknown sources if prompted</li>
</ol>
</div>

<div className="mt-6 flex gap-3">
<Button
onClick={() => setShowMxProModal(false)}
className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
>
Close
</Button>
<a
href="https://vlyx-mod.vercel.app/"
target="_blank"
rel="noopener noreferrer"
className="flex-1 text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg px-4 py-2.5 transition-all duration-300 transform hover:scale-105 shadow-lg"
>
Visit Site
</a>
</div>
</div>
</div>
</DialogContent>
</Dialog>

{/* Desktop Help Modal - Beautiful Design */}
<Dialog open={showDesktopHelpModal} onOpenChange={setShowDesktopHelpModal}>
<DialogContent className="bg-transparent border-0 p-0 max-w-sm w-full">
<div className="relative bg-gray-900/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl text-white p-6 sm:p-8">
{/* Gradient Background */}
<div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-600/10 via-transparent to-red-600/10 z-0" />

<div className="relative z-10 text-center">
<div className="inline-block p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-3 shadow-lg">
<CheckCircle2 className="w-6 h-6 text-white" />
</div>
<DialogHeader>
<DialogTitle className="text-2xl font-bold text-white">
How to open <code className="bg-black/50 px-2 py-1 rounded">stream.m3u</code>
</DialogTitle>
</DialogHeader>

<p className="text-sm text-gray-400 mt-4 mb-6">
A file called <code className="bg-black/50 px-1.5 py-0.5 rounded">stream.m3u</code> has been saved to your Downloads folder.
</p>

<div className="text-left bg-black/30 rounded-lg p-4">
<h4 className="font-semibold text-white mb-3">
{desktopHelpType === 'windows' ? '🪟 Windows Instructions:' : '🍎 macOS Instructions:'}
</h4>
{desktopHelpType === 'windows' ? (
<ol className="text-sm text-gray-300 list-decimal list-inside space-y-2">
<li>Right-click on the downloaded file</li>
<li>Hover over "Open with"</li>
<li>If VLC is not listed, click "Choose another app"</li>
<li>Select "VLC media player" and click "OK"</li>
</ol>
) : (
<ol className="text-sm text-gray-300 list-decimal list-inside space-y-2">
<li>Double-click the file (should open in VLC)</li>
<li>If wrong app opens, right-click the file</li>
<li>Hover over "Open With"</li>
<li>Select "VLC" from the applications list</li>
</ol>
)}
</div>

<div className="mt-6">
<Button
onClick={() => setShowDesktopHelpModal(false)}
className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 shadow-lg"
>
Got it, thanks!
</Button>
</div>
</div>
</div>
</DialogContent>
</Dialog>
</div>
)
}
