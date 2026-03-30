import { 
  BundleRecommendation, 
  FeatureScore, 
  SiteTypeResult 
} from '@/types';
import { getBundleRules, getFeatureById } from '@/lib/knowledge-base/loader';

/**
 * Generate bundle recommendations based on missing features
 */
export function generateBundleRecommendations(
  missingFeatures: FeatureScore[],
  siteType: SiteTypeResult
): BundleRecommendation[] {
  const rules = getBundleRules();
  const recommendations: BundleRecommendation[] = [];

  // Get set of missing feature IDs
  const missingFeatureIds = new Set(missingFeatures.map(f => f.feature_id));

  for (const rule of rules) {
    // Check site type match
    const siteTypeMatches = rule.recommend_if.site_types.includes(siteType.type);
    if (!siteTypeMatches) {
      continue;
    }

    // Count how many features from the bundle are missing
    const missingFromBundle = rule.recommend_if.from_features.filter(
      featureId => missingFeatureIds.has(featureId)
    );

    // Check if enough features are missing to recommend the bundle
    if (missingFromBundle.length >= rule.recommend_if.missing_at_least) {
      // Get feature names for missing features
      const missingFeatureNames = missingFromBundle.map(id => {
        const feature = getFeatureById(id);
        return feature?.name || id;
      });

      recommendations.push({
        bundle_id: rule.bundle_id,
        bundle_title: rule.bundle_title,
        priority: rule.priority,
        missing_features: missingFeatureNames,
        matched_count: missingFromBundle.length
      });
    }
  }

  // Sort by priority and then by number of matched features
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.matched_count - a.matched_count;
  });

  return recommendations;
}

/**
 * Get explanation for bundle recommendation
 */
export function getBundleExplanation(bundle: BundleRecommendation): string {
  const features = bundle.missing_features.join(', ');
  return `Рекомендуется установить пакет "${bundle.bundle_title}", так как ` +
         `отсутствуют ${bundle.matched_count} функций: ${features}. ` +
         `Установка пакета обычно выгоднее, чем заказ отдельных функций.`;
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: 'critical' | 'high' | 'medium' | 'low'): string {
  const labels = {
    critical: 'Критически важно',
    high: 'Высокий приоритет',
    medium: 'Средний приоритет',
    low: 'Низкий приоритет'
  };
  return labels[priority];
}

/**
 * Get bundle savings estimate
 */
export function getBundleSavings(bundle: BundleRecommendation): string {
  const savingsPercent = bundle.matched_count >= 4 ? '30-50%' : 
                         bundle.matched_count >= 3 ? '20-30%' : '10-20%';
  return `При заказе пакета экономия составит примерно ${savingsPercent} от стоимости отдельных функций.`;
}
