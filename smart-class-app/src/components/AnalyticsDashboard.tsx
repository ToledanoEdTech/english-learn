import React, { useMemo } from 'react';
import { Student } from '../types';

interface AnalyticsDashboardProps {
  students: Student[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ students }) => {
  const extractScore = (val: any): number => {
    const str = String(val).trim();
    if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);
    return NaN;
  };
  const normalizeKey = (key: string) => key.toLowerCase().replace(/[-_.\"\']/g, ' ');

  const stats = useMemo(() => {
    if (students.length === 0) return null;
    let totalGrades = 0;
    let gradeCount = 0;
    const gradeDistribution = { excellent: 0, good: 0, average: 0, failing: 0 };
    const behaviorStats = {
        positive: 0, negative: 0, homeworkIssues: 0,
        specific: { lates: 0, absences: 0, disturbance: 0, noEquipment: 0, insolence: 0 }
    };
    const subjectStats: Record<string, { sum: number, count: number, min: number, max: number }> = {};
    const IGNORED_HEADERS = [
        'מס', 'מספר', 'מס.', 'מס\'', 'no', 'no.', 'num', 'id', 'index', 
        'כיתה', 'class', 'שכבה', 'grade level', 'ת.ז', 'tz', 'group', 'קב', 'קבוצה', 'טור',
        'סה"כ', 'סה״כ', 'סך הכל', 'סיכום', 'total', 'sum', 'count', 'amount', 'מונה', 'counter'
    ];
    const NON_GRADE_KEYWORDS = [
        'שיעורי בית', 'ש.ב', 'ש״ב', 'homework', 'hw', 'h.w', 'תלבושת', 'uniform', 'ציוד', 'equipment', 
        'הערכה', 'eval', 'effort', 'התנהגות', 'behavior', 'חיסור', 'absence', 'חיסורים',
        'איחור', 'late', 'איחורים', 'בונוס', 'bonus', 'מילה טובה', 'מילים טובות', 'הצטיינות', 'הצטיינויות', 'commendation', 
        'נחת', 'חיזוק', 'חיזוקים', 'מחמאה', 'מחמאות', 'הערות', 'comment', 'note',
        'פרגון', 'נקודות זכות', 'זכות', 'שבח', 'לשבח', 'נקודת אור', 'נקודות אור', 'אירועים', 'events', 'incident'
    ];

    const studentAverages = students.map(s => {
      let sum = 0;
      let count = 0;
      s.subjects.forEach(sub => {
        if (!subjectStats[sub.subjectName]) subjectStats[sub.subjectName] = { sum: 0, count: 0, min: 100, max: 0 };
        Object.entries(sub).forEach(([key, val]) => {
            if(key === 'subjectName') return;
            const lowerKey = normalizeKey(key);
            const strVal = (lowerKey + ' ' + val).toLowerCase();
            const isNonGradeHeader = NON_GRADE_KEYWORDS.some(k => lowerKey.includes(k));
            let isBehavior = false;
            if (strVal.includes('איחור') || strVal.includes('late') || (lowerKey.includes('איחור') && val > 0)) { behaviorStats.negative++; behaviorStats.specific.lates++; isBehavior = true; }
            else if (strVal.includes('חיסור') || strVal.includes('absence') || (lowerKey.includes('חיסור') && val > 0)) { behaviorStats.negative++; behaviorStats.specific.absences++; isBehavior = true; }
            else if (strVal.includes('הפרעה') || strVal.includes('disturb')) { behaviorStats.negative++; behaviorStats.specific.disturbance++; isBehavior = true; }
            else if (strVal.includes('ציוד') || strVal.includes('equipment') || (lowerKey.includes('ציוד') && (val === 0 || val === 'לא'))) { behaviorStats.negative++; behaviorStats.specific.noEquipment++; isBehavior = true; }
            else if (strVal.includes('חוצפה') || strVal.includes('insolence')) { behaviorStats.negative++; behaviorStats.specific.insolence++; isBehavior = true; }
            else if (lowerKey.includes('שיעורי בית') && (val === 0 || val === 'לא' || strVal.includes('לא'))) { behaviorStats.homeworkIssues++; isBehavior = true; }
            else if (strVal.includes('מילה טובה') || strVal.includes('הצטיינות') || strVal.includes('excellent') || strVal.includes('נחת') || strVal.includes('חיזוק')) { behaviorStats.positive++; isBehavior = true; }
            if (['אי הכנת', 'לא הכין', 'חוסר', 'missing'].some(k => lowerKey.includes(k))) {
                if (parseFloat(val) > 0) { 
                    behaviorStats.negative++; 
                    if(lowerKey.includes('שיעורי בית') || lowerKey.includes('ש.ב')) behaviorStats.homeworkIssues++;
                }
                isBehavior = true; 
            }
            const isIgnored = IGNORED_HEADERS.some(h => lowerKey === h || lowerKey.includes(h + ' ') || lowerKey.startsWith(h));
            if (!isBehavior && !isIgnored && !isNonGradeHeader && !lowerKey.includes('מורה')) {
                const num = extractScore(val);
                if (!isNaN(num) && num >= 0 && num <= 100) {
                    sum += num;
                    count++;
                    totalGrades += num;
                    gradeCount++;
                    subjectStats[sub.subjectName].sum += num;
                    subjectStats[sub.subjectName].count++;
                    if (num < subjectStats[sub.subjectName].min) subjectStats[sub.subjectName].min = num;
                    if (num > subjectStats[sub.subjectName].max) subjectStats[sub.subjectName].max = num;
                    if (num >= 90) gradeDistribution.excellent++;
                    else if (num >= 75) gradeDistribution.good++;
                    else if (num >= 55) gradeDistribution.average++;
                    else gradeDistribution.failing++;
                }
            }
        });
      });
      return { id: s.id, name: s.fullName, average: count > 0 ? sum / count : 0, hasGrades: count > 0 };
    }).filter(s => s.hasGrades);

    const sortedByAvg = [...studentAverages].sort((a, b) => b.average - a.average);
    const processedSubjectStats = Object.entries(subjectStats)
        .map(([name, data]) => ({ name, avg: data.count > 0 ? data.sum / data.count : 0, min: data.count > 0 ? data.min : 0, max: data.count > 0 ? data.max : 0 }))
        .sort((a, b) => b.avg - a.avg);
    const totalDist = gradeDistribution.excellent + gradeDistribution.good + gradeDistribution.average + gradeDistribution.failing;
    const distPercents = {
        excellent: totalDist ? (gradeDistribution.excellent / totalDist) * 100 : 0,
        good: totalDist ? (gradeDistribution.good / totalDist) * 100 : 0,
        average: totalDist ? (gradeDistribution.average / totalDist) * 100 : 0,
        failing: totalDist ? (gradeDistribution.failing / totalDist) * 100 : 0,
    };
    const donutGradient = `conic-gradient(#F87171 0% ${distPercents.failing}%, #FACC15 ${distPercents.failing}% ${distPercents.failing + distPercents.average}%, #60A5FA ${distPercents.failing + distPercents.average}% ${distPercents.failing + distPercents.average + distPercents.good}%, #34D399 ${distPercents.failing + distPercents.average + distPercents.good}% 100%)`;
    return { classAverage: gradeCount > 0 ? totalGrades / gradeCount : 0, gradeDistribution, distPercents, donutGradient, topStudents: sortedByAvg.slice(0, 5), strugglingStudents: sortedByAvg.filter(s => s.average < 60).slice(0, 5), studentCount: students.length, behaviorStats, subjectStats: processedSubjectStats };
  }, [students]);

  if (!stats) return <div className="p-8 text-center text-slate-500">אין מספיק נתונים לניתוח</div>;

  return (
    <div className="space-y-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-indigo-100 font-medium mb-1">ממוצע כיתתי</p>
                    <h3 className="text-4xl font-bold">{stats.classAverage.toFixed(1)}</h3>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-20 transform rotate-12">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-500 font-medium mb-1">מצטיינים (מעל 90)</p>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.gradeDistribution.excellent} <span className="text-base font-normal text-slate-400">תלמידים</span></h3>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-500 font-medium mb-1">מדד התנהגות (חיובים)</p>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.behaviorStats.positive} <span className="text-base font-normal text-slate-400">אירועים</span></h3>
                </div>
                 <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-1">
                <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">התפלגות ציונים</h3>
                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48 rounded-full shadow-inner mb-6" style={{ background: stats.donutGradient }}>
                        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center flex-col">
                             <span className="text-3xl font-bold text-slate-800">{stats.studentCount}</span>
                             <span className="text-xs text-slate-400">תלמידים</span>
                        </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-emerald-400"></div> <span className="text-slate-600">מצויין (90+): <b>{stats.gradeDistribution.excellent}</b></span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-blue-400"></div> <span className="text-slate-600">טוב (75-89): <b>{stats.gradeDistribution.good}</b></span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-yellow-400"></div> <span className="text-slate-600">בינוני (55-74): <b>{stats.gradeDistribution.average}</b></span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-red-400"></div> <span className="text-slate-600">נכשל (0-54): <b>{stats.gradeDistribution.failing}</b></span> </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-800 mb-6">ביצועים לפי מקצוע (ממוצע וטווח כיתתי)</h3>
                <div className="space-y-6">
                    {stats.subjectStats.map((sub, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-slate-700 w-24 truncate" title={sub.name}>{sub.name}</span>
                                <div className="flex-1 mx-4 relative h-8">
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-slate-100 rounded-full"></div>
                                    <div className="absolute top-1/2 -translate-y-1/2 h-2 bg-indigo-200 rounded-full" style={{ right: `${100 - sub.max}%`, left: `${sub.min}%` }}></div>
                                    <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow ${sub.avg >= 85 ? 'bg-emerald-500' : sub.avg >= 70 ? 'bg-blue-500' : sub.avg >= 55 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ left: `${sub.avg}%` }} title={`ממוצע: ${sub.avg.toFixed(1)}`}></div>
                                </div>
                                <span className="text-sm font-bold text-slate-600 w-12 text-left">{sub.avg.toFixed(0)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-center gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-1"><div className="w-3 h-1 bg-indigo-200"></div> טווח ציונים (נמוך-גבוה)</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> ממוצע כיתתי</div>
                </div>
            </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">ניתוח משמעת והתנהגות</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                    <div className="text-red-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <span className="block text-2xl font-bold text-red-900">{stats.behaviorStats.specific.lates + stats.behaviorStats.specific.absences}</span>
                    <span className="text-xs text-red-600 font-medium">איחורים וחיסורים</span>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                     <div className="text-orange-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
                    <span className="block text-2xl font-bold text-orange-900">{stats.behaviorStats.homeworkIssues}</span>
                    <span className="text-xs text-orange-600 font-medium">אי הכנת ש.ב</span>
                </div>
                 <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                     <div className="text-purple-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>
                    <span className="block text-2xl font-bold text-purple-900">{stats.behaviorStats.specific.disturbance + stats.behaviorStats.specific.insolence}</span>
                    <span className="text-xs text-purple-600 font-medium">הפרעות/משמעת</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                     <div className="text-slate-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
                    <span className="block text-2xl font-bold text-slate-900">{stats.behaviorStats.specific.noEquipment}</span>
                    <span className="text-xs text-slate-600 font-medium">חוסר ציוד</span>
                </div>
            </div>
        </div>
    </div>
  );
};