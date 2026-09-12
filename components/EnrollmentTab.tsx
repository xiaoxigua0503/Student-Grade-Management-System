'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Student, Course, CourseCategory } from '@/lib/types';
import { 
  UserPlus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Users, 
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface EnrollmentTabProps {
  students: Student[];
  preselectedStudentId?: string;
  onRefresh: () => void;
  onNavigateToGrades: (courseId?: string) => void;
}

const CATEGORY_COLORS: Record<CourseCategory, { bg: string; text: string; border: string }> = {
  JCKC: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ZYBX: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ZYXX: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  BYSJ: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

export function EnrollmentTab({
  students,
  preselectedStudentId,
  onRefresh,
  onNavigateToGrades
}: EnrollmentTabProps) {
  const { t, language } = useLanguage();

  // Step 1: Selected student
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preselectedStudentId || '');
  const [studentSearch, setStudentSearch] = useState('');

  // Step 2: Available courses for selected student
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Step 3: Selected course IDs for enrollment
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

  // Step 4: Saving state & results
  const [isSaving, setIsSaving] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<{
    studentName: string;
    studentId: string;
    count: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Load available courses when selectedStudentId changes
  useEffect(() => {
    let isMounted = true;
    queueMicrotask(async () => {
      if (!isMounted) return;
      if (!selectedStudentId) {
        setAvailableCourses([]);
        setSelectedCourseIds(new Set());
        return;
      }

      setIsLoadingCourses(true);
      setErrorMessage('');
      setEnrollmentSuccess(null);
      setSelectedCourseIds(new Set());

      try {
        const res = await fetch(`/api/enrollment?studentId=${selectedStudentId}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success) {
          setAvailableCourses(data.availableCourses);
        } else {
          setErrorMessage(data.error || (language === 'zh' ? '加载待选课程失败' : 'Failed to load available courses.'));
        }
      } catch {
        if (isMounted) setErrorMessage(language === 'zh' ? '网络错误，无法加载待选课程' : 'Network error while loading available courses.');
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedStudentId, language]);

  // Filter students for left list
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [students, studentSearch]);

  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Filter available courses for right panel
  const filteredAvailableCourses = useMemo(() => {
    return availableCourses.filter(c => {
      const q = courseSearch.trim().toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [availableCourses, courseSearch, categoryFilter]);

  // Toggle course selection
  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      filteredAvailableCourses.forEach(c => next.add(c.id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedCourseIds(new Set());
  };

  // Compute selected credits
  const totalSelectedCredits = useMemo(() => {
    let sum = 0;
    availableCourses.forEach(c => {
      if (selectedCourseIds.has(c.id)) {
        sum += c.credits;
      }
    });
    return sum;
  }, [availableCourses, selectedCourseIds]);

  // Save enrollment
  const handleSaveEnrollment = async () => {
    if (!selectedStudentId || selectedCourseIds.size === 0) return;

    setIsSaving(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          courseIds: Array.from(selectedCourseIds)
        })
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || (language === 'zh' ? '保存选课失败' : 'Failed to save enrollment.'));
      } else {
        setEnrollmentSuccess({
          studentName: currentStudent?.name || selectedStudentId,
          studentId: selectedStudentId,
          count: selectedCourseIds.size
        });

        // Refresh available courses after save
        const refreshedRes = await fetch(`/api/enrollment?studentId=${selectedStudentId}`);
        const refreshedData = await refreshedRes.json();
        if (refreshedData.success) {
          setAvailableCourses(refreshedData.availableCourses);
        }
        setSelectedCourseIds(new Set());
        onRefresh();
      }
    } catch {
      setErrorMessage(language === 'zh' ? '网络错误，选课保存失败' : 'Network error while saving enrollment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRepeatForAnotherStudent = () => {
    setSelectedStudentId('');
    setAvailableCourses([]);
    setSelectedCourseIds(new Set());
    setEnrollmentSuccess(null);
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <span>{t.enrollmentTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.enrollmentDesc}
          </p>
        </div>

        {selectedStudentId && (
          <button
            id="btn-enroll-another-student"
            onClick={handleRepeatForAnotherStudent}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.enrollAnother}</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {enrollmentSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-base">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <span>
              {language === 'zh' ? '选课记录已成功写入 score.dat 持久化文件！' : 'Enrollment Successfully Saved to score.dat!'}
            </span>
          </div>
          <p className="text-sm text-emerald-700">
            {language === 'zh' ? '已为学生 ' : 'Enrolled '}
            <strong className="text-slate-900">{enrollmentSuccess.studentName}</strong> ({enrollmentSuccess.studentId})
            {language === 'zh' ? ' 成功添加 ' : ' in '}
            <strong className="text-slate-900">{enrollmentSuccess.count}</strong>
            {language === 'zh' ? ' 门修读课程。这些记录目前处于成绩待录入状态。' : ' course(s). These records are now pending grade entry.'}
          </p>
          <div className="flex items-center space-x-3 pt-1">
            <button
              id="btn-repeat-enrollment"
              onClick={handleRepeatForAnotherStudent}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 shadow-2xs transition"
            >
              {t.enrollAnother}
            </button>
            <button
              id="btn-goto-grades"
              onClick={() => onNavigateToGrades()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition"
            >
              {t.gotoGrades}
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STEP 1: Select Student Panel */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-slate-900 text-sm">{t.step1SelectStudent}</h3>
            </div>
            {currentStudent && (
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                {currentStudent.id}
              </span>
            )}
          </div>

          {/* Search student filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="enrollment-search-student"
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder={t.searchStudentPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Student selection list */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredStudents.map(s => {
              const isSelected = s.id === selectedStudentId;
              return (
                <button
                  key={s.id}
                  id={`select-student-row-${s.id}`}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
                    <span className="font-mono text-xs text-indigo-700 font-semibold">{s.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="truncate max-w-[150px]">{s.major}</span>
                    <span>{s.gender}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected student summary card */}
          {currentStudent && (
            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                {language === 'zh' ? '当前选中学生：' : 'Current Selection:'}
              </div>
              <div className="text-slate-700 font-medium">{currentStudent.name}</div>
              <div className="text-slate-500 font-mono">{currentStudent.id} • {currentStudent.major}</div>
              <div className="text-slate-500 text-[11px]">{currentStudent.college}</div>
            </div>
          )}
        </div>

        {/* STEP 2 & 3: Available Courses & Multi-Select */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{t.step2SelectCourses}</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedStudentId
                    ? (language === 'zh' ? `显示该生尚未选修的 ${availableCourses.length} 门可用课程` : `Showing ${availableCourses.length} available course(s) not yet taken by student`)
                    : t.selectStudentPrompt}
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            {availableCourses.length > 0 && (
              <div className="flex items-center space-x-2 text-xs">
                <button
                  id="btn-select-all-courses"
                  onClick={handleSelectAllFiltered}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {t.selectAll}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  id="btn-deselect-all-courses"
                  onClick={handleDeselectAll}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {t.clearSelection}
                </button>
              </div>
            )}
          </div>

          {/* Filters for Available Courses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="enrollment-search-course"
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder={t.searchCoursePlaceholder}
                disabled={!selectedStudentId}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="enrollment-filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={!selectedStudentId}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none disabled:opacity-50"
              >
                <option value="ALL">{t.all} {t.filterCategory}</option>
                <option value="JCKC">JCKC - {t.catJCKC}</option>
                <option value="ZYBX">ZYBX - {t.catZYBX}</option>
                <option value="ZYXX">ZYXX - {t.catZYXX}</option>
                <option value="BYSJ">BYSJ - {t.catBYSJ}</option>
              </select>
            </div>
          </div>

          {/* Courses List */}
          {isLoadingCourses ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {t.loading}
            </div>
          ) : !selectedStudentId ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-500">{t.selectStudentPrompt}</p>
              <p className="text-xs text-slate-400">
                {language === 'zh' ? '系统将根据已有选课记录动态排重并展示可选课程。' : 'Available courses will be dynamically filtered based on existing enrollments.'}
              </p>
            </div>
          ) : availableCourses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">{t.allCoursesEnrolled}</p>
              <p className="text-xs text-slate-500">
                {language === 'zh' ? '该生已修读或已选全部开设课程。' : 'This student is already enrolled in all university courses.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredAvailableCourses.map(course => {
                const isSelected = selectedCourseIds.has(course.id);
                const catStyle = CATEGORY_COLORS[course.category] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };

                return (
                  <div
                    key={course.id}
                    onClick={() => handleToggleCourse(course.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCourse(course.id)}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-indigo-700">{course.id}</span>
                          <span className="font-semibold text-slate-900 text-sm truncate">{course.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {course.category}
                          </span>
                          <span className="text-xs text-slate-500">{course.credits.toFixed(1)} {t.credits}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${isSelected ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                        {isSelected ? (language === 'zh' ? '已勾选' : 'Selected') : (language === 'zh' ? '+ 勾选' : '+ Select')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 4: Action & Persistence Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-xl">
            <div className="text-xs text-slate-600">
              {t.selectedCoursesCount}{' '}
              <strong className="text-indigo-700 font-bold text-sm">{selectedCourseIds.size}</strong> 门 (
              {t.totalCreditsCount} <strong className="text-slate-800">{totalSelectedCredits}</strong> {t.credits})
            </div>

            <button
              id="btn-save-enrollment"
              onClick={handleSaveEnrollment}
              disabled={isSaving || !selectedStudentId || selectedCourseIds.size === 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
            >
              <span>{isSaving ? (language === 'zh' ? '正在写入 score.dat...' : 'Saving to score.dat...') : t.step4SaveEnrollment}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
