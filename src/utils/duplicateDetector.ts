import { Question, ParsedQuestionItem } from '../types';

/**
 * Normalizes question text for robust comparison:
 * 1. Strips leading numbering (e.g. "1.", "Q1.", "प्रश्न 1:")
 * 2. Removes punctuation and special symbols
 * 3. Collapses extra spaces
 * 4. Lowercases Latin text
 * 5. Handles Devanagari unicode normalization (NFC)
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFC')
    // Remove leading numbering like "1.", "Q1:", "प्रश्न 1:"
    .replace(/^\s*(?:(?:Q|Question|प्रश्न|प्र)\.?\s*\d+[\.\:\)\-]?|\d+[\.\)\:\-]\s+|[१-९][०-९]*[\.\)\:\-]\s+)/i, '')
    // Remove common punctuation: ? , . ! " ' ` ; : ( ) [ ] { }
    .replace(/[\?\.,\!\"\'\`\;\:\(\)\[\]\{\}\–\—\-]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Calculates Token Jaccard Similarity between two strings
 * Returns a value between 0.0 and 1.0
 */
export function calculateJaccardSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeQuestionText(str1);
  const norm2 = normalizeQuestionText(str2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const words1 = new Set(norm1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 1));

  if (words1.size === 0 || words2.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const w of words1) {
    if (words2.has(w)) {
      intersectionCount++;
    }
  }

  const unionCount = words1.size + words2.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Checks option match signature
 */
export function areOptionsIdentical(opts1: { text: string }[], opts2: { text: string }[]): boolean {
  if (opts1.length !== opts2.length || opts1.length === 0) return false;
  
  const set1 = new Set(opts1.map(o => normalizeQuestionText(o.text)));
  const set2 = new Set(opts2.map(o => normalizeQuestionText(o.text)));

  if (set1.size !== set2.size) return false;
  for (const o of set1) {
    if (!set2.has(o)) return false;
  }
  return true;
}

export interface DuplicateCheckResult {
  isExactDuplicate: boolean;
  isSimilar: boolean;
  similarityScore: number;
  matchedQuestion?: Question;
  reason?: string;
}

/**
 * Checks a parsed question against the existing database of all questions
 */
export function checkDuplicate(parsed: ParsedQuestionItem, existingQuestions: Question[]): DuplicateCheckResult {
  const normTarget = normalizeQuestionText(parsed.questionText);
  if (!normTarget || normTarget.length < 5) {
    return { isExactDuplicate: false, isSimilar: false, similarityScore: 0 };
  }

  let highestSimilarity = 0;
  let mostSimilarQuestion: Question | undefined;

  for (const ex of existingQuestions) {
    const normExisting = normalizeQuestionText(ex.questionText);

    // Exact match in question text
    if (normTarget === normExisting) {
      // If options also match, definitely exact duplicate
      const optionsMatch = areOptionsIdentical(parsed.options, ex.options);
      return {
        isExactDuplicate: true,
        isSimilar: true,
        similarityScore: 1.0,
        matchedQuestion: ex,
        reason: optionsMatch 
          ? 'सटीक प्रश्न और विकल्प पहले से मौजूद हैं (Exact duplicate)' 
          : 'समान प्रश्न पहले से मौजूद है'
      };
    }

    // Similarity calculation
    const similarity = calculateJaccardSimilarity(parsed.questionText, ex.questionText);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      mostSimilarQuestion = ex;
    }
  }

  // Threshold: 0.78 or higher considered "Similar"
  if (highestSimilarity >= 0.78 && mostSimilarQuestion) {
    return {
      isExactDuplicate: false,
      isSimilar: true,
      similarityScore: Math.round(highestSimilarity * 100),
      matchedQuestion: mostSimilarQuestion,
      reason: `यह प्रश्न पहले से मौजूद प्रश्न से ${Math.round(highestSimilarity * 100)}% मेल खाता है।`
    };
  }

  return {
    isExactDuplicate: false,
    isSimilar: false,
    similarityScore: Math.round(highestSimilarity * 100)
  };
}
