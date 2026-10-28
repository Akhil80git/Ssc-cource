export type AppMode = 'preview' | 'edit';

export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: number;
  description?: string;
}

export type QuestionSetContentType = 
  | 'standard' 
  | 'passage' 
  | 'cloze' 
  | 'statement' 
  | 'assertion_reason' 
  | 'match' 
  | 'multi_correct' 
  | 'raw';

export interface QuestionSet {
  id: string;
  folderId: string;
  title: string;
  contentType: QuestionSetContentType;
  passageId?: string;
  directions?: string;
  createdAt: number;
}

export interface Passage {
  id: string;
  title: string;
  text: string;
  language?: 'hindi' | 'english' | 'mixed';
  notes?: string;
}

export interface QuestionOption {
  label: string; // e.g. "A", "B", "क", "ख", "1", "i"
  text: string;
}

export type QuestionType = 
  | 'mcq' 
  | 'passage_mcq' 
  | 'cloze' 
  | 'true_false' 
  | 'assertion_reason' 
  | 'match' 
  | 'statement' 
  | 'multi_correct' 
  | 'short_answer' 
  | 'raw';

export type VerificationStatus = 
  | 'verified' 
  | 'unverified' 
  | 'conflict' 
  | 'missing_answer';

export interface Question {
  id: string;
  setId: string;
  folderId: string;
  questionText: string;
  questionType: QuestionType;
  options: QuestionOption[];
  correctAnswer?: string; // matched option label, e.g. "B" or "(B)"
  correctAnswerText?: string;
  inlineAnswer?: string;
  keyAnswer?: string;
  explanation?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  sourceNumber?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  version: number;
  folders: Folder[];
  sets: QuestionSet[];
  passages: Passage[];
  questions: Question[];
  lastUpdated: number;
}

export interface ParsedQuestionItem {
  id: string;
  sourceNumber?: string;
  questionText: string;
  questionType: QuestionType;
  options: QuestionOption[];
  inlineAnswer?: string;
  keyAnswer?: string;
  detectedAnswer?: string;
  explanation?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  similarityScore?: number;
  similarToQuestionText?: string;
  hasConflict?: boolean;
}

export interface ParsedSetItem {
  title: string;
  contentType: QuestionSetContentType;
  directions?: string;
  passage?: {
    title: string;
    text: string;
    language?: 'hindi' | 'english' | 'mixed';
    notes?: string;
  };
  questions: ParsedQuestionItem[];
}

export interface ParseResult {
  sets: ParsedSetItem[];
  rawText: string;
  stats: {
    totalQuestions: number;
    validQuestions: number;
    missingAnswers: number;
    conflicts: number;
    duplicates: number;
    similar: number;
    skippedLines: number;
  };
  skippedContent: string[];
}
