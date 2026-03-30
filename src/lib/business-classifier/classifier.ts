import { BusinessTypeResult, ExtractedContent } from '@/types';
import { getBusinessTypeRules } from '@/lib/knowledge-base/loader';

interface BusinessTypeScore {
  type: string;
  score: number;
  matchedKeywords: string[];
  priorityAreaMatches: string[];
}

/**
 * Classify business type based on content analysis
 */
export function classifyBusinessType(
  content: ExtractedContent,
  detectedKeywords: string[] = []
): BusinessTypeResult {
  const rules = getBusinessTypeRules();
  
  // Combine all text content
  const allText = [
    content.title,
    ...content.h1,
    ...content.h2,
    content.meta_description,
    ...content.menus.flatMap(m => m.items),
    content.text_content.substring(0, 10000)
  ].join(' ').toLowerCase();

  // Get weighted text areas
  const titleText = content.title.toLowerCase();
  const h1Text = content.h1.join(' ').toLowerCase();
  const menuText = content.menus.flatMap(m => m.items).join(' ').toLowerCase();

  const scores: BusinessTypeScore[] = [];

  for (const [type, rule] of Object.entries(rules)) {
    let score = 0;
    const matchedKeywords: string[] = [];
    const priorityAreaMatches: string[] = [];

    for (const keyword of rule.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      
      // Check in priority areas with higher weight
      let keywordScore = 0;
      
      if (rule.priority_areas.includes('title') && titleText.includes(lowerKeyword)) {
        keywordScore += 3;
        priorityAreaMatches.push(`title: ${keyword}`);
      }
      
      if (rule.priority_areas.includes('h1') && h1Text.includes(lowerKeyword)) {
        keywordScore += 2;
        priorityAreaMatches.push(`h1: ${keyword}`);
      }
      
      if (rule.priority_areas.includes('menu') && menuText.includes(lowerKeyword)) {
        keywordScore += 2;
        priorityAreaMatches.push(`menu: ${keyword}`);
      }
      
      // Check in general content
      if (allText.includes(lowerKeyword)) {
        keywordScore += 1;
        matchedKeywords.push(keyword);
      }

      score += keywordScore;
    }

    scores.push({
      type,
      score,
      matchedKeywords: [...new Set(matchedKeywords)],
      priorityAreaMatches: [...new Set(priorityAreaMatches)]
    });
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  // Get best match
  const best = scores[0];
  
  // Calculate confidence (normalize to 0-100)
  const maxPossibleScore = 20; // Rough estimate
  const confidence = Math.min(100, Math.round((best.score / maxPossibleScore) * 100));

  // If no good match, return "другое"
  if (best.score === 0) {
    return {
      type: 'другое',
      confidence: 0,
      matched_keywords: [],
      priority_areas: []
    };
  }

  return {
    type: best.type,
    confidence,
    matched_keywords: best.matchedKeywords.slice(0, 10),
    priority_areas: best.priorityAreaMatches.slice(0, 5)
  };
}

/**
 * Translate business type to Russian
 */
export function translateBusinessType(type: string): string {
  const translations: Record<string, string> = {
    'строительство': 'Строительство',
    'ремонт': 'Ремонт и отделка',
    'медицина': 'Медицина',
    'образование': 'Образование',
    'логистика': 'Логистика',
    'мебель': 'Мебель',
    'e-commerce': 'E-commerce',
    'локальный бизнес': 'Локальный бизнес',
    'юридические услуги': 'Юридические услуги',
    'B2B': 'B2B',
    'красота': 'Сфера красоты',
    'производство': 'Производство',
    'туризм': 'Туризм',
    'международный бизнес': 'Международный бизнес',
    'другое': 'Другое'
  };

  return translations[type] || type;
}

/**
 * Get business type explanation
 */
export function getBusinessTypeExplanation(result: BusinessTypeResult): string {
  if (result.type === 'другое') {
    return 'Не удалось определить тип бизнеса. Возможно, это нишевый рынок или недостаточно данных для классификации.';
  }

  const keywords = result.matched_keywords.length > 0 
    ? result.matched_keywords.slice(0, 5).join(', ')
    : 'нет явных ключевых слов';

  return `Тип бизнеса определён как "${translateBusinessType(result.type)}" ` +
         `с уверенностью ${result.confidence}%. ` +
         `Ключевые слова: ${keywords}.`;
}

/**
 * Check if business type matches recommendation criteria
 */
export function matchesBusinessType(
  detectedType: string,
  ruleTypes: string[]
): boolean {
  // Check for "all_commercial" wildcard
  if (ruleTypes.includes('all_commercial')) {
    return detectedType !== 'другое';
  }

  return ruleTypes.includes(detectedType);
}
