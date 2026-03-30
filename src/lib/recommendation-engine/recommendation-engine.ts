import { 
  Recommendation, 
  FeatureScore, 
  SiteTypeResult, 
  BusinessTypeResult 
} from '@/types';
import { 
  getRecommendationRules, 
  getFeatureById 
} from '@/lib/knowledge-base/loader';
import { matchesBusinessType } from '@/lib/business-classifier/classifier';

/**
 * Generate recommendations based on analysis results
 */
export function generateRecommendations(
  detectedFeatures: FeatureScore[],
  missingFeatures: FeatureScore[],
  siteType: SiteTypeResult,
  businessType: BusinessTypeResult
): Recommendation[] {
  const rules = getRecommendationRules();
  const recommendations: Recommendation[] = [];

  // Get set of missing feature IDs
  const missingFeatureIds = new Set(missingFeatures.map(f => f.feature_id));

  for (const rule of rules) {
    // Check if this feature is missing
    if (!missingFeatureIds.has(rule.canonical_id)) {
      continue;
    }

    // Check site type match
    const siteTypeMatches = rule.recommend_if.site_types.includes(siteType.type);
    if (!siteTypeMatches) {
      continue;
    }

    // Check business type match
    const businessTypeMatches = matchesBusinessType(
      businessType.type,
      rule.recommend_if.business_types
    );
    if (!businessTypeMatches) {
      continue;
    }

    // Get feature info
    const feature = getFeatureById(rule.canonical_id);
    if (!feature) {
      continue;
    }

    recommendations.push({
      feature_id: rule.canonical_id,
      feature_name: feature.name,
      priority: rule.priority,
      why: rule.why,
      marketing_goal: rule.marketing_goal,
      rule_source: `recommendation_rule: ${rule.canonical_id}`,
      applicable: true
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Get explanation for recommendation
 */
export function getRecommendationExplanation(rec: Recommendation): string {
  const priorityLabels = {
    critical: 'Критически важно',
    high: 'Высокий приоритет',
    medium: 'Средний приоритет',
    low: 'Низкий приоритет'
  };

  return `${priorityLabels[rec.priority]}: ${rec.why} ` +
         `Маркетинговая цель: ${rec.marketing_goal}`;
}

/**
 * Filter recommendations by priority
 */
export function filterByPriority(
  recommendations: Recommendation[],
  priority: 'critical' | 'high' | 'medium' | 'low'
): Recommendation[] {
  return recommendations.filter(r => r.priority === priority);
}

/**
 * Get top N recommendations
 */
export function getTopRecommendations(
  recommendations: Recommendation[],
  limit: number = 10
): Recommendation[] {
  return recommendations.slice(0, limit);
}

/**
 * Group recommendations by category
 */
export function groupByCategory(
  recommendations: Recommendation[]
): Map<string, Recommendation[]> {
  const groups = new Map<string, Recommendation[]>();

  for (const rec of recommendations) {
    const feature = getFeatureById(rec.feature_id);
    const category = feature?.category || 'other';

    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(rec);
  }

  return groups;
}
