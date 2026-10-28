import React from 'react';
import { Menu, Search, Upload, Eye, Edit3, X, Sparkles } from 'lucide-react';
import { AppMode } from '../types';

interface TopNavProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeView: 'questions' | 'practice' | 'verification';
  onChangeView: (view: 'questions' | 'practice' | 'verification') => void;
  appMode: AppMode;
  onChangeAppMode: (mode: AppMode) => void;
  onOpenUpload: () => void;
  conflictCount: number;
  totalQuestions: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  activeView,
  onChangeView,
  appMode,
  onChangeAppMode,
  onOpenUpload,
  conflictCount,
  totalQuestions
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 md:px-5 py-2.5 flex items-center justify-between gap-2 md:gap-4 text-slate-100 shadow-md">
      {/* Zone 1: Mobile Hamburger & Brand Wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onChangeView('questions');
          }}
          className="flex items-center gap-2 tracking-tight whitespace-nowrap shrink-0 group"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xs">
            <span className="font-extrabold text-xs">SSC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm md:text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors hidden sm:inline">
              MCQ Master Manager
            </span>
            <span className="text-sm font-bold text-slate-100 sm:hidden">
              MCQ Studio
            </span>
          </div>
        </a>
      </div>

      {/* Zone 2: Search */}
      <div className="flex-1 flex items-center justify-center max-w-lg mx-auto px-1 md:px-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search questions, options, topics, Hindi/English..."
            className="w-full pl-9 pr-8 py-1.5 text-xs md:text-sm bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-800 focus:border-indigo-500 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Zone 3: [1. Preview] & [2. Edit] Mode Toggle Buttons + Actions */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Practice shortcut when in Preview Mode */}
        {activeView === 'practice' ? (
          <button
            onClick={() => onChangeView('questions')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            ← प्रश्न सूची पर लौटें
          </button>
        ) : (
          <button
            onClick={() => onChangeView('practice')}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            title="अभ्यास शुरू करें"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>प्रैक्टिस</span>
          </button>
        )}

        {/* 2 Mandatory Buttons Requested by User: [1] Preview, [2] Edit */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
          {/* Button 1: PREVIEW (Default active) */}
          <button
            type="button"
            onClick={() => onChangeAppMode('preview')}
            title="प्रिव्यू मोड: केवल देखने और अभ्यास करने के लिए"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              appMode === 'preview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Eye className={`w-3.5 h-3.5 ${appMode === 'preview' ? 'text-white' : 'text-slate-400'}`} />
            <span>Preview</span>
          </button>

          {/* Button 2: EDIT (Enables Add, Delete, Edit) */}
          <button
            type="button"
            onClick={() => onChangeAppMode('edit')}
            title="एडिट मोड: डेटा जोड़ने, हटाने व एडिट करने के लिए"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              appMode === 'edit'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Edit3 className={`w-3.5 h-3.5 ${appMode === 'edit' ? 'text-white' : 'text-slate-400'}`} />
            <span>Edit</span>
          </button>
        </div>

        {/* Upload Button: Visible in EDIT mode */}
        {appMode === 'edit' && (
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap animate-fadeIn"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">कंटेंट जोड़ें</span>
            <span className="sm:hidden">अपलोड</span>
          </button>
        )}
      </div>
    </header>
  );
};
