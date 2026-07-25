import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';

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
  if (!isOpen) return null;

  // Format Google Form URL for seamless embedding
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    // Check if embedded parameter already exists
    if (!formatted.includes('embedded=true')) {
      formatted += formatted.includes('?') ? '&embedded=true' : '?embedded=true';
    }
    return formatted;
  };

  const embedUrl = getEmbedUrl(googleFormUrl);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[101] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shrink-0 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-m3-purple/10 text-m3-purple dark:bg-m3-purple/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-m3-purple bg-m3-purple/10 dark:bg-m3-purple/20 px-2 py-0.5 rounded-full shrink-0">
                    {subjectName || 'Google Form'}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Embedded Tracking Aktif
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                  {taskTitle}
                </h3>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={googleFormUrl}
                target="_blank"
                rel="noreferrer"
                title="Buka Google Form di Tab Baru"
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
              </a>

              {onConfirmFinish && (
                <button
                  type="button"
                  onClick={onConfirmFinish}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 px-4 py-2 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
                className="relative z-20 w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ml-1"
                title="Tutup Modal"
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>
          </div>

          {/* Alert Instructions Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 px-5 py-2 border-b border-amber-200/60 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 shrink-0">
            <span>💡 <strong>Petunjuk:</strong> Isi formulir Google Form di bawah. Setelah mengirimkan jawaban Anda, klik tombol <strong>"Tandai Selesai"</strong> di sudut kanan atas.</span>
            <a
              href={googleFormUrl}
              target="_blank"
              rel="noreferrer"
              className="sm:hidden underline font-bold text-amber-900 dark:text-amber-200 shrink-0"
            >
              Tab Baru ↗
            </a>
          </div>

          {/* Responsive Embedded Iframe */}
          <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={`Embedded Google Form - ${taskTitle}`}
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
