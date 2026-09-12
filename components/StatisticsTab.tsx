'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Course, CourseStatistics } from '@/lib/types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface StatisticsTabProps {
  courses: Course[];
  preselectedCourseId?: string;
  onNavigateToBatchGrades: (courseId: string) => void;
}

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
  const [tableSearch, setTableSearch] = useState('');

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

  // Filter students in the course table
  const filteredRecords = useMemo(() => {
    if (!statistics) return [];
    const q = tableSearch.trim().toLowerCase();
    if (!q) return statistics.records;
    return statistics.records.filter(r => 
      r.name.toLowerCase().includes(q) ||
      r.studentId.toLowerCase().includes(q) ||
      r.major.toLowerCase().includes(q) ||
      r.college.toLowerCase().includes(q)
    );
  }, [statistics, tableSearch]);

  const distributionRanges = useMemo(() => {
    if (!statistics) return [];
    const total = statistics.totalGraded || 1;
    const c = statistics.counts;
    return [
      {
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

  return (
    <div className="space-y-6">
      {/* Course Selection Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.selectStatsCourse}:
            </label>
            <select
              id="select-stats-course"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.name} ({c.category}, {c.credits.toFixed(1)} {t.credits})
                </option>
              ))}
            </select>
          </div>

          {statistics && (
            <div className="flex items-center space-x-2">
              <button
                id="btn-stats-batch-grade"
                onClick={() => onNavigateToBatchGrades(statistics.course.id)}
                className="px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
              >
                {t.enterGradesForCourse}
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 text-sm border border-slate-200">
          {language === 'zh' ? '正在从持久化 score.dat 计算课程统计数据...' : 'Computing course statistics from persistent score.dat records...'}
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

          {/* EXACT REQUIREMENT: counts of 90+, 80–89, 70–79, 60–69, below 60 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.scoreDistributionTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.scoreDistributionDesc}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {t.totalGraded}: <strong className="text-slate-800">{statistics.totalGraded}</strong>
              </span>
            </div>

            {/* Distribution Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {distributionRanges.map((dist) => (
                <div
                  key={dist.range}
                  className={`p-4 rounded-xl border ${dist.bgColor} ${dist.borderColor} transition hover:shadow-2xs`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">{dist.range}</span>
                    <span className="text-[11px] text-slate-500">{dist.label}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {dist.count}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2 text-slate-600">
                    <span>{dist.pct}% {language === 'zh' ? '占比' : 'of class'}</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-white/80 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${dist.color}`}
                      style={{ width: `${Math.max(4, dist.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table: student ID, name, major, college, score, date */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-3">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{t.enrolledStudentsRoster}</h3>
                <p className="text-xs text-slate-500">
                  {language === 'zh' 
                    ? '学号、姓名、专业、学院、成绩 (两位小数)、以及录入日期' 
                    : 'Student ID, Name, Major, College, Score (2 decimals), and Date'}
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-stats-table"
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={language === 'zh' ? '筛选学号、姓名、专业、学院...' : 'Filter student, major, college...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
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
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        {language === 'zh' ? '未找到符合筛选条件的学生。' : 'No students match search filter.'}
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
