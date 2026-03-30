import { FetchResult } from '@/types';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

const TIMEOUT_MS = 30000;
const MAX_REDIRECTS = 10;

/**
 * Validates and normalizes URL
 */
export function validateUrl(url: string): { valid: boolean; normalized?: string; error?: string } {
  // Add protocol if missing
  let normalizedUrl = url.trim();
  
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);
    
    // Block dangerous protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Неподдерживаемый протокол. Используйте HTTP или HTTPS.' };
    }

    // Block localhost and internal IPs for security
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname === '0.0.0.0'
    ) {
      return { valid: false, error: 'Невозможно анализировать локальные адреса.' };
    }

    return { valid: true, normalized: normalizedUrl };
  } catch {
    return { valid: false, error: 'Некорректный URL. Проверьте правильность адреса.' };
  }
}

/**
 * Fetches HTML content from URL with proper error handling
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  const startTime = Date.now();
  
  // Validate URL first
  const validation = validateUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const targetUrl = validation.normalized!;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Random user agent to avoid blocking
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Check response status
    if (!response.ok) {
      return {
        success: false,
        url: targetUrl,
        status: response.status,
        error: `Ошибка HTTP ${response.status}: ${response.statusText}`,
        response_time: Date.now() - startTime
      };
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return {
        success: false,
        url: targetUrl,
        status: response.status,
        error: `Неподдерживаемый тип контента: ${contentType}. Ожидается HTML.`,
        response_time: Date.now() - startTime
      };
    }

    // Read HTML content
    const html = await response.text();
    
    // Check for empty response
    if (!html || html.trim().length === 0) {
      return {
        success: false,
        url: targetUrl,
        status: response.status,
        error: 'Получена пустая страница',
        response_time: Date.now() - startTime
      };
    }

    return {
      success: true,
      html,
      url: targetUrl,
      final_url: response.url,
      status: response.status,
      response_time: Date.now() - startTime
    };

  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          url: targetUrl,
          error: `Превышено время ожидания (${TIMEOUT_MS / 1000} сек)`,
          response_time: Date.now() - startTime
        };
      }
      
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        return {
          success: false,
          url: targetUrl,
          error: 'Домен не найден. Проверьте правильность URL.',
          response_time: Date.now() - startTime
        };
      }

      if (error.message.includes('ECONNREFUSED')) {
        return {
          success: false,
          url: targetUrl,
          error: 'Сервер недоступен. Сайт не отвечает.',
          response_time: Date.now() - startTime
        };
      }

      if (error.message.includes('CERT') || error.message.includes('SSL')) {
        return {
          success: false,
          url: targetUrl,
          error: 'Ошибка SSL сертификата. Сайт использует недействительный сертификат.',
          response_time: Date.now() - startTime
        };
      }

      return {
        success: false,
        url: targetUrl,
        error: `Ошибка загрузки: ${error.message}`,
        response_time: Date.now() - startTime
      };
    }

    return {
      success: false,
      url: targetUrl,
      error: 'Неизвестная ошибка при загрузке страницы',
      response_time: Date.now() - startTime
    };
  }
}

/**
 * Fetches multiple pages (for future expansion)
 */
export async function fetchMultiplePages(
  urls: string[]
): Promise<Map<string, FetchResult>> {
  const results = new Map<string, FetchResult>();
  
  // Fetch pages sequentially to avoid rate limiting
  for (const url of urls) {
    const result = await fetchPage(url);
    results.set(url, result);
    
    // Small delay between requests
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
