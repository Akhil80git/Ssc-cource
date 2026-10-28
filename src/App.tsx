import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Passage, 
  Question, 
  QuestionSet, 
  ParsedSetItem, 
  AppData,
  AppMode
} from './types';
import { 
  loadAppData, 
  saveAppData, 
  calculateStorageUsage,
  getAllDescendantFolderIds,
  resetToSSCMasterSyllabus
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { QuestionListView } from './components/QuestionListView';
import { PracticeMode } from './components/PracticeMode';
import { UploadModal } from './components/UploadModal';
import { FolderModal } from './components/FolderModal';
import { QuestionEditModal } from './components/QuestionEditModal';
import { MoveModal } from './components/MoveModal';
import { BackupModal } from './components/BackupModal';
import { Trash2 } from 'lucide-react';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  // Mode toggle: Default is 'preview' (User request: "default mai privew select rahe ok")
  const [appMode, setAppMode] = useState<AppMode>('preview');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'conflict' | 'missing' | 'passage' | 'folder'>('all');
  const [activeView, setActiveView] = useState<'questions' | 'practice' | 'verification'>('questions');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);

  const [isQuestionEditOpen, setIsQuestionEditOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [questionsToMove, setQuestionsToMove] = useState<string[]>([]);

  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Delete Confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Practice session state
  const [practiceQuestionsSubset, setPracticeQuestionsSubset] = useState<Question[] | null>(null);

  // Storage usage indicator
  const [storageUsage, setStorageUsage] = useState(() => calculateStorageUsage());

  const updateAndPersist = (newData: AppData) => {
    setAppData(newData);
    saveAppData(newData);
    setStorageUsage(calculateStorageUsage());
  };

  useEffect(() => {
    setStorageUsage(calculateStorageUsage());
  }, [appData]);

  // Folder Operations (arbitrary depth)
  const handleCreateFolder = (name: string, parentFolderId: string | null): Folder => {
    const newFolder: Folder = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      parentFolderId: parentFolderId || null,
      createdAt: Date.now()
    };
    const updated: AppData = {
      ...appData,
      folders: [...appData.folders, newFolder]
    };
    updateAndPersist(updated);
    setActiveFolderId(newFolder.id);
    setActiveFilter('folder');
    setActiveView('questions');
    return newFolder;
  };

  const handleRenameFolder = (id: string, newName: string) => {
    const updatedFolders = appData.folders.map(f => 
      f.id === id ? { ...f, name: newName } : f
    );
    updateAndPersist({
      ...appData,
      folders: updatedFolders
    });
  };

  const handleDeleteFolder = (folder: Folder) => {
    // Collect all recursive child folder IDs at ANY depth
    const idsToDelete = getAllDescendantFolderIds(appData.folders, folder.id);
    const questionCount = appData.questions.filter(q => idsToDelete.includes(q.folderId)).length;

    setDeleteConfirm({
      isOpen: true,
      title: 'फ़ोल्डर हटाएँ (Delete Folder)',
      message: `क्या आप "${folder.name}" और इसके अंदर के सभी सबफ़ोल्डर्स व ${questionCount} प्रश्नों को हटाना चाहते हैं?`,
      onConfirm: () => {
        const remainingFolders = appData.folders.filter(f => !idsToDelete.includes(f.id));
        const remainingSets = appData.sets.filter(s => !idsToDelete.includes(s.folderId));
        const remainingQuestions = appData.questions.filter(q => !idsToDelete.includes(q.folderId));

        updateAndPersist({
          ...appData,
          folders: remainingFolders,
          sets: remainingSets,
          questions: remainingQuestions
        });

        if (activeFolderId && idsToDelete.includes(activeFolderId)) {
          setActiveFolderId(null);
          setActiveFilter('all');
        }
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Upload & Parse Saving
  const handleSaveParsedContent = (
    targetFolderId: string,
    parsedSets: ParsedSetItem[],
    skipDuplicates: boolean
  ) => {
    const newPassages: Passage[] = [...appData.passages];
    const newSets: QuestionSet[] = [...appData.sets];
    const newQuestions: Question[] = [...appData.questions];

    let runningOrder = newQuestions.length + 1;

    parsedSets.forEach((pSet) => {
      let linkedPassageId: string | undefined;

      if (pSet.passage) {
        linkedPassageId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        newPassages.push({
          id: linkedPassageId,
          title: pSet.passage.title,
          text: pSet.passage.text,
          language: pSet.passage.language,
          notes: pSet.passage.notes
        });
      }

      const setId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      newSets.push({
        id: setId,
        folderId: targetFolderId,
        title: pSet.title,
        contentType: pSet.contentType,
        passageId: linkedPassageId,
        directions: pSet.directions,
        createdAt: Date.now()
      });

      pSet.questions.forEach((q) => {
        if (skipDuplicates && q.isDuplicate) {
          return;
        }

        newQuestions.push({
          id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          setId,
          folderId: targetFolderId,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          correctAnswer: q.detectedAnswer || q.inlineAnswer || q.keyAnswer,
          inlineAnswer: q.inlineAnswer,
          keyAnswer: q.keyAnswer,
          explanation: q.explanation,
          verificationStatus: q.verificationStatus,
          verificationNotes: q.verificationNotes,
          sourceNumber: q.sourceNumber,
          order: runningOrder++,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });
    });

    updateAndPersist({
      ...appData,
      passages: newPassages,
      sets: newSets,
      questions: newQuestions
    });

    setActiveFolderId(targetFolderId);
    setActiveFilter('folder');
  };

  const handleOpenUpload = (targetFolderId?: string) => {
    // When user explicitly wants to add content, engage Edit mode
    setAppMode('edit');
    if (targetFolderId) {
      setActiveFolderId(targetFolderId);
      setActiveFilter('folder');
    }
    setIsUploadOpen(true);
  };

  // Question editing
  const handleSaveQuestion = (updated: Question) => {
    const updatedQuestions = appData.questions.map(q => 
      q.id === updated.id ? updated : q
    );
    updateAndPersist({
      ...appData,
      questions: updatedQuestions
    });
  };

  const handleDeleteQuestion = (qId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'प्रश्न हटाएँ (Delete Question)',
      message: 'क्या आप इस प्रश्न को हटाना चाहते हैं?',
      onConfirm: () => {
        const remaining = appData.questions.filter(q => q.id !== qId);
        updateAndPersist({
          ...appData,
          questions: remaining
        });
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleReorderQuestion = (setId: string, questionId: string, direction: 'up' | 'down') => {
    const setQuestions = appData.questions.filter(q => q.setId === setId);
    const idx = setQuestions.findIndex(q => q.id === questionId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const prev = setQuestions[idx - 1];
      const cur = setQuestions[idx];
      const tempOrder = prev.order;
      prev.order = cur.order;
      cur.order = tempOrder;
    } else if (direction === 'down' && idx < setQuestions.length - 1) {
      const next = setQuestions[idx + 1];
      const cur = setQuestions[idx];
      const tempOrder = next.order;
      next.order = cur.order;
      cur.order = tempOrder;
    }

    const updated = appData.questions.map(q => {
      const found = setQuestions.find(sq => sq.id === q.id);
      return found || q;
    });

    updateAndPersist({
      ...appData,
      questions: updated
    });
  };

  const handleMoveQuestions = (targetFolderId: string) => {
    if (questionsToMove.length === 0) return;

    const updatedQuestions = appData.questions.map(q => {
      if (questionsToMove.includes(q.id)) {
        return { ...q, folderId: targetFolderId, updatedAt: Date.now() };
      }
      return q;
    });

    updateAndPersist({
      ...appData,
      questions: updatedQuestions
    });

    setQuestionsToMove([]);
  };

  const handleBatchDelete = (qIds: string[]) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'चयनित प्रश्न हटाएँ',
      message: `क्या आप चयनित ${qIds.length} प्रश्नों को हटाना चाहते हैं?`,
      onConfirm: () => {
        const remaining = appData.questions.filter(q => !qIds.includes(q.id));
        updateAndPersist({
          ...appData,
          questions: remaining
        });
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBatchVerify = (qIds: string[]) => {
    const updated = appData.questions.map(q => {
      if (qIds.includes(q.id)) {
        return {
          ...q,
          verificationStatus: 'verified' as const,
          verificationNotes: undefined,
          updatedAt: Date.now()
        };
      }
      return q;
    });
    updateAndPersist({
      ...appData,
      questions: updated
    });
  };

  const handleStartPractice = (filteredQuestions?: Question[]) => {
    const pool = filteredQuestions && filteredQuestions.length > 0
      ? filteredQuestions
      : appData.questions;
    setPracticeQuestionsSubset(pool);
    setActiveView('practice');
  };

  const conflictCount = appData.questions.filter(q => q.verificationStatus === 'conflict').length;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Dark Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        folders={appData.folders}
        sets={appData.sets}
        questions={appData.questions}
        activeFolderId={activeFolderId}
        activeFilter={activeFilter}
        appMode={appMode}
        onSelectFolder={(folderId) => {
          setActiveFolderId(folderId);
          setActiveFilter(folderId ? 'folder' : 'all');
          setActiveView('questions');
        }}
        onSelectFilter={(filter) => {
          setActiveFilter(filter);
          setActiveFolderId(null);
          setActiveView('questions');
        }}
        onCreateFolder={(parentId) => {
          setFolderModalParentId(parentId || null);
          setFolderToEdit(null);
          setIsFolderModalOpen(true);
        }}
        onRenameFolder={(folder) => {
          setFolderToEdit(folder);
          setIsFolderModalOpen(true);
        }}
        onDeleteFolder={handleDeleteFolder}
        onStartPractice={() => handleStartPractice()}
        onOpenUpload={handleOpenUpload}
        onOpenBackup={() => setIsBackupOpen(true)}
        onResetToMasterSyllabus={() => {
          const fresh = resetToSSCMasterSyllabus(true);
          setAppData(fresh);
        }}
        storageUsage={storageUsage}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-950">
        {/* Top Bar with 2 Mandatory Buttons: Preview (1st, default) and Edit (2nd) */}
        <TopNav
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeView={activeView}
          onChangeView={(view) => {
            if (view === 'verification') {
              setActiveFilter('conflict');
              setActiveView('questions');
            } else if (view === 'practice') {
              handleStartPractice();
            } else {
              setActiveView('questions');
            }
          }}
          appMode={appMode}
          onChangeAppMode={setAppMode}
          onOpenUpload={() => handleOpenUpload(activeFolderId || undefined)}
          conflictCount={conflictCount}
          totalQuestions={appData.questions.length}
        />

        {/* View Router */}
        {activeView === 'practice' ? (
          <PracticeMode
            questions={practiceQuestionsSubset || appData.questions}
            passages={appData.passages}
            sets={appData.sets}
            onExit={() => setActiveView('questions')}
            title={activeFolderId ? appData.folders.find(f => f.id === activeFolderId)?.name : 'अभ्यास सत्र'}
          />
        ) : (
          <QuestionListView
            questions={appData.questions}
            folders={appData.folders}
            sets={appData.sets}
            passages={appData.passages}
            currentFolderId={activeFolderId}
            activeFilter={activeFilter}
            searchQuery={searchQuery}
            appMode={appMode}
            onEditQuestion={(q) => {
              setQuestionToEdit(q);
              setIsQuestionEditOpen(true);
            }}
            onDeleteQuestion={handleDeleteQuestion}
            onReorderQuestion={handleReorderQuestion}
            onMoveQuestion={(ids) => {
              setQuestionsToMove(ids);
              setIsMoveModalOpen(true);
            }}
            onBatchDelete={handleBatchDelete}
            onBatchVerify={handleBatchVerify}
            onStartPractice={(qs) => handleStartPractice(qs)}
            onOpenUpload={handleOpenUpload}
            onSelectFolder={(fId) => {
              setActiveFolderId(fId);
              setActiveFilter(fId ? 'folder' : 'all');
            }}
            onCreateFolder={(parentId) => {
              setFolderModalParentId(parentId || null);
              setFolderToEdit(null);
              setIsFolderModalOpen(true);
            }}
            onSwitchToEditMode={() => setAppMode('edit')}
          />
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folders={appData.folders}
        existingQuestions={appData.questions}
        currentFolderId={activeFolderId}
        onSaveParsedContent={handleSaveParsedContent}
        onCreateFolder={handleCreateFolder}
      />

      {/* Folder Create/Rename Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSave={handleCreateFolder}
        folders={appData.folders}
        initialParentId={folderModalParentId}
        editFolder={folderToEdit}
        onRename={handleRenameFolder}
      />

      {/* Question Edit Modal */}
      <QuestionEditModal
        isOpen={isQuestionEditOpen}
        question={questionToEdit}
        onClose={() => {
          setIsQuestionEditOpen(false);
          setQuestionToEdit(null);
        }}
        onSave={handleSaveQuestion}
      />

      {/* Move Questions Modal */}
      <MoveModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setQuestionsToMove([]);
        }}
        folders={appData.folders}
        currentFolderId={activeFolderId || ''}
        onMove={handleMoveQuestions}
        itemCount={questionsToMove.length}
      />

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        appData={appData}
        storageUsage={storageUsage}
        onDataRestored={() => {
          const fresh = loadAppData();
          setAppData(fresh);
          setActiveFolderId(null);
          setActiveFilter('all');
          setStorageUsage(calculateStorageUsage());
        }}
      />

      {/* Custom Dark Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-800 overflow-hidden text-slate-100">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
                <Trash2 className="w-5 h-5 shrink-0" />
                <span>{deleteConfirm.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {deleteConfirm.message}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={deleteConfirm.onConfirm}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors"
                >
                  हटाएँ (Confirm Delete)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
