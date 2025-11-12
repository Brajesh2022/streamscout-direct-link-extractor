import { useState, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { DownloadLink, ProcessUrlResponse } from '@shared/types';
import { Link, Search, Loader2, ServerCrash, Sparkles, Download, Play, ChevronRight, AlertCircle, X, Star, CheckCircle2 } from 'lucide-react';
type AppState = {
  url: string;
  isLoading: boolean;
  error: string | null;
  results: DownloadLink[];
  setUrl: (url: string) => void;
  processUrl: () => Promise<void>;
  reset: () => void;
};
const useAppStore = create<AppState>((set, get) => ({
  url: '',
  isLoading: false,
  error: null,
  results: [],
  setUrl: (url) => set({ url }),
  processUrl: async () => {
    const url = get().url;
    if (!url.trim()) {
      toast.error('Please enter a URL to process.');
      return;
    }
    set({ isLoading: true, error: null, results: [] });
    try {
      const data = await api<ProcessUrlResponse>('/api/process-url', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      set({ results: data, isLoading: false });
      toast.success('Links extracted successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      set({ error: errorMessage, isLoading: false });
      toast.error(`Processing failed: ${errorMessage}`);
    }
  },
  reset: () => set({ url: '', isLoading: false, error: null, results: [] }),
}));
const PlayerModal = ({
  isOpen,
  onClose,
  streamingUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  streamingUrl: string;
}) => {
  const [os, setOs] = useState('Android');
  useEffect(() => {
    if (isOpen) {
      const userAgent = window.navigator.userAgent;
      if (/iPad|iPhone|iPod/.test(userAgent)) setOs('iOS');
      else if (/Mac/.test(userAgent)) setOs('Mac');
      else if (/Win/.test(userAgent)) setOs('Windows');
      else if (/Android/.test(userAgent)) setOs('Android');
      else setOs('Other');
    }
  }, [isOpen]);
  const downloadM3u = () => {
    const m3uContent = `#EXTM3U\n#EXTINF:-1,Stream\n${streamingUrl}`;
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'stream.m3u';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  const renderContent = () => {
    switch (os) {
      case 'iOS':
        return (
          <a href={`vlc://stream?url=${encodeURIComponent(streamingUrl)}`} className="btn-gradient w-full">
            <Play className="mr-2 h-4 w-4" /> Open in VLC
          </a>
        );
      case 'Android':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href={`intent://${streamingUrl.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=org.videolan.vlc;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.videolan.vlc')};end`} className="btn-gradient">
              <Play className="mr-2 h-4 w-4" /> VLC
            </a>
            <a href={`intent://${streamingUrl.replace(/^https?:\/\//i, '')}#Intent;scheme=https;action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad')};end`} className="btn-gradient">
              <Play className="mr-2 h-4 w-4" /> MX Player
            </a>
          </div>
        );
      default: // Windows, Mac, Other
        return (
          <Button onClick={downloadM3u} className="btn-gradient w-full">
            <Download className="mr-2 h-4 w-4" /> Download .m3u for VLC
          </Button>
        );
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card/80 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Choose Your Player</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <p className="text-center text-muted-foreground">Detected OS: {os}. Select an option to play.</p>
          {renderContent()}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Ensure you have the selected player (like VLC) installed on your device.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
const ResultCard = ({ link, onStreamClick }: { link: DownloadLink; onStreamClick: (url: string) => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="group"
  >
    <Card className="bg-card/50 backdrop-blur-sm transition-all duration-300 hover:bg-card/70 hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {link.isTrusted && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
          {!link.isTrusted && <ServerCrash className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
          <p className="font-semibold truncate flex-1">{link.label}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={() => onStreamClick(link.url)}>
            <Play className="h-4 w-4 mr-2" /> Stream
          </Button>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" /> Download
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);
export function HomePage() {
  const url = useAppStore((s) => s.url);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const results = useAppStore((s) => s.results);
  const setUrl = useAppStore((s) => s.setUrl);
  const processUrl = useAppStore((s) => s.processUrl);
  const reset = useAppStore((s) => s.reset);
  const [isPlayerModalOpen, setPlayerModalOpen] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState('');
  const handleStreamClick = (streamUrl: string) => {
    setStreamingUrl(streamUrl);
    setPlayerModalOpen(true);
  };
  const { trusted, other } = useMemo(() => {
    const trusted = results.filter(r => r.isTrusted);
    const other = results.filter(r => !r.isTrusted);
    return { trusted, other };
  }, [results]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processUrl();
  };
  return (
    <>
      <main className="min-h-screen w-full animated-gradient-bg">
        <ThemeToggle className="fixed top-4 right-4" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 md:py-24 lg:py-32">
            <div className="max-w-2xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex justify-center mb-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Link className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-4xl md:text-6xl font-bold font-display tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent"
              >
                StreamScout
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-4 text-lg text-muted-foreground"
              >
                Paste a link, get direct access. Simple, fast, and clean.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-12 max-w-xl mx-auto"
            >
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <Input
                  type="url"
                  placeholder="https://example.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 text-base"
                  disabled={isLoading}
                />
                <Button type="submit" size="lg" className="h-12 w-36 btn-gradient" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Process'}
                </Button>
              </form>
            </motion.div>
            <div className="mt-16 max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </motion.div>
                )}
                {error && !isLoading && (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="bg-destructive/10 border-destructive/20 text-center">
                      <CardHeader>
                        <div className="mx-auto bg-destructive/20 rounded-full p-3 w-fit">
                          <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle className="text-destructive">Extraction Failed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-destructive-foreground">{error}</p>
                        <Button variant="destructive" className="mt-4" onClick={reset}>Try Again</Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {results.length > 0 && !isLoading && (
                  <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    {trusted.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-semibold text-lg"><Sparkles className="text-yellow-400" /> Recommended Servers</h3>
                        <div className="space-y-3">
                          <AnimatePresence>
                            {trusted.map(link => <ResultCard key={link.url} link={link} onStreamClick={handleStreamClick} />)}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                    {other.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-semibold text-lg"><ServerCrash className="text-muted-foreground" /> Other Servers</h3>
                        <div className="space-y-3">
                          <AnimatePresence>
                            {other.map(link => <ResultCard key={link.url} link={link} onStreamClick={handleStreamClick} />)}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <footer className="text-center py-8 text-sm text-muted-foreground">
          Built with ❤️ at Cloudflare
        </footer>
      </main>
      <Toaster richColors />
      <PlayerModal isOpen={isPlayerModalOpen} onClose={() => setPlayerModalOpen(false)} streamingUrl={streamingUrl} />
    </>
  );
}