import { AppData, Folder, Passage, Question, QuestionSet } from '../types';
import { generateSSCMasterFolders } from '../data/sscMasterSyllabus';

export const STORAGE_KEY = 'MCQ_MANAGER_DATA_V4';
export const CURRENT_SCHEMA_VERSION = 4;

// Default initial data populated with the 5 Main Folders and 110 Subfolders (SSC Master Syllabus)
export const INITIAL_SSC_DATA: AppData = {
  version: CURRENT_SCHEMA_VERSION,
  lastUpdated: Date.now(),
  folders: generateSSCMasterFolders(),
  sets: [],
  passages: [],
  questions: []
};

/**
 * Loads entire app data from LocalStorage.
 * Guarantees the 5 Master Folders + 110 Subfolders are available,
 * while preserving any user questions entered previously.
 */
export function loadAppData(): AppData {
  try {
    const rawV4 = localStorage.getItem(STORAGE_KEY);
    if (rawV4) {
      const parsed = JSON.parse(rawV4) as AppData;
      if (parsed && Array.isArray(parsed.folders) && Array.isArray(parsed.questions)) {
        // Ensure master folders are present if user had an empty folder list
        if (parsed.folders.length === 0 || !parsed.folders.some(f => f.id === 'f_main_quant')) {
          const master = generateSSCMasterFolders();
          const existingIds = new Set(parsed.folders.map(f => f.id));
          const combinedFolders = [...parsed.folders];
          master.forEach(mf => {
            if (!existingIds.has(mf.id)) combinedFolders.push(mf);
          });
          parsed.folders = combinedFolders;
          saveAppData(parsed);
        }
        return parsed;
      }
    }

    // Check V3 for any questions already saved by the user
    const rawV3 = localStorage.getItem('MCQ_MANAGER_DATA_V3');
    if (rawV3) {
      try {
        const parsedV3 = JSON.parse(rawV3) as AppData;
        if (parsedV3 && Array.isArray(parsedV3.questions) && parsedV3.questions.length > 0) {
          const master = generateSSCMasterFolders();
          // Map questions to number system folder if their folder no longer exists
          const defaultTargetFolderId = 'f_quant_01_number_system';
          const migratedQuestions = parsedV3.questions.map(q => ({
            ...q,
            folderId: master.some(f => f.id === q.folderId) ? q.folderId : defaultTargetFolderId
          }));

          const migratedData: AppData = {
            version: CURRENT_SCHEMA_VERSION,
            lastUpdated: Date.now(),
            folders: master,
            sets: parsedV3.sets || [],
            passages: parsedV3.passages || [],
            questions: migratedQuestions
          };
          saveAppData(migratedData);
          return migratedData;
        }
      } catch {
        // Fall through to initial
      }
    }

    // Otherwise initialize with fresh 5 Main Folders + 110 Subfolders
    saveAppData(INITIAL_SSC_DATA);
    return INITIAL_SSC_DATA;
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
    return INITIAL_SSC_DATA;
  }
}

/**
 * Saves app data to LocalStorage
 */
export function saveAppData(data: AppData): boolean {
  try {
    data.lastUpdated = Date.now();
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
    return false;
  }
}

/**
 * Resets folders to the complete SSC Master Syllabus (5 Main Folders + 110 Subfolders)
 */
export function resetToSSCMasterSyllabus(keepQuestions: boolean = true): AppData {
  const current = loadAppData();
  const master = generateSSCMasterFolders();
  const defaultFolderId = 'f_quant_01_number_system';

  const questions = keepQuestions
    ? current.questions.map(q => ({
        ...q,
        folderId: master.some(f => f.id === q.folderId) ? q.folderId : defaultFolderId
      }))
    : [];

  const freshData: AppData = {
    version: CURRENT_SCHEMA_VERSION,
    lastUpdated: Date.now(),
    folders: master,
    sets: keepQuestions ? current.sets : [],
    passages: keepQuestions ? current.passages : [],
    questions
  };

  saveAppData(freshData);
  return freshData;
}

/**
 * Returns complete ancestor trail of a folder (from root down to current)
 */
export function getFolderTrail(folders: Folder[], folderId: string | null): Folder[] {
  if (!folderId) return [];
  const trail: Folder[] = [];
  let cur = folders.find(f => f.id === folderId);
  const visited = new Set<string>();

  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id);
    trail.unshift(cur);
    cur = cur.parentFolderId ? folders.find(f => f.id === cur?.parentFolderId) : undefined;
  }
  return trail;
}

/**
 * Returns formatted path string, e.g. "General Knowledge / Geography / Indian Rivers"
 */
export function getFolderPathString(folders: Folder[], folderId: string | null): string {
  const trail = getFolderTrail(folders, folderId);
  if (trail.length === 0) return 'Root (मुख्य)';
  return trail.map(t => t.name).join(' / ');
}

/**
 * Returns all descendant folder IDs recursively at any depth level
 */
export function getAllDescendantFolderIds(folders: Folder[], rootFolderId: string): string[] {
  const result: string[] = [rootFolderId];
  let queue: string[] = [rootFolderId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = folders.filter(f => f.parentFolderId === currentId);
    for (const child of children) {
      if (!result.includes(child.id)) {
        result.push(child.id);
        queue.push(child.id);
      }
    }
  }

  return result;
}

/**
 * Calculates current LocalStorage usage estimate
 */
export function calculateStorageUsage(): {
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
  isNearLimit: boolean;
  formattedUsed: string;
} {
  try {
    let totalChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalChars += key.length + (localStorage.getItem(key)?.length || 0);
      }
    }

    const usedBytes = totalChars * 2;
    const quotaBytes = 5 * 1024 * 1024; // 5 MB typical browser quota
    const percentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
    const isNearLimit = percentage >= 80;

    const formattedUsed = usedBytes > 1024 * 1024 
      ? `${(usedBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(usedBytes / 1024).toFixed(1)} KB`;

    return {
      usedBytes,
      quotaBytes,
      percentage,
      isNearLimit,
      formattedUsed
    };
  } catch {
    return {
      usedBytes: 0,
      quotaBytes: 5 * 1024 * 1024,
      percentage: 0,
      isNearLimit: false,
      formattedUsed: '0 KB'
    };
  }
}

/**
 * Triggers JSON backup download
 */
export function exportBackupJSON(data?: AppData): void {
  const currentData = data || loadAppData();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `mcq-content-backup-${dateStr}.json`;
  
  const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports JSON backup file with merge or overwrite options
 */
export function importBackupJSON(
  jsonString: string,
  mode: 'merge' | 'overwrite' = 'merge'
): { success: boolean; message: string; count: { folders: number; sets: number; questions: number } } {
  try {
    const imported = JSON.parse(jsonString) as AppData;
    if (!imported || !Array.isArray(imported.folders) || !Array.isArray(imported.questions)) {
      return {
        success: false,
        message: 'अमान्य बैकअप फ़ाइल: आवश्यक फ़ोल्डर या प्रश्न डेटा गायब है।',
        count: { folders: 0, sets: 0, questions: 0 }
      };
    }

    if (mode === 'overwrite') {
      const newData: AppData = {
        version: CURRENT_SCHEMA_VERSION,
        folders: imported.folders,
        sets: imported.sets || [],
        passages: imported.passages || [],
        questions: imported.questions,
        lastUpdated: Date.now()
      };
      saveAppData(newData);
      return {
        success: true,
        message: 'डेटा सफलतापूर्वक पुनर्स्थापित (Overwrite) कर दिया गया।',
        count: {
          folders: imported.folders.length,
          sets: (imported.sets || []).length,
          questions: imported.questions.length
        }
      };
    } else {
      // Merge mode
      const current = loadAppData();
      const existingFolderIds = new Set(current.folders.map(f => f.id));
      const existingSetIds = new Set(current.sets.map(s => s.id));
      const existingQuestionIds = new Set(current.questions.map(q => q.id));
      const existingPassageIds = new Set(current.passages.map(p => p.id));

      const newFolders = [...current.folders];
      const newSets = [...current.sets];
      const newPassages = [...current.passages];
      const newQuestions = [...current.questions];

      imported.folders.forEach(f => {
        if (!existingFolderIds.has(f.id)) newFolders.push(f);
      });

      (imported.sets || []).forEach(s => {
        if (!existingSetIds.has(s.id)) newSets.push(s);
      });

      (imported.passages || []).forEach(p => {
        if (!existingPassageIds.has(p.id)) newPassages.push(p);
      });

      imported.questions.forEach(q => {
        if (!existingQuestionIds.has(q.id)) newQuestions.push(q);
      });

      const mergedData: AppData = {
        version: CURRENT_SCHEMA_VERSION,
        folders: newFolders,
        sets: newSets,
        passages: newPassages,
        questions: newQuestions,
        lastUpdated: Date.now()
      };

      saveAppData(mergedData);
      return {
        success: true,
        message: 'डेटा सफलतापूर्वक मर्ज कर दिया गया।',
        count: {
          folders: newFolders.length - current.folders.length,
          sets: newSets.length - current.sets.length,
          questions: newQuestions.length - current.questions.length
        }
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `बैकअप पढ़ने में त्रुटि: ${err instanceof Error ? err.message : 'Unknown error'}`,
      count: { folders: 0, sets: 0, questions: 0 }
    };
  }
}

/**
 * Resets storage to default state with 5 Master Folders + 110 Subfolders
 */
export function clearAllData(): AppData {
  saveAppData(INITIAL_SSC_DATA);
  return INITIAL_SSC_DATA;
}
