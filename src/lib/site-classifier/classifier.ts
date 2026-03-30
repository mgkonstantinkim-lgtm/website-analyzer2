import { SiteTypeResult, FeatureScore, ExtractedContent } from '@/types';
import { getSiteTypeRules } from '@/lib/knowledge-base/loader';
import * as cheerio from 'cheerio';

interface SiteTypeScore {
  type: string;
  totalScore: number;
  maxPossibleScore: number;
  indicators: string[];
}

/**
 * Classify site type based on features and content
 */
export function classifySiteType(
  features: FeatureScore[],
  html: string,
  content: ExtractedContent
): SiteTypeResult {
  const rules = getSiteTypeRules();
  const $ = cheerio.load(html);
  
  // Calculate scores for each site type
  const scores: SiteTypeScore[] = [];

  for (const [type, rule] of Object.entries(rules)) {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const matchedIndicators: string[] = [];

    for (const [indicator, weight] of Object.entries(rule.indicators)) {
      maxPossibleScore += weight;
      const indicatorScore = checkIndicator(indicator, features, $, content);
      
      if (indicatorScore > 0) {
        totalScore += weight * indicatorScore;
        matchedIndicators.push(`${indicator} (${indicatorScore > 0.5 ? 'сильно' : 'слабо'})`);
      }
    }

    scores.push({
      type,
      totalScore,
      maxPossibleScore,
      indicators: matchedIndicators
    });
  }

  // Sort by score percentage
  scores.sort((a, b) => {
    const aPercent = a.maxPossibleScore > 0 ? a.totalScore / a.maxPossibleScore : 0;
    const bPercent = b.maxPossibleScore > 0 ? b.totalScore / b.maxPossibleScore : 0;
    return bPercent - aPercent;
  });

  // Get best match
  const best = scores[0];
  const confidence = best.maxPossibleScore > 0 
    ? Math.min(100, Math.round((best.totalScore / best.maxPossibleScore) * 100))
    : 0;

  // Get description
  const rule = rules[best.type];
  const description = rule?.description || 'Не удалось определить тип сайта';

  return {
    type: best.type,
    confidence,
    description: translateSiteType(best.type) + ': ' + description,
    indicators: best.indicators
  };
}

/**
 * Check individual indicator
 */
function checkIndicator(
  indicator: string,
  features: FeatureScore[],
  $: cheerio.CheerioAPI,
  content: ExtractedContent
): number {
  switch (indicator) {
    case 'single_page':
      // Check if it's a single-page site (few internal links, all anchor links)
      const internalLinks = content.links.filter(l => !l.is_external).length;
      const anchorLinks = content.links.filter(l => l.href.includes('#')).length;
      return internalLinks < 10 && anchorLinks > 3 ? 1 : 0;

    case 'long_scroll':
      // Estimate if page has long content
      const contentLength = content.text_content.length;
      return contentLength > 5000 ? 1 : contentLength > 2000 ? 0.5 : 0;

    case 'many_cta':
      // Check for many call-to-action elements
      const ctaButtons = content.buttons.filter(b => 
        /купить|заказать|получить|оставить|связаться|звонок|заявк/i.test(b)
      ).length;
      return ctaButtons >= 3 ? 1 : ctaButtons >= 1 ? 0.5 : 0;

    case 'lead_forms':
      // Check for lead capture forms
      const leadForms = features.filter(f => 
        f.feature_id === 'lead_form_inline' && f.status !== 'not_found'
      ).length;
      return leadForms > 0 ? 1 : 0;

    case 'timer_blocks':
      // Check for timer/countdown
      const timerFeature = features.find(f => f.feature_id === 'timer_block');
      return timerFeature && timerFeature.status !== 'not_found' ? 1 : 0;

    case 'no_catalog':
      // Check absence of catalog
      const hasCatalog = features.some(f => 
        f.feature_id === 'categories_block' && f.status !== 'not_found'
      );
      return hasCatalog ? 0 : 1;

    case 'services_block':
      // Check for services block
      const servicesFeature = features.find(f => f.feature_id === 'services_block');
      return servicesFeature && servicesFeature.status !== 'not_found' ? 1 : 0;

    case 'portfolio':
      // Check for portfolio
      const portfolioFeature = features.find(f => f.feature_id === 'portfolio_gallery');
      return portfolioFeature && portfolioFeature.status !== 'not_found' ? 1 : 0;

    case 'contact_forms':
      // Check for contact forms
      const contactForms = content.forms.filter(f => 
        f.inputs.some(i => /email|phone|tel|телефон|почта/i.test(i))
      ).length;
      return contactForms > 0 ? 1 : 0;

    case 'price_list':
      // Check for price list
      const priceFeature = features.find(f => f.feature_id === 'price_list_block');
      return priceFeature && priceFeature.status !== 'not_found' ? 1 : 0;

    case 'stages_block':
      // Check for stages block
      const stagesFeature = features.find(f => f.feature_id === 'stages_block');
      return stagesFeature && stagesFeature.status !== 'not_found' ? 1 : 0;

    case 'about_page':
      // Check for about content
      const hasAbout = /о компании|о нас|about/i.test(content.text_content);
      return hasAbout ? 1 : 0;

    case 'team_block':
      // Check for team block
      const teamFeature = features.find(f => f.feature_id === 'team_block');
      return teamFeature && teamFeature.status !== 'not_found' ? 1 : 0;

    case 'news_block':
      // Check for news block
      const newsFeature = features.find(f => f.feature_id === 'news_block');
      return newsFeature && newsFeature.status !== 'not_found' ? 1 : 0;

    case 'contacts_page':
      // Check for contacts content
      const hasContacts = /контакты|адрес|телефон|email/i.test(content.text_content);
      return hasContacts ? 1 : 0;

    case 'partners_block':
      // Check for partners block
      const partnersFeature = features.find(f => f.feature_id === 'partners_block');
      return partnersFeature && partnersFeature.status !== 'not_found' ? 1 : 0;

    case 'cart':
      // Check for cart functionality
      const cartFeature = features.find(f => f.feature_id === 'mini_cart');
      const hasCartText = /корзина|cart|basket/i.test(content.text_content);
      return (cartFeature && cartFeature.status !== 'not_found') || hasCartText ? 1 : 0;

    case 'checkout':
      // Check for checkout functionality
      const hasCheckout = /оформить заказ|checkout|оплата/i.test(content.text_content);
      return hasCheckout ? 1 : 0;

    case 'product_cards':
      // Check for product cards
      const productElements = $('[class*="product"], [class*="item"], [class*="card"]').length;
      return productElements > 5 ? 1 : productElements > 2 ? 0.5 : 0;

    case 'catalog':
      // Check for catalog structure
      const catalogFeature = features.find(f => f.feature_id === 'categories_block');
      const hasCatalogText = /каталог|товары|продукты/i.test(content.text_content);
      return (catalogFeature && catalogFeature.status !== 'not_found') || hasCatalogText ? 1 : 0;

    case 'filters':
      // Check for filters
      const hasFilters = $('[class*="filter"], [class*="sort"]').length > 0;
      return hasFilters ? 1 : 0;

    case 'search':
      // Check for search
      const searchFeature = features.find(f => f.feature_id === 'site_search');
      return searchFeature && searchFeature.status !== 'not_found' ? 1 : 0;

    case 'no_cart':
      // Check absence of cart
      const hasCart = features.some(f => 
        f.feature_id === 'mini_cart' && f.status !== 'not_found'
      ) || /корзина|cart/i.test(content.text_content);
      return hasCart ? 0 : 1;

    case 'no_checkout':
      // Check absence of checkout
      const hasCheckout2 = /оформить|checkout|оплата/i.test(content.text_content);
      return hasCheckout2 ? 0 : 1;

    case 'portfolio_gallery':
      // Check for portfolio gallery
      const portfolioGalleryFeature = features.find(f => f.feature_id === 'portfolio_gallery');
      return portfolioGalleryFeature && portfolioGalleryFeature.status !== 'not_found' ? 1 : 0;

    case 'works_block':
      // Check for works block
      const hasWorks = /наши работы|выполненные работы|проекты|portfolio/i.test(content.text_content);
      return hasWorks ? 1 : 0;

    case 'no_ecommerce':
      // Check absence of ecommerce
      const hasEcommerce = features.some(f => 
        ['mini_cart', 'wishlist_compare', 'stock_indicator'].includes(f.feature_id) && f.status !== 'not_found'
      );
      return hasEcommerce ? 0 : 1;

    default:
      return 0;
  }
}

/**
 * Translate site type to Russian
 */
function translateSiteType(type: string): string {
  const translations: Record<string, string> = {
    'landing': 'Лендинг',
    'services': 'Сайт услуг',
    'corporate': 'Корпоративный сайт',
    'ecommerce': 'Интернет-магазин',
    'catalog': 'Каталог товаров',
    'portfolio': 'Портфолио'
  };

  return translations[type] || type;
}

/**
 * Get site type explanation
 */
export function getSiteTypeExplanation(result: SiteTypeResult): string {
  const indicators = result.indicators.length > 0 
    ? result.indicators.join(', ')
    : 'недостаточно данных';
    
  return `Тип определён как "${result.type}" с уверенностью ${result.confidence}%. ` +
         `Признаки: ${indicators}.`;
}
