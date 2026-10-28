import React, { useState } from 'react';
import { 
  Folder, 
  Passage, 
  Question, 
  QuestionSet, 
  VerificationStatus,
  AppMode
} from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Edit3, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FolderInput, 
  PlayCircle, 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  CheckSquare, 
  Square, 
  Plus, 
  FolderPlus, 
  Layers, 
  Upload, 
  FolderOpen,
  Eye,
  Sparkles
} from 'lucide-react';
import { getFolderTrail, getAllDescendantFolderIds } from '../utils/storage';

interface QuestionListViewProps {
  questions: Question[];
  folders: Folder[];
  sets: QuestionSet[];
  passages: Passage[];
  currentFolderId: string | null;
  activeFilter: 'all' | 'conflict' | 'missing' | 'passage' | 'folder';
  searchQuery: string;
  appMode: AppMode;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestion: (setId: string, questionId: string, direction: 'up' | 'down') => void;
  onMoveQuestion: (questionIds: string[]) => void;
  onBatchDelete: (questionIds: string[]) => void;
  onBatchVerify: (questionIds: string[]) => void;
  onStartPractice: (filteredQuestions?: Question[]) => void;
  onOpenUpload: (targetFolderId?: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onSwitchToEditMode?: () => void;
}

export const QuestionListView: React.FC<QuestionListViewProps> = ({
  questions,
  folders,
  sets,
  passages,
  currentFolderId,
  activeFilter,
  searchQuery,
  appMode,
  onEditQuestion,
  onDeleteQuestion,
  onReorderQuestion,
  onMoveQuestion,
  onBatchDelete,
  onBatchVerify,
  onStartPractice,
  onOpenUpload,
  onSelectFolder,
  onCreateFolder,
  onSwitchToEditMode
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [expandedPassage, setExpandedPassage] = useState<boolean>(true);
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(false);

  // Compute folder breadcrumb trail across arbitrary nesting depth
  const breadcrumbs = getFolderTrail(folders, currentFolderId);
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const childSubfolders = folders.filter(f => f.parentFolderId === currentFolderId);

  // Filter questions strictly based on current folder or global status
  const filteredQuestions = questions.filter(q => {
    // Search query match
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const inText = q.questionText.toLowerCase().includes(qLower);
      const inOptions = q.options.some(o => o.text.toLowerCase().includes(qLower));
      const inExpl = (q.explanation || '').toLowerCase().includes(qLower);
      if (!inText && !inOptions && !inExpl) return false;
    }

    // Status filter
    if (activeFilter === 'conflict') {
      return q.verificationStatus === 'conflict';
    }
    if (activeFilter === 'missing') {
      return q.verificationStatus === 'missing_answer';
    }
    if (activeFilter === 'passage') {
      return q.questionType === 'passage_mcq';
    }

    // Strict Folder Filter:
    // If viewing a folder, only show questions belonging strictly to this folder
    // unless the user deliberately toggled "includeSubfolders"!
    if (activeFilter === 'folder' && currentFolderId) {
      if (includeSubfolders) {
        const targetFolderIds = getAllDescendantFolderIds(folders, currentFolderId);
        return targetFolderIds.includes(q.folderId);
      } else {
        return q.folderId === currentFolderId;
      }
    }

    return true;
  });

  // Group questions by Set or find linked passage
  const currentSetIds = Array.from(new Set(filteredQuestions.map(q => q.setId)));
  const currentSets = sets.filter(s => currentSetIds.includes(s.id));
  const currentPassage = currentSets.find(s => s.passageId)?.passageId
    ? passages.find(p => p.id === currentSets.find(s => s.passageId)?.passageId)
    : null;

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id));
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleExplanation = (qId: string) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleResolveConflict = (q: Question, chosenAnswer: string) => {
    onEditQuestion({
      ...q,
      correctAnswer: chosenAnswer,
      verificationStatus: 'verified',
      verificationNotes: undefined,
      updatedAt: Date.now()
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-950 text-slate-100">
      {/* Mode Banner */}
      {appMode === 'preview' ? (
        <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>प्रिव्यू मोड (Preview Mode):</strong> आप 110 विषयों के प्रश्न देख व अभ्यास कर सकते हैं। डेटा जोड़ने, हटाने या एडिट करने के लिए ऊपर <strong>'Edit'</strong> चुनें।
            </span>
          </div>
          {onSwitchToEditMode && (
            <button
              onClick={onSwitchToEditMode}
              className="text-xs font-semibold text-emerald-200 hover:text-white underline ml-3 shrink-0"
            >
              स्विच करें &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-3.5 py-2 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>एडिट मोड (Edit Mode सक्रिय):</strong> आप नए प्रश्न जोड़ सकते हैं, सबफ़ोल्डर्स बना सकते हैं, प्रश्न सुधार व हटा सकते हैं।
            </span>
          </div>
        </div>
      )}

      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
            <button
              onClick={() => onSelectFolder(null)}
              className="hover:text-indigo-400 transition-colors"
            >
              सभी प्रश्न (All)
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <button
                  onClick={() => onSelectFolder(crumb.id)}
                  className={`hover:text-indigo-400 transition-colors ${
                    idx === breadcrumbs.length - 1 ? 'font-semibold text-slate-200' : ''
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-2.5 mt-1">
            <h2 className="text-base md:text-xl font-bold text-slate-100">
              {activeFilter === 'conflict'
                ? 'सत्यापन आवश्यक प्रश्न (Conflicting Answers)'
                : activeFilter === 'missing'
                ? 'उत्तर अनुपलब्ध प्रश्न (Missing Answers)'
                : activeFilter === 'passage'
                ? 'गद्यांश आधारित प्रश्न (Passage MCQs)'
                : currentFolder
                ? currentFolder.name
                : 'सभी प्रश्न (All MCQs)'}
            </h2>

            {currentFolder && (
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-2 py-0.5 rounded">
                📁 {currentFolder.parentFolderId ? 'सबफ़ोल्डर' : 'मुख्य विषय'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
            <span>
              इस फ़ोल्डर में: <strong className="text-slate-200 font-mono tabular-nums">{filteredQuestions.length}</strong> प्रश्न
            </span>

            {childSubfolders.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-indigo-300">
                  <input
                    type="checkbox"
                    checked={includeSubfolders}
                    onChange={(e) => setIncludeSubfolders(e.target.checked)}
                    className="rounded text-indigo-600 bg-slate-900 border-slate-700"
                  />
                  <span>सबफ़ोल्डर्स के प्रश्न भी शामिल करें ({childSubfolders.length} सबफ़ोल्डर)</span>
                </label>
              </>
            )}

            {searchQuery && (
              <>
                <span aria-hidden="true">·</span>
                <span>खोज परिणाम: "{searchQuery}"</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls for this Folder */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Practice button always available if questions exist */}
          {filteredQuestions.length > 0 && (
            <button
              onClick={() => onStartPractice(filteredQuestions)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/80 rounded-lg shadow-xs transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>इस विषय का अभ्यास करें ({filteredQuestions.length})</span>
            </button>
          )}

          {/* EDIT MODE ONLY: Add more questions or subfolders */}
          {appMode === 'edit' && currentFolderId && (
            <>
              <button
                onClick={() => onOpenUpload(currentFolderId)}
                title="इस फ़ोल्डर में और प्रश्न जोड़ें"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ इस फ़ोल्डर में और प्रश्न जोड़ें</span>
              </button>

              <button
                onClick={() => onCreateFolder(currentFolderId)}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ सबफ़ोल्डर</span>
              </button>
            </>
          )}

          {appMode === 'edit' && !currentFolderId && (
            <button
              onClick={() => onOpenUpload()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>कंटेंट अपलोड</span>
            </button>
          )}
        </div>
      </div>

      {/* Subfolder Chips when viewing a folder with subfolders */}
      {childSubfolders.length > 0 && (
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>इसके अंदर {childSubfolders.length} सबफ़ोल्डर्स हैं:</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {childSubfolders.map(sub => {
              const subCount = questions.filter(q => q.folderId === sub.id).length;
              return (
                <button
                  key={sub.id}
                  onClick={() => onSelectFolder(sub.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-slate-300 transition-colors"
                >
                  <FolderOpen className="w-3 h-3 text-amber-400" />
                  <span>{sub.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({subCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked Passage Display (if set is passage-based) */}
      {currentPassage && (
        <div className="p-4 bg-slate-900/80 border border-indigo-900/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-indigo-300">
            <div className="flex items-center gap-2 font-bold text-xs">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>{currentPassage.title}</span>
            </div>
            <button
              onClick={() => setExpandedPassage(!expandedPassage)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              {expandedPassage ? 'गद्यांश छिपाएँ' : 'गद्यांश देखें'}
            </button>
          </div>

          {expandedPassage && (
            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800/60 font-sans">
              <div className="whitespace-pre-wrap max-h-56 overflow-y-auto p-1 text-slate-200">
                {currentPassage.text}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Selection Toolbar: ONLY IN EDIT MODE */}
      {appMode === 'edit' && filteredQuestions.length > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-slate-300 hover:text-slate-100 font-medium"
            >
              {selectedIds.length === filteredQuestions.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>
                {selectedIds.length > 0
                  ? `${selectedIds.length} चयनित (Selected)`
                  : 'सभी चुनें (Select All)'}
              </span>
            </button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onMoveQuestion(selectedIds)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
              >
                <FolderInput className="w-3 h-3 text-slate-400" />
                <span>स्थानांतरित करें (Move)</span>
              </button>

              <button
                onClick={() => onBatchVerify(selectedIds)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 rounded-md transition-colors"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>सत्यापित करें</span>
              </button>

              <button
                onClick={() => onBatchDelete(selectedIds)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 rounded-md transition-colors"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>हटाएँ (Delete)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State when folder has 0 questions */}
      {filteredQuestions.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-slate-800 bg-slate-900/40 rounded-xl space-y-4 max-w-lg mx-auto my-6">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-indigo-400">
            {currentFolder ? <FolderOpen className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-200">
              {searchQuery 
                ? 'कोई मेल खाता प्रश्न नहीं मिला' 
                : currentFolder 
                ? `"${currentFolder.name}" में अभी कोई प्रश्न नहीं है` 
                : 'कोई प्रश्न उपलब्ध नहीं है'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'कृपया अलग कीवर्ड से खोजें या फ़िल्टर रीसेट करें।'
                : appMode === 'preview'
                ? 'इस विषय में नए प्रश्न जोड़ने या संपादित करने के लिए ऊपर "Edit" मोड पर स्विच करें।'
                : 'इस फ़ोल्डर में प्रश्न जोड़ने के लिए नीचे दिए गए बटन से कंटेंट पेस्ट या अपलोड करें।'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {appMode === 'preview' ? (
              onSwitchToEditMode && (
                <button
                  onClick={onSwitchToEditMode}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit मोड में स्विच करें और प्रश्न जोड़ें</span>
                </button>
              )
            ) : currentFolderId ? (
              <button
                onClick={() => onOpenUpload(currentFolderId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ इस फ़ोल्डर में प्रश्न जोड़ें / अपलोड करें</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onCreateFolder(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ नया मुख्य फ़ोल्डर बनाएँ</span>
                </button>

                <button
                  onClick={() => onOpenUpload()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>कंटेंट अपलोड / पेस्ट करें</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Questions Feed */
        <div className="space-y-3">
          {filteredQuestions.map((q, index) => {
            const isSelected = selectedIds.includes(q.id);
            const isExplanationOpen = expandedExplanations[q.id];

            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-indigo-500/70 shadow-md ring-1 ring-indigo-500/50'
                    : q.verificationStatus === 'conflict'
                    ? 'bg-slate-900/90 border-rose-800/60'
                    : q.verificationStatus === 'missing_answer'
                    ? 'bg-slate-900/90 border-amber-800/60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header row: Checkbox, Question Number, Status, Actions */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    {/* Checkbox ONLY in EDIT mode */}
                    {appMode === 'edit' && (
                      <button
                        type="button"
                        onClick={() => toggleSelectQuestion(q.id)}
                        className="text-slate-400 hover:text-indigo-400"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    )}

                    <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Q{q.sourceNumber || index + 1}
                    </span>

                    {/* Verification Status Badges */}
                    {q.verificationStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>सत्यापित</span>
                      </span>
                    )}

                    {q.verificationStatus === 'conflict' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>विरोधाभास (Conflict)</span>
                      </span>
                    )}

                    {q.verificationStatus === 'missing_answer' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                        <HelpCircle className="w-3 h-3 text-amber-400" />
                        <span>उत्तर गायब</span>
                      </span>
                    )}
                  </div>

                  {/* Actions & Reordering: ONLY IN EDIT MODE */}
                  {appMode === 'edit' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onReorderQuestion(q.setId, q.id, 'up')}
                        title="ऊपर ले जाएँ (Move Up)"
                        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReorderQuestion(q.setId, q.id, 'down')}
                        title="नीचे ले जाएँ (Move Down)"
                        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditQuestion(q)}
                        title="संपादित करें (Edit)"
                        className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(q.id)}
                        title="हटाएँ (Delete)"
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Conflict Notice */}
                {q.verificationStatus === 'conflict' && (
                  <div className="mb-3 p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs space-y-2">
                    <div className="text-rose-300 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>उत्तर विरोधाभास: इनलाइन उत्तर और उत्तर कुंजी में अंतर है।</span>
                    </div>

                    {appMode === 'edit' ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-slate-300 font-medium">सही उत्तर चुनें:</span>
                        {q.inlineAnswer && (
                          <button
                            type="button"
                            onClick={() => handleResolveConflict(q, q.inlineAnswer!)}
                            className="px-2.5 py-1 font-semibold text-rose-200 bg-rose-900/60 border border-rose-700 hover:bg-rose-800 rounded-md transition-colors shadow-xs"
                          >
                            इनलाइन उत्तर: ({q.inlineAnswer})
                          </button>
                        )}
                        {q.keyAnswer && (
                          <button
                            type="button"
                            onClick={() => handleResolveConflict(q, q.keyAnswer!)}
                            className="px-2.5 py-1 font-semibold text-rose-200 bg-rose-900/60 border border-rose-700 hover:bg-rose-800 rounded-md transition-colors shadow-xs"
                          >
                            उत्तर कुंजी: ({q.keyAnswer})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditQuestion(q)}
                          className="text-xs text-indigo-400 hover:underline px-2"
                        >
                          मैन्युअल संपादित करें
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-300">
                        इनलाइन उत्तर: <strong>{q.inlineAnswer}</strong> | कुंजी उत्तर: <strong>{q.keyAnswer}</strong> (इसे बदलने के लिए ऊपर Edit मोड चुनें)
                      </p>
                    )}
                  </div>
                )}

                {/* Missing Answer Alert */}
                {q.verificationStatus === 'missing_answer' && (
                  <div className="mb-3 p-2 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs flex items-center justify-between text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>इस प्रश्न का सही उत्तर दर्ज नहीं है।</span>
                    </div>
                    {appMode === 'edit' && (
                      <button
                        type="button"
                        onClick={() => onEditQuestion(q)}
                        className="text-amber-200 font-semibold hover:underline"
                      >
                        उत्तर दर्ज करें &rarr;
                      </button>
                    )}
                  </div>
                )}

                {/* Question Text */}
                <p className="text-xs md:text-sm text-slate-100 font-medium mb-3 whitespace-pre-wrap leading-relaxed">
                  {q.questionText}
                </p>

                {/* Options List (supports 2 to 10 options cleanly) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = q.correctAnswer === opt.label || q.inlineAnswer === opt.label;

                    return (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 transition-colors ${
                          isCorrect
                            ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200 font-medium'
                            : 'bg-slate-950/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className={`font-bold font-mono px-1 rounded ${
                          isCorrect ? 'text-emerald-300 bg-emerald-900/50' : 'text-slate-400'
                        }`}>
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

                {/* Footer with Correct Answer and Explanation Toggle */}
                <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">उत्तर:</span>
                    {q.correctAnswer ? (
                      <span className="font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                        विकल्प ({q.correctAnswer})
                      </span>
                    ) : (
                      <span className="text-amber-400 italic">अनुपलब्ध</span>
                    )}

                    {q.keyAnswer && q.inlineAnswer && q.keyAnswer === q.inlineAnswer && (
                      <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                        (इनलाइन व कुंजी दोनों में समान)
                      </span>
                    )}
                  </div>

                  {q.explanation && (
                    <button
                      type="button"
                      onClick={() => toggleExplanation(q.id)}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      <span>{isExplanationOpen ? 'व्याख्या छिपाएँ' : 'व्याख्या देखें (Solution)'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExplanationOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Explanation Content */}
                {isExplanationOpen && q.explanation && (
                  <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed animate-fadeIn">
                    <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span className="text-indigo-400">💡</span>
                      <span>व्याख्या / समाधान (Explanation):</span>
                    </div>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
