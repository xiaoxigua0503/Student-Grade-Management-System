'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Course, CourseStatistics } from '@/lib/types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface StatisticsTabProps {
  courses: Course[];
  preselectedCourseId?: string;
  onNavigateToBatchGrades: (courseId: string) => void;
}

type ScoreBandKey = 'ALL' | 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'PASS' | 'FAIL';

export function StatisticsTab({
  courses,
  preselectedCourseId,
  onNavigateToBatchGrades
}: StatisticsTabProps) {
  const { t, language } = useLanguage();
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    preselectedCourseId || (courses[0]?.id || '')
  );
  const [statistics, setStatistics] = useState<CourseStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Course search states
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Score band filter state
  const [selectedBand, setSelectedBand] = useState<ScoreBandKey>('ALL');

  // Table search state
  const [tableSearch, setTableSearch] = useState('');

  // Close course dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter courses based on name, ID, or category
  const filteredCourses = useMemo(() => {
    const q = courseSearchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [courses, courseSearchQuery]);

  // Current course navigation index
  const currentCourseIndex = useMemo(() => {
    return courses.findIndex(c => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const currentCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const handleSelectCourse = (id: string) => {
    setSelectedCourseId(id);
    setSelectedBand('ALL');
    const cr = courses.find(c => c.id === id);
    if (cr) setCourseSearchQuery(`${cr.name} (${cr.id})`);
  };

  // Fetch statistics for the selected course
  useEffect(() => {
    if (!selectedCourseId) return;

    let isMounted = true;
    queueMicrotask(async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/statistics/${selectedCourseId}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success) {
          setStatistics(data.statistics);
        } else {
          setErrorMessage(data.error || (language === 'zh' ? '获取课程成绩统计失败' : 'Failed to load statistics.'));
        }
      } catch {
        if (isMounted) setErrorMessage(language === 'zh' ? '网络错误，无法加载课程统计' : 'Network error while loading course statistics.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId, language]);

  // Navigation handlers
  const handlePrevCourse = () => {
    if (currentCourseIndex > 0) {
      handleSelectCourse(courses[currentCourseIndex - 1].id);
    }
  };

  const handleNextCourse = () => {
    if (currentCourseIndex < courses.length - 1) {
      handleSelectCourse(courses[currentCourseIndex + 1].id);
    }
  };

  // Distribution ranges definitions
  const distributionRanges = useMemo(() => {
    if (!statistics) return [];
    const total = statistics.totalGraded || 1;
    const c = statistics.counts;
    return [
      {
        key: 'EXCELLENT' as ScoreBandKey,
        range: '90+',
        label: t.excellent,
        count: c.excellent,
        pct: Math.round((c.excellent / total) * 100),
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
      },
      {
        key: 'GOOD' as ScoreBandKey,
        range: '80–89',
        label: t.good,
        count: c.good,
        pct: Math.round((c.good / total) * 100),
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      {
        key: 'AVERAGE' as ScoreBandKey,
        range: '70–79',
        label: t.averageGrade,
        count: c.average,
        pct: Math.round((c.average / total) * 100),
        color: 'bg-cyan-500',
        textColor: 'text-cyan-700',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-200'
      },
      {
        key: 'PASS' as ScoreBandKey,
        range: '60–69',
        label: t.passGrade,
        count: c.pass,
        pct: Math.round((c.pass / total) * 100),
        color: 'bg-amber-500',
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      },
      {
        key: 'FAIL' as ScoreBandKey,
        range: language === 'zh' ? '60分以下' : 'Below 60',
        label: t.failGrade,
        count: c.fail,
        pct: Math.round((c.fail / total) * 100),
        color: 'bg-rose-500',
        textColor: 'text-rose-700',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200'
      }
    ];
  }, [statistics, t, language]);

  // Filter students in the course table by Score Band and Search Text
  const filteredRecords = useMemo(() => {
    if (!statistics) return [];
    
    // 1. Filter by Score Band
    let records = statistics.records;
    if (selectedBand === 'EXCELLENT') {
      records = records.filter(r => r.numericScore !== null && r.numericScore >= 90);
    } else if (selectedBand === 'GOOD') {
      records = records.filter(r => r.numericScore !== null && r.numericScore >= 80 && r.numericScore < 90);
    } else if (selectedBand === 'AVERAGE') {
      records = records.filter(r => r.numericScore !== null && r.numericScore >= 70 && r.numericScore < 80);
    } else if (selectedBand === 'PASS') {
      records = records.filter(r => r.numericScore !== null && r.numericScore >= 60 && r.numericScore < 70);
    } else if (selectedBand === 'FAIL') {
      records = records.filter(r => r.numericScore !== null && r.numericScore < 60);
    }

    // 2. Filter by Search Query
    const q = tableSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => 
      r.name.toLowerCase().includes(q) ||
      r.studentId.toLowerCase().includes(q) ||
      r.major.toLowerCase().includes(q) ||
      r.college.toLowerCase().includes(q)
    );
  }, [statistics, selectedBand, tableSearch]);

  const activeBandInfo = useMemo(() => {
    if (selectedBand === 'ALL') return null;
    return distributionRanges.find(d => d.key === selectedBand);
  }, [selectedBand, distributionRanges]);

  return (
    <div className="space-y-6">
      {/* Course Search & Selection Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search by Course Name or Course ID */}
          <div className="flex-1 relative" ref={courseDropdownRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.selectStatsCourse}:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-stats-course"
                type="text"
                value={courseSearchQuery}
                onFocus={() => setIsCourseDropdownOpen(true)}
                onChange={(e) => {
                  setCourseSearchQuery(e.target.value);
                  setIsCourseDropdownOpen(true);
                }}
                placeholder={t.searchCoursePrompt}
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
              />
              {courseSearchQuery && (
                <button
                  onClick={() => setCourseSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown suggestions popover */}
            {isCourseDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
                <div className="p-2 text-[11px] font-semibold text-slate-400 bg-slate-50 flex justify-between items-center">
                  <span>{language === 'zh' ? `匹配课程 (${filteredCourses.length})` : `Matches (${filteredCourses.length})`}</span>
                  <span className="text-[10px] text-slate-400">{language === 'zh' ? '点击选择课程' : 'Click to select'}</span>
                </div>
                {filteredCourses.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    {language === 'zh' ? '未找到匹配的课程' : 'No courses found matching query'}
                  </div>
                ) : (
                  filteredCourses.slice(0, 30).map((c) => {
                    const isSelected = c.id === selectedCourseId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleSelectCourse(c.id);
                          setIsCourseDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 hover:bg-indigo-50/70 transition flex items-center justify-between text-xs ${
                          isSelected ? 'bg-indigo-50 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <div className="text-slate-900 font-semibold">
                              {c.name}{' '}
                              <span className="font-mono text-indigo-600 font-medium">({c.id})</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.category} · {c.credits.toFixed(1)} {t.credits}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Quick Stepper & Direct Course Select */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
              <button
                onClick={handlePrevCourse}
                disabled={currentCourseIndex <= 0}
                title={language === 'zh' ? '上一门课程' : 'Previous Course'}
                className="p-1.5 rounded hover:bg-white text-slate-600 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-600">
                {currentCourseIndex + 1} / {courses.length}
              </span>
              <button
                onClick={handleNextCourse}
                disabled={currentCourseIndex >= courses.length - 1}
                title={language === 'zh' ? '下一门课程' : 'Next Course'}
                className="p-1.5 rounded hover:bg-white text-slate-600 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct select dropdown */}
            <select
              id="select-stats-course"
              value={selectedCourseId}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-700 max-w-[220px] truncate"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.name}
                </option>
              ))}
            </select>

            {statistics && (
              <button
                id="btn-stats-batch-grade"
                onClick={() => onNavigateToBatchGrades(statistics.course.id)}
                className="px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition whitespace-nowrap"
              >
                {t.enterGradesForCourse}
              </button>
            )}
          </div>
        </div>

        {/* Selected Course Information Summary */}
        {currentCourse && (
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span>{language === 'zh' ? '当前查看课程：' : 'Selected Course: '}</span>
            <strong className="text-slate-900 font-semibold">{currentCourse.name}</strong>
            <span className="font-mono text-indigo-700 font-semibold">({currentCourse.id})</span>
            <span className="text-slate-300">|</span>
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">{currentCourse.category}</span>
            <span className="text-slate-300">|</span>
            <span>{currentCourse.credits.toFixed(1)} {t.credits}</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 text-sm border border-slate-200">
          {language === 'zh' ? '正在统计课程成绩数据...' : 'Computing course statistics...'}
        </div>
      ) : !statistics ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 text-sm border border-slate-200">
          {language === 'zh' ? '请选择一门课程以查看成绩统计与分析。' : 'Select a course to view statistical grade analysis.'}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Summary Banner */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {statistics.course.id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600">
                  {statistics.course.category}
                </span>
                <span className="text-xs text-slate-500">
                  {statistics.course.credits.toFixed(1)} {t.credits}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1.5">{statistics.course.name}</h2>
            </div>

            <div className="flex items-center space-x-4 text-xs text-slate-500 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold">{t.totalEnrolled}</span>
                <span className="font-mono font-bold text-slate-900 text-base">{statistics.totalEnrolled}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold">{t.gradedCount}</span>
                <span className="font-mono font-bold text-slate-900 text-base">{statistics.totalGraded}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold">{t.pendingCount}</span>
                <span className="font-mono font-bold text-amber-600 text-base">{statistics.counts.pending}</span>
              </div>
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Average Score */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium block">{t.classAverage}</span>
              <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
                {statistics.averageScore !== null ? statistics.averageScore.toFixed(2) : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{language === 'zh' ? '全班平均成绩' : 'Overall mean score'}</span>
            </div>

            {/* Passing Rate */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium block">{t.passingRate}</span>
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {statistics.passingRate !== null ? `${statistics.passingRate.toFixed(1)}%` : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{t.scoreGte60}</span>
            </div>

            {/* Highest Score */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium block">{t.highestScore}</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {statistics.highestScore !== null ? statistics.highestScore.toFixed(2) : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{language === 'zh' ? '全班最高分' : 'Top student mark'}</span>
            </div>

            {/* Lowest Score */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium block">{t.lowestScore}</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {statistics.lowestScore !== null ? statistics.lowestScore.toFixed(2) : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{language === 'zh' ? '全班最低分' : 'Lowest recorded mark'}</span>
            </div>
          </div>

          {/* Interactive Score Distribution & Band Breakdown Section */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900">{t.scoreDistributionTitle}</h3>
                  <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium rounded-full border border-indigo-200 flex items-center space-x-1">
                    <Filter className="w-3 h-3" />
                    <span>{t.filterByBand}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.scoreDistributionDesc}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {selectedBand !== 'ALL' && (
                  <button
                    onClick={() => setSelectedBand('ALL')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition flex items-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t.clearBandFilter}</span>
                  </button>
                )}
                <span className="text-xs font-mono text-slate-500">
                  {t.totalGraded}: <strong className="text-slate-800">{statistics.totalGraded}</strong>
                </span>
              </div>
            </div>

            {/* Clickable Distribution Band Cards with Interactive Filter Effect */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {distributionRanges.map((dist) => {
                const isSelected = selectedBand === dist.key;
                return (
                  <div
                    key={dist.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBand(prev => prev === dist.key ? 'ALL' : dist.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedBand(prev => prev === dist.key ? 'ALL' : dist.key);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer select-none text-left relative ${
                      isSelected
                        ? `ring-2 ring-indigo-600 ring-offset-2 ${dist.bgColor} ${dist.borderColor} shadow-md scale-[1.02]`
                        : `${dist.bgColor} ${dist.borderColor} hover:shadow-xs hover:-translate-y-0.5 opacity-90 hover:opacity-100`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">{dist.range}</span>
                      <span className="text-[11px] text-slate-600 font-medium">{dist.label}</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-black text-slate-900 font-mono">
                        {dist.count}
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white flex items-center space-x-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{language === 'zh' ? '已选' : 'Active'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs mt-2 text-slate-600">
                      <span>{dist.pct}% {language === 'zh' ? '占比' : 'of class'}</span>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        {isSelected 
                          ? (language === 'zh' ? '点击取消' : 'Click to reset') 
                          : (language === 'zh' ? '点击筛选' : 'Click to filter')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/80 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${dist.color}`}
                        style={{ width: `${Math.max(4, dist.pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enrolled Students Table (Filtered by Score Band & Keyword Search) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-3">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-900 text-sm">{t.enrolledStudentsRoster}</h3>
                  <span className="text-xs font-mono font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                    {filteredRecords.length} / {statistics.records.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'zh' 
                    ? '学号、姓名、专业、学院、成绩 (两位小数)、以及录入日期' 
                    : 'Student ID, Name, Major, College, Score (2 decimals), and Date'}
                </p>
              </div>

              {/* Keyword Filter & Active Band Filter Indicator */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {activeBandInfo && (
                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 font-medium">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {language === 'zh' ? '已筛选分数段：' : 'Filtered: '}
                      <strong>{activeBandInfo.range} ({activeBandInfo.label})</strong>
                    </span>
                    <button
                      onClick={() => setSelectedBand('ALL')}
                      className="ml-1 text-indigo-600 hover:text-indigo-900 p-0.5"
                      title={t.clearBandFilter}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-stats-table"
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder={language === 'zh' ? '筛选学号、姓名、专业、学院...' : 'Filter student, major, college...'}
                    className="w-full pl-9 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  {tableSearch && (
                    <button
                      onClick={() => setTableSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs tracking-wider">
                    <th className="py-3 px-4">{t.studentId}</th>
                    <th className="py-3 px-4">{t.studentName}</th>
                    <th className="py-3 px-4">{t.major}</th>
                    <th className="py-3 px-4">{t.college}</th>
                    <th className="py-3 px-4 text-right">{t.score}</th>
                    <th className="py-3 px-4 text-right">{t.recordDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        <div className="space-y-2">
                          <p>{language === 'zh' ? '未找到符合当前筛选条件的学生。' : 'No students match current filter criteria.'}</p>
                          {(selectedBand !== 'ALL' || tableSearch) && (
                            <button
                              onClick={() => {
                                setSelectedBand('ALL');
                                setTableSearch('');
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-medium underline text-xs"
                            >
                              {language === 'zh' ? '重置筛选并显示全部学生' : 'Reset filters to show all students'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item) => {
                      const num = item.numericScore;
                      return (
                        <tr key={item.studentId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {item.studentId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {item.name}
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            {item.major}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                            {item.college}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                            {num !== null ? (
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                num >= 90 ? 'bg-emerald-50 text-emerald-700 font-black' :
                                num >= 80 ? 'bg-blue-50 text-blue-700' :
                                num >= 70 ? 'bg-cyan-50 text-cyan-700' :
                                num >= 60 ? 'bg-amber-50 text-amber-700' :
                                'bg-rose-50 text-rose-700'
                              }`}>
                                {num.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">{t.pendingGrade}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                            {item.date}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
