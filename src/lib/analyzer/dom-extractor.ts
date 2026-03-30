import * as cheerio from 'cheerio';
import { ExtractedContent } from '@/types';

/**
 * Extracts structured content from HTML
 */
export function extractContent(html: string, baseUrl: string): ExtractedContent {
  const $ = cheerio.load(html);
  
  // Remove script, style, and other non-content elements
  $('script').remove();
  $('style').remove();
  $('noscript').remove();
  $('iframe').remove(); // We'll extract iframes separately
  
  // Reload after removal for text content
  const $clean = cheerio.load(html);

  // Extract title
  const title = $('title').text().trim() || '';

  // Extract headings
  const h1: string[] = [];
  const h2: string[] = [];
  const h3: string[] = [];

  $('h1').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1.push(text);
  });

  $('h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2.push(text);
  });

  $('h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h3.push(text);
  });

  // Extract meta description
  const meta_description = $('meta[name="description"]').attr('content') || '';

  // Extract main text content (from body, excluding scripts and styles)
  const text_content = $('body')
    .clone()
    .find('script, style, noscript')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50000); // Limit text length

  // Extract links
  const links: ExtractedContent['links'] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    
    if (href && text) {
      try {
        const fullUrl = new URL(href, baseUrl).href;
        const is_external = !fullUrl.includes(new URL(baseUrl).hostname);
        links.push({ href: fullUrl, text, is_external });
      } catch {
        // Skip invalid URLs
      }
    }
  });

  // Extract images
  const images: ExtractedContent['images'] = [];
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    
    if (src) {
      try {
        const fullUrl = new URL(src, baseUrl).href;
        images.push({ src: fullUrl, alt });
      } catch {
        // Skip invalid URLs
      }
    }
  });

  // Extract forms
  const forms: ExtractedContent['forms'] = [];
  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    const method = $(el).attr('method') || 'GET';
    
    const inputs: string[] = [];
    $(el)
      .find('input, textarea, select')
      .each((_, input) => {
        const name = $(input).attr('name') || $(input).attr('type') || '';
        if (name) inputs.push(name);
      });

    const has_submit = $(el).find('button[type="submit"], input[type="submit"]').length > 0;

    forms.push({ action, method: method.toUpperCase(), inputs, has_submit });
  });

  // Extract buttons
  const buttons: string[] = [];
  $('button, input[type="button"], input[type="submit"], a.btn, a.button, [role="button"]').each((_, el) => {
    const text = $(el).text().trim() || $(el).attr('value') || '';
    if (text && !buttons.includes(text)) {
      buttons.push(text);
    }
  });

  // Extract iframes (reload to get them)
  const iframes: ExtractedContent['iframes'] = [];
  $clean('iframe[src]').each((_, el) => {
    const src = $clean(el).attr('src') || '';
    const title = $clean(el).attr('title') || '';
    
    if (src) {
      // Check for map iframes
      const isMap = 
        src.includes('yandex.ru/map') ||
        src.includes('maps.yandex') ||
        src.includes('google.com/map') ||
        src.includes('maps.google');
      
      iframes.push({ 
        src, 
        title: title || (isMap ? 'Карта' : '')
      });
    }
  });

  // Extract navigation menus
  const menus: ExtractedContent['menus'] = [];
  $('nav, .menu, .nav, [role="navigation"], header ul, .header ul').each((_, el) => {
    const items: string[] = [];
    $(el)
      .find('a')
      .each((_, link) => {
        const text = $(link).text().trim();
        if (text && !items.includes(text)) {
          items.push(text);
        }
      });

    if (items.length > 0) {
      menus.push({
        items,
        class: $(el).attr('class') || ''
      });
    }
  });

  // Extract script sources (for detecting libraries)
  const scripts: string[] = [];
  $clean('script[src]').each((_, el) => {
    const src = $clean(el).attr('src') || '';
    if (src) scripts.push(src);
  });

  // Extract stylesheet links
  const styles: string[] = [];
  $clean('link[rel="stylesheet"]').each((_, el) => {
    const href = $clean(el).attr('href') || '';
    if (href) styles.push(href);
  });

  return {
    title,
    h1,
    h2,
    h3,
    meta_description,
    text_content,
    links: links.slice(0, 500), // Limit links
    images: images.slice(0, 200), // Limit images
    forms,
    buttons: buttons.slice(0, 100), // Limit buttons
    iframes,
    menus: menus.slice(0, 10), // Limit menus
    scripts,
    styles
  };
}

/**
 * Find DOM elements matching patterns
 */
export function findDomPatterns(html: string, patterns: string[]): Map<string, string[]> {
  const $ = cheerio.load(html);
  const results = new Map<string, string[]>();

  for (const pattern of patterns) {
    const matches: string[] = [];
    
    try {
      $(pattern).each((_, el) => {
        const text = $(el).text().trim().substring(0, 200);
        const classAttr = $(el).attr('class') || '';
        const idAttr = $(el).attr('id') || '';
        
        matches.push(`${text}${classAttr ? ` [class="${classAttr}"]` : ''}${idAttr ? ` [id="${idAttr}"]` : ''}`);
      });
      
      if (matches.length > 0) {
        results.set(pattern, matches.slice(0, 10)); // Limit matches per pattern
      }
    } catch {
      // Invalid selector, skip
    }
  }

  return results;
}

/**
 * Extract all CSS classes from HTML
 */
export function extractClasses(html: string): string[] {
  const $ = cheerio.load(html);
  const classes = new Set<string>();

  $('[class]').each((_, el) => {
    const classAttr = $(el).attr('class') || '';
    classAttr.split(/\s+/).forEach(cls => {
      if (cls) classes.add(cls.toLowerCase());
    });
  });

  return Array.from(classes);
}

/**
 * Extract all IDs from HTML
 */
export function extractIds(html: string): string[] {
  const $ = cheerio.load(html);
  const ids = new Set<string>();

  $('[id]').each((_, el) => {
    const id = $(el).attr('id') || '';
    if (id) ids.add(id.toLowerCase());
  });

  return Array.from(ids);
}

/**
 * Check if page contains text pattern (case insensitive)
 */
export function containsTextPattern(content: ExtractedContent, pattern: string): boolean {
  const lowerPattern = pattern.toLowerCase();
  
  // Check in priority areas first
  if (content.title.toLowerCase().includes(lowerPattern)) return true;
  if (content.h1.some(h => h.toLowerCase().includes(lowerPattern))) return true;
  if (content.meta_description.toLowerCase().includes(lowerPattern)) return true;
  
  // Then check in text content
  if (content.text_content.toLowerCase().includes(lowerPattern)) return true;
  
  // Check in buttons
  if (content.buttons.some(b => b.toLowerCase().includes(lowerPattern))) return true;
  
  return false;
}

/**
 * Get text from specific areas with weights
 */
export function getWeightedText(content: ExtractedContent): Map<string, string[]> {
  const weighted = new Map<string, string[]>();
  
  weighted.set('title', [content.title]);
  weighted.set('h1', content.h1);
  weighted.set('h2', content.h2);
  weighted.set('h3', content.h3);
  weighted.set('meta', [content.meta_description]);
  weighted.set('menu', content.menus.flatMap(m => m.items));
  weighted.set('buttons', content.buttons);
  weighted.set('content', [content.text_content.substring(0, 10000)]);
  
  return weighted;
}
