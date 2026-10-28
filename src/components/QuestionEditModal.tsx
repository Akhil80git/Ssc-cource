import React, { useState } from 'react';
import { X, Check, Plus, Trash2, HelpCircle } from 'lucide-react';
import { Question, QuestionOption, QuestionType, VerificationStatus } from '../types';

interface QuestionEditModalProps {
  isOpen: boolean;
  question: Question | null;
  onClose: () => void;
  onSave: (updatedQuestion: Question) => void;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  question,
  onClose,
  onSave
}) => {
  if (!isOpen || !question) return null;

  const [questionText, setQuestionText] = useState(question.questionText);
  const [questionType, setQuestionType] = useState<QuestionType>(question.questionType);
  const [options, setOptions] = useState<QuestionOption[]>([...question.options]);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer || '');
  const [explanation, setExplanation] = useState(question.explanation || '');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(question.verificationStatus);
  const [sourceNumber, setSourceNumber] = useState(question.sourceNumber || '');

  const handleOptionChange = (idx: number, field: 'label' | 'text', val: string) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], [field]: val };
    setOptions(updated);
  };

  const handleAddOption = () => {
    const defaultLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const nextLabel = defaultLabels[options.length] || `${options.length + 1}`;
    setOptions([...options, { label: nextLabel, text: '' }]);
  };

  const handleRemoveOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Question = {
      ...question,
      questionText,
      questionType,
      options,
      correctAnswer: correctAnswer.trim(),
      explanation: explanation.trim(),
      verificationStatus,
      sourceNumber: sourceNumber.trim(),
      updatedAt: Date.now()
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900">
          <h3 className="text-sm md:text-base font-bold text-slate-100">
            प्रश्न संपादित करें (Edit Question)
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              प्रश्न विवरण (Question Text)
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* Type & Verification Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                प्रकार (Type)
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 text-slate-100 rounded-lg"
              >
                <option value="mcq">Standard MCQ</option>
                <option value="passage_mcq">Passage-based MCQ</option>
                <option value="assertion_reason">Assertion-Reason (अभिकथन-कारण)</option>
                <option value="match">Match the Following (सुमेलित)</option>
                <option value="statement">Statement-based (कथन)</option>
                <option value="true_false">True / False</option>
                <option value="cloze">Cloze Test</option>
                <option value="short_answer">Short Answer (बिना विकल्प)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                सत्यापन स्थिति (Status)
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 text-slate-100 rounded-lg"
              >
                <option value="verified">Verified (सत्यापित)</option>
                <option value="unverified">Unverified (असत्यापित)</option>
                <option value="conflict">Conflict (विरोधाभास)</option>
                <option value="missing_answer">Missing Answer (उत्तर गायब)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                क्रमांक (Number)
              </label>
              <input
                type="text"
                value={sourceNumber}
                onChange={(e) => setSourceNumber(e.target.value)}
                placeholder="उदा. 1, 2..."
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 text-slate-100 rounded-lg"
              />
            </div>
          </div>

          {/* Options (2 to 10 options) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                विकल्प सूची (Options - {options.length} विकल्प)
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ विकल्प जोड़ें (Add Option)</span>
              </button>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                    placeholder="Label"
                    className="w-14 px-2 py-1.5 text-xs font-bold text-center bg-slate-950 border border-slate-700 text-slate-100 rounded-md"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                    placeholder={`विकल्प ${opt.label} का विवरण...`}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 text-slate-100 rounded-md placeholder-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setCorrectAnswer(opt.label)}
                    title="इसे सही उत्तर चिह्नित करें"
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                      correctAnswer.toUpperCase() === opt.label.toUpperCase()
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    सही
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Correct Answer Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              सही उत्तर का लेबल (Correct Answer Label)
            </label>
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="उदा. B, 2, ख, J..."
              className="w-full px-3 py-1.5 text-xs md:text-sm bg-slate-950 border border-slate-700 text-slate-100 rounded-lg"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              व्याख्या / हल (Explanation & Detailed Solution)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              placeholder="चरणबद्ध हल, सूत्र या स्पष्टीकरण लिखें..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-950 border border-slate-700 text-slate-100 rounded-lg font-sans placeholder-slate-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs"
            >
              परिवर्तन सहेजें (Save Changes)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
