import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { DownloadLink, ProcessUrlResponse } from '@shared/types';
import { Link, Loader2, AlertCircle, Sparkles, Download, Play, X, Star, CheckCircle2, ChevronRight } from 'lucide-react';
interface ProcessLog {
  message: string;
  type: "info" | "success" | "error";
  timestamp: Date;
}
export function HomePage() {
  const [url, setUrl] = useState('');
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isZipFile, setIsZipFile] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showStreamingPopup, setShowStreamingPopup] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState<string>("");
  const [detectedOS, setDetectedOS] = useState<string>("");
  const [showMxProModal, setShowMxProModal] = useState(false);
  const [showDesktopHelpModal, setShowDesktopHelpModal] = useState(false);
  const [desktopHelpType, setDesktopHelpType] = useState<"windows" | "mac">("windows");
  const [selectedLink, setSelectedLink] = useState<DownloadLink | null>(null);
  const [displayTitle, setDisplayTitle] = useState("StreamScout");
  const statusRef = useRef<HTMLDivElement>(null);
  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }]);
    setTimeout(() => {
      if (statusRef.current) {
        statusRef.current.scrollTop = statusRef.current.scrollHeight;
      }
    }, 100);
  };
  const resetState = () => {
    setUrl('');
    setLogs([]);
    setDownloadLinks([]);
    setIsProcessing(false);
    setError(null);
    setIsZipFile(false);
    setShowLogs(false);
    setShowMoreOptions(false);
    setSelectedLink(null);
    setDisplayTitle("StreamScout");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a URL.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setDownloadLinks([]);
    setLogs([]);
    addLog("Starting link processing...");
    try {
      addLog(`Fetching URL: ${url}`);
      const data = await api<ProcessUrlResponse>('/api/process-url', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      addLog(`Received ${data.links.length} links.`, "success");
      setDownloadLinks(data.links);
      setIsZipFile(data.isZipFile);
      setDisplayTitle(data.pageTitle || "Extracted Content");
      addLog("Process completed successfully!", "success");
      toast.success("Links extracted successfully!");
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      setError(errorMessage);
      addLog(`Error: ${errorMessage}`, "error");
      toast.error(`Processing failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleLinkClick = (link: DownloadLink) => {
    if (isZipFile) {
      window.open(link.url, "_blank");
    } else {
      setSelectedLink(link.url === selectedLink?.url ? null : link);
    }
  };
  const handleWatchOnline = (url: string) => {
    setStreamingUrl(url);
    setShowStreamingPopup(true);
    setSelectedLink(null);
  };
  const handleDownload = (url: string) => {
    window.open(url, "_blank");
    setSelectedLink(null);
  };
  useEffect(() => {
    if (showStreamingPopup && !detectedOS) {
      const userAgent = window.navigator.userAgent;
      if (/iPad|iPhone|iPod/.test(userAgent)) setDetectedOS('iOS');
      else if (/Mac/.test(userAgent)) setDetectedOS('Mac');
      else if (/Win/.test(userAgent)) setDetectedOS('Windows');
      else if (/Android/.test(userAgent)) setDetectedOS('Android');
      else setDetectedOS('Other');
    }
  }, [showStreamingPopup, detectedOS]);
  const downloadM3u = (url: string) => {
    const m3uContent = `#EXTM3U\n#EXTINF:-1,Stream\n${url}`;
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'stream.m3u';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  const trustedLinks = downloadLinks.filter((l) => l.isTrusted);
  const otherLinks = downloadLinks.filter((l) => !l.isTrusted);
  return (
    <>
      <main className="min-h-screen w-full bg-gray-950 text-white animated-gradient-bg">
        <ThemeToggle className="fixed top-4 right-4 z-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 md:py-24">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Link className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold font-display tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                {displayTitle}
              </h1>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm text-gray-300">Processing...</span>
                  </>
                ) : error ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-300">Failed</span>
                  </>
                ) : downloadLinks.length > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-300">Ready</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">Waiting for URL</span>
                )}
              </div>
            </div>
            <div className="mt-12 max-w-xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <Input
                  type="url"
                  placeholder="https://example.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 text-base bg-white/5 border-white/10 placeholder:text-gray-500"
                  disabled={isProcessing}
                />
                <Button type="submit" size="lg" className="h-12 w-36 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Process'}
                </Button>
              </form>
            </div>
            <div className="mt-16 max-w-2xl mx-auto">
              {!isProcessing && error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center animate-fade-in">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-red-300">Extraction Failed</h3>
                  <p className="text-gray-400 mt-2">{error}</p>
                  <Button variant="destructive" className="mt-4" onClick={resetState}>Try Again</Button>
                </div>
              )}
              {!isProcessing && !error && downloadLinks.length > 0 && (
                <div className="space-y-6 animate-fade-in-up">
                  {trustedLinks.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 font-semibold text-lg"><Sparkles className="text-yellow-400" /> Recommended Servers</h3>
                      {trustedLinks.map((link, index) => (
                        <div key={index} className="animate-slide-in-left" style={{ animationDelay: `${index * 100}ms` }}>
                          <Button variant="ghost" onClick={() => handleLinkClick(link)} className="w-full h-auto p-0 rounded-xl bg-gray-900/90 backdrop-blur-xl border border-white/10 hover:bg-gray-800/90">
                            <div className="p-4 flex items-center justify-between gap-4 w-full">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                                <p className="font-semibold truncate text-left">{link.label}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </Button>
                          {selectedLink?.url === link.url && !isZipFile && (
                            <div className="mt-2 grid grid-cols-2 gap-2 animate-slide-down">
                              <Button onClick={() => handleWatchOnline(link.url)} className="bg-emerald-600 hover:bg-emerald-500"><Play className="h-4 w-4 mr-2" />Watch</Button>
                              <Button onClick={() => handleDownload(link.url)} className="bg-sky-600 hover:bg-sky-500"><Download className="h-4 w-4 mr-2" />Download</Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {otherLinks.length > 0 && (
                    <div className="space-y-4">
                      {trustedLinks.length > 0 && (
                        <Button variant="outline" onClick={() => setShowMoreOptions(!showMoreOptions)} className="w-full bg-white/5 border-white/10 hover:bg-white/10">
                          {showMoreOptions ? "Hide" : "Show"} {otherLinks.length} Alternative Server{otherLinks.length > 1 ? "s" : ""}
                        </Button>
                      )}
                      {(showMoreOptions || trustedLinks.length === 0) && (
                        <div className="space-y-3">
                          {trustedLinks.length === 0 && <h3 className="font-semibold text-lg">Available Servers</h3>}
                          {otherLinks.map((link, index) => (
                            <div key={index} className="animate-slide-in-left" style={{ animationDelay: `${index * 50}ms` }}>
                              <Button variant="ghost" onClick={() => handleLinkClick(link)} className="w-full h-auto p-0 rounded-xl bg-gray-900/90 backdrop-blur-xl border border-white/10 hover:bg-gray-800/90">
                                <div className="p-4 flex items-center justify-between gap-4 w-full">
                                  <p className="font-semibold truncate text-left">{link.label}</p>
                                  <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                              </Button>
                              {selectedLink?.url === link.url && !isZipFile && (
                                <div className="mt-2 grid grid-cols-2 gap-2 animate-slide-down">
                                  <Button onClick={() => handleWatchOnline(link.url)} className="bg-emerald-600 hover:bg-emerald-500"><Play className="h-4 w-4 mr-2" />Watch</Button>
                                  <Button onClick={() => handleDownload(link.url)} className="bg-sky-600 hover:bg-sky-500"><Download className="h-4 w-4 mr-2" />Download</Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="max-w-2xl mx-auto mt-12 text-center">
              <button onClick={() => setShowLogs(!showLogs)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                {showLogs ? "Hide" : "Show"} Debug Info
              </button>
              {showLogs && (
                <div className="mt-4 bg-black/40 backdrop-blur-xl border border-white/5 rounded-xl p-4 text-left animate-fade-in">
                  <div ref={statusRef} className="bg-black/60 rounded-lg h-48 overflow-y-auto font-mono text-xs text-gray-400 p-3 custom-scrollbar">
                    {logs.map((log, index) => (
                      <p key={index} className={log.type === "error" ? "text-red-400" : log.type === "success" ? "text-green-400" : ""}>
                        [{log.timestamp.toLocaleTimeString()}] {log.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <footer className="text-center py-8 text-sm text-muted-foreground">
          Built with ❤️ at Cloudflare
        </footer>
      </main>
      <Toaster richColors theme="dark" />
      {/* Streaming Popup */}
      <Dialog open={showStreamingPopup} onOpenChange={setShowStreamingPopup}>
        <DialogContent className="max-w-4xl w-full bg-black/95 backdrop-blur-2xl border border-white/10 p-0 gap-0">
          <button onClick={() => setShowStreamingPopup(false)} className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10">
            <X className="h-4 w-4 text-white/70" />
          </button>
          <div className="px-6 sm:px-8 pt-8 pb-6 text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Choose Your Player
            </h2>
            <p className="text-gray-400">Select the best option for your device: <span className="font-bold">{detectedOS}</span></p>
          </div>
          <div className="px-6 sm:px-8 pb-8 space-y-4">
            {detectedOS === 'iOS' && (
              <a href={`vlc://stream?url=${encodeURIComponent(streamingUrl)}`} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium">
                <Play className="h-4 w-4" /> Open in VLC
              </a>
            )}
            {detectedOS === 'Android' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a href={`intent://${streamingUrl.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=org.videolan.vlc;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.videolan.vlc')};end`} className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium">
                  <img src="https://i.ibb.co/0VfBwckX/vlc-logo.png" alt="VLC" className="w-6 h-6" /> VLC Player
                </a>
                <a href={`intent://${streamingUrl.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad')};end`} className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white font-medium">
                  <img src="https://i.ibb.co/kVhq9tcq/mx-player.png" alt="MX Player" className="w-6 h-6" /> MX Player
                </a>
              </div>
            )}
            {(detectedOS === 'Windows' || detectedOS === 'Mac' || detectedOS === 'Other') && (
              <div className="space-y-3 text-center">
                <a href={`vlc://${streamingUrl}`} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium">
                  <Play className="h-4 w-4" /> Launch in VLC
                </a>
                <button onClick={() => { downloadM3u(streamingUrl); setDesktopHelpType(detectedOS === 'Windows' ? 'windows' : 'mac'); setShowDesktopHelpModal(true); }} className="text-blue-400 hover:text-blue-300 text-sm underline">
                  Trouble launching? Download .m3u file
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* MX Player Pro Modal */}
      <Dialog open={showMxProModal} onOpenChange={setShowMxProModal}>
        <DialogContent className="bg-black/95 backdrop-blur-2xl border border-white/10">
          <DialogHeader><DialogTitle>MX Player Pro Guide</DialogTitle></DialogHeader>
          <p>MX Player Pro has been removed from the Play Store. You can download the APK from trusted third-party sources.</p>
          <a href="https://vlyx-mod.vercel.app/" target="_blank" rel="noopener noreferrer" className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-4 py-2.5">
            Visit Site
          </a>
        </DialogContent>
      </Dialog>
      {/* Desktop Help Modal */}
      <Dialog open={showDesktopHelpModal} onOpenChange={setShowDesktopHelpModal}>
        <DialogContent className="bg-black/95 backdrop-blur-2xl border border-white/10">
          <DialogHeader><DialogTitle>How to open stream.m3u</DialogTitle></DialogHeader>
          <p>A file called <code className="bg-black/50 px-1 rounded">stream.m3u</code> has been saved. Open it with VLC Media Player.</p>
          <Button onClick={() => setShowDesktopHelpModal(false)} className="mt-4 w-full">Got it</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}