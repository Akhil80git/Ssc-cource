import { Folder } from '../types';

export interface MainSyllabusSection {
  id: string;
  name: string;
  shortName: string;
  topics: string[];
}

export const SSC_MASTER_SECTIONS: MainSyllabusSection[] = [
  {
    id: 'f_main_quant',
    name: '1) QUANTITATIVE APTITUDE',
    shortName: 'Quantitative Aptitude',
    topics: [
      'Number System',
      'Simplification & Approximation',
      'Percentage',
      'Ratio & Proportion',
      'Average',
      'Profit, Loss & Discount',
      'Simple & Compound Interest',
      'Problems on Ages',
      'Partnership',
      'Mixture & Alligation',
      'Time & Work',
      'Pipes & Cisterns',
      'Time, Speed & Distance',
      'Problems on Trains',
      'Boats & Streams',
      'Races & Circular Motion',
      'Algebra',
      'Lines & Angles',
      'Triangles',
      'Quadrilaterals & Polygons',
      'Circles',
      'Coordinate Geometry',
      'Mensuration 2D',
      'Mensuration 3D',
      'Trigonometry',
      'Height & Distance',
      'Data Interpretation',
      'Statistics',
      'Sequence & Series',
      'Logarithm',
      'Permutation, Combination & Probability'
    ]
  },
  {
    id: 'f_main_reasoning',
    name: '2) GENERAL INTELLIGENCE & REASONING',
    shortName: 'Reasoning',
    topics: [
      'Analogy',
      'Classification (Odd One Out)',
      'Series',
      'Coding-Decoding',
      'Blood Relations',
      'Direction & Distance',
      'Ranking & Order',
      'Syllogism',
      'Venn Diagrams',
      'Seating Arrangement',
      'Puzzles',
      'Mathematical Operations',
      'Inequality',
      'Statement & Conclusion',
      'Calendar',
      'Clock',
      'Alphabet & Word Tests',
      'Number-Based Tests',
      'Missing Number',
      'Mirror & Water Image',
      'Paper Folding & Cutting',
      'Figure Counting & Embedded Figures',
      'Cubes & Dice',
      'Figure Series, Analogy & Classification',
      'Construction & Completion of Figures',
      'Data Sufficiency',
      'Eligibility & Decision Making'
    ]
  },
  {
    id: 'f_main_english',
    name: '3) ENGLISH LANGUAGE & COMPREHENSION',
    shortName: 'English',
    topics: [
      'Reading Comprehension',
      'Cloze Test',
      'Spot the Error',
      'Sentence Improvement',
      'Fill in the Blanks',
      'Para Jumbles',
      'Sentence & Paragraph Completion',
      'Synonyms',
      'Antonyms',
      'One Word Substitution',
      'Idioms & Phrases',
      'Phrasal Verbs',
      'Homonyms, Homophones & Paronyms',
      'Spelling Correction',
      'Word Formation',
      'Parts of Speech',
      'Articles & Determiners',
      'Tenses',
      'Subject-Verb Agreement',
      'Pronouns',
      'Adjectives & Adverbs',
      'Prepositions',
      'Conjunctions & Connectors',
      'Modals, Conditionals & Non-finites',
      'Active-Passive Voice',
      'Direct-Indirect Speech',
      'Sentence Structure & Transformation'
    ]
  },
  {
    id: 'f_main_ga',
    name: '4) GENERAL AWARENESS',
    shortName: 'General Awareness',
    topics: [
      'Ancient Indian History',
      'Medieval Indian History',
      'Modern Indian History',
      'World History',
      'Art & Culture',
      'Indian Geography',
      'World Geography',
      'Indian Polity',
      'Indian Economy',
      'Physics',
      'Chemistry',
      'Biology',
      'Environment & Ecology',
      'Static GK',
      'Awards & Honours',
      'Sports',
      'Current Affairs'
    ]
  },
  {
    id: 'f_main_computer',
    name: '5) COMPUTER KNOWLEDGE (Only Tier 2)',
    shortName: 'Computer Knowledge',
    topics: [
      'Computer Basics',
      'Software & Operating Systems',
      'MS Office',
      'Internet & Networking',
      'Cyber Security',
      'Number Systems & Logic',
      'Databases',
      'Emerging Tech & Digital India'
    ]
  }
];

/**
 * Builds the initial standard 5 Main Folders + 110 Subfolders hierarchy
 */
export function generateSSCMasterFolders(): Folder[] {
  const folders: Folder[] = [];
  const baseTime = 1700000000000;

  SSC_MASTER_SECTIONS.forEach((section, sectionIdx) => {
    // 1. Add Main Folder (parentFolderId is null)
    folders.push({
      id: section.id,
      name: section.name,
      parentFolderId: null,
      createdAt: baseTime + sectionIdx * 1000,
      description: `SSC Master Syllabus Section with ${section.topics.length} topics`
    });

    // 2. Add subfolders for each topic
    section.topics.forEach((topicName, topicIdx) => {
      const topicNumber = topicIdx + 1;
      const slug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const subfolderId = `f_${section.id.replace('f_main_', '')}_${String(topicNumber).padStart(2, '0')}_${slug}`;

      folders.push({
        id: subfolderId,
        name: `${topicNumber}. ${topicName}`,
        parentFolderId: section.id,
        createdAt: baseTime + sectionIdx * 1000 + topicIdx * 10,
        description: `${section.shortName} - Topic ${topicNumber}: ${topicName}`
      });
    });
  });

  return folders;
}
