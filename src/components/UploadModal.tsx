import React, { useState, useEffect, useId } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  FolderPlus, 
  Sparkles, 
  Edit2, 
  Trash2, 
  ArrowRight,
  Info,
  FolderOpen
} from 'lucide-react';
import { Folder, ParsedQuestionItem, ParsedSetItem, ParseResult, Question } from '../types';
import { parseMCQContent } from '../utils/parser';
import { checkDuplicate } from '../utils/duplicateDetector';
import { getFolderPathString } from '../utils/storage';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  existingQuestions: Question[];
  currentFolderId: string | null;
  onSaveParsedContent: (
    targetFolderId: string,
    sets: ParsedSetItem[],
    skipDuplicates: boolean
  ) => void;
  onCreateFolder: (name: string, parentId: string | null) => Folder;
}

const SAMPLE_TEMPLATES = {
  standard: `1. सूर्य के सबसे निकट कौन-सा ग्रह है?
(A) शुक्र
(B) बुध
(C) मंगल
(D) बृहस्पति
उत्तर: (B) बुध
व्याख्या: बुध (Mercury) सूर्य का सबसे निकटतम और सौरमंडल का सबसे छोटा ग्रह है।

2. Which Indian state has the longest coastline?
A) Tamil Nadu
B) Maharashtra
C) Gujarat
D) Andhra Pradesh
Answer: C
Explanation: Gujarat possesses the longest coastline in India, extending over 1,600 km.

3. मानव शरीर की सबसे बड़ी ग्रंथि कौन-सी है?
(क) अग्न्याशय
(ख) यकृत
(ग) थायरॉयड
(घ) पीयूष
उत्तर: (ख) यकृत
व्याख्या: यकृत (Liver) मानव शरीर का सबसे बड़ा आंतरिक अंग और ग्रंथि है।`,

  tenOptions: `1. आवर्त सारणी में अक्रिय गैस (Noble Gas) कौन-सी है?
(A) हाइड्रोजन
(B) हीलियम
(C) लिथियम
(D) बेरिलियम
(E) बोरॉन
(F) कार्बन
(G) नाइट्रोजन
(H) ऑक्सीजन
(I) फ्लोरीन
(J) नियॉन
उत्तर: B
व्याख्या: हीलियम (He) और नियॉन (Ne) दोनों अक्रिय गैसें हैं।`,

  inline: `1. What is the SI unit of electric current? (A) Volt (B) Ampere (C) Ohm (D) Watt Answer: B Explanation: Ampere is the base unit of electric current.
2. भारत की प्रथम महिला राष्ट्रपति कौन थीं? (A) प्रतिभा पाटिल (B) सरोजिनी नायडू (C) इंदिरा गांधी (D) द्रौपदी मुर्मू उत्तर: A
3. Which gas is known as Laughing Gas? (1) N2O (2) NO2 (3) CO2 (4) SO2 Ans: 1`,

  passage: `Directions (Q. 1 - 2): Read the following passage and answer the questions below.
Passage: Artificial Intelligence is revolutionizing multiple industries. In healthcare, computer vision algorithms assist radiologists in detecting malignancies with unprecedented accuracy. Natural language processing models streamline clinical documentation, reducing physician burnout. However, algorithmic bias and data privacy remain critical challenges.

1. According to the text, how does computer vision assist radiologists?
(A) By replacing doctors entirely
(B) By detecting malignancies with high accuracy
(C) By reducing pharmaceutical costs
(D) By manufacturing medical hardware
Answer: B

2. What challenge is explicitly highlighted regarding AI implementation?
(A) Extreme lack of electricity
(B) High cost of computer monitors
(C) Algorithmic bias and data privacy
(D) Language barriers in rural clinics
Answer: C`,

  withAnswerKey: `1. हड़प्पा सभ्यता की खोज किस वर्ष हुई थी?
(A) 1901
(B) 1921
(C) 1935
(D) 1942
उत्तर: (B) 1921

2. Who was the first Governor-General of independent India?
(A) Lord Mountbatten
(B) C. Rajagopalachari
(C) Dr. Rajendra Prasad
(D) Jawaharlal Nehru
Answer: (A)

3. प्रकाश वर्ष (Light Year) किसका मात्रक है?
(A) समय
(B) दूरी
(C) प्रकाश की तीव्रता
(D) चाल

Answer Key:
1-B, 2-A, 3-B`
};

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  folders,
  existingQuestions,
  currentFolderId,
  onSaveParsedContent,
  onCreateFolder
}) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderType, setNewFolderType] = useState<'root' | 'subfolder'>('root');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'conflicts' | 'duplicates'>('all');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const fileInputId = useId();

  // Synchronize targetFolderId cleanly whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setRawText('');
      setParseResult(null);
      setFileError('');
      setEditingQuestionId(null);

      if (currentFolderId && folders.some(f => f.id === currentFolderId)) {
        setTargetFolderId(currentFolderId);
        setIsCreatingNewFolder(false);
      } else if (folders.length > 0) {
        setTargetFolderId(folders[0].id);
        setIsCreatingNewFolder(false);
      } else {
        setTargetFolderId('');
        setIsCreatingNewFolder(true);
        setNewFolderName('');
        setNewFolderType('root');
      }
    }
  }, [isOpen, currentFolderId, folders]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.type.includes('text')) {
      setFileError('कृपया एक वैध टेक्स्ट फ़ाइल (.txt) चुनें');
      return;
    }

    setFileError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleParse = () => {
    if (!rawText.trim()) return;

    const result = parseMCQContent(rawText);

    // Cross-check duplicates against existing questions
    let totalDuplicates = 0;
    let totalSimilar = 0;

    result.sets.forEach((s) => {
      s.questions.forEach((q) => {
        const dupCheck = checkDuplicate(q, existingQuestions);
        if (dupCheck.isExactDuplicate) {
          q.isDuplicate = true;
          q.duplicateOfId = dupCheck.matchedQuestion?.id;
          q.verificationNotes = dupCheck.reason;
          totalDuplicates++;
        } else if (dupCheck.isSimilar) {
          q.similarityScore = dupCheck.similarityScore;
          q.similarToQuestionText = dupCheck.matchedQuestion?.questionText;
          q.verificationNotes = dupCheck.reason;
          totalSimilar++;
        }
      });
    });

    result.stats.duplicates = totalDuplicates;
    result.stats.similar = totalSimilar;

    setParseResult(result);
    setStep('preview');
  };

  const handleConfirmSave = () => {
    if (!parseResult) return;

    let finalFolderId = targetFolderId;
    if (isCreatingNewFolder && newFolderName.trim()) {
      const parentId = newFolderType === 'subfolder' ? (targetFolderId || null) : null;
      const created = onCreateFolder(newFolderName.trim(), parentId);
      finalFolderId = created.id;
    }

    if (!finalFolderId && folders.length > 0) {
      finalFolderId = folders[0].id;
    }

    if (!finalFolderId) {
      const created = onCreateFolder('My Questions (मुख्य फ़ोल्डर)', null);
      finalFolderId = created.id;
    }

    onSaveParsedContent(finalFolderId, parseResult.sets, skipDuplicates);
    onClose();
  };

  const updateParsedQuestion = (qId: string, updates: Partial<ParsedQuestionItem>) => {
    if (!parseResult) return;
    const newSets = parseResult.sets.map((set) => {
      return {
        ...set,
        questions: set.questions.map((q) => {
          if (q.id === qId) {
            return { ...q, ...updates };
          }
          return q;
        })
      };
    });

    setParseResult({
      ...parseResult,
      sets: newSets
    });
  };

  const deleteParsedQuestion = (qId: string) => {
    if (!parseResult) return;
    const newSets = parseResult.sets.map((set) => ({
      ...set,
      questions: set.questions.filter((q) => q.id !== qId)
    })).filter(s => s.questions.length > 0 || s.passage);

    setParseResult({
      ...parseResult,
      sets: newSets
    });
  };

  // Render tree options for target folder selection
  const renderFolderSelectOptions = () => {
    const buildOptions = (parentIdVal: string | null, depth: number): React.ReactNode[] => {
      const children = folders.filter(f => f.parentFolderId === parentIdVal);
      let items: React.ReactNode[] = [];
      for (const child of children) {
        const indent = '— '.repeat(depth);
        items.push(
          <option key={child.id} value={child.id} className="bg-slate-900 text-slate-100">
            {depth > 0 ? `${indent}📁 ` : '📁 '}{child.name}
          </option>
        );
        items = items.concat(buildOptions(child.id, depth + 1));
      }
      return items;
    };

    return buildOptions(null, 0);
  };

  const selectedFolderName = folders.find(f => f.id === targetFolderId)?.name;
  const existingFolderCount = existingQuestions.filter(q => q.folderId === targetFolderId).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-100">
                {step === 'input' ? 'कंटेंट पेस्ट या अपलोड करें (Upload MCQs)' : 'पार्स पूर्वावलोकन व सत्यापन (Parsed Preview)'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'input' 
                  ? 'प्रश्न, 2-10 विकल्प, उत्तर और समाधान स्वचालित रूप से पहचाने जाएँगे' 
                  : 'सहेजने से पहले प्रश्नों की समीक्षा करें और आवश्यक बदलाव करें'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {step === 'input' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Target Folder Banner */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <FolderOpen className="w-4 h-4 text-indigo-400" />
                  <span>
                    {isCreatingNewFolder 
                      ? 'नया फ़ोल्डर बनाकर सहेजें:' 
                      : 'चयनित गंतव्य फ़ोल्डर (Target Folder):'}
                  </span>
                </div>

                {folders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewFolder(!isCreatingNewFolder);
                      setNewFolderName('');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 self-start sm:self-auto"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{isCreatingNewFolder ? 'मौजूदा फ़ोल्डर में जोड़ें' : '+ नया फ़ोल्डर बनाएँ'}</span>
                  </button>
                )}
              </div>

              {!isCreatingNewFolder && folders.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs md:text-sm bg-slate-900 text-slate-100 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {renderFolderSelectOptions()}
                  </select>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <span>पथ: <strong className="text-slate-200">{getFolderPathString(folders, targetFolderId)}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>पहले से मौजूद प्रश्न: <strong className="text-emerald-400 font-mono">{existingFolderCount}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span className="text-indigo-400">नए प्रश्न इसी फ़ोल्डर में जुड़ेंगे</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="नए फ़ोल्डर का नाम लिखें (उदा. General Science, Maths Test 1)..."
                    className="w-full px-3 py-2 text-xs md:text-sm bg-slate-900 text-slate-100 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500 font-medium"
                    autoFocus
                  />
                  {folders.length > 0 && (
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="newFolderType"
                          value="root"
                          checked={newFolderType === 'root'}
                          onChange={() => setNewFolderType('root')}
                          className="text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                        />
                        <span>मुख्य फ़ोल्डर (Root)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="newFolderType"
                          value="subfolder"
                          checked={newFolderType === 'subfolder'}
                          onChange={() => setNewFolderType('subfolder')}
                          className="text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                        />
                        <span>सबफ़ोल्डर (Subfolder under {selectedFolderName || 'चयनित'})</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Sample Selector */}
            <div className="p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>त्वरित नमूना लोड करें (Quick Test Samples):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_TEMPLATES.standard)}
                  className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-slate-900 border border-indigo-800/60 rounded-md hover:bg-indigo-950/60 transition-colors"
                >
                  मानक हिंदी/English
                </button>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_TEMPLATES.tenOptions)}
                  className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-slate-900 border border-indigo-800/60 rounded-md hover:bg-indigo-950/60 transition-colors"
                >
                  10 विकल्पों वाला MCQ (A-J)
                </button>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_TEMPLATES.passage)}
                  className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-slate-900 border border-indigo-800/60 rounded-md hover:bg-indigo-950/60 transition-colors"
                >
                  Passage / गद्यांश सेट
                </button>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_TEMPLATES.inline)}
                  className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-slate-900 border border-indigo-800/60 rounded-md hover:bg-indigo-950/60 transition-colors"
                >
                  Inline (एक ही लाइन)
                </button>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_TEMPLATES.withAnswerKey)}
                  className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-slate-900 border border-indigo-800/60 rounded-md hover:bg-indigo-950/60 transition-colors"
                >
                  अलग उत्तर कुंजी (Answer Key)
                </button>
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                टेक्स्ट पेस्ट करें या .txt फ़ाइल अपलोड करें
              </label>

              <label
                htmlFor={fileInputId}
                className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-indigo-300 bg-slate-800 px-2.5 py-1.5 rounded-md hover:bg-slate-700 transition-colors border border-slate-700"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>फ़ाइल चुनें (.txt)</span>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {fileError && (
              <p className="text-xs text-rose-400">{fileError}</p>
            )}

            {/* Content Textarea */}
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="यहाँ प्रश्न पेस्ट करें...
उदा.
1. भारत की राजधानी क्या है?
(A) मुंबई
(B) नई दिल्ली
(C) कोलकाता
(D) चेन्नई
उत्तर: (B) नई दिल्ली
व्याख्या: नई दिल्ली भारत की राजधानी है।"
              rows={12}
              className="w-full p-3 font-mono text-xs md:text-sm bg-slate-950 text-slate-100 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed placeholder-slate-600"
            />
          </div>
        ) : (
          /* Preview Step */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Stats Summary Bar */}
            {parseResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400 font-medium">कुल पहचाने गए प्रश्न</div>
                  <div className="text-xl font-bold text-slate-100 font-mono tabular-nums">
                    {parseResult.stats.totalQuestions}
                  </div>
                </div>
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
                  <div className="text-xs text-emerald-400 font-medium">वैध MCQs (Valid)</div>
                  <div className="text-xl font-bold text-emerald-300 font-mono tabular-nums">
                    {parseResult.stats.validQuestions}
                  </div>
                </div>
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg">
                  <div className="text-xs text-amber-400 font-medium">उत्तर गायब / समीक्षा</div>
                  <div className="text-xl font-bold text-amber-300 font-mono tabular-nums">
                    {parseResult.stats.missingAnswers + parseResult.stats.conflicts}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400 font-medium">डुप्लिकेट (Duplicates)</div>
                  <div className="text-xl font-bold text-slate-300 font-mono tabular-nums">
                    {parseResult.stats.duplicates}
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Settings Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-medium text-slate-300">
                  सटीक डुप्लिकेट प्रश्नों को स्वचालित रूप से छोड़ें (Skip exact duplicates)
                </span>
              </label>

              <span className="text-xs text-slate-400">
                लक्ष्य फ़ोल्डर: <strong className="text-slate-200">{folders.find(f => f.id === targetFolderId)?.name || newFolderName || 'नया फ़ोल्डर'}</strong>
              </span>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                सभी प्रश्न ({parseResult?.stats.totalQuestions})
              </button>
              <button
                onClick={() => setActiveTab('conflicts')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  activeTab === 'conflicts'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>समीक्षा आवश्यक</span>
                <span className="text-[10px] bg-rose-950 text-rose-300 px-1 rounded border border-rose-800">
                  {(parseResult?.stats.conflicts || 0) + (parseResult?.stats.missingAnswers || 0)}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('duplicates')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'duplicates'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                डुप्लिकेट ({parseResult?.stats.duplicates || 0})
              </button>
            </div>

            {/* Questions Preview List */}
            <div className="space-y-4">
              {parseResult?.sets.map((set, sIdx) => {
                const filteredQuestions = set.questions.filter((q) => {
                  if (activeTab === 'conflicts') {
                    return q.verificationStatus === 'conflict' || q.verificationStatus === 'missing_answer';
                  }
                  if (activeTab === 'duplicates') {
                    return q.isDuplicate || (q.similarityScore && q.similarityScore >= 70);
                  }
                  return true;
                });

                if (filteredQuestions.length === 0 && !set.passage) return null;

                return (
                  <div key={sIdx} className="space-y-3">
                    {/* Set / Passage Header */}
                    {set.passage && (
                      <div className="p-3.5 bg-indigo-950/30 border border-indigo-900/50 rounded-lg space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-300">
                            {set.passage.title}
                          </span>
                          <span className="text-[10px] text-indigo-300 uppercase bg-indigo-900/60 px-1.5 py-0.5 rounded">
                            Passage
                          </span>
                        </div>
                        {set.directions && (
                          <div className="text-xs text-indigo-400 italic">
                            {set.directions}
                          </div>
                        )}
                        <p className="text-xs text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {set.passage.text}
                        </p>
                      </div>
                    )}

                    {filteredQuestions.map((q, qIdx) => {
                      const isEditing = editingQuestionId === q.id;

                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-lg border transition-all ${
                            q.isDuplicate
                              ? 'bg-slate-950/60 border-slate-850 opacity-70'
                              : q.verificationStatus === 'conflict'
                              ? 'bg-rose-950/20 border-rose-800/60'
                              : q.verificationStatus === 'missing_answer'
                              ? 'bg-amber-950/20 border-amber-800/60'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          {/* Card Header & Status */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-200 font-mono">
                                Q{q.sourceNumber || qIdx + 1}
                              </span>

                              <span className="text-[11px] text-slate-400 font-medium">
                                Type: {q.questionType}
                              </span>

                              <span className="text-[11px] text-slate-500 font-mono">
                                ({q.options.length} विकल्प)
                              </span>

                              {q.isDuplicate && (
                                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                                  Duplicate (छोड़ा जाएगा)
                                </span>
                              )}

                              {q.verificationStatus === 'conflict' && (
                                <span className="text-[10px] font-bold text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  उत्तर विरोधाभास (Conflict)
                                </span>
                              )}

                              {q.verificationStatus === 'missing_answer' && (
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                                  उत्तर गायब (Missing)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                className="p-1 text-slate-400 hover:text-indigo-400 rounded"
                                title="संपादित करें"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteParsedQuestion(q.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded"
                                title="हटाएँ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Verification Notes */}
                          {q.verificationNotes && (
                            <div className="mb-2.5 p-2 bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs rounded-md flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                              <span>{q.verificationNotes}</span>
                            </div>
                          )}

                          {/* Question text */}
                          {isEditing ? (
                            <div className="space-y-2 mb-3">
                              <textarea
                                value={q.questionText}
                                onChange={(e) => updateParsedQuestion(q.id, { questionText: e.target.value })}
                                className="w-full p-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-md focus:ring-1 focus:ring-indigo-500"
                                rows={2}
                              />
                            </div>
                          ) : (
                            <p className="text-xs md:text-sm font-medium text-slate-100 mb-3 whitespace-pre-wrap">
                              {q.questionText}
                            </p>
                          )}

                          {/* Options grid (2 to 10 options) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = q.detectedAnswer === opt.label || q.inlineAnswer === opt.label;

                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded-md border text-xs flex items-start gap-2 transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200 font-medium'
                                      : 'bg-slate-900 border-slate-800 text-slate-300'
                                  }`}
                                >
                                  <span className="font-bold text-slate-400 shrink-0">
                                    ({opt.label})
                                  </span>
                                  <span className="flex-1">{opt.text}</span>
                                  {isCorrect && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Correct Answer & Explanation row */}
                          <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-400">उत्तर:</span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={q.detectedAnswer || ''}
                                  onChange={(e) => updateParsedQuestion(q.id, { 
                                    detectedAnswer: e.target.value,
                                    verificationStatus: 'verified' 
                                  })}
                                  placeholder="e.g. B or 2 or ख"
                                  className="w-20 px-2 py-1 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-md"
                                />
                              ) : (
                                <span className="font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                                  {q.detectedAnswer || 'उत्तर अनुपलब्ध'}
                                </span>
                              )}
                            </div>

                            {q.explanation && (
                              <div className="text-[11px] text-slate-400 max-w-md truncate" title={q.explanation}>
                                व्याख्या: {q.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900 shrink-0">
          {step === 'input' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
              >
                <span>पार्स करें व पूर्वावलोकन देखें (Parse Content)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                वापस जाएं (Back)
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isCreatingNewFolder 
                    ? `नया फ़ोल्डर बनाकर सहेजें` 
                    : `${selectedFolderName || 'फ़ोल्डर'} में सहेजें`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
