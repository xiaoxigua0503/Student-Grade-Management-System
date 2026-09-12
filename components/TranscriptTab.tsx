'use client';

import React, { useState, useEffect } from 'react';
import { Student, StudentTranscript } from '@/lib/types';
import { 
  Printer, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface TranscriptTabProps {
  students: Student[];
  preselectedStudentId?: string;
}

export function TranscriptTab({ students, preselectedStudentId }: TranscriptTabProps) {
  const { t, language } = useLanguage();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId || (students[0]?.id || '')
  );
  const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!selectedStudentId) return;

    let isMounted = true;
    queueMicrotask(async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/transcript/${selectedStudentId}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success) {
          setTranscript(data.transcript);
        } else {
          setErrorMessage(data.error || (language === 'zh' ? '获取成绩单失败' : 'Failed to load transcript.'));
        }
      } catch {
        if (isMounted) setErrorMessage(language === 'zh' ? '网络错误，无法加载学生成绩单' : 'Network error while loading transcript.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedStudentId, language]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Student Selector Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.selectTranscriptStudent}:
            </label>
            <select
              id="select-transcript-student"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name} ({s.major}, {s.college})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-print-transcript"
              onClick={handlePrint}
              disabled={!transcript}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printTranscript}</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Transcript Document View */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 text-sm border border-slate-200">
          {language === 'zh' ? '正在从 student.dat, course.dat, score.dat 生成成绩单...' : 'Generating transcript from persistent records...'}
        </div>
      ) : !transcript ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 text-sm border border-slate-200">
          {language === 'zh' ? '请选择一名学生以查看官方成绩单。' : 'Select a student to view transcript.'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md print:border-none print:shadow-none space-y-8">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-widest mb-1">
                  <GraduationCap className="w-4 h-4" />
                  <span>{language === 'zh' ? '教务处学生综合成绩档案' : 'Academic Registrar & Grade Records'}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.officialTranscriptTitle}</h1>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'zh' 
                    ? '数据源自持久化数据文件：' 
                    : 'Generated from database files: '}
                  <span className="font-mono">student.dat</span>, <span className="font-mono">course.dat</span>, <span className="font-mono">score.dat</span>
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 text-xs text-slate-600">
                <div>{language === 'zh' ? '认证状态：' : 'Document Status: '}
                  <strong className="text-emerald-700 font-semibold">{language === 'zh' ? '已核验有效' : 'VERIFIED'}</strong>
                </div>
                <div>{language === 'zh' ? '打印日期：' : 'Issue Date: '}
                  <span className="font-mono">{new Date().toISOString().slice(0, 10)}</span>
                </div>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.studentName}</span>
                <span className="text-slate-900 font-bold text-sm">{transcript.student.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.studentId}</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">{transcript.student.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.major}</span>
                <span className="text-slate-800 font-medium">{transcript.student.major}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{t.college}</span>
                <span className="text-slate-800 font-medium">{transcript.student.college}</span>
              </div>
            </div>
          </div>

          {/* Academic Performance Summary Stats */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.academicSummaryMetrics}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Overall Average */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <span className="text-xs text-indigo-800 font-semibold block">{t.overallAverage}</span>
                <div className="text-2xl font-black text-indigo-900 mt-1 font-mono">
                  {transcript.overallAverage !== null ? transcript.overallAverage.toFixed(2) : 'N/A'}
                </div>
                <span className="text-[11px] text-indigo-600 mt-0.5 block">
                  {t.weightedAverage}: {transcript.weightedAverage !== null ? `${transcript.weightedAverage.toFixed(2)}` : 'N/A'}
                </span>
              </div>

              {/* Highest Score */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-semibold block">{t.highestScore}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                  {transcript.highestScore !== null ? transcript.highestScore.toFixed(2) : 'N/A'}
                </div>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">
                  {language === 'zh' ? '单科最高成绩' : 'Best performance'}
                </span>
              </div>

              {/* Lowest Score */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-semibold block">{t.lowestScore}</span>
                  <TrendingDown className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {transcript.lowestScore !== null ? transcript.lowestScore.toFixed(2) : 'N/A'}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {language === 'zh' ? '单科最低成绩' : 'Minimum grade'}
                </span>
              </div>

              {/* Total Earned Credits */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-800 font-semibold block">{t.earnedCredits}</span>
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-900 mt-1 font-mono">
                  {transcript.earnedCredits} <span className="text-sm font-normal text-amber-700">/ {transcript.totalEnrolledCredits}</span>
                </div>
                <span className="text-[11px] text-amber-700 mt-0.5 block">
                  {language === 'zh' 
                    ? `通过课程已获学分 (共 ${transcript.gradedCoursesCount} 门完成评分)` 
                    : `Passing credits (${transcript.gradedCoursesCount} graded)`}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Course Breakdown Table */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.courseDetailsRecords} ({transcript.courses.length})
            </h2>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs tracking-wider">
                    <th className="py-3 px-4">{t.courseId}</th>
                    <th className="py-3 px-4">{t.courseName}</th>
                    <th className="py-3 px-4">{t.courseCategory}</th>
                    <th className="py-3 px-4 text-center">{t.credits}</th>
                    <th className="py-3 px-4 text-right">{t.score} (两位小数)</th>
                    <th className="py-3 px-4 text-right">{t.recordDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transcript.courses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        {language === 'zh' ? '暂无该学生的选课或成绩记录。' : 'No course enrollment or score records found for this student.'}
                      </td>
                    </tr>
                  ) : (
                    transcript.courses.map((item) => {
                      const isPassing = item.numericScore !== null && item.numericScore >= 60;
                      return (
                        <tr key={item.courseId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-semibold text-indigo-700 whitespace-nowrap">
                            {item.courseId}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {item.courseName}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-xs rounded font-mono font-medium bg-slate-100 border border-slate-200 text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {item.credits.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                            {item.numericScore !== null ? (
                              <span className={`text-sm px-2 py-0.5 rounded ${
                                isPassing ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                              }`}>
                                {item.numericScore.toFixed(2)}
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
