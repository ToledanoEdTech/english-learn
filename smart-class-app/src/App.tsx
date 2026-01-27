import React, { useState, useRef, useEffect } from 'react';
import { processFiles } from './services/dataProcessor';
import { generateStudentMessage } from './services/geminiService';
import { Student, GeneratedMessage, GenerationStyle } from './types';
import { FileUpload } from './components/FileUpload';
import { StudentTable } from './components/StudentTable';
import { StudentDetailsModal } from './components/StudentDetailsModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TrendsDashboard } from './components/TrendsDashboard';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Record<string, GeneratedMessage>>({});
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>(GenerationStyle.DETAILED);
  const [customInstructions, setCustomInstructions] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [showTeacherNameError, setShowTeacherNameError] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [currentView, setCurrentView] = useState<'table' | 'analytics' | 'trends'>('table');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem('morai_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) { console.error("Failed to load history", e); }
    }
    const savedTeacherName = localStorage.getItem('morai_teacher_name');
    if (savedTeacherName) { setTeacherName(savedTeacherName); }
  }, []);

  useEffect(() => {
    if (Object.keys(messages).length > 0) {
      localStorage.setItem('morai_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
      localStorage.setItem('morai_teacher_name', teacherName);
      if (teacherName.trim()) setShowTeacherNameError(false);
  }, [teacherName]);

  const processStudentData = async (filesToProcess: File[]) => {
      setIsProcessingFiles(true);
      try {
        const newStudents = await processFiles(filesToProcess);
        if (newStudents.length === 0) {
            alert("לא נמצאו נתוני תלמידים בקבצים. אנא וודא שיש עמודת 'שם תלמיד' או שמות בעברית.");
            setStudents([]);
            return;
        }
        const map = new Map<string, Student>();
        newStudents.forEach((s: Student) => {
          if (map.has(s.fullName)) {
             const existing = map.get(s.fullName)!;
             existing.subjects = [...existing.subjects, ...s.subjects];
             if(!existing.phoneNumber && s.phoneNumber) existing.phoneNumber = s.phoneNumber;
             if(!existing.language && s.language) existing.language = s.language;
          } else { map.set(s.fullName, s); }
        });
        setStudents(Array.from(map.values()));
      } catch (error) {
        console.error("Error processing files", error);
        alert("שגיאה בעיבוד הקבצים.");
      } finally { setIsProcessingFiles(false); }
  };

  const handleFilesSelected = async (files: File[]) => {
    const newFiles = files.filter(f => !uploadedFiles.some(uf => uf.name === f.name));
    if (newFiles.length === 0) return;
    const updatedFileList = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFileList);
    await processStudentData(updatedFileList);
  };

  const handleRemoveFile = async (fileName: string) => {
      const updatedFileList = uploadedFiles.filter(f => f.name !== fileName);
      setUploadedFiles(updatedFileList);
      if (updatedFileList.length === 0) { setStudents([]); } else { await processStudentData(updatedFileList); }
  };

  const handleToggleSelect = (id: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, isSelected: !s.isSelected } : s));
  };
  const handleSelectAll = (isSelected: boolean) => {
      setStudents(students.map(s => ({ ...s, isSelected })));
  };
  const handleUpdatePhone = (id: string, phone: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, phoneNumber: phone } : s));
  };
  const handleStopGeneration = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); setIsGenerating(false); }
  };

  const handleGenerate = async () => {
    if (!teacherName.trim()) { setShowTeacherNameError(true); return; }
    setShowTeacherNameError(false);
    const selectedStudents = students.filter(s => s.isSelected);
    if (selectedStudents.length === 0) return;
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    const initialMessages = { ...messages };
    selectedStudents.forEach(s => { initialMessages[s.id] = { studentId: s.id, text: '', status: 'loading', timestamp: Date.now() }; });
    setMessages(initialMessages);

    const batchSize = 3;
    for (let i = 0; i < selectedStudents.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) break;
        const batch = selectedStudents.slice(i, i + batchSize);
        await Promise.all(batch.map(async (student) => {
             if (abortControllerRef.current?.signal.aborted) return;
             const text = await generateStudentMessage(student, generationStyle, customInstructions, teacherName, abortControllerRef.current?.signal);
             setMessages(prev => ({
                 ...prev,
                 [student.id]: { studentId: student.id, text: text, status: text.includes('שגיאה') ? 'error' : 'success', timestamp: Date.now() }
             }));
        }));
    }
    setIsGenerating(false);
  };

  const clearHistory = () => {
    if(window.confirm("האם אתה בטוח שברצונך למחוק את היסטוריית ההודעות?")) { setMessages({}); localStorage.removeItem('morai_messages'); }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans text-slate-800 flex flex-col">
      <div className="max-w-[1600px] mx-auto space-y-8 flex-grow w-full">
        <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
             </div>
             <div><h1 className="text-3xl font-bold text-slate-800 tracking-tight">קשר חכם</h1><p className="text-slate-500 text-sm font-medium">ניהול קשר אישי עם הורים מבוסס AI</p></div>
          </div>
          <div className="flex gap-3 items-center">
             <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold border border-indigo-100 shadow-sm">{students.length} תלמידים</div>
             {Object.keys(messages).length > 0 && (
                 <button onClick={clearHistory} className="text-sm text-slate-500 hover:text-red-600 transition-colors font-medium px-2">נקה היסטוריה</button>
             )}
          </div>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        העלאת נתונים
                    </h2>
                    <FileUpload files={uploadedFiles} onFilesSelected={handleFilesSelected} onRemoveFile={handleRemoveFile} />
                    {isProcessingFiles && <p className="text-sm text-indigo-600 mt-3 text-center font-medium animate-pulse">מפענח נתונים מקבצים...</p>}
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        הגדרות ניסוח
                    </h2>
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">שם המורה (לחתימה)</label>
                        <input type="text" placeholder="לדוגמה: המורה יוסף" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-slate-50 ${showTeacherNameError ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300'}`} />
                        {showTeacherNameError && <p className="text-xs text-red-500 mt-1 font-medium">נא להזין שם מורה לפני יצירת ההודעות</p>}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">סגנון הודעה</label>
                        <div className="flex flex-col gap-2 bg-slate-100 p-2 rounded-xl">
                            <button onClick={() => setGenerationStyle(GenerationStyle.DETAILED)} className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all text-right ${generationStyle === GenerationStyle.DETAILED ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>מפורט (ציונים והערות)</button>
                            <button onClick={() => setGenerationStyle(GenerationStyle.GENERAL)} className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all text-right ${generationStyle === GenerationStyle.GENERAL ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>כללי (סיכום מגמה)</button>
                            <button onClick={() => setGenerationStyle(GenerationStyle.REPORT_CARD)} className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all text-right ${generationStyle === GenerationStyle.REPORT_CARD ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>הערת מחנך לתעודה</button>
                        </div>
                    </div>
                    <div>
                         <label className="text-sm font-semibold text-slate-700 mb-2 block">הוראות נוספות ל-AI</label>
                         <textarea className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-slate-50 resize-none" rows={3} placeholder="לדוגמה: להוסיף סמיילי בסוף, להדגיש שיפור..." value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
                    </div>
                    <div className="pt-2">
                        {!isGenerating ? (
                             <button onClick={handleGenerate} disabled={students.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2">
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                                 צור הודעות ({students.filter(s => s.isSelected).length})
                             </button>
                        ) : (
                            <button onClick={handleStopGeneration} className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex justify-center items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" /></svg>
                                עצור יצירה
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="xl:col-span-3">
                 <div className="flex gap-1 mb-4 bg-slate-200/50 p-1 rounded-xl w-fit">
                    <button onClick={() => setCurrentView('table')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}>רשימת תלמידים</button>
                    <button onClick={() => setCurrentView('analytics')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'analytics' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}>תמונת מצב כיתתית</button>
                    <button onClick={() => setCurrentView('trends')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'trends' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}>מגמות ושינויים</button>
                 </div>
                 {currentView === 'table' ? (
                     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                        <StudentTable students={students} messages={messages} onToggleSelect={handleToggleSelect} onUpdatePhone={handleUpdatePhone} onViewStudent={setViewingStudent} onSelectAll={handleSelectAll} />
                     </div>
                 ) : currentView === 'analytics' ? (
                     <AnalyticsDashboard students={students} />
                 ) : (
                    <TrendsDashboard students={students} />
                 )}
            </div>
        </div>
        {viewingStudent && <StudentDetailsModal student={viewingStudent} onClose={() => setViewingStudent(null)} />}
      </div>
      <footer className="w-full text-center py-6 mt-4 border-t border-slate-200">
          <p className="text-slate-500 text-sm">© כל הזכויות שמורות ל- <span className="font-semibold text-indigo-600">Toledano EdTech</span></p>
      </footer>
    </div>
  );
};

export default App;