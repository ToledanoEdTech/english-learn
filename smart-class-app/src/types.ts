export interface SubjectRecord {
  subjectName: string;
  grade?: string | number;
  comments?: string;
  behavior?: string;
  absences?: string | number;
  lates?: string | number;
  [key: string]: any;
}

export interface Student {
  id: string;
  fullName: string;
  firstName: string;
  phoneNumber?: string;
  language?: string;
  subjects: SubjectRecord[];
  isSelected: boolean;
}

export interface GeneratedMessage {
  studentId: string;
  text: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  timestamp: number;
}

export enum GenerationStyle {
  DETAILED = 'detailed',
  GENERAL = 'general',
  REPORT_CARD = 'report_card',
}

export interface AppState {
  students: Student[];
  messages: Record<string, GeneratedMessage>;
  isProcessing: boolean;
  files: string[];
}