// ============================================
// Knowledge Base Types
// ============================================

export interface ScoringRules {
  strong_dom_signal: number;
  strong_text_signal: number;
  weak_signal: number;
  false_positive_penalty: number;
  threshold_probable: number;
  threshold_confident: number;
}

export interface Feature {
  id: string;
  name: string;
  category: string;
  detectable: boolean;
  source_examples: string[];
  status_modes: string[];
  text_patterns?: string[];
  dom_patterns?: string[];
  false_positives?: string[];
}

export interface SiteTypeRule {
  indicators: Record<string, number>;
  description: string;
}

export interface BusinessTypeRule {
  keywords: string[];
  priority_areas: string[];
}

export interface RecommendCondition {
  site_types: string[];
  business_types: string[];
  missing_features: string[];
}

export interface RecommendationRule {
  canonical_id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommend_if: RecommendCondition;
  why: string;
  marketing_goal: string;
}

export interface BundleCondition {
  site_types: string[];
  missing_at_least: number;
  from_features: string[];
}

export interface BundleRule {
  bundle_id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  bundle_title: string;
  recommend_if: BundleCondition;
}

export interface KnowledgeBase {
  schema_version: string;
  project: string;
  description: string;
  scoring_rules: ScoringRules;
  feature_dictionary: Feature[];
  site_type_rules: Record<string, SiteTypeRule>;
  business_type_rules: Record<string, BusinessTypeRule>;
  recommendation_rules: RecommendationRule[];
  bundle_rules: BundleRule[];
  stats: {
    total_source_items: number;
    total_canonical_features: number;
    status_breakdown: Record<string, number>;
  };
}

// ============================================
// Analysis Types
// ============================================

export type FeatureStatus = 'not_found' | 'probable' | 'confident';

export interface FeatureEvidence {
  pattern: string;
  type: 'dom' | 'text' | 'url';
  score: number;
}

export interface FeatureScore {
  feature_id: string;
  feature_name: string;
  category: string;
  status: FeatureStatus;
  total_score: number;
  evidence: FeatureEvidence[];
  explanation: string;
}

export interface SiteTypeResult {
  type: string;
  confidence: number;
  description: string;
  indicators: string[];
}

export interface BusinessTypeResult {
  type: string;
  confidence: number;
  matched_keywords: string[];
  priority_areas: string[];
}

export interface Recommendation {
  feature_id: string;
  feature_name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  why: string;
  marketing_goal: string;
  rule_source: string;
  applicable: boolean;
}

export interface BundleRecommendation {
  bundle_id: string;
  bundle_title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  missing_features: string[];
  matched_count: number;
}

// ============================================
// Page Fetcher Types
// ============================================

export interface FetchResult {
  success: boolean;
  html?: string;
  url?: string;
  final_url?: string;
  status?: number;
  error?: string;
  response_time?: number;
}

// ============================================
// DOM Extractor Types
// ============================================

export interface ExtractedContent {
  title: string;
  h1: string[];
  h2: string[];
  h3: string[];
  meta_description: string;
  text_content: string;
  links: Array<{
    href: string;
    text: string;
    is_external: boolean;
  }>;
  images: Array<{
    src: string;
    alt: string;
  }>;
  forms: Array<{
    action: string;
    method: string;
    inputs: string[];
    has_submit: boolean;
  }>;
  buttons: string[];
  iframes: Array<{
    src: string;
    title: string;
  }>;
  menus: Array<{
    items: string[];
    class: string;
  }>;
  scripts: string[];
  styles: string[];
}

// ============================================
// Analysis Result Types
// ============================================

export interface AnalysisResult {
  url: string;
  final_url: string;
  fetch_success: boolean;
  fetch_time: number;
  analyzed_at: string;
  
  // Site classification
  site_type: SiteTypeResult;
  business_type: BusinessTypeResult;
  
  // Feature detection
  detected_features: FeatureScore[];
  missing_features: FeatureScore[];
  
  // Recommendations
  recommendations: Recommendation[];
  bundle_recommendations: BundleRecommendation[];
  
  // Raw data for debug
  raw_data: {
    extracted_content: ExtractedContent;
    all_scores: Record<string, FeatureScore>;
  };
}

// ============================================
// API Types
// ============================================

export interface AnalyzeRequest {
  url: string;
  include_raw?: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  result?: AnalysisResult;
  error?: string;
}
