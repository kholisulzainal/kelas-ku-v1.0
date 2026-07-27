import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Lock, AlertTriangle, Maximize2, ShieldAlert } from 'lucide-react';

interface EmbeddedGoogleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleFormUrl: string;
  taskTitle: string;
  subjectName?: string;
  assignmentId: string;
  studentId: string;
  onConfirmFinish?: () => void;
  isSubmitting?: boolean;
}

export const EmbeddedGoogleFormModal: React.FC<EmbeddedGoogleFormModalProps> = ({
  isOpen,
  onClose,
  googleFormUrl,
  taskTitle,
  subjectName,
  onConfirmFinish,
  isSubmitting = false
}) => {
  const [warningCount, setWarningCount] = useState<number>(0);
  const [showWarningAlert, setShowWarningAlert] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setWarningCount(0);
      setShowWarningAlert(false);
      return;
    }

    const handleBlurOrHide = () => {
      setWarningCount(prev => prev + 1);
      setShowWarningAlert(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlurOrHide();
      }
    };

    window.addEventListener('blur', handleBlurOrHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlurOrHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Format Google Form URL for seamless embedding
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    if (!formatted.includes('embedded=true')) {
      formatted += formatted.includes('?') ? '&embedded=true' : '?embedded=true';
    }
    return formatted;
  };

  const embedUrl = getEmbedUrl(googleFormUrl);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-lg pointer-events-auto select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[101] bg-white dark:bg-slate-900 border-2 border-amber-500/30 rounded-3xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Header Bar - Exam Browser Style */}
          <div className="px-5 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                <Lock className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 shrink-0">
                    Exambrowser Ujian
                  </span>
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Mode Layar Terkunci
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                  {taskTitle} &bull; <span className="text-slate-300 font-semibold">{subjectName || 'Mata Pelajaran'}</span>
                </h3>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Layar Penuh Exam Browser"
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 px-3 py-2 rounded-xl border border-amber-500/40 transition-all cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isFullscreen ? 'Keluar Layar Penuh' : 'Kunci Layar Penuh'}</span>
              </button>

              {onConfirmFinish && (
                <button
                  type="button"
                  onClick={onConfirmFinish}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 px-4 py-2 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Memproses...' : 'Tandai Selesai'}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ml-1 border border-slate-700"
                title="Tutup Kuis"
                aria-label="Tutup Kuis"
              >
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>
          </div>

          {/* Exam Warning / Violation Notice Banner */}
          {warningCount > 0 && showWarningAlert && (
            <div className="bg-red-600 text-white px-5 py-2.5 border-b border-red-700 text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-pulse">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-300" />
                <strong>PERINGATAN EXAM BROWSER ({warningCount}x):</strong> Anda terdeteksi meninggalkan layar/pindah tab! Dilarang berpindah aplikasi saat kuis berlangsung.
              </span>
              <button
                type="button"
                onClick={() => setShowWarningAlert(false)}
                className="bg-white/20 hover:bg-white/30 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold"
              >
                Saya Mengerti
              </button>
            </div>
          )}

          {/* Instructions Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 px-5 py-2 border-b border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shrink-0">
            <span>🔒 <strong>Anti-Curang Active:</strong> Kerjakan formulir langsung di dalam kotak ujian ini. Dilarang membuka tab baru/browsing. Setelah selesai, klik tombol <strong>"Tandai Selesai"</strong>.</span>
            {warningCount > 0 && (
              <span className="font-extrabold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200">
                Peringatan: {warningCount}x Left Window
              </span>
            )}
          </div>

          {/* Embedded Iframe */}
          <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={`Exambrowser Google Form - ${taskTitle}`}
                className="w-full h-full border-0 rounded-b-3xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500">
                <p className="text-sm font-semibold">Tautan Google Form belum tersedia.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
