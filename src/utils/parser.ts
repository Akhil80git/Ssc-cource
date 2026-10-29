import { ParsedQuestionItem, ParsedSetItem, ParseResult, QuestionOption, QuestionType, VerificationStatus } from '../types';

// Normalized label helper: converts any label representation to standard uppercase or Hindi symbol
export function normalizeLabel(rawLabel: string): string {
  const cleaned = rawLabel
    .trim()
    .replace(/^[\(\[\{]/, '')
    .replace(/[\)\]\}\.:\-]/, '')
    .trim();

  // If it's a Devanagari character
  if (/^[क-ह]/.test(cleaned)) {
    return cleaned;
  }

  // If it's an English letter
  if (/^[A-Za-z]$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  // If it's roman numerals (1 to 10)
  const lower = cleaned.toLowerCase();
  if (['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'].includes(lower)) {
    return lower;
  }

  return cleaned;
}

// Option label patterns
// IMPORTANT: Numbers 1-10 are only options with parentheses e.g. (1) or closing bracket 1) or prefix Option 1
// They must NEVER match bare "1." which is always a question number!
const OPTION_START_REGEX = /^\s*(?:\(([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v|vi{1,3}|ix|x|I{1,3}|IV|V|VI{1,3}|IX|X)\)|([A-Za-z]|[क-ह]|i{1,3}|iv|v|vi{1,3}|ix|x|I{1,3}|IV|V|VI{1,3}|IX|X)[\.\)\:\-]|(?:10|[1-9])\)|(?:Option|विकल्प)\s*([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v|I{1,3}|IV|V)[\.\:\-]?)\s*(.*)$/i;

// Answer regex patterns
const ANSWER_HEADER_REGEX = /^\s*(?:उत्तर|Answer|Ans|Correct\s*(?:Answer|Option)?|सही\s*(?:विकल्प|उत्तर)|सही\s*विकल्प\s*का\s*कारण|Right\s*Answer)\s*[\:\-\=]\s*(.*)$/i;

// Explanation regex patterns
const EXPLANATION_HEADER_REGEX = /^\s*(?:Explanation|व्याख्या|समाधान|हल|Solution|Reason|Explanation\s*\/|विस्तार|Notes?|Hint|कारण)\s*[\:\-\=]\s*(.*)$/i;

// Question start regex patterns
const QUESTION_START_REGEX = /^\s*(?:(?:Q|Question|प्रश्न|प्र)\.?\s*(\d+|[क-ह])[\.\:\)\-]?|(\d+)[\.\)\:\-]\s+|([१-९][०-९]*)[\.\)\:\-]\s+)\s*(.*)$/i;

// Passage start patterns
const PASSAGE_HEADER_REGEX = /^\s*(?:Passage|Reading\s+Comprehension|गद्यांश|निर्देश|Directions?|Instructions?)(?:\s*\(.*?\))?[\:\-\.]?\s*(.*)$/i;

/**
 * Parses inline options from a single line like:
 * "1. प्रश्न? (A) Option 1 (B) Option 2 (C) Option 3 (D) Option 4 Answer: B"
 * Handles questions 1 to 50+ reliably without confusing question numbers with options!
 */
export function extractInlineOptions(text: string): { 
  sourceNumber?: string;
  questionText: string; 
  options: QuestionOption[]; 
  inlineAnswer?: string; 
  explanation?: string 
} | null {
  let workingText = text.trim();
  let sourceNumber: string | undefined;

  // Step 1: Strip and extract leading question number if present (e.g. "1. ", "Q1. ", "प्रश्न 1: ")
  const qStartMatch = workingText.match(/^\s*(?:(?:Q|Question|प्रश्न|प्र)\.?\s*(\d+|[क-ह])[\.\:\)\-]?|(\d+)[\.\)\:\-]\s+|([१-९][०-९]*)[\.\)\:\-]\s+)\s*(.*)$/i);
  if (qStartMatch) {
    sourceNumber = qStartMatch[1] || qStartMatch[2] || qStartMatch[3];
    workingText = qStartMatch[4] || '';
  }

  // Step 2: In workingText, look for inline option markers
  // An option marker is either enclosed in parentheses e.g. (A), (1), (क)
  // or preceded by whitespace e.g. " A) ", " 1) ", " Option A "
  const inlineOptionMarkerRegex = /(?:\s+|^)(?:\(([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v|vi{1,3}|ix|x|I{1,3}|IV|V|VI{1,3}|IX|X)\)|([A-Za-z]|[क-ह]|i{1,3}|iv|v|I{1,3}|IV|V)[\)\.](?!\d)|(?:10|[1-9])\)|(?:Option|विकल्प)\s*([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v))\s+/gi;

  const matches = Array.from(workingText.matchAll(inlineOptionMarkerRegex));
  if (matches.length < 2) {
    return null; // Must have at least 2 options
  }

  const firstOptionIndex = matches[0].index ?? -1;
  if (firstOptionIndex === -1) return null;

  let questionText = workingText.substring(0, firstOptionIndex).trim();
  if (!questionText && sourceNumber) {
    questionText = `Question ${sourceNumber}`;
  }
  if (!questionText) return null;

  const optionsPart = workingText.substring(firstOptionIndex);

  // Check if there is an Answer: or Explanation: inside optionsPart
  let answerPart = '';
  let explanationPart = '';
  let remainingOptionsText = optionsPart;

  const ansIndex = remainingOptionsText.search(/(?:उत्तर|Answer|Ans|Correct\s*(?:Answer|Option)?|सही\s*विकल्प)\s*[\:\-\=]/i);
  if (ansIndex !== -1) {
    const afterAns = remainingOptionsText.substring(ansIndex);
    remainingOptionsText = remainingOptionsText.substring(0, ansIndex);

    const explIndex = afterAns.search(/(?:Explanation|व्याख्या|समाधान|हल|Solution)\s*[\:\-\=]/i);
    if (explIndex !== -1) {
      answerPart = afterAns.substring(0, explIndex);
      explanationPart = afterAns.substring(explIndex);
    } else {
      answerPart = afterAns;
    }
  }

  // Parse each option
  const optMatches = Array.from(remainingOptionsText.matchAll(inlineOptionMarkerRegex));
  const options: QuestionOption[] = [];

  for (let i = 0; i < optMatches.length; i++) {
    const curMatch = optMatches[i];
    const rawLabel = curMatch[1] || curMatch[2] || curMatch[3];
    const label = normalizeLabel(rawLabel);

    const startIndex = (curMatch.index ?? 0) + curMatch[0].length;
    const endIndex = (i + 1 < optMatches.length) ? (optMatches[i + 1].index ?? remainingOptionsText.length) : remainingOptionsText.length;

    const optionText = remainingOptionsText.substring(startIndex, endIndex).trim();
    if (label && optionText) {
      options.push({ label, text: optionText });
    }
  }

  let inlineAnswer: string | undefined;
  if (answerPart) {
    const cleanedAns = answerPart.replace(/(?:उत्तर|Answer|Ans|Correct\s*(?:Answer|Option)?|सही\s*विकल्प)\s*[\:\-\=]\s*/i, '').trim();
    inlineAnswer = extractAnswerKeyLetter(cleanedAns);
  }

  let explanation: string | undefined;
  if (explanationPart) {
    explanation = explanationPart.replace(/(?:Explanation|व्याख्या|समाधान|हल|Solution)\s*[\:\-\=]\s*/i, '').trim();
  }

  return { sourceNumber, questionText, options, inlineAnswer, explanation };
}
/**
 * Extracts multiple options from a line where options are written together on a single line, e.g.:
 * "(A) 5% वृद्धि (B) 5% कमी (C) कोई परिवर्तन नहीं (D) 2% वृद्धि"
 * or "(A) 25% (B) 28 4/7% (C) 30% (D) 33 1/3%"
 * or "(A) Option 1 (B) Option 2 Answer: B"
 */
export function extractMultipleOptionsOnly(text: string): {
  options: QuestionOption[];
  inlineAnswer?: string;
  explanation?: string;
} | null {
  const workingText = text.trim();
  if (!workingText) return null;

  // An option marker matching (A), (1), (क), A), 1), A., Option A, etc.
  const optionMarkerRegex = /(?:\s+|^)(?:\(([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v|vi{1,3}|ix|x|I{1,3}|IV|V|VI{1,3}|IX|X)\)|([A-Za-z]|[क-ह]|i{1,3}|iv|v|I{1,3}|IV|V)[\)\.](?!\d)|(?:10|[1-9])\)|(?:Option|विकल्प)\s*([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v))\s*/gi;

  const matches = Array.from(workingText.matchAll(optionMarkerRegex));
  // Must have at least 2 options on the line
  if (matches.length < 2) {
    return null;
  }

  // Ensure first option is at or near the start (index <= 15) so it's not arbitrary text
  const firstIndex = matches[0].index ?? -1;
  if (firstIndex > 15) {
    return null;
  }

  let answerPart = '';
  let explanationPart = '';
  let remainingOptionsText = workingText.substring(firstIndex);

  const ansIndex = remainingOptionsText.search(/(?:उत्तर|Answer|Ans|Correct\s*(?:Answer|Option)?|सही\s*विकल्प)\s*[\:\-\=]/i);
  if (ansIndex !== -1) {
    const afterAns = remainingOptionsText.substring(ansIndex);
    remainingOptionsText = remainingOptionsText.substring(0, ansIndex);

    const explIndex = afterAns.search(/(?:Explanation|व्याख्या|समाधान|हल|Solution)\s*[\:\-\=]/i);
    if (explIndex !== -1) {
      answerPart = afterAns.substring(0, explIndex);
      explanationPart = afterAns.substring(explIndex);
    } else {
      answerPart = afterAns;
    }
  }

  const optMatches = Array.from(remainingOptionsText.matchAll(optionMarkerRegex));
  if (optMatches.length < 2) return null;

  const options: QuestionOption[] = [];

  for (let i = 0; i < optMatches.length; i++) {
    const curMatch = optMatches[i];
    const rawLabel = curMatch[1] || curMatch[2] || curMatch[3];
    const label = normalizeLabel(rawLabel);

    const startIndex = (curMatch.index ?? 0) + curMatch[0].length;
    const endIndex = (i + 1 < optMatches.length) 
      ? (optMatches[i + 1].index ?? remainingOptionsText.length) 
      : remainingOptionsText.length;

    const optionText = remainingOptionsText.substring(startIndex, endIndex).trim();
    if (label && optionText) {
      options.push({ label, text: optionText });
    }
  }

  let inlineAnswer: string | undefined;
  if (answerPart) {
    const cleanedAns = answerPart.replace(/(?:उत्तर|Answer|Ans|Correct\s*(?:Answer|Option)?|सही\s*विकल्प)\s*[\:\-\=]?\s*/i, '').trim();
    inlineAnswer = extractAnswerKeyLetter(cleanedAns);
  }

  let explanation: string | undefined;
  if (explanationPart) {
    explanation = explanationPart.replace(/(?:Explanation|व्याख्या|समाधान|हल|Solution)\s*[\:\-\=]?\s*/i, '').trim();
  }

  return options.length >= 2 ? { options, inlineAnswer, explanation } : null;
}

/**
 * Extracts standard normalized answer label or option text
 * e.g. "(B) 1" -> "B"
 * "B) गंगा" -> "B"
 * "Option B" -> "B"
 * "(ख)" -> "ख"
 * "उत्तर: विकल्प 2" -> "2"
 */
export function extractAnswerKeyLetter(text: string): string {
  const trimmed = text.trim();
  
  // Direct match for (A), A), A., Option A, विकल्प 2, etc.
  const labelMatch = trimmed.match(
    /^(?:\(([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v|vi{1,3}|ix|x)\)|([A-Za-z]|[क-ह]|i{1,3}|iv|v)[\.\)\:\-]?|(?:Option|विकल्प)\s*([A-Za-z]|(?:10|[1-9])|[क-ह])[\.\:\-]?)/i
  );
  
  if (labelMatch) {
    const raw = labelMatch[1] || labelMatch[2] || labelMatch[3];
    if (raw) return normalizeLabel(raw);
  }

  // If user wrote "उत्तर: B" or single character
  const singleLetterMatch = trimmed.match(/^([A-Za-z]|(?:10|[1-9])|[क-ह])(?:\s+.*)?$/i);
  if (singleLetterMatch) {
    return normalizeLabel(singleLetterMatch[1]);
  }

  return trimmed;
}

/**
 * Parses separate Answer Key block like:
 * 1-B, 2-C, 3-A
 * 1. B  2. C  3. A
 * 1(A), 2(B), 3(C)
 * 1: B
 * 2: D
 */
export function parseAnswerKeyMap(text: string): Map<string, string> {
  const map = new Map<string, string>();
  
  const keyPairRegex = /(?:(?:Q|Question|प्रश्न)?\.?\s*(\d+|[क-ह])\s*[\:\-\.\=\)]?\s*(?:\(?(?:Option|विकल्प)?\s*([A-Za-z]|(?:10|[1-9])|[क-ह]|i{1,3}|iv|v)\)?))/gi;
  
  let match;
  while ((match = keyPairRegex.exec(text)) !== null) {
    const qNum = match[1].trim();
    const ansKey = normalizeLabel(match[2]);
    map.set(qNum, ansKey);
  }

  return map;
}

/**
 * Detects question type from question content and options
 */
export function detectQuestionType(questionText: string, options: QuestionOption[], hasPassage: boolean): QuestionType {
  const lower = questionText.toLowerCase();

  if (hasPassage) {
    return 'passage_mcq';
  }

  // Assertion - Reason
  if (
    (lower.includes('assertion') && lower.includes('reason')) ||
    (questionText.includes('अभिकथन') && (questionText.includes('कारण') || questionText.includes('तर्क')))
  ) {
    return 'assertion_reason';
  }

  // Match the Following
  if (
    lower.includes('match the following') ||
    lower.includes('list i') ||
    questionText.includes('सुमेलित') ||
    questionText.includes('सूची I') ||
    questionText.includes('कॉलम 1')
  ) {
    return 'match';
  }

  // Statement Based
  if (
    lower.includes('statement 1') ||
    lower.includes('statement i') ||
    questionText.includes('कथन 1') ||
    questionText.includes('कथन I')
  ) {
    return 'statement';
  }

  // Cloze Test / Fill in the blanks
  if (
    lower.includes('fill in the blank') ||
    questionText.includes('रिक्त स्थान') ||
    /\b_{3,}\b/.test(questionText)
  ) {
    return 'cloze';
  }

  // True / False
  if (options.length === 2) {
    const optTexts = options.map(o => o.text.trim().toLowerCase());
    if (
      (optTexts.includes('true') && optTexts.includes('false')) ||
      (optTexts.includes('सही') && optTexts.includes('गलत')) ||
      (optTexts.includes('सत्य') && optTexts.includes('असत्य'))
    ) {
      return 'true_false';
    }
  }

  if (options.length === 0) {
    return 'short_answer';
  }

  return 'mcq';
}

/**
 * Full parsing engine for raw educational content.
 * Accepts text from paste or uploaded file, recognizes sections, passages, questions,
 * options (2 to 10 options), answers, and explanations.
 */
export function parseMCQContent(rawText: string): ParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      sets: [],
      rawText: '',
      stats: {
        totalQuestions: 0,
        validQuestions: 0,
        missingAnswers: 0,
        conflicts: 0,
        duplicates: 0,
        similar: 0,
        skippedLines: 0
      },
      skippedContent: []
    };
  }

  // Check if there is a separate Answer Key section at the bottom
  let mainContent = rawText;
  let answerKeyMap = new Map<string, string>();

  const answerKeyHeaderMatch = rawText.match(/(?:^|\n)\s*(?:Answer\s*Key|Answers?|उत्तर\s*कुंजी|उत्तर\s*माला)[\:\-\.]?\s*(?:\r?\n|(?=\s*\d))([\s\S]*)$/i);
  if (answerKeyHeaderMatch && answerKeyHeaderMatch.index !== undefined) {
    const keySectionText = answerKeyHeaderMatch[1];
    answerKeyMap = parseAnswerKeyMap(keySectionText);
    mainContent = rawText.substring(0, answerKeyHeaderMatch.index).trim();
  }

  const lines = mainContent.split(/\r?\n/);
  const sets: ParsedSetItem[] = [];
  const skippedLines: string[] = [];

  let currentSet: ParsedSetItem = {
    title: 'General MCQs',
    contentType: 'standard',
    questions: []
  };

  let inPassageMode = false;
  let passageBuffer: string[] = [];
  let passageTitle = 'Reading Comprehension';
  let passageDirections = '';

  let currentQuestion: Partial<ParsedQuestionItem> | null = null;
  let currentOptions: QuestionOption[] = [];
  let currentExplanation: string[] = [];
  let inExplanationMode = false;

  function commitCurrentQuestion() {
    if (!currentQuestion || !currentQuestion.questionText) {
      currentQuestion = null;
      currentOptions = [];
      currentExplanation = [];
      inExplanationMode = false;
      return;
    }

    const qNum = currentQuestion.sourceNumber || '';
    const keyAns = qNum ? answerKeyMap.get(qNum) : undefined;
    const inlineAns = currentQuestion.inlineAnswer;

    let finalAnswer = inlineAns || keyAns;
    let verificationStatus: VerificationStatus = 'unverified';
    let verificationNotes = '';
    let hasConflict = false;

    if (inlineAns && keyAns) {
      if (normalizeLabel(inlineAns) === normalizeLabel(keyAns)) {
        verificationStatus = 'verified';
        finalAnswer = normalizeLabel(inlineAns);
      } else {
        verificationStatus = 'conflict';
        hasConflict = true;
        verificationNotes = `विरोधाभास: इनलाइन उत्तर "${inlineAns}" है, पर उत्तर कुंजी में "${keyAns}" दिया गया है।`;
      }
    } else if (inlineAns || keyAns) {
      verificationStatus = 'verified';
    } else {
      verificationStatus = 'missing_answer';
      verificationNotes = 'उत्तर उपलब्ध नहीं है (Missing Answer)';
    }

    const explanationText = currentExplanation.join('\n').trim();
    const qType = detectQuestionType(currentQuestion.questionText, currentOptions, inPassageMode);

    const fullQuestion: ParsedQuestionItem = {
      id: `parsed_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sourceNumber: currentQuestion.sourceNumber,
      questionText: currentQuestion.questionText,
      questionType: qType,
      options: [...currentOptions],
      inlineAnswer: inlineAns,
      keyAnswer: keyAns,
      detectedAnswer: finalAnswer,
      explanation: explanationText || currentQuestion.explanation,
      verificationStatus,
      verificationNotes,
      hasConflict
    };

    currentSet.questions.push(fullQuestion);

    // Reset
    currentQuestion = null;
    currentOptions = [];
    currentExplanation = [];
    inExplanationMode = false;
  }

  function commitCurrentSet() {
    commitCurrentQuestion();
    if (inPassageMode && passageBuffer.length > 0) {
      currentSet.passage = {
        title: passageTitle,
        text: passageBuffer.join('\n').trim(),
        language: /[\u0900-\u097F]/.test(passageBuffer.join(' ')) ? 'hindi' : 'english'
      };
      currentSet.contentType = 'passage';
      currentSet.directions = passageDirections;
    }

    if (currentSet.questions.length > 0 || currentSet.passage) {
      sets.push(currentSet);
    }

    // Reset set
    currentSet = {
      title: 'Question Set',
      contentType: 'standard',
      questions: []
    };
    inPassageMode = false;
    passageBuffer = [];
    passageTitle = '';
    passageDirections = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    // 1. Check for Passage / Directions Header
    const passageMatch = line.match(PASSAGE_HEADER_REGEX);
    if (passageMatch && (line.length < 160 || line.includes(':') || line.includes('निर्देश') || line.includes('Directions'))) {
      commitCurrentSet();
      inPassageMode = true;
      passageTitle = line.replace(/[\:\-\.]\s*$/, '').trim() || 'Reading Comprehension';
      passageDirections = passageMatch[1] || '';
      continue;
    }

    // If currently collecting passage text before questions start
    if (inPassageMode && !currentQuestion && !line.match(QUESTION_START_REGEX)) {
      if (!line.match(OPTION_START_REGEX) && !line.match(ANSWER_HEADER_REGEX)) {
        passageBuffer.push(line);
        continue;
      }
    }

    // 2. Check for Single-Line Format (Question + Options + Answer on the same line)
    const inlineResult = extractInlineOptions(line);
    if (inlineResult && inlineResult.options.length >= 2) {
      commitCurrentQuestion();

      currentQuestion = {
        sourceNumber: inlineResult.sourceNumber,
        questionText: inlineResult.questionText,
        inlineAnswer: inlineResult.inlineAnswer,
        explanation: inlineResult.explanation
      };
      currentOptions = inlineResult.options;
      commitCurrentQuestion();
      continue;
    }

    // 3. Check for Question Start
    const questionMatch = line.match(QUESTION_START_REGEX);
    const isActuallyOption = line.match(OPTION_START_REGEX);

    if (questionMatch && !isActuallyOption) {
      commitCurrentQuestion();
      const qNum = questionMatch[1] || questionMatch[2] || questionMatch[3];
      const restText = questionMatch[4] || '';

      currentQuestion = {
        sourceNumber: qNum,
        questionText: restText
      };
      continue;
    }

    // 4A. Check if this line contains MULTIPLE options packed together on one line:
    // e.g. "(A) 5% वृद्धि (B) 5% कमी (C) कोई परिवर्तन नहीं (D) 2% वृद्धि"
    // or "(A) 25% (B) 28 4/7% (C) 30% (D) 33 1/3%"
    const multiOptResult = extractMultipleOptionsOnly(line);
    if (multiOptResult) {
      if (!currentQuestion && skippedLines.length > 0) {
        currentQuestion = {
          sourceNumber: `${currentSet.questions.length + 1}`,
          questionText: skippedLines.pop()!
        };
      }

      if (currentQuestion) {
        inExplanationMode = false;
        multiOptResult.options.forEach(opt => {
          currentOptions.push(opt);
        });
        if (multiOptResult.inlineAnswer) {
          currentQuestion.inlineAnswer = multiOptResult.inlineAnswer;
        }
        if (multiOptResult.explanation) {
          currentExplanation.push(multiOptResult.explanation);
          inExplanationMode = true;
        }
        continue;
      }
    }

    // 4B. Check for Single Option Line (supports 2 to 10 options: A-J, 1-10, क-ञ, i-x, etc.)
    const optionMatch = line.match(OPTION_START_REGEX);
    if (optionMatch && currentQuestion) {
      inExplanationMode = false;
      const rawLabel = optionMatch[1] || optionMatch[2] || optionMatch[3];
      const optLabel = normalizeLabel(rawLabel);
      const optText = optionMatch[4]?.trim() || '';

      const trailingAnsMatch = optText.match(/^(.*?)(?:\s+(?:Answer|Ans|उत्तर|सही विकल्प)[\:\-\=]\s*(.*))$/i);
      if (trailingAnsMatch) {
        currentOptions.push({ label: optLabel, text: trailingAnsMatch[1].trim() });
        currentQuestion.inlineAnswer = extractAnswerKeyLetter(trailingAnsMatch[2].trim());
      } else {
        currentOptions.push({ label: optLabel, text: optText });
      }
      continue;
    }

    // 5. Check for Answer Line
    const answerMatch = line.match(ANSWER_HEADER_REGEX);
    if (answerMatch && currentQuestion) {
      inExplanationMode = false;
      const ansPayload = answerMatch[1].trim();

      const explInAnsMatch = ansPayload.match(/^(.*?)(?:\s+(?:Explanation|व्याख्या|समाधान|हल)[\:\-\=]\s*(.*))$/i);
      if (explInAnsMatch) {
        currentQuestion.inlineAnswer = extractAnswerKeyLetter(explInAnsMatch[1].trim());
        currentExplanation.push(explInAnsMatch[2].trim());
        inExplanationMode = true;
      } else {
        currentQuestion.inlineAnswer = extractAnswerKeyLetter(ansPayload);
      }
      continue;
    }

    // 6. Check for Explanation Line
    const explanationMatch = line.match(EXPLANATION_HEADER_REGEX);
    if (explanationMatch && currentQuestion) {
      inExplanationMode = true;
      const explText = explanationMatch[1].trim();
      if (explText) {
        currentExplanation.push(explText);
      }
      continue;
    }

    // 7. If currently in Explanation Mode, continue appending to explanation
    if (inExplanationMode && currentQuestion) {
      currentExplanation.push(line);
      continue;
    }

    // 8. If currently in Question Text mode and no options have started yet, append multi-line question text!
    if (currentQuestion && currentOptions.length === 0) {
      currentQuestion.questionText = `${currentQuestion.questionText}\n${line}`;
      continue;
    }

    // 9. If options already exist, but line is continuation of last option
    if (currentQuestion && currentOptions.length > 0) {
      currentOptions[currentOptions.length - 1].text += ` ${line}`;
      continue;
    }

    // Fallback unparsed line (e.g. title "SSC NUMBER SYSTEM — 50 MCQ")
    if (sets.length === 0 && !currentQuestion && line.length < 100) {
      currentSet.title = line;
    } else {
      skippedLines.push(line);
    }
  }

  commitCurrentSet();

  // If no sets were formed but skippedLines has content, capture as raw unparsed
  if (sets.length === 0 && skippedLines.length > 0) {
    sets.push({
      title: 'Unparsed Raw Content',
      contentType: 'raw',
      questions: [
        {
          id: `parsed_q_raw_${Date.now()}`,
          questionText: skippedLines.join('\n'),
          questionType: 'raw',
          options: [],
          verificationStatus: 'missing_answer',
          verificationNotes: 'स्वचालित पार्सर इस प्रारूप को पहचान नहीं सका। कृपया मैन्युअल रूप से संपादित करें।'
        }
      ]
    });
  }

  let totalQuestions = 0;
  let validQuestions = 0;
  let missingAnswers = 0;
  let conflicts = 0;

  sets.forEach(s => {
    s.questions.forEach(q => {
      totalQuestions++;
      if (q.questionText && q.options.length >= 2) {
        validQuestions++;
      }
      if (q.verificationStatus === 'missing_answer') {
        missingAnswers++;
      }
      if (q.verificationStatus === 'conflict') {
        conflicts++;
      }
    });
  });

  return {
    sets,
    rawText,
    stats: {
      totalQuestions,
      validQuestions,
      missingAnswers,
      conflicts,
      duplicates: 0,
      similar: 0,
      skippedLines: skippedLines.length
    },
    skippedContent: skippedLines
  };
}
