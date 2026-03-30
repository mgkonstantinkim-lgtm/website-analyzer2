import fs from 'fs';
import path from 'path';
import type {
  KnowledgeBase,
  Feature,
  ScoringRules,
  SiteTypeRule,
  BusinessTypeRule,
  RecommendationRule,
  BundleRule,
} from '@/types';

let cachedKnowledgeBase: KnowledgeBase | null = null;

export async function loadKnowledgeBase(): Promise<KnowledgeBase> {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }

  const url = process.env.KNOWLEDGE_BASE_URL;

  if (url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });

      if (res.ok) {
        const kb = (await res.json()) as KnowledgeBase;
        cachedKnowledgeBase = kb;
        return kb;
      }
    } catch (error) {
      console.error('Remote load failed:', error);
    }
  }

  const kbPath = path.join(process.cwd(), 'data', 'knowledge_base.json');

  const raw = fs.readFileSync(kbPath, 'utf-8');
  const kb = JSON.parse(raw) as KnowledgeBase;
  cachedKnowledgeBase = kb;

  return kb;
}

// ================= API =================

export async function getFeatureById(featureId: string): Promise<Feature | undefined> {
  const kb = await loadKnowledgeBase();
  return kb.feature_dictionary?.find(f => f.id === featureId);
}

export async function getDetectableFeatures(): Promise<Feature[]> {
  const kb = await loadKnowledgeBase();
  return (kb.feature_dictionary ?? []).filter(f => f.detectable);
}

export async function getFeaturesByCategory(category: string): Promise<Feature[]> {
  const kb = await loadKnowledgeBase();
  return (kb.feature_dictionary ?? []).filter(f => f.category === category);
}

export async function getScoringRules(): Promise<ScoringRules> {
  const kb = await loadKnowledgeBase();
  return kb.scoring_rules;
}

export async function getSiteTypeRules(): Promise<Record<string, SiteTypeRule>> {
  const kb = await loadKnowledgeBase();
  return kb.site_type_rules ?? {};
}

export async function getBusinessTypeRules(): Promise<Record<string, BusinessTypeRule>> {
  const kb = await loadKnowledgeBase();
  return kb.business_type_rules ?? {};
}

export async function getRecommendationRules(): Promise<RecommendationRule[]> {
  const kb = await loadKnowledgeBase();
  return kb.recommendation_rules ?? [];
}

export async function getBundleRules(): Promise<BundleRule[]> {
  const kb = await loadKnowledgeBase();
  return kb.bundle_rules ?? [];
}
