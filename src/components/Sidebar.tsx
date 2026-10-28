import React, { useState, useMemo } from 'react';
import { 
  Folder as FolderIcon, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  AlertCircle, 
  HelpCircle, 
  BookOpen, 
  PlayCircle, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Plus, 
  HardDrive,
  X,
  FileQuestion,
  UploadCloud,
  Search,
  RotateCcw,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { AppMode, Folder, Question, QuestionSet } from '../types';
import { getAllDescendantFolderIds } from '../utils/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  sets: QuestionSet[];
  questions: Question[];
  activeFolderId: string | null;
  activeFilter: 'all' | 'conflict' | 'missing' | 'passage' | 'folder';
  appMode: AppMode;
  onSelectFolder: (folderId: string | null) => void;
  onSelectFilter: (filter: 'all' | 'conflict' | 'missing' | 'passage') => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onStartPractice: () => void;
  onOpenUpload: (targetFolderId?: string) => void;
  onOpenBackup: () => void;
  onResetToMasterSyllabus?: () => void;
  storageUsage: { usedBytes: number; percentage: number; formattedUsed: string; isNearLimit: boolean };
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  folders,
  sets,
  questions,
  activeFolderId,
  activeFilter,
  appMode,
  onSelectFolder,
  onSelectFilter,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onStartPractice,
  onOpenUpload,
  onOpenBackup,
  onResetToMasterSyllabus,
  storageUsage
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'f_main_quant': true,
    'f_main_reasoning': false,
    'f_main_english': false,
    'f_main_ga': false,
    'f_main_computer': false
  });
  const [topicSearchQuery, setTopicSearchQuery] = useState('');

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const totalQuestions = questions.length;
  const conflictCount = questions.filter(q => q.verificationStatus === 'conflict').length;
  const missingCount = questions.filter(q => q.verificationStatus === 'missing_answer').length;
  const passageCount = questions.filter(q => q.questionType === 'passage_mcq').length;

  // Direct question count for a folder
  const getDirectFolderCount = (folderId: string): number => {
    return questions.filter(q => q.folderId === folderId).length;
  };

  // Cumulative question count (including all subfolders)
  const getRecursiveFolderCount = (folderId: string): number => {
    const descendantIds = getAllDescendantFolderIds(folders, folderId);
    return questions.filter(q => descendantIds.includes(q.folderId)).length;
  };

  const rootFolders = folders.filter(f => !f.parentFolderId);
  const getSubfolders = (parentId: string) => folders.filter(f => f.parentFolderId === parentId);

  // Filter folders if user searches topics in the sidebar
  const filteredSubfolderMap = useMemo(() => {
    if (!topicSearchQuery.trim()) return null;
    const query = topicSearchQuery.toLowerCase();
    const matchingIds = new Set<string>();

    folders.forEach(f => {
      if (f.name.toLowerCase().includes(query)) {
        matchingIds.add(f.id);
        if (f.parentFolderId) {
          matchingIds.add(f.parentFolderId);
        }
      }
    });

    return matchingIds;
  }, [folders, topicSearchQuery]);

  const renderFolderItem = (folder: Folder, depth: number = 0) => {
    const rawSubfolders = getSubfolders(folder.id);
    const subfolders = filteredSubfolderMap 
      ? rawSubfolders.filter(s => filteredSubfolderMap.has(s.id))
      : rawSubfolders;

    const hasSubfolders = rawSubfolders.length > 0;
    const isExpanded = topicSearchQuery.trim() 
      ? true 
      : (expandedFolders[folder.id] ?? (depth === 0 ? false : true));

    const isSelected = activeFilter === 'folder' && activeFolderId === folder.id;
    const directCount = getDirectFolderCount(folder.id);
    const totalRecursiveCount = getRecursiveFolderCount(folder.id);

    // If searching and this folder doesn't match and has no matching children, skip
    if (filteredSubfolderMap && !filteredSubfolderMap.has(folder.id)) {
      return null;
    }

    const isRoot = !folder.parentFolderId;

    return (
      <div key={folder.id} className="select-none">
        <div
          onClick={() => {
            onSelectFolder(folder.id);
            if (window.innerWidth < 768) onClose();
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
            isSelected
              ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
              : isRoot
              ? 'text-slate-200 hover:bg-slate-800/90 font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasSubfolders ? (
              <button
                type="button"
                onClick={(e) => toggleFolder(folder.id, e)}
                className="p-0.5 text-slate-400 hover:text-slate-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            <FolderIcon className={`w-3.5 h-3.5 shrink-0 ${
              isRoot ? 'text-amber-400' : isSelected ? 'text-indigo-400' : 'text-slate-500'
            }`} />
            <span className="truncate" title={folder.name}>{folder.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
              totalRecursiveCount > 0 
                ? 'text-indigo-300 bg-indigo-950/60 font-semibold' 
                : 'text-slate-500'
            }`}>
              {isRoot && hasSubfolders ? totalRecursiveCount : directCount}
            </span>

            {/* Folder action controls: ONLY in EDIT Mode */}
            {appMode === 'edit' && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                <button
                  type="button"
                  title="इस फ़ोल्डर में प्रश्न जोड़ें (+ Add Content)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUpload(folder.id);
                  }}
                  className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-slate-700 rounded"
                >
                  <UploadCloud className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="सबफ़ोल्डर जोड़ें (+ Subfolder)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(folder.id);
                  }}
                  className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="नाम बदलें (Rename)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameFolder(folder);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="हटाएँ (Delete)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {hasSubfolders && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {subfolders.map(sub => renderFolderItem(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Dark Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-full w-72 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-out md:translate-x-0 text-slate-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Mode Indicator Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              SSC
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-tight text-slate-100 leading-tight">
                Master Syllabus
              </h1>
              <div className="flex items-center gap-1.5 text-[10px]">
                {appMode === 'preview' ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Eye className="w-2.5 h-2.5" /> Preview (Read Only)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-medium">
                    <Edit3 className="w-2.5 h-2.5" /> Edit Mode (Active)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="p-2.5 space-y-2 border-b border-slate-800">
          {/* In EDIT mode, show Upload button */}
          {appMode === 'edit' && (
            <button
              onClick={() => {
                onOpenUpload(activeFolderId || undefined);
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>कंटेंट अपलोड / पेस्ट करें (Upload)</span>
            </button>
          )}

          {/* Practice button available in both modes */}
          <button
            onClick={() => {
              onStartPractice();
              if (window.innerWidth < 768) onClose();
            }}
            disabled={totalQuestions === 0}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>अभ्यास शुरू करें (Practice)</span>
          </button>
        </div>

        {/* Navigation & Views */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Quick Filters */}
          <div className="space-y-0.5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
              फ़िल्टर व सूचियाँ (Views)
            </div>

            <button
              onClick={() => {
                onSelectFilter('all');
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>सभी प्रश्न (All MCQs)</span>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {totalQuestions}
              </span>
            </button>

            <button
              onClick={() => {
                onSelectFilter('conflict');
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'conflict'
                  ? 'bg-rose-950/50 text-rose-300 font-semibold border border-rose-800/50'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-3.5 h-3.5 ${conflictCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
                <span>सत्यापन आवश्यक (Conflicts)</span>
              </div>
              {conflictCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 font-semibold text-rose-300 bg-rose-900/60 rounded-sm font-mono tabular-nums">
                  {conflictCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onSelectFilter('missing');
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'missing'
                  ? 'bg-amber-950/50 text-amber-300 font-semibold border border-amber-800/50'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className={`w-3.5 h-3.5 ${missingCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>उत्तर गायब (Missing Ans)</span>
              </div>
              {missingCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 font-semibold text-amber-300 bg-amber-900/60 rounded-sm font-mono tabular-nums">
                  {missingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onSelectFilter('passage');
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === 'passage'
                  ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>गद्यांश आधारित (Passages)</span>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {passageCount}
              </span>
            </button>
          </div>

          {/* 5 Main Folders + 110 Subfolders Section */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                5 मुख्य विषय (110 Topics)
              </span>

              {/* In EDIT mode, allow creating custom main folder */}
              {appMode === 'edit' && (
                <button
                  type="button"
                  onClick={() => onCreateFolder(null)}
                  title="नया मुख्य फ़ोल्डर बनाएँ (+ Root Folder)"
                  className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-[11px]"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ नया</span>
                </button>
              )}
            </div>

            {/* Topic Search within 110 Topics */}
            <div className="relative px-1 pb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={topicSearchQuery}
                onChange={(e) => setTopicSearchQuery(e.target.value)}
                placeholder="विषय खोजें (उदा: Number System, Algebra...)"
                className="w-full pl-8 pr-7 py-1 text-[11px] bg-slate-950 text-slate-200 placeholder-slate-500 border border-slate-800 focus:border-indigo-500 rounded-md focus:outline-none"
              />
              {topicSearchQuery && (
                <button
                  onClick={() => setTopicSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {folders.length === 0 ? (
              <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 text-center space-y-2">
                <FileQuestion className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  फ़ोल्डर लोड हो रहे हैं...
                </p>
                {onResetToMasterSyllabus && (
                  <button
                    type="button"
                    onClick={onResetToMasterSyllabus}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 rounded-md transition-colors"
                  >
                    110 टॉपिक्स लोड करें
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {rootFolders.map(folder => renderFolderItem(folder, 0))}
              </div>
            )}
          </div>
        </div>

        {/* Local Storage & Backup Footer */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-xs space-y-2">
          {/* Storage Meter */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <div className="flex items-center gap-1 font-medium">
                <HardDrive className="w-3 h-3 text-slate-500" />
                <span>ब्राउज़र स्टोरेज</span>
              </div>
              <span className="font-mono tabular-nums text-slate-400">
                {storageUsage.formattedUsed} ({storageUsage.percentage}%)
              </span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  storageUsage.isNearLimit ? 'bg-rose-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.max(4, storageUsage.percentage)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              onClick={onOpenBackup}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>बैकअप / रीस्टोर</span>
            </button>

            {/* In Edit mode, show Re-sync Master Syllabus button */}
            {appMode === 'edit' && onResetToMasterSyllabus && (
              <button
                onClick={onResetToMasterSyllabus}
                title="SSC मास्टर सिलेबस (5 Main + 110 Subfolders) रिस्टोर करें"
                className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
