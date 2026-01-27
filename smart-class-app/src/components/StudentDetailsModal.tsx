import React from 'react';
import { Student } from '../types';

interface StudentDetailsModalProps {
  student: Student;
  onClose: () => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ student, onClose }) => {
  const IGNORED_HEADERS = [
      'מס', 'מספר', 'מס.', 'מס\'', 'no', 'no.', 'num', 'id', 'index', 
      'כיתה', 'class', 'שכבה', 'grade level', 'ת.ז', 'tz', 'group', 'קב', 'קבוצה', 'טור',
      'סה"כ', 'סה״כ', 'סך הכל', 'סיכום', 'total', 'sum', 'count', 'amount', 'מונה', 'counter'
  ];
  const NON_GRADE_KEYWORDS = [
      'שיעורי בית', 'ש.ב', 'ש״ב', 'homework', 'hw', 'תלבושת', 'uniform', 'ציוד', 'equipment', 
      'הערכה', 'eval', 'effort', 'התנהגות', 'behavior', 'חיסור', 'absence', 'חיסורים',
      'איחור', 'late', 'איחורים', 'משמעת', 'discipline', 'מילה טובה', 'מילים טובות', 
      'הצטיינות', 'הצטיינויות', 'commendation', 'נחת', 'חיזוק', 'חיזוקים', 'מחמאה', 'מחמאות', 
      'הערות', 'comment', 'note', 'פרגון', 'נקודות זכות', 'זכות', 'שבח', 'לשבח', 'נקודת אור', 'נקודות אור',
      'אירועים', 'events', 'incident'
  ];
  const BEHAVIOR_KEYWORDS = [
      'איחור', 'חיסור', 'הפרעה', 'ציוד', 'שוטטות', 'חוצפה', 'אי השתתפות', 'אלימות', 'תלבושת', 'שיעורי בית', 'ש.ב', 'ש״ב', 'שלילי', 'משמעת',
      'late', 'absence', 'violence', 'equipment', 'behavior', 'comment', 'note', 'uniform', 'homework', 'negative'
  ];
  const NEGATIVE_COUNT_KEYWORDS = [
      'אי הכנת', 'לא הכין', 'חוסר', 'missing', 'not done', 'fail', 'שלילי', 'negative', 
      'הפרעות', 'איחורים', 'חיסורים', 'ביקור בית', 'הרחקה', 'השעיה', 'אי הכנה'
  ];
  const POSITIVE_KEYWORDS = [
      'מילה טובה', 'מילים טובות', 'הצטיינות', 'הצטיינויות', 'חיובי', 'שיפור', 'נחת', 
      'excellent', 'good', 'commendation', 'positive', 'חיוביים', 'חיזוק', 'חיזוקים', 
      'מחמאה', 'מחמאות', 'ראוי לשבח', 'צל"ש', 'פרגון', 'נקודת אור', 'נקודות אור', 'זכות'
  ];

  const normalizeKey = (key: string) => key.toLowerCase().replace(/[-_.\"\']/g, ' ');

  const isPositive = (key: string, val: any) => {
    const lowerKey = normalizeKey(key);
    const str = (key + ' ' + val).toLowerCase();
    return POSITIVE_KEYWORDS.some(k => lowerKey.includes(k) || str.includes(k));
  };

  const isNegative = (key: string, val: any) => {
    const lowerKey = normalizeKey(key);
    const str = (key + ' ' + val).toLowerCase();
    if (NEGATIVE_COUNT_KEYWORDS.some(k => lowerKey.includes(k))) {
        const num = parseFloat(val);
        if (!isNaN(num)) return num > 0;
        return val && val !== 0 && val !== '0' && val !== '-';
    }
    if (BEHAVIOR_KEYWORDS.some(k => lowerKey.includes(k))) {
        if (lowerKey.includes('שיעורי בית') || lowerKey.includes('homework') || lowerKey.includes('ש.ב')) {
             return val === 0 || val === 'לא' || String(val).includes('לא') || String(val).includes('not');
        }
        if (lowerKey.includes('ציוד') || lowerKey.includes('equipment')) {
             return val === 0 || val === 'לא' || String(val).includes('לא') || String(val).includes('חסר');
        }
        return true; 
    }
    return BEHAVIOR_KEYWORDS.some(k => str.includes(k));
  };

  const isGrade = (key: string, val: any) => {
    const lowerKey = normalizeKey(key);
    if (isPositive(key, val) || isNegative(key, val)) return false;
    if (IGNORED_HEADERS.some(h => lowerKey === h || lowerKey.includes(h + ' ') || lowerKey.startsWith(h))) return false;
    if (NON_GRADE_KEYWORDS.some(k => lowerKey.includes(k))) return false;
    if (lowerKey.includes('מורה') || lowerKey.includes('teacher')) return false;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) return true;
    return false;
  };

  const grades: any[] = [];
  const negatives: any[] = [];
  const positives: any[] = [];
  const others: any[] = [];

  student.subjects.forEach(sub => {
    Object.entries(sub).forEach(([key, val]) => {
        if (key === 'subjectName') return;
        const item = { source: sub.subjectName, key, val };
        if (isPositive(key, val)) positives.push(item);
        else if (isNegative(key, val)) negatives.push(item);
        else if (isGrade(key, val)) grades.push(item);
        else others.push(item);
    });
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity backdrop-blur-sm" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="relative inline-block align-bottom bg-white rounded-2xl text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-slate-200">
          <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
            <div>
                <h3 className="text-2xl font-bold">תיק תלמיד: {student.fullName}</h3>
                <p className="text-indigo-200 text-sm mt-1">מזהה מערכת: {student.id.slice(0, 8)}</p>
            </div>
            <button onClick={onClose} className="text-indigo-200 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="px-6 py-6 max-h-[75vh] overflow-y-auto bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-lg font-bold text-indigo-700 mb-4 border-b border-indigo-50 pb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                        הישגים לימודיים וציונים
                    </h4>
                    {grades.length > 0 ? (
                        <ul className="space-y-3">
                            {grades.map((g, i) => (
                                <li key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700">{g.key}</span>
                                        <span className="text-xs text-slate-400">{g.source}</span>
                                    </div>
                                    <span className={`font-bold px-2 py-1 rounded text-sm ${parseFloat(g.val) < 60 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                        {g.val}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-slate-400 text-sm">אין נתוני ציונים</p>}
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h4 className="text-lg font-bold text-red-600 mb-4 border-b border-red-50 pb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            אירועי משמעת והתנהגות
                        </h4>
                        {negatives.length > 0 ? (
                            <ul className="space-y-2">
                                {negatives.map((item, i) => (
                                    <li key={i} className="bg-red-50 border-r-4 border-red-400 p-2 rounded text-sm text-red-800">
                                        <div className="font-bold">{item.key}</div>
                                        <div>{item.val} <span className="text-xs text-red-400">({item.source})</span></div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-400 text-sm">לא נרשמו אירועים חריגים</p>}
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h4 className="text-lg font-bold text-emerald-600 mb-4 border-b border-emerald-50 pb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            נקודות אור וחיזוקים
                        </h4>
                        {positives.length > 0 ? (
                            <ul className="space-y-2">
                                {positives.map((item, i) => (
                                    <li key={i} className="bg-emerald-50 border-r-4 border-emerald-400 p-2 rounded text-sm text-emerald-800">
                                        <div className="font-bold">{item.key}</div>
                                        <div>{item.val} <span className="text-xs text-emerald-600">({item.source})</span></div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-400 text-sm">אין רישומי הצטיינות כרגע</p>}
                    </div>
                </div>
            </div>
            {others.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                     <h4 className="text-lg font-bold text-slate-600 mb-4 border-b border-slate-100 pb-2">נתונים כלליים נוספים</h4>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {others.map((item, i) => (
                            <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="block text-xs text-slate-400">{item.key} ({item.source})</span>
                                <span className="block font-medium text-slate-700">{item.val}</span>
                            </div>
                        ))}
                     </div>
                </div>
            )}
          </div>
          <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse">
            <button onClick={onClose} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">סגור תיק</button>
          </div>
        </div>
      </div>
    </div>
  );
};