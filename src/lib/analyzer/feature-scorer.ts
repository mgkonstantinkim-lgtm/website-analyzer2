import { 
  Feature, 
  FeatureScore, 
  FeatureEvidence, 
  FeatureStatus,
  ScoringRules,
  ExtractedContent 
} from '@/types';
import { getScoringRules } from '@/lib/knowledge-base/loader';
import { findDomPatterns, containsTextPattern, extractClasses, extractIds } from './dom-extractor';
import * as cheerio from 'cheerio';

/**
 * Calculate score for a single feature based on patterns
 */
export function scoreFeature(
  feature: Feature,
  html: string,
  content: ExtractedContent,
  rules: ScoringRules
): FeatureScore {
  let totalScore = 0;
  const evidence: FeatureEvidence[] = [];
  const matchedPatterns: string[] = [];

  // Check DOM patterns (strong signal)
  if (feature.dom_patterns && feature.dom_patterns.length > 0) {
    const domMatches = findDomPatterns(html, feature.dom_patterns);
    
    for (const [pattern, matches] of domMatches) {
      if (matches.length > 0) {
        totalScore += rules.strong_dom_signal;
        matchedPatterns.push(pattern);
        evidence.push({
          pattern: `DOM: ${pattern} (${matches.length} совпадений)`,
          type: 'dom',
          score: rules.strong_dom_signal
        });
      }
    }
  }

  // Check CSS classes and IDs for pattern matches
  const classes = extractClasses(html);
  const ids = extractIds(html);
  
  if (feature.text_patterns) {
    for (const pattern of feature.text_patterns) {
      const lowerPattern = pattern.toLowerCase();
      
      // Check in class names
      const classMatches = classes.filter(c => c.includes(lowerPattern.replace(/\s+/g, '-')));
      if (classMatches.length > 0) {
        totalScore += rules.strong_dom_signal;
        evidence.push({
          pattern: `CSS класс: ${classMatches.slice(0, 3).join(', ')}`,
          type: 'dom',
          score: rules.strong_dom_signal
        });
      }
      
      // Check in IDs
      const idMatches = ids.filter(i => i.includes(lowerPattern.replace(/\s+/g, '-')));
      if (idMatches.length > 0) {
        totalScore += rules.strong_dom_signal;
        evidence.push({
          pattern: `ID: ${idMatches.slice(0, 3).join(', ')}`,
          type: 'dom',
          score: rules.strong_dom_signal
        });
      }
    }
  }

  // Check text patterns (strong text signal)
  if (feature.text_patterns) {
    for (const pattern of feature.text_patterns) {
      if (containsTextPattern(content, pattern)) {
        totalScore += rules.strong_text_signal;
        matchedPatterns.push(pattern);
        evidence.push({
          pattern: `Текст: "${pattern}"`,
          type: 'text',
          score: rules.strong_text_signal
        });
      }
    }
  }

  // Check source examples as additional text patterns
  if (feature.source_examples) {
    for (const example of feature.source_examples.slice(0, 3)) {
      // Extract key words from example
      const keyWords = example
        .toLowerCase()
        .replace(/[^\wа-яё\s-]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 3);

      for (const word of keyWords) {
        if (containsTextPattern(content, word)) {
          totalScore += rules.weak_signal;
          evidence.push({
            pattern: `Ключевое слово: "${word}"`,
            type: 'text',
            score: rules.weak_signal
          });
        }
      }
    }
  }

  // Apply false positive penalties
  if (feature.false_positives && feature.false_positives.length > 0) {
    for (const fp of feature.false_positives) {
      if (containsTextPattern(content, fp)) {
        totalScore += rules.false_positive_penalty;
        evidence.push({
          pattern: `False positive: "${fp}"`,
          type: 'text',
          score: rules.false_positive_penalty
        });
      }
    }
  }

  // Special detection logic for specific features
  const specialScore = detectSpecialFeatures(feature.id, html, content, rules);
  totalScore += specialScore.score;
  evidence.push(...specialScore.evidence);

  // Determine status based on thresholds
  let status: FeatureStatus = 'not_found';
  let explanation = '';

  if (totalScore >= rules.threshold_confident) {
    status = 'confident';
    explanation = `Обнаружено с высокой уверенностью. Score: ${totalScore}. Совпавшие паттерны: ${matchedPatterns.slice(0, 5).join(', ')}`;
  } else if (totalScore >= rules.threshold_probable) {
    status = 'probable';
    explanation = `Вероятно присутствует. Score: ${totalScore}. Совпавшие паттерны: ${matchedPatterns.slice(0, 5).join(', ')}`;
  } else {
    explanation = `Не обнаружено. Score: ${totalScore}. Порог: ${rules.threshold_probable}`;
  }

  return {
    feature_id: feature.id,
    feature_name: feature.name,
    category: feature.category,
    status,
    total_score: totalScore,
    evidence,
    explanation
  };
}

/**
 * Special detection logic for complex features
 */
function detectSpecialFeatures(
  featureId: string,
  html: string,
  content: ExtractedContent,
  rules: ScoringRules
): { score: number; evidence: FeatureEvidence[] } {
  const $ = cheerio.load(html);
  let score = 0;
  const evidence: FeatureEvidence[] = [];

  switch (featureId) {
    case 'mini_cart':
      // Check for cart elements
      if ($('[class*="cart"]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Элемент корзины', type: 'dom', score: rules.strong_dom_signal });
      }
      if (content.buttons.some(b => b.toLowerCase().includes('корзин'))) {
        score += rules.strong_text_signal;
        evidence.push({ pattern: 'Кнопка корзины', type: 'text', score: rules.strong_text_signal });
      }
      break;

    case 'site_search':
    case 'smart_search':
      // Check for search input
      if ($('input[type="search"]').length > 0 || $('input[placeholder*="поиск" i]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Поле поиска', type: 'dom', score: rules.strong_dom_signal });
      }
      break;

    case 'contacts_with_map':
      // Check for map iframe
      if (content.iframes.some(i => i.src.includes('map'))) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Карта на странице', type: 'dom', score: rules.strong_dom_signal });
      }
      if (containsTextPattern(content, 'адрес') || containsTextPattern(content, 'контакт')) {
        score += rules.strong_text_signal;
        evidence.push({ pattern: 'Контактная информация', type: 'text', score: rules.strong_text_signal });
      }
      break;

    case 'messenger_buttons':
      // Check for messenger links
      const messengerPatterns = ['telegram', 'whatsapp', 'viber', 't.me/', 'wa.me/'];
      for (const pattern of messengerPatterns) {
        if (html.toLowerCase().includes(pattern)) {
          score += rules.strong_dom_signal;
          evidence.push({ pattern: `Ссылка на ${pattern}`, type: 'dom', score: rules.strong_dom_signal });
          break;
        }
      }
      break;

    case 'reviews_block':
      // Check for review elements
      if ($('[class*="review"]').length > 0 || $('[class*="testimonial"]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Блок отзывов', type: 'dom', score: rules.strong_dom_signal });
      }
      break;

    case 'gallery':
      // Check for gallery/slider elements
      if ($('[class*="gallery"]').length > 0 || $('[class*="slider"]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Галерея/слайдер', type: 'dom', score: rules.strong_dom_signal });
      }
      if (content.images.length > 5) {
        score += rules.weak_signal;
        evidence.push({ pattern: 'Много изображений', type: 'dom', score: rules.weak_signal });
      }
      break;

    case 'lead_form_inline':
      // Check for contact forms
      if (content.forms.length > 0) {
        const hasContactForm = content.forms.some(f => 
          f.inputs.some(i => ['name', 'email', 'phone', 'tel', 'телефон', 'почта'].includes(i.toLowerCase()))
        );
        if (hasContactForm) {
          score += rules.strong_dom_signal;
          evidence.push({ pattern: 'Контактная форма', type: 'dom', score: rules.strong_dom_signal });
        }
      }
      break;

    case 'auth_popup':
      // Check for auth elements
      if (containsTextPattern(content, 'войти') || containsTextPattern(content, 'регистрац')) {
        score += rules.strong_text_signal;
        evidence.push({ pattern: 'Ссылка на авторизацию', type: 'text', score: rules.strong_text_signal });
      }
      break;

    case 'product_video':
      // Check for video elements
      if ($('video').length > 0 || $('iframe[src*="youtube"]').length > 0 || $('iframe[src*="vimeo"]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Видео на странице', type: 'dom', score: rules.strong_dom_signal });
      }
      break;

    case 'mega_menu':
      // Check for complex navigation
      if ($('nav ul ul').length > 0 || $('[class*="mega"]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Сложное меню', type: 'dom', score: rules.strong_dom_signal });
      }
      break;

    case 'product_variants':
      // Check for variant selectors
      if ($('select[name*="size" i], select[name*="color" i], select[name*="variant" i]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Селектор вариантов', type: 'dom', score: rules.strong_dom_signal });
      }
      break;

    case 'timer_block':
      // Check for countdown elements
      if ($('[class*="countdown"], [class*="timer"], [data-countdown]').length > 0) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Таймер обратного отсчета', type: 'dom', score: rules.strong_dom_signal });
      }
      break;

    case 'language_switcher':
      // Check for language switcher - use more specific patterns
      const langSwitcherSelectors = [
        '[class*="language-switcher"]',
        '[class*="lang-switch"]',
        '[class*="lang_select"]',
        '[class*="language-select"]',
        '.language-switcher',
        '.lang-selector',
        '#lang-switch',
        'a[hreflang]',
        'link[hreflang]',
        '[data-lang]',
        '[data-language]'
      ];
      
      let langSwitcherFound = false;
      for (const selector of langSwitcherSelectors) {
        if ($(selector).length > 0) {
          langSwitcherFound = true;
          break;
        }
      }
      
      // Also check for actual language links (RU/EN/etc.) in navigation
      if (!langSwitcherFound) {
        const langLinkPatterns = ['ru', 'en', 'de', 'fr', 'es', 'ua', 'by', 'kz'];
        $('nav a, header a, .menu a').each((_, el) => {
          const text = $(el).text().trim().toLowerCase();
          const href = ($(el).attr('href') || '').toLowerCase();
          // Check if it's a language link (short text like "RU", "EN", "Рус", "Eng")
          if ((text.length <= 4 && langLinkPatterns.some(l => text === l || text === l.toUpperCase())) ||
              href.includes('/en/') || href.includes('/ru/') || href.includes('/de/')) {
            langSwitcherFound = true;
            return false; // break
          }
        });
      }
      
      if (langSwitcherFound) {
        score += rules.strong_dom_signal;
        evidence.push({ pattern: 'Переключатель языка', type: 'dom', score: rules.strong_dom_signal });
      }
      break;
  }

  return { score, evidence };
}

/**
 * Score all features
 */
export function scoreAllFeatures(
  features: Feature[],
  html: string,
  content: ExtractedContent
): FeatureScore[] {
  const rules = getScoringRules();
  const scores: FeatureScore[] = [];

  for (const feature of features) {
    if (feature.detectable) {
      const score = scoreFeature(feature, html, content, rules);
      scores.push(score);
    }
  }

  // Sort by score descending
  return scores.sort((a, b) => b.total_score - a.total_score);
}

/**
 * Separate detected and missing features
 */
export function separateFeatures(
  scores: FeatureScore[]
): { detected: FeatureScore[]; missing: FeatureScore[] } {
  const detected = scores.filter(s => s.status !== 'not_found');
  const missing = scores.filter(s => s.status === 'not_found');

  return {
    detected: detected.sort((a, b) => b.total_score - a.total_score),
    missing: missing.sort((a, b) => a.feature_name.localeCompare(b.feature_name))
  };
}
