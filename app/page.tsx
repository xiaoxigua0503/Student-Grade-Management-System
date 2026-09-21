'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { StudentsTab } from '@/components/StudentsTab';
import { CoursesTab } from '@/components/CoursesTab';
import { EnrollmentTab } from '@/components/EnrollmentTab';
import { GradesTab } from '@/components/GradesTab';
import { TranscriptTab } from '@/components/TranscriptTab';
import { StatisticsTab } from '@/components/StatisticsTab';
import { Student, Course } from '@/lib/types';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LanguageProvider, useLanguage } from '@/lib/LanguageContext';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('students');
  const { t } = useLanguage();

  // Master data
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Cross-tab selection states
  const [selectedStudentForTranscript, setSelectedStudentForTranscript] = useState<string | undefined>();
  const [selectedStudentForEnrollment, setSelectedStudentForEnrollment] = useState<string | undefined>();
  const [selectedCourseForStats, setSelectedCourseForStats] = useState<string | undefined>();
  const [selectedCourseForBatchGrades, setSelectedCourseForBatchGrades] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const [studentsRes, coursesRes, scoresRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/courses'),
        fetch('/api/scores')
      ]);

      const [studentsData, coursesData, scoresData] = await Promise.all([
        studentsRes.json(),
        coursesRes.json(),
        scoresRes.json()
      ]);

      if (studentsData.success) {
        setStudents(studentsData.students);
      }
      if (coursesData.success) {
        setCourses(coursesData.courses);
      }
    } catch {
      setGlobalError('无法连接到服务器，请检查网络或刷新重试。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
  }, [loadData]);

  // Cross-tab navigation handlers
  const handleSelectForTranscript = (studentId: string) => {
    setSelectedStudentForTranscript(studentId);
    setActiveTab('transcript');
  };

  const handleSelectForEnrollment = (studentId: string) => {
    setSelectedStudentForEnrollment(studentId);
    setActiveTab('enrollment');
  };

  const handleSelectForStats = (courseId: string) => {
    setSelectedCourseForStats(courseId);
    setActiveTab('statistics');
  };

  const handleSelectForBatchGrades = (courseId: string) => {
    setSelectedCourseForBatchGrades(courseId);
    setActiveTab('grades');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {globalError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{globalError}</span>
            <button
              onClick={loadData}
              className="ml-auto underline font-medium hover:text-rose-950"
            >
              {t.reset}
            </button>
          </div>
        )}

        {isLoading && students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">
              {t.loading}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            {activeTab === 'students' && (
              <StudentsTab
                students={students}
                onRefresh={loadData}
                onSelectForTranscript={handleSelectForTranscript}
                onSelectForEnrollment={handleSelectForEnrollment}
              />
            )}

            {activeTab === 'courses' && (
              <CoursesTab
                courses={courses}
                onRefresh={loadData}
                onSelectForStats={handleSelectForStats}
                onSelectForBatchGrades={handleSelectForBatchGrades}
              />
            )}

            {activeTab === 'enrollment' && (
              <EnrollmentTab
                key={selectedStudentForEnrollment || 'default'}
                students={students}
                preselectedStudentId={selectedStudentForEnrollment}
                onRefresh={loadData}
                onNavigateToGrades={(courseId) => {
                  if (courseId) setSelectedCourseForBatchGrades(courseId);
                  setActiveTab('grades');
                }}
              />
            )}

            {activeTab === 'grades' && (
              <GradesTab
                key={selectedCourseForBatchGrades || 'default'}
                students={students}
                courses={courses}
                preselectedCourseId={selectedCourseForBatchGrades}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'transcript' && (
              <TranscriptTab
                key={selectedStudentForTranscript || 'default'}
                students={students}
                preselectedStudentId={selectedStudentForTranscript}
              />
            )}

            {activeTab === 'statistics' && (
              <StatisticsTab
                key={selectedCourseForStats || 'default'}
                courses={courses}
                preselectedCourseId={selectedCourseForStats}
                onNavigateToBatchGrades={handleSelectForBatchGrades}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span className="font-medium text-slate-600">
            {t.footerStorage}
          </span>
          <span className="text-slate-400">
            {t.footerBackend}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <LanguageProvider>
      <DashboardContent />
    </LanguageProvider>
  );
}
