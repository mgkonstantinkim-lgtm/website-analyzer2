import { KnowledgeBase } from '@/types';
import fs from 'fs';
import path from 'path';

// Cache for loaded knowledge base
let cachedKnowledgeBase: KnowledgeBase | null = null;

/**
 * Load knowledge base from JSON file
 * Uses caching to avoid repeated file reads
 */
export function loadKnowledgeBase(): KnowledgeBase {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }

  const kbPath = path.join(process.cwd(), 'data', 'knowledge_base.json');
  
  try {
    const rawContent = fs.readFileSync(kbPath, 'utf-8');
    const kb = JSON.parse(rawContent) as KnowledgeBase;
    cachedKnowledgeBase = kb;
    return kb;
  } catch (error) {
    console.error('Failed to load knowledge base:', error);
    throw new Error('Failed to load knowledge base');
  }
}

/**
 * Get feature by ID
 */
export function getFeatureById(featureId: string): import('@/types').Feature | undefined {
  const kb = loadKnowledgeBase();
  return kb.feature_dictionary.find(f => f.id === featureId);
}

/**
 * Get all detectable features
 */
export function getDetectableFeatures(): import('@/types').Feature[] {
  const kb = loadKnowledgeBase();
  return kb.feature_dictionary.filter(f => f.detectable);
}

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: string): import('@/types').Feature[] {
  const kb = loadKnowledgeBase();
  return kb.feature_dictionary.filter(f => f.category === category);
}

/**
 * Get scoring rules
 */
export function getScoringRules(): import('@/types').ScoringRules {
  const kb = loadKnowledgeBase();
  return kb.scoring_rules;
}

/**
 * Get site type rules
 */
export function getSiteTypeRules(): Record<string, import('@/types').SiteTypeRule> {
  const kb = loadKnowledgeBase();
  return kb.site_type_rules;
}

/**
 * Get business type rules
 */
export function getBusinessTypeRules(): Record<string, import('@/types').BusinessTypeRule> {
  const kb = loadKnowledgeBase();
  return kb.business_type_rules;
}

/**
 * Get recommendation rules
 */
export function getRecommendationRules(): import('@/types').RecommendationRule[] {
  const kb = loadKnowledgeBase();
  return kb.recommendation_rules;
}

/**
 * Get bundle rules
 */
export function getBundleRules(): import('@/types').BundleRule[] {
  const kb = loadKnowledgeBase();
  return kb.bundle_rules;
}

/**
 * Clear cache (useful for testing or hot reload)
 */
export function clearCache(): void {
  cachedKnowledgeBase = null;
}
