'use client';

import React from 'react';
import { 
  Users, 
  BookOpen, 
  UserPlus, 
  ClipboardEdit, 
  FileText, 
  BarChart3, 
  GraduationCap,
  Languages
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export type ActiveTab = 'students' | 'courses' | 'enrollment' | 'grades' | 'transcript' | 'statistics';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  statsCount?: { students: number; courses: number; scores: number };
  onResetData?: () => void;
  isResetting?: boolean;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { language, toggleLanguage, t } = useLanguage();

  const navItems = [
    { id: 'students' as ActiveTab, label: t.navStudents, icon: Users },
    { id: 'courses' as ActiveTab, label: t.navCourses, icon: BookOpen },
    { id: 'enrollment' as ActiveTab, label: t.navEnrollment, icon: UserPlus },
    { id: 'grades' as ActiveTab, label: t.navGrades, icon: ClipboardEdit },
    { id: 'transcript' as ActiveTab, label: t.navTranscript, icon: FileText },
    { id: 'statistics' as ActiveTab, label: t.navStatistics, icon: BarChart3 },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-inner">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">{t.appTitle}</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Controls: Language Switch */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              id="btn-toggle-language"
              onClick={toggleLanguage}
              title={language === 'zh' ? 'Switch to English' : '切换为简体中文'}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'zh' ? '中文' : 'English'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/80 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
