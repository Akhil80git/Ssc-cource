import React, { useState } from 'react';
import { X, FolderInput } from 'lucide-react';
import { Folder } from '../types';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string;
  onMove: (targetFolderId: string) => void;
  itemCount: number;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onMove,
  itemCount
}) => {
  const [targetId, setTargetId] = useState<string>(
    folders.find(f => f.id !== currentFolderId)?.id || currentFolderId
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetId) {
      onMove(targetId);
      onClose();
    }
  };

  const renderFolderOptions = () => {
    const buildOptions = (parentIdVal: string | null, depth: number): React.ReactNode[] => {
      const children = folders.filter(f => f.parentFolderId === parentIdVal);
      let items: React.ReactNode[] = [];
      for (const child of children) {
        const indent = '— '.repeat(depth);
        items.push(
          <option 
            key={child.id} 
            value={child.id} 
            disabled={child.id === currentFolderId}
            className="bg-slate-900 text-slate-100"
          >
            {depth > 0 ? `${indent}📁 ` : '📁 '}{child.name} {child.id === currentFolderId ? '(वर्तमान फ़ोल्डर)' : ''}
          </option>
        );
        items = items.concat(buildOptions(child.id, depth + 1));
      }
      return items;
    };

    return buildOptions(null, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <FolderInput className="w-5 h-5 text-indigo-400" />
            <span>प्रश्न स्थानांतरित करें (Move Questions)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-300">
            चयनित <strong>{itemCount}</strong> प्रश्न को किस फ़ोल्डर/सबफ़ोल्डर में स्थानांतरित करना चाहते हैं?
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              गंतव्य फ़ोल्डर (Target Folder)
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-950 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {renderFolderOptions()}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              disabled={!targetId || targetId === currentFolderId}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors shadow-xs"
            >
              स्थानांतरित करें (Move)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
