import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  Flag, 
  BookOpen, 
  ListOrdered, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Passage, Question, QuestionSet } from '../types';

interface PracticeModeProps {
  questions: Question[];
  passages: Passage[];
  sets: QuestionSet[];
  onExit: () => void;
  title?: string;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  questions,
  passages,
  sets,
  onExit,
  title = 'MCQ Practice Session'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>(questions);
  const [isPassageExpanded, setIsPassageExpanded] = useState(true);

  // Synchronize when questions change
  useEffect(() => {
    setPracticeQuestions(questions);
    setCurrentIndex(0);
    setUserAnswers({});
    setRevealedAnswers({});
    setFlaggedQuestions({});
    setShowSummary(false);
  }, [questions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSummary || viewMode === 'scroll') return;

      const currentQ = practiceQuestions[currentIndex];
      if (!currentQ) return;

      if (e.key === 'ArrowRight' || e.key === 'n') {
        if (currentIndex < practiceQuestions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        if (currentQ.options[optIdx]) {
          handleSelectOption(currentQ.id, currentQ.options[optIdx].label);
        }
      } else if (['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].includes(e.key.toLowerCase())) {
        const keyLabel = e.key.toUpperCase();
        const found = currentQ.options.find(o => o.label.toUpperCase() === keyLabel);
        if (found) {
          handleSelectOption(currentQ.id, found.label);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, practiceQuestions, showSummary, viewMode, userAnswers]);

  if (practiceQuestions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-950 text-slate-100">
        <div className="p-4 bg-slate-900 rounded-full border border-slate-800">
          <BookOpen className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">अभ्यास के लिए कोई प्रश्न उपलब्ध नहीं है</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          कृपया पहले किसी फ़ोल्डर का चयन करें या नए प्रश्न अपलोड करें।
        </p>
        <button
          onClick={onExit}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
        >
          वापस जाएँ (Return to Manager)
        </button>
      </div>
    );
  }

  const currentQuestion = practiceQuestions[currentIndex];

  // Look up passage for the current question
  const currentSet = sets.find(s => s.id === currentQuestion.setId);
  const currentPassage = currentSet?.passageId 
    ? passages.find(p => p.id === currentSet.passageId)
    : null;

  // Stats computation
  const totalCount = practiceQuestions.length;
  const attemptedCount = Object.keys(userAnswers).length;
  let correctCount = 0;
  let incorrectCount = 0;

  practiceQuestions.forEach(q => {
    const ans = userAnswers[q.id];
    if (ans) {
      if (q.correctAnswer && ans.toUpperCase() === q.correctAnswer.toUpperCase()) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }
  });

  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  const handleSelectOption = (qId: string, optionLabel: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionLabel
    }));
  };

  const toggleReveal = (qId: string) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const toggleFlag = (qId: string) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleResetSession = () => {
    setUserAnswers({});
    setRevealedAnswers({});
    setFlaggedQuestions({});
    setCurrentIndex(0);
    setShowSummary(false);
  };

  const handleRetryIncorrectOnly = () => {
    const incorrectQs = practiceQuestions.filter(q => {
      const ans = userAnswers[q.id];
      return ans && (!q.correctAnswer || ans.toUpperCase() !== q.correctAnswer.toUpperCase());
    });

    if (incorrectQs.length > 0) {
      setPracticeQuestions(incorrectQs);
      setUserAnswers({});
      setRevealedAnswers({});
      setFlaggedQuestions({});
      setCurrentIndex(0);
      setShowSummary(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>बाहर निकलें (Exit)</span>
          </button>
          <div>
            <h2 className="text-xs md:text-sm font-bold text-slate-100 truncate max-w-xs md:max-w-md">
              {title}
            </h2>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              प्रश्न {currentIndex + 1} / {totalCount}
            </div>
          </div>
        </div>

        {/* Live Score Counter */}
        <div className="flex items-center gap-3 md:gap-5 text-xs">
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-slate-400">
              प्रयास: <strong className="text-slate-200 font-mono tabular-nums">{attemptedCount}/{totalCount}</strong>
            </span>
            <span className="text-emerald-400">
              सही: <strong className="font-mono tabular-nums">{correctCount}</strong>
            </span>
            <span className="text-rose-400">
              गलत: <strong className="font-mono tabular-nums">{incorrectCount}</strong>
            </span>
            <span className="text-indigo-400">
              सटीकता: <strong className="font-mono tabular-nums">{accuracy}%</strong>
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800">
            <button
              onClick={() => setViewMode('single')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'single' ? 'bg-slate-800 shadow-xs text-slate-100' : 'text-slate-400'
              }`}
            >
              एक-एक प्रश्न
            </button>
            <button
              onClick={() => setViewMode('scroll')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'scroll' ? 'bg-slate-800 shadow-xs text-slate-100' : 'text-slate-400'
              }`}
            >
              सभी स्क्रॉल
            </button>
          </div>

          <button
            onClick={() => setShowSummary(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 rounded-lg transition-colors"
          >
            परिणाम (Summary)
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1 bg-slate-850">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
        />
      </div>

      {/* Main Practice Workspace */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* If passage is present: Left or Collapsible Top Passage Drawer */}
        {currentPassage && (
          <div className="w-full md:w-5/12 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 overflow-y-auto max-h-[35vh] md:max-h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>{currentPassage.title}</span>
              </div>
              <button
                onClick={() => setIsPassageExpanded(!isPassageExpanded)}
                className="md:hidden text-slate-400 p-1"
              >
                {isPassageExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isPassageExpanded && (
              <div className="space-y-2 text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
                {currentSet?.directions && (
                  <p className="text-xs text-indigo-300 italic bg-indigo-950/40 p-2 rounded border border-indigo-900/50">
                    {currentSet.directions}
                  </p>
                )}
                <div className="whitespace-pre-wrap">
                  {currentPassage.text}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right / Main Questions Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-between">
          {viewMode === 'single' ? (
            /* Single Question Mode */
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {/* Question Card */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-xs space-y-4">
                {/* Meta Bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 font-mono text-sm">
                      प्रश्न {currentIndex + 1}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {currentQuestion.questionType.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({currentQuestion.options.length} विकल्प)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        flaggedQuestions[currentQuestion.id]
                          ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{flaggedQuestions[currentQuestion.id] ? 'फ्लैग किया' : 'फ्लैग करें'}</span>
                    </button>

                    <button
                      onClick={() => toggleReveal(currentQuestion.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-indigo-400 px-2 py-1 text-xs rounded hover:bg-slate-800 transition-colors"
                    >
                      {revealedAnswers[currentQuestion.id] ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>उत्तर छिपाएँ</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>उत्तर दिखाएँ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-sm md:text-base font-semibold text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {currentQuestion.questionText}
                </h3>

                {/* Options Interactive List */}
                <div className="space-y-2.5 pt-2">
                  {currentQuestion.options.map((opt, oIdx) => {
                    const isSelected = userAnswers[currentQuestion.id] === opt.label;
                    const isCorrectAnswer = currentQuestion.correctAnswer && 
                      opt.label.toUpperCase() === currentQuestion.correctAnswer.toUpperCase();
                    const hasAnswered = !!userAnswers[currentQuestion.id];
                    const isRevealed = !!revealedAnswers[currentQuestion.id];

                    let buttonClass = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900';
                    let labelBadgeClass = 'bg-slate-800 text-slate-400';

                    if (hasAnswered || isRevealed) {
                      if (isCorrectAnswer) {
                        buttonClass = 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200 font-medium shadow-xs';
                        labelBadgeClass = 'bg-emerald-600 text-white';
                      } else if (isSelected && !isCorrectAnswer) {
                        buttonClass = 'bg-rose-950/60 border-rose-500/80 text-rose-200 shadow-xs';
                        labelBadgeClass = 'bg-rose-600 text-white';
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, opt.label)}
                        className={`w-full text-left p-3 md:p-3.5 rounded-lg border flex items-start gap-3 transition-all ${buttonClass}`}
                      >
                        <span className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${labelBadgeClass}`}>
                          {opt.label}
                        </span>

                        <span className="flex-1 text-xs md:text-sm leading-snug">
                          {opt.text}
                        </span>

                        {hasAnswered && isCorrectAnswer && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        )}

                        {hasAnswered && isSelected && !isCorrectAnswer && (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Solution / Explanation Box */}
                {(userAnswers[currentQuestion.id] || revealedAnswers[currentQuestion.id]) && (
                  <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">
                        सही उत्तर: <strong className="text-emerald-400 font-mono">({currentQuestion.correctAnswer || 'उपलब्ध नहीं'})</strong>
                      </span>
                      {currentQuestion.verificationStatus === 'conflict' && (
                        <span className="text-rose-300 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded text-[11px]">
                          विरोधाभास समीक्षा आवश्यक
                        </span>
                      )}
                    </div>

                    {currentQuestion.explanation && (
                      <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed pt-2 border-t border-slate-850 font-sans">
                        <strong className="text-slate-400 block mb-1">विस्तृत व्याख्या:</strong>
                        {currentQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Nav Buttons for Single Mode */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>पिछला (Previous)</span>
                </button>

                <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
                  शॉर्टकट: 1-9 या A-J दबाएं, &larr; / &rarr; से नेविगेट करें
                </div>

                <button
                  onClick={() => {
                    if (currentIndex < practiceQuestions.length - 1) {
                      setCurrentIndex(prev => prev + 1);
                    } else {
                      setShowSummary(true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
                >
                  <span>{currentIndex < practiceQuestions.length - 1 ? 'अगला (Next)' : 'समीक्षा देखें (Finish)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Scroll All Mode */
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {practiceQuestions.map((q, qIdx) => {
                const hasAnswered = !!userAnswers[q.id];
                const isRevealed = !!revealedAnswers[q.id];

                return (
                  <div key={q.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                      <span className="font-bold text-slate-100 font-mono text-sm">
                        प्रश्न {qIdx + 1}
                      </span>
                      <button
                        onClick={() => toggleReveal(q.id)}
                        className="text-xs text-slate-400 hover:text-indigo-400"
                      >
                        {isRevealed ? 'उत्तर छिपाएँ' : 'उत्तर दिखाएँ'}
                      </button>
                    </div>

                    <h3 className="text-sm md:text-base font-semibold text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {q.questionText}
                    </h3>

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = userAnswers[q.id] === opt.label;
                        const isCorrectAnswer = q.correctAnswer && 
                          opt.label.toUpperCase() === q.correctAnswer.toUpperCase();

                        let buttonClass = 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-900';
                        if (hasAnswered || isRevealed) {
                          if (isCorrectAnswer) {
                            buttonClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-medium';
                          } else if (isSelected && !isCorrectAnswer) {
                            buttonClass = 'bg-rose-950/60 border-rose-500 text-rose-200';
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.label)}
                            className={`w-full text-left p-3 rounded-lg border flex items-start gap-3 transition-colors ${buttonClass}`}
                          >
                            <span className="w-5 h-5 rounded font-mono text-xs font-bold bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                              {opt.label}
                            </span>
                            <span className="flex-1 text-xs md:text-sm">{opt.text}</span>
                            {hasAnswered && isCorrectAnswer && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {(hasAnswered || isRevealed) && (
                      <div className="p-3 bg-slate-950 rounded-lg text-xs space-y-1 border border-slate-800">
                        <div className="text-emerald-400 font-semibold">
                          सही उत्तर: ({q.correctAnswer})
                        </div>
                        {q.explanation && (
                          <div className="text-slate-300 whitespace-pre-wrap">
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Jump-to Question Navigation Grid */}
          <div className="max-w-3xl mx-auto w-full pt-4 border-t border-slate-800 mt-6">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>त्वरित प्रश्न नेविगेशन (Quick Jump Grid):</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>सही</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>गलत</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span>बाकी</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
              {practiceQuestions.map((q, idx) => {
                const ans = userAnswers[q.id];
                const isCorrect = ans && q.correctAnswer && ans.toUpperCase() === q.correctAnswer.toUpperCase();
                const isWrong = ans && (!q.correctAnswer || ans.toUpperCase() !== q.correctAnswer.toUpperCase());
                const isCurrent = currentIndex === idx;
                const isFlagged = flaggedQuestions[q.id];

                let badgeColor = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800';
                if (isCorrect) badgeColor = 'bg-emerald-600 text-white border-emerald-500';
                else if (isWrong) badgeColor = 'bg-rose-600 text-white border-rose-500';
                else if (isFlagged) badgeColor = 'bg-amber-950 border-amber-700 text-amber-300';

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setViewMode('single');
                    }}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-semibold border flex items-center justify-center transition-all ${badgeColor} ${
                      isCurrent ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-950' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Practice Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
              <h3 className="text-base font-bold text-slate-100">
                अभ्यास सारांश (Practice Report)
              </h3>
              <button
                onClick={() => setShowSummary(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-center py-2">
                <div className="text-4xl font-extrabold text-indigo-400 font-mono tabular-nums">
                  {accuracy}%
                </div>
                <p className="text-xs text-slate-400 mt-1">सटीकता दर (Accuracy)</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400 font-medium">कुल प्रश्न</div>
                  <div className="text-lg font-bold text-slate-200 font-mono">{totalCount}</div>
                </div>
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
                  <div className="text-xs text-emerald-400 font-medium">सही उत्तर</div>
                  <div className="text-lg font-bold text-emerald-300 font-mono">{correctCount}</div>
                </div>
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg">
                  <div className="text-xs text-rose-400 font-medium">गलत उत्तर</div>
                  <div className="text-lg font-bold text-rose-300 font-mono">{incorrectCount}</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {incorrectCount > 0 && (
                  <button
                    onClick={handleRetryIncorrectOnly}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span>केवल गलत प्रश्नों का पुनः अभ्यास करें ({incorrectCount})</span>
                  </button>
                )}

                <button
                  onClick={handleResetSession}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span>शुरू से पुनः अभ्यास करें (Reset Practice)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
