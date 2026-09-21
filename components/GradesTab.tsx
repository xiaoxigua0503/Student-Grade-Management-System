'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Course, EnrichedScoreRecord } from '@/lib/types';
import { 
  ClipboardEdit, 
  Search, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  User, 
  BookOpen, 
  X,
  Check,
  Clock
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface GradesTabProps {
  students: Student[];
  courses: Course[];
  preselectedCourseId?: string;
  onRefresh: () => void;
}

type GradeSubView = 'batch' | 'individual' | 'search';

export function GradesTab({
  students,
  courses,
  preselectedCourseId,
  onRefresh
}: GradesTabProps) {
  const { t, language } = useLanguage();
  const [subView, setSubView] = useState<GradeSubView>('batch');

  // --- BATCH ENTRY STATE ---
  const [batchCourseId, setBatchCourseId] = useState<string>(preselectedCourseId || (courses[0]?.id || ''));
  const [batchEnrolledStudents, setBatchEnrolledStudents] = useState<Array<{
    studentId: string;
    name: string;
    major: string;
    college: string;
    score: string;
    date: string;
  }>>([]);
  const [batchDraftScores, setBatchDraftScores] = useState<Record<string, string>>({});
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // --- INDIVIDUAL ENTRY STATE ---
  const [indivStudentId, setIndivStudentId] = useState<string>(students[0]?.id || '');
  const [indivCourseId, setIndivCourseId] = useState<string>(courses[0]?.id || '');
  const [indivScore, setIndivScore] = useState<string>('85.00');
  const [indivDate, setIndivDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [isSubmittingIndiv, setIsSubmittingIndiv] = useState(false);

  // --- GRADE SEARCH & MANAGE STATE ---
  const [searchStudentId, setSearchStudentId] = useState('');
  const [searchCourseId, setSearchCourseId] = useState('');
  const [searchStatus, setSearchStatus] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<EnrichedScoreRecord[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modals for Edit & Delete
  const [editingRecord, setEditingRecord] = useState<EnrichedScoreRecord | null>(null);
  const [editScoreValue, setEditScoreValue] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<EnrichedScoreRecord | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [statusError, setStatusError] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Enrolled Students for Batch Entry
  useEffect(() => {
    if (!batchCourseId) return;

    let isMounted = true;
    queueMicrotask(async () => {
      if (!isMounted) return;
      setIsLoadingBatch(true);
      setStatusError('');

      try {
        const res = await fetch(`/api/grades/batch?courseId=${batchCourseId}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success) {
          setBatchEnrolledStudents(data.enrolledStudents);

          // Check for localStorage draft first
          const draftKey = `grade_draft_${batchCourseId}`;
          const localDraft = localStorage.getItem(draftKey);
          if (localDraft) {
            try {
              const parsed = JSON.parse(localDraft);
              setBatchDraftScores(parsed);
              setIsDraftSaved(true);
            } catch {
              const initialScores: Record<string, string> = {};
              data.enrolledStudents.forEach((st: { studentId: string; score: string }) => {
                initialScores[st.studentId] = st.score !== 'Pending' ? st.score : '';
              });
              setBatchDraftScores(initialScores);
              setIsDraftSaved(false);
            }
          } else {
            const initialScores: Record<string, string> = {};
            data.enrolledStudents.forEach((st: { studentId: string; score: string }) => {
              initialScores[st.studentId] = st.score !== 'Pending' ? st.score : '';
            });
            setBatchDraftScores(initialScores);
            setIsDraftSaved(false);
          }
        } else {
          setStatusError(data.error || (language === 'zh' ? '加载选课学生名单失败' : 'Failed to load enrolled students.'));
        }
      } catch {
        if (isMounted) setStatusError(language === 'zh' ? '网络错误，无法加载选课学生名单' : 'Network error while loading course enrollment.');
      } finally {
        if (isMounted) setIsLoadingBatch(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [batchCourseId, language]);

  // Load Search Records
  const fetchSearchResults = useCallback(async (sId?: string, cId?: string, st?: string) => {
    setIsLoadingSearch(true);
    try {
      const studentVal = sId !== undefined ? sId : searchStudentId;
      const courseVal = cId !== undefined ? cId : searchCourseId;
      const statusVal = st !== undefined ? st : searchStatus;

      const params = new URLSearchParams();
      if (studentVal.trim()) params.append('studentId', studentVal.trim());
      if (courseVal.trim()) params.append('courseId', courseVal.trim());
      if (statusVal && statusVal !== 'all') params.append('status', statusVal);

      const res = await fetch(`/api/scores?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.scores);
        setCurrentPage(1);
      }
    } catch {
      showToast(language === 'zh' ? '网络错误，查询成绩失败' : 'Network error while fetching grades.', 'error');
    } finally {
      setIsLoadingSearch(false);
    }
  }, [searchStudentId, searchCourseId, searchStatus, language]);

  useEffect(() => {
    if (subView === 'search') {
      queueMicrotask(() => {
        fetchSearchResults();
      });
    }
  }, [subView, fetchSearchResults]);

  // Handle temporary save in localStorage
  const handleTemporarySave = () => {
    const draftKey = `grade_draft_${batchCourseId}`;
    localStorage.setItem(draftKey, JSON.stringify(batchDraftScores));
    setIsDraftSaved(true);
    showToast(language === 'zh' 
      ? `课程 ${batchCourseId} 的临时草稿已暂存至本地缓存，可在正式提交前随时修改。` 
      : `Temporary draft saved locally for ${batchCourseId}. You can resume anytime without losing changes.`);
  };

  // Discard draft
  const handleDiscardDraft = () => {
    const draftKey = `grade_draft_${batchCourseId}`;
    localStorage.removeItem(draftKey);
    const initialScores: Record<string, string> = {};
    batchEnrolledStudents.forEach(st => {
      initialScores[st.studentId] = st.score !== 'Pending' ? st.score : '';
    });
    setBatchDraftScores(initialScores);
    setIsDraftSaved(false);
    showToast(language === 'zh' ? '已放弃草稿，恢复至已保存成绩' : 'Draft discarded. Reset to saved grades.');
  };

  // Final batch submission
  const handleFinalBatchSubmit = async () => {
    setIsSubmittingBatch(true);
    setStatusError('');

    const gradesPayload: Array<{ studentId: string; score: string }> = [];
    for (const st of batchEnrolledStudents) {
      const val = batchDraftScores[st.studentId] ?? '';
      if (val !== '') {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 100) {
          setStatusError(language === 'zh' 
            ? `学生 ${st.name} (${st.studentId}) 成绩无效：成绩必须在 0.00 至 100.00 之间。` 
            : `Invalid score for ${st.name} (${st.studentId}): Score must be between 0.00 and 100.00.`);
          setIsSubmittingBatch(false);
          return;
        }
      }
      gradesPayload.push({
        studentId: st.studentId,
        score: val
      });
    }

    try {
      const res = await fetch('/api/grades/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: batchCourseId,
          grades: gradesPayload
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusError(data.error || (language === 'zh' ? '批量录入成绩失败' : 'Failed to submit batch grades.'));
      } else {
        localStorage.removeItem(`grade_draft_${batchCourseId}`);
        setIsDraftSaved(false);
        showToast(language === 'zh' 
          ? `成功保存 ${data.updatedCount} 名学生的成绩！` 
          : `Successfully saved grades for ${data.updatedCount} student(s)!`);
        onRefresh();

        const refreshRes = await fetch(`/api/grades/batch?courseId=${batchCourseId}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setBatchEnrolledStudents(refreshData.enrolledStudents);
        }
      }
    } catch {
      setStatusError(language === 'zh' ? '网络错误，成绩最终提交失败' : 'Network error during final grade submission.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Handle individual grade submission
  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingIndiv(true);
    setStatusError('');

    const num = parseFloat(indivScore);
    if (indivScore !== '' && (isNaN(num) || num < 0 || num > 100)) {
      setStatusError(language === 'zh' ? '成绩必须是 0.00 到 100.00 之间的数值。' : 'Score must be a number between 0.00 and 100.00.');
      setIsSubmittingIndiv(false);
      return;
    }

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: indivStudentId.trim(),
          courseId: indivCourseId.trim(),
          score: indivScore,
          date: indivDate
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusError(data.error || (language === 'zh' ? '录入成绩失败' : 'Failed to save individual grade.'));
      } else {
        showToast(language === 'zh' 
          ? `学生 ${indivStudentId} 在课程 ${indivCourseId} 的成绩已成功记录。` 
          : `Grade recorded for Student ${indivStudentId} in Course ${indivCourseId}.`);
        onRefresh();
        if (subView === 'search') {
          fetchSearchResults();
        }
      }
    } catch {
      setStatusError(language === 'zh' ? '网络错误，录入成绩失败' : 'Network error while saving grade.');
    } finally {
      setIsSubmittingIndiv(false);
    }
  };

  // Edit Grade Score Only (automatically updates date!)
  const handleConfirmEditScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setModalSubmitting(true);

    const num = parseFloat(editScoreValue);
    if (editScoreValue !== '' && (isNaN(num) || num < 0 || num > 100)) {
      showToast(language === 'zh' ? '成绩必须在 0.00 到 100.00 之间。' : 'Score must be between 0.00 and 100.00.', 'error');
      setModalSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/scores/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: editingRecord.studentId,
          courseId: editingRecord.courseId,
          score: editScoreValue
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || (language === 'zh' ? '修改成绩失败' : 'Failed to update score.'), 'error');
      } else {
        showToast(language === 'zh' 
          ? `学生 ${editingRecord.studentName} 在课程 ${editingRecord.courseName} 的成绩已更新，录入日期自动变更为今日。` 
          : `Score updated for ${editingRecord.studentName} in ${editingRecord.courseName}. Date auto-updated to today.`);
        setEditingRecord(null);
        onRefresh();
        fetchSearchResults();
      }
    } catch {
      showToast(language === 'zh' ? '网络错误，修改成绩失败' : 'Network error while updating score.', 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Grade Deletion: delete one record at a time using student ID + course ID
  const handleConfirmDeleteGrade = async () => {
    if (!recordToDelete) return;
    setModalSubmitting(true);

    try {
      const res = await fetch('/api/scores/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: recordToDelete.studentId,
          courseId: recordToDelete.courseId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || (language === 'zh' ? '删除成绩失败' : 'Failed to delete grade record.'), 'error');
      } else {
        showToast(language === 'zh' 
          ? `已删除学生 ${recordToDelete.studentId} 在课程 ${recordToDelete.courseId} 的成绩记录。` 
          : `Grade record deleted for Student ${recordToDelete.studentId} in Course ${recordToDelete.courseId}.`);
        setRecordToDelete(null);
        onRefresh();
        fetchSearchResults();
      }
    } catch {
      showToast(language === 'zh' ? '网络错误，删除成绩记录失败' : 'Network error while deleting grade.', 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  const selectedCourseObj = useMemo(() => {
    return courses.find(c => c.id === batchCourseId) || null;
  }, [courses, batchCourseId]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-sm transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-view Navigation Controls */}
      <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm flex flex-wrap gap-2">
        <button
          id="btn-subview-batch"
          onClick={() => setSubView('batch')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            subView === 'batch'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ClipboardEdit className="w-4 h-4" />
          <span>{t.batchEntryTab}</span>
        </button>

        <button
          id="btn-subview-individual"
          onClick={() => setSubView('individual')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            subView === 'individual'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t.individualEntryTab}</span>
        </button>

        <button
          id="btn-subview-search"
          onClick={() => setSubView('search')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            subView === 'search'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>{t.gradeSearchTab}</span>
        </button>
      </div>

      {statusError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {/* VIEW 1: BATCH GRADE ENTRY */}
      {subView === 'batch' && (
        <div className="space-y-4">
          {/* Header & Course Selection */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.selectBatchCourse}
                </label>
                <select
                  id="select-batch-course"
                  value={batchCourseId}
                  onChange={(e) => setBatchCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name} ({c.category}, {c.credits.toFixed(1)} {t.credits})
                    </option>
                  ))}
                </select>
              </div>

              {/* Automatic Course ID & Details Display */}
              {selectedCourseObj && (
                <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.courseId}</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">{selectedCourseObj.id}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.courseCategory}</span>
                    <span className="font-semibold text-slate-700">{selectedCourseObj.category}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.credits}</span>
                    <span className="font-semibold text-slate-700">{selectedCourseObj.credits.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Temporary Draft Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-2 text-slate-600">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  {isDraftSaved ? (
                    <span className="text-amber-700 font-medium">
                      {language === 'zh' ? '当前课程的临时成绩已暂存于本地，可在最终提交前继续编辑。' : 'Temporary draft saved locally for this session.'}
                    </span>
                  ) : (
                    <span>
                      {t.tempSaveNotice}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="btn-temp-save-draft"
                  onClick={handleTemporarySave}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.tempSave}</span>
                </button>
                {isDraftSaved && (
                  <button
                    onClick={handleDiscardDraft}
                    className="text-slate-500 hover:text-slate-700 underline px-2 py-1"
                  >
                    {t.discardDraft}
                  </button>
                )}
                <button
                  id="btn-final-submit-grades"
                  onClick={handleFinalBatchSubmit}
                  disabled={isSubmittingBatch || batchEnrolledStudents.length === 0}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-xs disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingBatch ? (language === 'zh' ? '正在提交...' : 'Submitting...') : t.finalSubmit}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enrolled Students Grade Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold">
              <span>{t.enrolledStudentsForCourse} ({batchEnrolledStudents.length})</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {language === 'zh' ? '成绩范围须在 0.00 至 100.00 之间，若暂未评定可留空' : 'Scores must be between 0.00 and 100.00. Leave blank if pending.'}
              </span>
            </div>

            {isLoadingBatch ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                {t.loading}
              </div>
            ) : batchEnrolledStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-600">{t.noEnrolledStudents}</p>
                <p className="text-xs text-slate-400">
                  {language === 'zh' ? '请前往“选课管理”标签页先为学生选修本门课程。' : 'Go to the Enrollment tab to enroll students into this course first.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">{t.studentId}</th>
                      <th className="py-3 px-4">{t.studentName}</th>
                      <th className="py-3 px-4">{t.major} & {t.college}</th>
                      <th className="py-3 px-4 w-44">{t.score} (0.00 – 100.00)</th>
                      <th className="py-3 px-4">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchEnrolledStudents.map((st, idx) => {
                      const currentVal = batchDraftScores[st.studentId] ?? '';
                      const isGraded = currentVal !== '';
                      const numVal = parseFloat(currentVal);
                      const isInvalid = currentVal !== '' && (isNaN(numVal) || numVal < 0 || numVal > 100);

                      return (
                        <tr key={st.studentId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 text-xs text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-medium text-indigo-700 whitespace-nowrap">
                            {st.studentId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {st.name}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            <div>{st.major}</div>
                            <div className="text-[11px] text-slate-400">{st.college}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="relative max-w-[140px]">
                              <input
                                id={`input-batch-score-${st.studentId}`}
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={currentVal}
                                onChange={(e) => {
                                  setBatchDraftScores(prev => ({
                                    ...prev,
                                    [st.studentId]: e.target.value
                                  }));
                                }}
                                placeholder="88.50"
                                className={`w-full px-3 py-1.5 text-sm font-mono font-semibold rounded-lg border focus:outline-none focus:ring-2 ${
                                  isInvalid
                                    ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-indigo-500 focus:bg-white'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isInvalid ? (
                              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                {language === 'zh' ? '成绩数值无效' : 'Invalid Score'}
                              </span>
                            ) : isGraded ? (
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                                numVal >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {numVal >= 60 ? t.passed : t.failed} ({numVal.toFixed(2)})
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded text-slate-500 bg-slate-100 border border-slate-200">
                                {t.pendingGrade}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL GRADE ENTRY */}
      {subView === 'individual' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <User className="w-5 h-5 text-indigo-600" />
              <span>{t.individualEntryTab}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'zh' 
                ? '支持单条成绩直接录入或更新，数据必须引用已存在的有效学生和课程。' 
                : 'Directly input or update a single grade record. References to existing students and courses are strictly enforced.'}
            </p>
          </div>

          <form onSubmit={handleIndividualSubmit} className="space-y-4">
            {/* Student selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.student} <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-indiv-student"
                value={indivStudentId}
                onChange={(e) => setIndivStudentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name} ({s.major})
                  </option>
                ))}
              </select>
            </div>

            {/* Course selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.course} <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-indiv-course"
                value={indivCourseId}
                onChange={(e) => setIndivCourseId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name} ({c.category}, {c.credits.toFixed(1)} {t.credits})
                  </option>
                ))}
              </select>
            </div>

            {/* Score & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.score} (0.00 – 100.00) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-indiv-score"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={indivScore}
                  onChange={(e) => setIndivScore(e.target.value)}
                  placeholder="88.50"
                  required
                  className="w-full px-3 py-2 text-sm font-mono font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.recordDate} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-indiv-date"
                  type="date"
                  value={indivDate}
                  onChange={(e) => setIndivDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="btn-submit-individual-grade"
                type="submit"
                disabled={isSubmittingIndiv}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isSubmittingIndiv ? (language === 'zh' ? '正在保存...' : 'Saving...') : t.saveGradeRecord}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 3: GRADE SEARCH & RECORD MANAGEMENT */}
      {subView === 'search' && (
        <div className="space-y-4">
          {/* Search Controls Bar */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.searchGradeHeader}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.searchGradeDesc}
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchSearchResults();
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {/* Search by Student ID / Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.filterByStudentId}:</label>
                <input
                  id="search-grade-student-id"
                  type="text"
                  value={searchStudentId}
                  onChange={(e) => setSearchStudentId(e.target.value)}
                  placeholder={language === 'zh' ? '输入学号或姓名 (如 20210001)' : 'Student ID or Name...'}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                />
              </div>

              {/* Search by Course ID / Name / Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.filterByCourseId}:</label>
                <input
                  id="search-grade-course-id"
                  type="text"
                  list="course-search-datalist"
                  value={searchCourseId}
                  onChange={(e) => setSearchCourseId(e.target.value)}
                  placeholder={language === 'zh' ? '输入课程号或名称 (如 JCKC0001)' : 'Course ID or Name...'}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                />
                <datalist id="course-search-datalist">
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Filter by Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.filterByStatus}:</label>
                <select
                  id="search-grade-status-select"
                  value={searchStatus}
                  onChange={(e) => {
                    setSearchStatus(e.target.value);
                    fetchSearchResults(undefined, undefined, e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                >
                  <option value="all">{t.allStatuses}</option>
                  <option value="passed">{t.statusPassed}</option>
                  <option value="failed">{t.statusFailed}</option>
                  <option value="pending">{t.statusPending}</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end space-x-2">
                <button
                  id="btn-execute-grade-search"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Search className="w-4 h-4" />
                  <span>{t.search}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchStudentId('');
                    setSearchCourseId('');
                    setSearchStatus('all');
                    fetchSearchResults('', '', 'all');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
                >
                  {t.reset}
                </button>
              </div>
            </form>

            {/* Results Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div>
                {language === 'zh' ? '共检索到 ' : 'Found '}
                <strong className="text-slate-900 font-bold text-sm">{searchResults.length}</strong>
                {language === 'zh' ? ' 条成绩记录' : ' grade record(s)'}
              </div>

              {searchResults.length > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    {t.passed}: {searchResults.filter(s => s.score !== '' && parseFloat(s.score) >= 60).length}
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-medium">
                    {t.failed}: {searchResults.filter(s => s.score !== '' && parseFloat(s.score) < 60).length}
                  </span>
                  <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
                    {t.pendingStatus}: {searchResults.filter(s => s.score === '').length}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {isLoadingSearch ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                {t.loading}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                {t.noData}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider">
                      <th className="py-3 px-4">{t.student}</th>
                      <th className="py-3 px-4">{t.course}</th>
                      <th className="py-3 px-4">{t.courseCategory}</th>
                      <th className="py-3 px-4">{t.score}</th>
                      <th className="py-3 px-4">{t.recordDate}</th>
                      <th className="py-3 px-4 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searchResults.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((sc) => {
                      const num = sc.score !== '' ? parseFloat(sc.score) : null;
                      return (
                        <tr key={`${sc.studentId}_${sc.courseId}`} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-xs text-indigo-700 block">{sc.studentId}</span>
                            <span className="font-medium text-slate-900">{sc.studentName}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-xs text-slate-500 block">{sc.courseId}</span>
                            <span className="font-medium text-slate-800">{sc.courseName}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                              {sc.courseCategory}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                            {num !== null ? (
                              <span className={`text-sm px-2 py-0.5 rounded ${
                                num >= 60 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                              }`}>
                                {num.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-normal">{t.pendingGrade}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                            {sc.date}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                id={`btn-edit-score-${sc.studentId}-${sc.courseId}`}
                                onClick={() => {
                                  setEditingRecord(sc);
                                  setEditScoreValue(sc.score !== '' ? sc.score : '');
                                }}
                                title={t.editScoreTitle}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                id={`btn-delete-score-${sc.studentId}-${sc.courseId}`}
                                onClick={() => setRecordToDelete(sc)}
                                title={t.deleteGradeRecord}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {searchResults.length > pageSize && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  {language === 'zh'
                    ? `显示第 ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, searchResults.length)} 条，共 ${searchResults.length} 条记录`
                    : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, searchResults.length)} of ${searchResults.length} records`}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition font-medium"
                  >
                    {t.prevPage}
                  </button>
                  <span className="font-semibold text-slate-800">
                    {t.page} {currentPage} / {Math.max(1, Math.ceil(searchResults.length / pageSize))} {t.of}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(searchResults.length / pageSize), p + 1))}
                    disabled={currentPage >= Math.ceil(searchResults.length / pageSize)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition font-medium"
                  >
                    {t.nextPage}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT SCORE */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{t.editScoreTitle}</h3>
                <p className="text-xs text-slate-500">{t.editScoreHelp}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEditScore} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  <span className="text-slate-400 font-semibold">{t.student}:</span>{' '}
                  <strong className="text-slate-800">{editingRecord.studentName}</strong>{' '}
                  <span className="font-mono text-indigo-700">({editingRecord.studentId})</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">{t.course}:</span>{' '}
                  <strong className="text-slate-800">{editingRecord.courseName}</strong>{' '}
                  <span className="font-mono text-indigo-700">({editingRecord.courseId})</span>
                </div>
                <div className="text-slate-500 pt-1">
                  {language === 'zh' ? '原记录日期：' : 'Previous Date: '}
                  <span className="font-mono">{editingRecord.date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.score} (0.00 – 100.00) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-modal-edit-score"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editScoreValue}
                  onChange={(e) => setEditScoreValue(e.target.value)}
                  placeholder="92.50"
                  required
                  className="w-full px-3 py-2 text-base font-mono font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <p className="text-xs text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                {t.dateAutoUpdateNotice} ({new Date().toISOString().slice(0, 10)})。
              </p>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-submit-modal-edit-score"
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {modalSubmitting ? (language === 'zh' ? '正在保存...' : 'Updating...') : (language === 'zh' ? '保存并自动更新日期' : 'Save & Update Date')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE GRADE CONFIRMATION */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-lg">{t.deleteGradeRecord}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'zh'
                ? '确定要永久删除这条成绩记录吗？删除后将不可恢复。'
                : 'Are you sure you want to permanently delete this grade record? This action cannot be undone.'}
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>{t.student}: <strong>{recordToDelete.studentName}</strong> ({recordToDelete.studentId})</div>
              <div>{t.course}: <strong>{recordToDelete.courseName}</strong> ({recordToDelete.courseId})</div>
              <div>{t.score}: <strong className="font-mono">{recordToDelete.score || t.pendingGrade}</strong></div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                {t.cancel}
              </button>
              <button
                id="btn-confirm-delete-score-record"
                type="button"
                onClick={handleConfirmDeleteGrade}
                disabled={modalSubmitting}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {modalSubmitting ? (language === 'zh' ? '正在删除...' : 'Deleting...') : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
