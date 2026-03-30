import { AnalysisResult } from '@/types';
import { loadKnowledgeBase } from '@/lib/knowledge-base/loader';
import { fetchPage } from './page-fetcher';
import { extractContent } from './dom-extractor';
import { scoreAllFeatures, separateFeatures } from './feature-scorer';
import { classifySiteType } from '@/lib/site-classifier/classifier';
import { classifyBusinessType } from '@/lib/business-classifier/classifier';
import { generateRecommendations } from '@/lib/recommendation-engine/recommendation-engine';
import { generateBundleRecommendations } from '@/lib/recommendation-engine/bundle-engine';

/**
 * Main analysis function - orchestrates the entire analysis pipeline
 */
export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const startTime = Date.now();
  const kb = loadKnowledgeBase();

  // Step 1: Fetch the page
  const fetchResult = await fetchPage(url);
  
  if (!fetchResult.success || !fetchResult.html) {
    // Return error result
    return {
      url: fetchResult.url || url,
      final_url: fetchResult.url || url,
      fetch_success: false,
      fetch_time: fetchResult.response_time || 0,
      analyzed_at: new Date().toISOString(),
      
      site_type: {
        type: 'unknown',
        confidence: 0,
        description: 'Не удалось загрузить страницу',
        indicators: []
      },
      business_type: {
        type: 'другое',
        confidence: 0,
        matched_keywords: [],
        priority_areas: []
      },
      detected_features: [],
      missing_features: [],
      recommendations: [],
      bundle_recommendations: [],
      raw_data: {
        extracted_content: {
          title: '',
          h1: [],
          h2: [],
          h3: [],
          meta_description: '',
          text_content: '',
          links: [],
          images: [],
          forms: [],
          buttons: [],
          iframes: [],
          menus: [],
          scripts: [],
          styles: []
        },
        all_scores: {}
      }
    };
  }

  // Step 2: Extract content from HTML
  const content = extractContent(fetchResult.html, fetchResult.final_url || fetchResult.url || url);

  // Step 3: Score all features
  const allScores = scoreAllFeatures(
    kb.feature_dictionary.filter(f => f.detectable),
    fetchResult.html,
    content
  );

  // Step 4: Separate detected and missing features
  const { detected, missing } = separateFeatures(allScores);

  // Step 5: Classify site type
  const siteType = classifySiteType(allScores, fetchResult.html, content);

  // Step 6: Classify business type
  const businessType = classifyBusinessType(content);

  // Step 7: Generate recommendations
  const recommendations = generateRecommendations(
    detected,
    missing,
    siteType,
    businessType
  );

  // Step 8: Generate bundle recommendations
  const bundleRecommendations = generateBundleRecommendations(missing, siteType);

  // Build final result
  const result: AnalysisResult = {
    url: fetchResult.url || url,
    final_url: fetchResult.final_url || fetchResult.url || url,
    fetch_success: true,
    fetch_time: fetchResult.response_time || Date.now() - startTime,
    analyzed_at: new Date().toISOString(),
    
    site_type: siteType,
    business_type: businessType,
    
    detected_features: detected,
    missing_features: missing,
    
    recommendations,
    bundle_recommendations: bundleRecommendations,
    
    raw_data: {
      extracted_content: content,
      all_scores: Object.fromEntries(allScores.map(s => [s.feature_id, s]))
    }
  };

  return result;
}
