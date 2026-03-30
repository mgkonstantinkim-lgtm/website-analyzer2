'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Search, 
  Copy, 
  Check, 
  AlertCircle,
  Globe,
  Clock,
  FileCode,
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { AnalysisResult } from '@/types';

export function Analyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Введите URL сайта');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, include_raw: showRaw })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Ошибка при анализе');
        return;
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    const report = generateReport(result);
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const filteredRecommendations = result?.recommendations.filter(rec => {
    const matchesSearch = rec.feature_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Анализатор сайтов
          </CardTitle>
          <CardDescription>
            Введите URL сайта для анализа функций и получения рекомендаций
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Анализ...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Анализировать
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showRaw}
                onChange={(e) => setShowRaw(e.target.checked)}
                className="rounded border-gray-300"
              />
              Показать сырые данные
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Тип сайта</p>
                    <p className="text-xl font-bold">{translateSiteType(result.site_type.type)}</p>
                  </div>
                  <Badge variant={result.site_type.confidence > 70 ? 'default' : 'secondary'}>
                    {result.site_type.confidence}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Тип бизнеса</p>
                    <p className="text-xl font-bold">{translateBusinessType(result.business_type.type)}</p>
                  </div>
                  <Badge variant={result.business_type.confidence > 50 ? 'default' : 'secondary'}>
                    {result.business_type.confidence}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Найдено функций</p>
                    <p className="text-xl font-bold text-green-600">{result.detected_features.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Рекомендаций</p>
                    <p className="text-xl font-bold text-orange-600">{result.recommendations.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="detected">Найденные</TabsTrigger>
              <TabsTrigger value="missing">Отсутствующие</TabsTrigger>
              <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
              <TabsTrigger value="raw">JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <OverviewTab result={result} />
            </TabsContent>

            <TabsContent value="detected" className="space-y-4">
              <DetectedFeaturesTab features={result.detected_features} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            </TabsContent>

            <TabsContent value="missing" className="space-y-4">
              <MissingFeaturesTab features={result.missing_features} />
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <RecommendationsTab 
                recommendations={filteredRecommendations}
                bundles={result.bundle_recommendations}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
              />
            </TabsContent>

            <TabsContent value="raw" className="space-y-4">
              <RawDataTab result={result} />
            </TabsContent>
          </Tabs>

          {/* Copy Button */}
          <div className="flex justify-end">
            <Button onClick={handleCopy} variant="outline">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Скопировать отчёт
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function OverviewTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Информация о сайте</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">URL</p>
              <p className="font-mono text-sm">{result.final_url}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Время загрузки</p>
              <p className="font-mono text-sm">{result.fetch_time} мс</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Заголовок страницы</p>
              <p className="font-medium">{result.raw_data.extracted_content.title || 'Не найден'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">H1</p>
              <p className="font-medium">{result.raw_data.extracted_content.h1[0] || 'Не найден'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Классификация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Тип сайта</p>
            <p className="text-muted-foreground">{result.site_type.description}</p>
            <div className="flex gap-2 mt-2">
              {result.site_type.indicators.map((ind, i) => (
                <Badge key={i} variant="outline">{ind}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Тип бизнеса</p>
            <p className="text-muted-foreground">
              Ключевые слова: {result.business_type.matched_keywords.join(', ') || 'не определены'}
            </p>
          </div>
        </CardContent>
      </Card>

      {result.bundle_recommendations.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Пакетные рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.bundle_recommendations.map((bundle, i) => (
              <div key={i} className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{bundle.bundle_title}</h4>
                  <Badge variant={bundle.priority === 'critical' ? 'destructive' : 'default'}>
                    {bundle.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Отсутствует {bundle.matched_count} функций из пакета
                </p>
                <div className="flex flex-wrap gap-1">
                  {bundle.missing_features.map((f, j) => (
                    <Badge key={j} variant="outline">{f}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetectedFeaturesTab({ 
  features, 
  searchQuery, 
  setSearchQuery 
}: { 
  features: AnalysisResult['detected_features'];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const filtered = features.filter(f => 
    f.feature_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Найденные функции ({filtered.length})</CardTitle>
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.map((feature, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                {feature.status === 'confident' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <p className="font-medium">{feature.feature_name}</p>
                  <p className="text-xs text-muted-foreground">{feature.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={feature.status === 'confident' ? 'default' : 'secondary'}>
                  {feature.status === 'confident' ? 'Найдено' : 'Вероятно'}
                </Badge>
                <span className="text-sm text-muted-foreground">Score: {feature.total_score}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MissingFeaturesTab({ features }: { features: AnalysisResult['missing_features'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Отсутствующие функции ({features.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="font-medium">{feature.feature_name}</p>
                  <p className="text-xs text-muted-foreground">{feature.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsTab({
  recommendations,
  bundles,
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter
}: {
  recommendations: AnalysisResult['recommendations'];
  bundles: AnalysisResult['bundle_recommendations'];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">Рекомендации ({recommendations.length})</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Все приоритеты</option>
                <option value="critical">Критические</option>
                <option value="high">Высокие</option>
                <option value="medium">Средние</option>
                <option value="low">Низкие</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recommendations.map((rec, i) => (
              <div key={i} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{rec.feature_name}</h4>
                  <Badge 
                    variant={
                      rec.priority === 'critical' ? 'destructive' : 
                      rec.priority === 'high' ? 'default' : 'secondary'
                    }
                  >
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{rec.why}</p>
                <p className="text-sm font-medium text-primary">{rec.marketing_goal}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {bundles.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Пакетные рекомендации ({bundles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bundles.map((bundle, i) => (
                <div key={i} className="p-4 rounded-lg border bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{bundle.bundle_title}</h4>
                    <Badge 
                      variant={bundle.priority === 'critical' ? 'destructive' : 'default'}
                    >
                      {bundle.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Отсутствует {bundle.matched_count} функций:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {bundle.missing_features.map((f, j) => (
                      <Badge key={j} variant="outline">{f}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RawDataTab({ result }: { result: AnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Сырой результат (JSON)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

// Helper functions
function translateSiteType(type: string): string {
  const translations: Record<string, string> = {
    'landing': 'Лендинг',
    'services': 'Сайт услуг',
    'corporate': 'Корпоративный',
    'ecommerce': 'Интернет-магазин',
    'catalog': 'Каталог',
    'portfolio': 'Портфолио',
    'unknown': 'Не определён'
  };
  return translations[type] || type;
}

function translateBusinessType(type: string): string {
  const translations: Record<string, string> = {
    'строительство': 'Строительство',
    'ремонт': 'Ремонт',
    'медицина': 'Медицина',
    'образование': 'Образование',
    'логистика': 'Логистика',
    'мебель': 'Мебель',
    'e-commerce': 'E-commerce',
    'локальный бизнес': 'Локальный бизнес',
    'юридические услуги': 'Юридические услуги',
    'B2B': 'B2B',
    'красота': 'Красота',
    'производство': 'Производство',
    'туризм': 'Туризм',
    'международный бизнес': 'Международный бизнес',
    'другое': 'Другое'
  };
  return translations[type] || type;
}

function generateReport(result: AnalysisResult): string {
  let report = `# Отчёт анализа сайта: ${result.final_url}\n\n`;
  report += `Дата анализа: ${result.analyzed_at}\n`;
  report += `Время загрузки: ${result.fetch_time} мс\n\n`;

  report += `## Классификация\n\n`;
  report += `**Тип сайта:** ${translateSiteType(result.site_type.type)} (${result.site_type.confidence}%)\n`;
  report += `**Тип бизнеса:** ${translateBusinessType(result.business_type.type)} (${result.business_type.confidence}%)\n\n`;

  report += `## Найденные функции (${result.detected_features.length})\n\n`;
  result.detected_features.forEach(f => {
    report += `- ${f.feature_name} (${f.status})\n`;
  });

  report += `\n## Рекомендации (${result.recommendations.length})\n\n`;
  result.recommendations.forEach(r => {
    report += `### ${r.feature_name} [${r.priority}]\n`;
    report += `${r.why}\n`;
    report += `Цель: ${r.marketing_goal}\n\n`;
  });

  if (result.bundle_recommendations.length > 0) {
    report += `## Пакетные рекомендации\n\n`;
    result.bundle_recommendations.forEach(b => {
      report += `### ${b.bundle_title}\n`;
      report += `Отсутствует функций: ${b.matched_count}\n`;
      report += `Функции: ${b.missing_features.join(', ')}\n\n`;
    });
  }

  return report;
}
