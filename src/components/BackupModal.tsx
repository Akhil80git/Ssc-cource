import React, { useState, useId } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  FileJson,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { AppData } from '../types';
import { exportBackupJSON, importBackupJSON, clearAllData } from '../utils/storage';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  storageUsage: {
    usedBytes: number;
    quotaBytes: number;
    percentage: number;
    isNearLimit: boolean;
    formattedUsed: string;
  };
  onDataRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  appData,
  storageUsage,
  onDataRestored
}) => {
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const jsonFileInputId = useId();

  if (!isOpen) return null;

  const handleExport = () => {
    exportBackupJSON(appData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const res = importBackupJSON(text, importMode);
        if (res.success) {
          setImportStatus({
            type: 'success',
            message: `${res.message} (${res.count.questions} प्रश्न, ${res.count.folders} फ़ोल्डर)`
          });
          onDataRestored();
        } else {
          setImportStatus({
            type: 'error',
            message: res.message
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    clearAllData();
    setShowClearConfirm(false);
    setImportStatus({
      type: 'success',
      message: 'डेटा साफ़ कर दिया गया और 5 मुख्य विषय व 110 सबफ़ोल्डर्स रीसेट कर दिए गए।'
    });
    onDataRestored();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl border border-slate-800 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm md:text-base font-bold text-slate-100">
              स्थानीय संग्रहण व बैकअप प्रबंधन (LocalStorage & Backup)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Important Notice Banner */}
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-lg flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <strong>महत्वपूर्ण सूचना:</strong> आपका संपूर्ण डेटा केवल इस ब्राउज़र के LocalStorage में सुरक्षित है। यदि आप ब्राउज़र डेटा साफ़ करते हैं, तो डेटा मिट सकता है। इसलिए समय-समय पर <strong>JSON Backup Export</strong> करके सुरक्षित रखें।
            </div>
          </div>

          {/* Storage Capacity Bar */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>उपयोग किया गया स्टोरेज</span>
              <span className="font-mono tabular-nums text-slate-100">
                {storageUsage.formattedUsed} / 5.0 MB ({storageUsage.percentage}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  storageUsage.isNearLimit ? 'bg-rose-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.max(3, storageUsage.percentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>कुल फ़ोल्डर: {appData.folders.length}</span>
              <span>कुल प्रश्न सेट: {appData.sets.length}</span>
              <span>कुल प्रश्न: {appData.questions.length}</span>
            </div>
          </div>

          {/* Status Message */}
          {importStatus.type && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                importStatus.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Export Section */}
          <div className="border border-slate-800 rounded-lg p-4 space-y-3 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                1. बैकअप फ़ाइल डाउनलोड करें (Export JSON)
              </h4>
            </div>
            <p className="text-xs text-slate-400">
              सभी फ़ोल्डर्स, सेट्स, गद्यांश और प्रश्नों को एक पोर्टेबल `.json` फ़ाइल में डाउनलोड करें।
            </p>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>JSON बैकअप डाउनलोड करें (Export All Data)</span>
            </button>
          </div>

          {/* Import Section */}
          <div className="border border-slate-800 rounded-lg p-4 space-y-3 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                2. बैकअप फ़ाइल से पुनर्स्थापित करें (Import / Restore)
              </h4>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300 font-medium">डेटा मर्ज करें (Merge)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="overwrite"
                  checked={importMode === 'overwrite'}
                  onChange={() => setImportMode('overwrite')}
                  className="text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300 font-medium">पूरा बदलें (Overwrite All)</span>
              </label>
            </div>

            <label
              htmlFor={jsonFileInputId}
              className="cursor-pointer flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
            >
              <FileJson className="w-4 h-4 text-slate-400" />
              <span>JSON बैकअप फ़ाइल चुनें (.json)</span>
              <input
                id={jsonFileInputId}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Clear All Data Option */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>संपूर्ण डेटा साफ़ करें (Clear All Data)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-rose-400 font-medium">क्या आप निश्चित हैं?</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-md"
                >
                  हाँ, पूरा डेटा साफ़ करें
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 rounded-md"
                >
                  रद्द करें
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
