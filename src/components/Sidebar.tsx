import React from 'react';
import {
  School,
  UserCheck,
  BookOpen,
  Calendar,
  Users,
  CheckSquare,
  Award,
  AlertOctagon,
  FileText,
  Bookmark,
  GraduationCap
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ currentRole, activeTab, setActiveTab }: SidebarProps) {
  // Navigation items based on role
  const getNavItems = () => {
    if (currentRole === 'operator' || currentRole === 'guru') {
      return [
        { id: 'profil_sekolah', label: 'Profil Sekolah', icon: School },
        { id: 'profil_guru', label: 'Profil Guru', icon: UserCheck },
        { id: 'mata_pelajaran', label: 'Mata Pelajaran', icon: BookOpen },
        { id: 'jadwal_pelajaran', label: 'Jadwal Pelajaran', icon: Calendar },
        { id: 'data_siswa', label: 'Data Siswa', icon: Users },
        { id: 'absensi', label: 'Absensi Siswa', icon: CheckSquare },
        { id: 'tugas_harian', label: 'Tugas Google Form', icon: Bookmark },
        { id: 'asesmen', label: 'Asesmen Kurikulum', icon: Award },
        { id: 'temuan_khusus', label: 'Temuan Khusus', icon: AlertOctagon },
        { id: 'kalender_akademik', label: 'Kalender & Jadwal', icon: FileText }
      ];
    } else if (currentRole === 'siswa') {
      return [
        { id: 'siswa_tugas', label: 'Tugas Harian Saya', icon: Bookmark },
        { id: 'siswa_nilai', label: 'Laporan Nilai Saya', icon: Award },
        { id: 'siswa_absensi', label: 'Rekap Absensi Saya', icon: CheckSquare },
        { id: 'kalender_akademik', label: 'Kalender & Jadwal Kelas', icon: Calendar }
      ];
    } else {
      // Orang Tua
      return [
        { id: 'ortu_notif_tugas', label: 'Status Tugas Anak', icon: Bookmark },
        { id: 'ortu_rekap_nilai', label: 'Laporan Nilai Anak', icon: Award },
        { id: 'ortu_absensi', label: 'Kehadiran Anak', icon: CheckSquare },
        { id: 'kalender_akademik', label: 'Kalender Sekolah', icon: Calendar }
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between shrink-0 border-r border-[#DCE8F7] dark:border-slate-800">
      <div className="space-y-2">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Navigasi Utama ({currentRole === 'operator' ? 'Operator' : currentRole === 'guru' ? 'Guru' : currentRole === 'siswa' ? 'Siswa' : 'Orang Tua'})
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar_tab_${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/70 hover:text-blue-600 dark:hover:text-white'
                }`}
              >
                <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding inside sidebar */}
      <div className="mt-6 border-t border-[#DCE8F7] dark:border-slate-800 pt-4 px-2">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <GraduationCap className="w-5 h-5 shrink-0" />
          <span className="font-bold text-xs tracking-wider">Kelas Ku V1.0</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Aplikasi Pengelolaan Kelas Kurikulum Merdeka &amp; Terintegrasi Google Form.
        </p>
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
          Developer : Kholisul Zainal A.S, S.Pd.
        </p>
      </div>
    </div>
  );
}

