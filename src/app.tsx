import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { RSI, MACD, SMA } from 'technicalindicators';

type Language = 'en' | 'tr';

const uiText = {
  headerTitle: {
    en: 'AI Powered Crypto Analysis Platform',
    tr: 'Yapay Zeka Destekli Kripto Analiz Platformu',
  },
  selectCoin: {
    en: 'Select Coin',
    tr: 'Coin Seç',
  },
  latestNews: {
    en: 'Latest News',
    tr: 'Son Haberler',
  },
  loadingNews: {
    en: 'Loading news...',
    tr: 'Haberler yükleniyor...',
  },
  newsError: {
    en: 'News error',
    tr: 'Haber hatası',
  },
  noNews: {
    en: 'No news found for',
    tr: 'İçin haber bulunamadı',
  },
  showMore: {
    en: 'Show More',
    tr: 'Daha Fazla Göster',
  },
  showLess: {
    en: 'Show Less',
    tr: 'Daha Az Göster',
  },
  priceChart: {
    en: 'Price Chart',
    tr: 'Fiyat Grafiği',
  },
  chartLoading: {
    en: 'Loading chart...',
    tr: 'Grafik yükleniyor...',
  },
  chartError: {
    en: 'Chart Error',
    tr: 'Grafik Hatası',
  },
  chartEmpty: {
    en: 'Chart data not found.',
    tr: 'Grafik verisi bulunamadı.',
  },
  technicalIndicators: {
    en: 'Technical Indicators',
    tr: 'Teknik İndikatörler',
  },
  indicatorColumn: {
    en: 'Indicator',
    tr: 'İndikatör',
  },
  valueColumn: {
    en: 'Value',
    tr: 'Değer',
  },
  marketData: {
    en: 'Market Data',
    tr: 'Piyasa Verileri',
  },
  metricVolume: {
    en: '24h Volume',
    tr: '24s Hacim',
  },
  metric1hChange: {
    en: '1h Change',
    tr: '1s Değişim',
  },
  metric24hChange: {
    en: '24h Change',
    tr: '24s Değişim',
  },
  metric7dChange: {
    en: '7d Change',
    tr: '7g Değişim',
  },
  metricMarketCap: {
    en: 'Market Cap',
    tr: 'Piyasa Değeri',
  },
  metricRank: {
    en: 'CMC Rank',
    tr: 'CMC Sırası',
  },
  aiAnalysisTitle: {
    en: 'AI Analysis',
    tr: 'Yapay Zeka Analizi',
  },
  liveLabel: {
    en: 'LIVE',
    tr: 'CANLI',
  },
  aiSummaryPlaceholder: {
    en: 'AI analysis loading...',
    tr: 'Yapay zeka analizi yükleniyor...',
  },
};

const translateText = async (text: string, targetLang: Language): Promise<string> => {
  if (!text || targetLang === 'en') {
    return text;
  }
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
        text
      )}`
    );
    if (!response.ok) {
      throw new Error('Translation request failed');
    }
    const data = await response.json();
    const translated = data[0]
      .map((segment: any[]) => segment[0])
      .join('');
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return text;
  }
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface NewsItem {
  title: string;
  url: string;
}

interface IndicatorItem {
  name: string;
  value: string | number;
  comment: string;
}

interface CoinData {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  currentPrice: number;
  volume24h: number;
  percentChange1h: number;
  percentChange24h: number;
  percentChange7d: number;
  marketCap: number;
  cmcRank: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor?: string;
    tension: number;
    fill: boolean;
  }[];
}

function App() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const [language, setLanguage] = useState<Language>('en');
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [selected, setSelected] = useState<string>('BTC');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<any>({});
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [initialDataError, setInitialDataError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string>(uiText.aiSummaryPlaceholder.en); // Raw AI summary text
  const [translatedAiSummary, setTranslatedAiSummary] = useState<string>(uiText.aiSummaryPlaceholder.en);
  const [news, setNews] = useState<NewsItem[]>([]); // New state for news
  const [newsLoading, setNewsLoading] = useState<boolean>(false); // New state for news loading
  const [newsError, setNewsError] = useState<string | null>(null); // New state for news error
  const [displayedAiSummary, setDisplayedAiSummary] = useState<string>(''); // Displayed text for typewriter effect
  const [visibleCharacters, setVisibleCharacters] = useState<number>(0); // Number of characters currently visible
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768); // Detect mobile screen size
  const [showAllNews, setShowAllNews] = useState<boolean>(false); // State for showing all news on mobile
  const [translatedNews, setTranslatedNews] = useState<NewsItem[]>([]);

  // Helper function to strip markdown from text
  const stripMarkdown = (text: string): string => {
    // Remove bold and italics markers (*, **, _)
    let plainText = text.replace(/(\*\*|__)(.*?)\1/g, '$2'); // Bold
    plainText = plainText.replace(/(\*|_)(.*?)\1/g, '$2');   // Italic
    return plainText;
  };

  useEffect(() => {
    let isMounted = true;
    const currentLanguage = language;
    const runTranslation = async () => {
      if (!aiSummary) {
        setTranslatedAiSummary('');
        return;
      }
      if (language === 'en') {
        setTranslatedAiSummary(aiSummary);
        return;
      }
      const translated = await translateText(aiSummary, language);
      if (isMounted && currentLanguage === language) {
        setTranslatedAiSummary(translated);
      }
    };
    runTranslation();
    return () => {
      isMounted = false;
    };
  }, [aiSummary, language]);

  useEffect(() => {
    let isMounted = true;
    const currentLanguage = language;
    const translateNewsItems = async () => {
      if (news.length === 0) {
        setTranslatedNews([]);
        return;
      }
      setTranslatedNews(news);
      if (language === 'en') {
        return;
      }
      try {
        const translatedTitles = await Promise.all(
          news.map((item) => translateText(item.title, language))
        );
        if (isMounted && currentLanguage === language) {
          const updated = news.map((item, idx) => ({
            ...item,
            title: translatedTitles[idx],
          }));
          setTranslatedNews(updated);
        }
      } catch (error) {
        console.error('News translation failed:', error);
        if (isMounted && currentLanguage === language) {
          setTranslatedNews(news);
        }
      }
    };
    translateNewsItems();
    return () => {
      isMounted = false;
    };
  }, [news, language]);

  // Typewriter effect for AI Summary
  useEffect(() => {
    if (!translatedAiSummary) {
      setDisplayedAiSummary('');
      setVisibleCharacters(0);
      return;
    }

    const plainAiSummary = stripMarkdown(translatedAiSummary);
    setVisibleCharacters(0); // Her yeni özet geldiğinde karakter sayısını sıfırla

    const typingSpeed = 30; // Milliseconds per character
    let intervalId: number;

    intervalId = setInterval(() => {
      setVisibleCharacters(prevCount => {
        if (prevCount < plainAiSummary.length) {
          return prevCount + 1;
        } else {
          clearInterval(intervalId);
          return prevCount; // Son karaktere ulaşıldıysa mevcut sayıyı koru
        }
      });
    }, typingSpeed);

    // Cleanup fonksiyonu
    return () => clearInterval(intervalId);
  }, [translatedAiSummary]); // Yalnızca çeviri değiştiğinde efekti yeniden çalıştır

  // visibleCharacters veya plainAiSummary değiştiğinde displayedAiSummary'i güncelle
  useEffect(() => {
    if (translatedAiSummary) {
      const plainAiSummary = stripMarkdown(translatedAiSummary);
      setDisplayedAiSummary(plainAiSummary.slice(0, visibleCharacters));
    }
  }, [visibleCharacters, translatedAiSummary]);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/cryptocurrency/listings/latest`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`);
        }
        const json = await response.json();
        const fetchedCoins: CoinData[] = json.map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          logo: coin.logo || 'https://cryptologos.cc/logos/placeholder-logo.png', // Backend now sends logo, use it or placeholder
          currentPrice: coin.currentPrice || 0,
          volume24h: coin.volume24h || 0,
          percentChange1h: coin.percentChange1h || 0,
          percentChange24h: coin.percentChange24h || 0,
          percentChange7d: coin.percentChange7d || 0,
          marketCap: coin.marketCap || 0,
          cmcRank: coin.cmcRank || 'N/A'
        }));
        fetchedCoins.sort((a, b) => a.cmcRank - b.cmcRank); // Sort by CMC rank
        setCoins(fetchedCoins);
        console.log('Frontend\'e ulaşan işlenmiş coin verisi:', fetchedCoins); // Geçici log
        // fetchedCoins.length > 0 ise ve 'selected' henüz ayarlanmamışsa, ilk coini seç
        if (fetchedCoins.length > 0) {
          setSelected(fetchedCoins[0].symbol);
        }
      } catch (e: any) {
        console.error("API request failed:", e);
        setInitialDataError(e.message);
      } finally {
        setLoadingInitialData(false);
      }
    };

    fetchCoins();
  }, []);

  // Removed the useEffect for fetching coin logos as per user request.

  useEffect(() => {
    console.log('useEffect triggered for selected:', selected); // Debug log
    const fetchChartAndIndicatorsData = async () => {
      setChartLoading(true); // Yükleme başlangıcında true yap
      setChartError(null); // Önceki hataları temizle
      setNewsLoading(true); // Haber yükleme başlangıcında true yap
      setNewsError(null); // Haber hatalarını temizle

      const currentCoin = coins.find((c) => c.symbol === selected);
      console.log('Current coins array:', coins); // Debug log
      console.log('Found currentCoin:', currentCoin); // Debug log
      // currentCoin bulunamazsa veya henüz yüklenmediyse, beklemeye devam et veya varsayılan değerleri ayarla.
      // Bu durum, coinler henüz yüklenmediğinde veya geçerli olmayan bir 'selected' değeri olduğunda ortaya çıkabilir.
      if (!currentCoin) {
        setChartData(null);
        setIndicators({});
        setAiSummary('Please select a coin to view data.'); // Reset AI summary
        setNews([]); // Clear news
        setNewsLoading(false); // Ensure news loading is false if no coin selected
        return;
      }
      try {
        // Twelve Data API için tarih aralığı ve çıktı boyutu
        const interval = '1day'; // Günlük veriler için
        const outputsize = 200; // Son 200 günün verisi için

        // Twelve Data'dan OHLCV verisi çek
        const ohlcvResponse = await fetch(`${BACKEND_URL}/api/cryptocurrency/ohlcv/twelvedata-historical?symbol=${selected}&interval=${interval}&outputsize=${outputsize}`);

        if (!ohlcvResponse.ok) {
          const errorData = await ohlcvResponse.json();
          throw new Error(`Twelve Data OHLCV API Error: ${ohlcvResponse.status} - ${errorData.error || errorData.message || ohlcvResponse.statusText}`);
        }
        const ohlcvJson = await ohlcvResponse.json();

        if (ohlcvJson && ohlcvJson.values && ohlcvJson.values.length > 0) {
          // Twelve Data OHLCV data format: [{ datetime, open, high, low, close, volume }, ...]
          const history: any[] = ohlcvJson.values;
          // Veriyi en eskiden en yeniye doğru sırala
          history.sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

          const labels = history.map((data: any) => new Date(data.datetime).toLocaleDateString());
          const prices = history.map((data: any) => parseFloat(data.close));

          setChartData({
            labels: labels,
            datasets: [{
              label: `${selected} Price (USD)`, // Use selected directly
              data: prices,
              borderColor: 'rgb(59, 130, 246)', // blue-500
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1,
              fill: true,
            }],
          });

          const closePrices = history.map((data: any) => parseFloat(data.close));

          // Technical indicator calculations (remain mostly the same)
          const rsiInput = {
            values: closePrices,
            period: 14,
          };
          const rsi = RSI.calculate(rsiInput);
          const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 'N/A';

          const macdInput = {
            values: closePrices,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMA: false,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
          };
          const macd = MACD.calculate(macdInput);
          const currentMacd = macd.length > 0 ? macd[macd.length - 1] : { MACD: 'N/A', signal: 'N/A', histogram: 'N/A' };

          const sma50 = SMA.calculate({ values: closePrices, period: 50 });
          const currentSma50 = sma50.length > 0 ? sma50[sma50.length - 1] : 'N/A';

          const sma200 = SMA.calculate({ values: closePrices, period: 200 });
          const currentSma200 = sma200.length > 0 ? sma200[sma200.length - 1] : 'N/A';

          const currentIndicators = {
            rsi: typeof currentRsi === 'number' ? parseFloat(currentRsi.toFixed(2)) : 'N/A',
            macd: typeof currentMacd.MACD === 'number' ? parseFloat(currentMacd.MACD.toFixed(4)) : 'N/A',
            macdSignal: typeof currentMacd.signal === 'number' ? parseFloat(currentMacd.signal.toFixed(4)) : 'N/A',
            macdHistogram: typeof currentMacd.histogram === 'number' ? parseFloat(currentMacd.histogram.toFixed(4)) : 'N/A',
            sma50: typeof currentSma50 === 'number' ? parseFloat(currentSma50.toFixed(4)) : 'N/A',
            sma200: typeof currentSma200 === 'number' ? parseFloat(currentSma200.toFixed(4)) : 'N/A',
            volume: 0, // No direct volume data from Twelve Data, will be fetched separately if needed
          };
          setIndicators(currentIndicators);

          // Fetch AI analysis
          const aiAnalysisResponse = await fetch(`${BACKEND_URL}/api/ai/analyze-crypto`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol: selected, // Use selected directly
              currentPrice: currentCoin.currentPrice || 0,
              percentChange24h: currentCoin.percentChange24h || 0,
              marketCap: currentCoin.marketCap || 0,
              rsi: currentIndicators.rsi,
              macd: currentIndicators.macd,
              sma50: currentIndicators.sma50,
              sma200: currentIndicators.sma200,
              volume: currentCoin.volume24h || 0,
              news: news, // Add news data to the payload
            }),
          });

          if (!aiAnalysisResponse.ok) {
            const errorData = await aiAnalysisResponse.json();
            throw new Error(`AI Analysis API Error: ${aiAnalysisResponse.status} - ${errorData.error || aiAnalysisResponse.statusText}`);
          }

          const aiAnalysisJson = await aiAnalysisResponse.json();
          // console.log("Raw AI Analysis JSON:", aiAnalysisJson); // Hata ayıklama için kaldırıldı
          setAiSummary(aiAnalysisJson.analysis);

          try {
              const newsResponse = await fetch(`${BACKEND_URL}/api/news/tavily?symbol=${selected}`);

              if (!newsResponse.ok) {
                const errorData = await newsResponse.json();
                console.error('Tavily News API Yanıtı OK değil:', newsResponse.status, errorData);
                throw new Error(`Tavily News API Error: ${newsResponse.status} - ${errorData.error || newsResponse.statusText}`);
              }

              const newsJson = await newsResponse.json();
              setNews(newsJson.news);
          } catch (newsFetchError: any) {
              console.error("Tavily news fetch failed:", newsFetchError);
              setNewsError(newsFetchError.message);
              setNews([]);
          }

        } else {
          setChartData(null);
          setIndicators({});
          setChartError('No OHLCV data found for this coin from Twelve Data.');
          setAiSummary('No data to analyze.');
          setNews([]);
        }
        
      } catch (e: any) {
        console.error("OHLCV/AI/News API request failed:", e);
        setChartError(e.message);
        setIndicators({});
        setAiSummary(`AI analysis error: ${e.message}`);
        setNewsError(e.message);
        setNews([]); // Hata durumunda haberleri temizle
      } finally {
        setChartLoading(false);
        setNewsLoading(false); // Haber yüklemesini de finally içinde sonlandır
      }
    };
    if (selected) {
      fetchChartAndIndicatorsData();
    }
  }, [selected, coins]); // coins'i bağımlılık dizisine ekledim

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelected = event.target.value;
    console.log('Selected coin changed to:', newSelected); // Debug log
    setSelected(newSelected);
  };

  // Yanıp sönen nokta animasyonu için Tailwind CSS uyumlu bir bileşen
  const LoadingDot = () => (
    <span className="inline-block w-2 h-2 ml-2 bg-blue-500 rounded-full animate-pulse duration-100">
    </span>
  );

  // Canlı veri göstergesi
  const LiveIndicator = ({ label }: { label: string }) => (
    <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
      <span className="w-1.5 h-1.5 mr-1 bg-red-500 rounded-full animate-pulse"></span>
      {label}
    </span>
  );

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  };

  // Dummy data for news and AI summary - will be replaced with live data later
  const dummyData: { [key: string]: any } = {
    BTC: {
      news: [
        { title: 'Bitcoin reached new highs!', url: '#' },
        { title: 'Institutional investors increase BTC holdings', url: '#' },
        { title: 'Regulatory news impacts crypto markets', url: '#' },
      ],
      indicators: [
        { name: 'RSI', value: '76', comment: 'Market is overbought, a pullback may occur.' },
        { name: 'MACD', value: '+1.25', comment: 'Bullish crossover detected.' },
        { name: '50-day MA', value: '45,200', comment: 'Price is above the 50-day average.' },
        { name: '200-day MA', value: '39,800', comment: 'Strong long-term uptrend.' },
        { name: 'Volume', value: '1.2B', comment: 'High trading volume supports the trend.' },
        { name: 'Sentiment', value: '182 positive', comment: 'Social media sentiment is positive, buy pressure likely.' },
      ],
      aiSummary: 'According to AI analysis, due to overbought RSI and strong positive sentiment, a short-term correction is possible, but the overall trend remains bullish. Consider waiting for a better entry.',
    },
    ETH: {
      news: [
        { title: 'Ethereum 2.0 launch date announced', url: '#' },
        { title: 'ETH gas fees drop to record lows', url: '#' },
        { title: 'DeFi projects boost Ethereum ecosystem', url: '#' },
      ],
      indicators: [
        { name: 'RSI', value: '54', comment: 'Neutral zone, no strong signal.' },
        { name: 'MACD', value: '-0.32', comment: 'Bearish momentum is fading.' },
        { name: '50-day MA', value: '3,150', comment: 'Price is near the 50-day average.' },
        { name: '200-day MA', value: '2,900', comment: 'Long-term trend is positive.' },
        { name: 'Volume', value: '800M', comment: 'Volume is average.' },
        { name: 'Sentiment', value: '120 positive', comment: 'Sentiment is slightly positive.' },
      ],
      aiSummary: 'AI suggests holding ETH for now as indicators are mixed and no strong trend is present.',
    },
    SOL: {
      news: [
        { title: 'Solana mainnet stability improves', url: '#' },
        { title: 'SOL price rebounds after dip', url: '#' },
        { title: 'NFTs thrive on Solana', url: '#' },
      ],
      indicators: [
        { name: 'RSI', value: '33', comment: 'Approaching oversold territory.' },
        { name: 'MACD', value: '-0.85', comment: 'Bearish momentum increasing.' },
        { name: '50-day MA', value: '110', comment: 'Price is below the 50-day average.' },
        { name: '200-day MA', value: '95', comment: 'Long-term support may be tested.' },
        { name: 'Volume', value: '500M', comment: 'Volume is slightly below average.' },
        { name: 'Sentiment', value: '60 positive', comment: 'Sentiment is neutral.' },
      ],
      aiSummary: 'AI recommends caution as SOL is nearing oversold levels but bearish momentum persists.',
    },
    AVAX: {
      news: [
        { title: 'Avalanche partners with major DeFi platform', url: '#' },
        { title: 'AVAX price surges after network upgrade', url: '#' },
        { title: 'Avalanche ecosystem expands rapidly', url: '#' },
      ],
      indicators: [
        { name: 'RSI', value: '48', comment: 'Neutral, no clear trend.' },
        { name: 'MACD', value: '+0.10', comment: 'Weak bullish signal.' },
        { name: '50-day MA', value: '35', comment: 'Price is at the 50-day average.' },
        { name: '200-day MA', value: '28', comment: 'Long-term trend is positive.' },
        { name: 'Volume', value: '210M', comment: 'Volume is low.' },
        { name: 'Sentiment', value: '30 positive', comment: 'Sentiment is neutral.' },
      ],
      aiSummary: 'AI analysis shows no strong buy or sell signal for AVAX at this time.',
    },
    XRP: {
      news: [
        { title: 'XRP lawsuit update', url: '#' },
        { title: 'Ripple expands global partnerships', url: '#' },
        { title: 'XRP trading volume increases', url: '#' },
      ],
      indicators: [
        { name: 'RSI', value: '41', comment: 'Slightly oversold.' },
        { name: 'MACD', value: '-0.12', comment: 'Bearish but stabilizing.' },
        { name: '50-day MA', value: '0.65', comment: 'Price is below the 50-day average.' },
        { name: '200-day MA', value: '0.58', comment: 'Long-term support is holding.' },
        { name: 'Volume', value: '320M', comment: 'Volume is average.' },
        { name: 'Sentiment', value: '40 positive', comment: 'Sentiment is slightly negative.' },
      ],
      aiSummary: 'AI suggests monitoring XRP for a reversal as oversold conditions may lead to a bounce.',
    },
    ADA: {
      news: [
        { title: 'Cardano launches new smart contracts', url: '#' },
        { title: 'ADA staking rewards increase', url: '#' },
        { title: 'Cardano community grows', url: '#' },
      ],
      indicators: [
        { name: 'RSI', value: '59', comment: 'Approaching overbought.' },
        { name: 'MACD', value: '+0.22', comment: 'Bullish momentum building.' },
        { name: '50-day MA', value: '1.25', comment: 'Price is above the 50-day average.' },
        { name: '200-day MA', value: '1.10', comment: 'Long-term trend is positive.' },
        { name: 'Volume', value: '150M', comment: 'Volume is low.' },
        { name: 'Sentiment', value: '25 positive', comment: 'Sentiment is positive.' },
      ],
      aiSummary: 'AI analysis: ADA is gaining bullish momentum, but overbought risk is rising.',
    },
    FET: {
      news: [
        { title: 'Fetch.ai partners with Bosch for Web3', url: '#' },
        { title: 'FET price surges on AI hype', url: '#' },
        { title: 'FET launches new DeFi tools', url: '#' },
      ],
      indicators: [
        { name: 'RSI', value: '64', comment: 'Slightly overbought.' },
        { name: 'MACD', value: '+0.45', comment: 'Bullish crossover.' },
        { name: '50-day MA', value: '2.10', comment: 'Price is above the 50-day average.' },
        { name: '200-day MA', value: '1.80', comment: 'Long-term trend is positive.' },
        { name: 'Volume', value: '90M', comment: 'Volume is increasing.' },
        { name: 'Sentiment', value: '80 positive', comment: 'Sentiment is positive.' },
      ],
      aiSummary: 'AI analysis: FET is in a bullish phase, but monitor for overbought signals.',
    },
  };

  const dummyNews: NewsItem[] = dummyData[selected]?.news || [];
  // const dummyAiSummary: string = dummyData[selected]?.aiSummary || 'No data found.'; // Remove or comment out this line

  if (loadingInitialData) {
    // return <div className="min-h-screen flex items-center justify-center text-xl">Loading coins...</div>; // Kaldırıldı
  }

  if (initialDataError) {
    // return <div className="min-h-screen flex items-center justify-center text-xl text-red-600">Error: {initialDataError}</div>; // Kaldırıldı
  }

  if (chartLoading) {
    // return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>; // Kaldırıldı
  }

  if (chartError) {
    // return <div className="min-h-screen flex items-center justify-center text-xl text-red-600">Error: {chartError}</div>; // Kaldırıldı
  }

  const currentCoin = coins.find((c) => c.symbol === selected);
  const newsToRender =
    language === 'en' ? news : (translatedNews.length ? translatedNews : news);

  return (
    <div className="min-h-screen bg-zinc-950 w-full flex flex-col">
      {/* Header */}
      <header className="relative flex flex-col items-center bg-zinc-900 text-white p-4 shadow-lg border-b border-zinc-800 md:flex-row md:justify-center">
        <span className="text-3xl font-bold tracking-wide text-gray-100 text-center">
          {uiText.headerTitle[language]}
        </span>
        <div className="flex items-center gap-2 mt-3 md:hidden">
          {(['en', 'tr'] as Language[]).map((langOption) => (
            <button
              key={langOption}
              onClick={() => setLanguage(langOption)}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors border ${
                language === langOption
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
              }`}
              aria-pressed={language === langOption}
            >
              {langOption.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-2 absolute right-4 top-1/2 -translate-y-1/2">
          {(['en', 'tr'] as Language[]).map((langOption) => (
            <button
              key={langOption}
              onClick={() => setLanguage(langOption)}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors border ${
                language === langOption
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
              }`}
              aria-pressed={language === langOption}
            >
              {langOption.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col md:flex-row w-full">
        {/* Left: News & Selector */}
        <aside className="hidden md:block md:w-1/5 bg-zinc-900 p-6 border-r border-zinc-800 shadow-lg">
          <div className="mb-6 hidden md:block">
            <label htmlFor="coin-select" className="text-lg font-semibold mb-4 text-gray-200">
              {uiText.selectCoin[language]}
            </label>
            <select
              id="coin-select"
              value={selected}
              onChange={handleSelectChange}
              className="w-full p-2 border border-zinc-700 rounded bg-zinc-800 text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/50 transition-all"
            >
              {coins.map((coin) => (
                <option key={coin.id} value={coin.symbol}>{coin.name} ({coin.symbol})</option>
              ))}
            </select>
          </div>
          <div className="mb-4 hidden md:block">
            {currentCoin && (
              <span className="text-lg font-bold flex items-center text-gray-200">
                {currentCoin.name} ({currentCoin.symbol})
              </span>
            )}
            {currentCoin?.currentPrice && <span className={`ml-2 text-xl font-bold ${currentCoin.currentPrice > 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${currentCoin.currentPrice.toFixed(2)}
              <LoadingDot/>{/* Artık sadece yüklenirken değil, sürekli görünür. */}
            </span>}
          </div>
          <h2 className="text-lg font-semibold mb-4 hidden md:block text-gray-200">
            {uiText.latestNews[language]}
          </h2>
          <ul className="space-y-3 hidden md:block">
            {newsLoading ? (
              <li>
                <div className="text-gray-400">
                  {uiText.loadingNews[language]} <LoadingDot />
                </div>
              </li>
            ) : newsError ? (
              <li>
                <div className="text-red-500">
                  {uiText.newsError[language]}: {newsError}
                </div>
              </li>
            ) : newsToRender.length > 0 ? (
              <>
                {newsToRender.map((item: NewsItem, idx: number) => (
                  <li key={idx} className="bg-zinc-800 p-3 rounded border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-200">
                    <a href={item.url} className="text-blue-400 hover:text-blue-300 block transition-colors" target="_blank" rel="noopener noreferrer">
                      {truncateText(item.title, 60)}
                    </a>
                  </li>
                ))}
              </>
            ) : (
              <li>
                <div className="text-gray-400">
                  {language === 'en'
                    ? `${uiText.noNews.en} ${selected}.`
                    : `${selected} ${uiText.noNews.tr}.`}
                </div>
              </li>
            )}
          </ul>
        </aside>

        {/* Center: Chart and Indicators Table */}
        <main className="flex-1 flex flex-col justify-start p-6">
          {/* Mobile Select Card */}
          <div className="md:hidden mb-6">
            <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 p-4">
              <label htmlFor="coin-select-mobile" className="text-lg font-semibold mb-3 text-gray-200 block">
                {uiText.selectCoin[language]}
              </label>
              <select
                id="coin-select-mobile"
                value={selected}
                onChange={handleSelectChange}
                className="w-full p-2 border border-zinc-700 rounded bg-zinc-800 text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/50 transition-all"
              >
                {coins.map((coin) => (
                  <option key={coin.id} value={coin.symbol}>{coin.name} ({coin.symbol})</option>
                ))}
              </select>
              {currentCoin && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 uppercase tracking-wide">Selected Coin</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-semibold text-gray-100">
                      {currentCoin.name} ({currentCoin.symbol})
                    </span>
                    {currentCoin?.currentPrice && (
                      <span className={`text-xl font-bold ${currentCoin.currentPrice > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${currentCoin.currentPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Sol Kısım: Chart, Indicators ve Market Data */} 
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Price Chart */}
              <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 p-6 flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-4 text-gray-200">
                  {language === 'en'
                    ? `${selected}/USDT ${uiText.priceChart.en}`
                    : `${selected}/USDT ${uiText.priceChart.tr}`}
                </h2>
                {chartLoading ? (
                  <div className="w-full h-64 flex items-center justify-center text-gray-400">
                    {uiText.chartLoading[language]}
                  </div>
                ) : chartError ? (
                  <div className="w-full h-64 flex items-center justify-center text-red-500">
                    {uiText.chartError[language]}: {chartError}
                  </div>
                ) : chartData ? (
                  <div className="w-full h-64">
                    <Line data={chartData} options={{ maintainAspectRatio: false }} />
                  </div>
                ) : (
                  <div className="w-full h-64 bg-zinc-800 rounded flex items-center justify-center text-gray-400">
                    {uiText.chartEmpty[language]}
                  </div>
                )}
              </div>

              {/* Indicators Table */}
              <div className="w-full bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between p-6">
                  <h2 className="text-xl font-semibold text-gray-200">
                    {uiText.technicalIndicators[language]}
                  </h2>
                  <LiveIndicator label={uiText.liveLabel[language]} />
                </div>
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-zinc-800">
                      <th className="py-3 px-4 text-left font-semibold text-gray-300">
                        {uiText.indicatorColumn[language]}
                      </th>
                      <th className="py-3 px-4 text-right font-semibold text-gray-300">
                        {uiText.valueColumn[language]}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* RSI */} 
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">RSI (14)</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          {typeof indicators.rsi === 'number' ? indicators.rsi.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    {/* MACD */} 
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">MACD</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          {typeof indicators.macd === 'number' ? indicators.macd.toFixed(4) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">MACD Signal</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          {typeof indicators.macdSignal === 'number' ? indicators.macdSignal.toFixed(4) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">MACD Histogram</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          {typeof indicators.macdHistogram === 'number' ? indicators.macdHistogram.toFixed(4) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    {/* 50-day MA */} 
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">50-Day MA</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          {typeof indicators.sma50 === 'number' ? indicators.sma50.toFixed(4) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    {/* 200-day MA */} 
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">200-Day MA</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          {typeof indicators.sma200 === 'number' ? indicators.sma200.toFixed(4) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Market Data Table */}
              <div className="w-full bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between p-6">
                  <h2 className="text-xl font-semibold text-gray-200">
                    {uiText.marketData[language]}
                  </h2>
                  <LiveIndicator label={uiText.liveLabel[language]} />
                </div>
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-zinc-800">
                      <th className="py-3 px-4 text-left font-semibold text-gray-300">Metric</th>
                      <th className="py-3 px-4 text-right font-semibold text-gray-300">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">{uiText.metricVolume[language]}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          ${currentCoin?.volume24h?.toLocaleString() || '0'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">{uiText.metric1hChange[language]}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center font-semibold ${currentCoin && (currentCoin.percentChange1h || 0) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {currentCoin?.percentChange1h?.toFixed(2) || 'N/A'}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">{uiText.metric24hChange[language]}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center font-semibold ${currentCoin && (currentCoin.percentChange24h || 0) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {currentCoin?.percentChange24h?.toFixed(2) || 'N/A'}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">{uiText.metric7dChange[language]}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center font-semibold ${currentCoin && (currentCoin.percentChange7d || 0) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {currentCoin?.percentChange7d?.toFixed(2) || 'N/A'}%
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">{uiText.metricMarketCap[language]}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          ${currentCoin?.marketCap?.toLocaleString() || '0'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-300">{uiText.metricRank[language]}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-blue-400 font-semibold">
                          {currentCoin?.cmcRank || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Latest News - Mobile Only */}
              <div className="w-full bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 p-6 md:hidden">
                <h2 className="text-xl font-semibold mb-4 text-gray-200">
                  {uiText.latestNews[language]}
                </h2>
                <ul className="space-y-3">
                  {newsLoading ? (
                    <li>
                      <div className="text-gray-400">
                        {uiText.loadingNews[language]} <LoadingDot />
                      </div>
                    </li>
                  ) : newsError ? (
                    <li>
                      <div className="text-red-500">
                        {uiText.newsError[language]}: {newsError}
                      </div>
                    </li>
                  ) : newsToRender.length > 0 ? (
                    <>
                      {(isMobile && !showAllNews ? newsToRender.slice(0, 1) : newsToRender).map((item: NewsItem, idx: number) => (
                        <li key={idx} className="bg-zinc-800 p-3 rounded border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-200">
                          <a href={item.url} className="text-blue-400 hover:text-blue-300 block transition-colors" target="_blank" rel="noopener noreferrer">
                            {truncateText(item.title, 60)}
                          </a>
                        </li>
                      ))}
                      {isMobile && newsToRender.length > 1 && (
                        <li className="mt-2">
                          <button
                            onClick={() => setShowAllNews(!showAllNews)}
                            className="w-full px-4 py-2 bg-zinc-800 text-gray-200 rounded-lg hover:bg-zinc-700 transition-colors duration-200 border border-zinc-700"
                          >
                            {showAllNews ? uiText.showLess[language] : uiText.showMore[language]}
                          </button>
                        </li>
                      )}
                    </>
                  ) : (
                    <li>
                      <div className="text-gray-400">
                        {language === 'en'
                          ? `${uiText.noNews.en} ${selected}.`
                          : `${selected} ${uiText.noNews.tr}.`}
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Sağ Kısım: AI Analysis Summary (uzun ve robot videosu ile) */}
            <div className="lg:col-span-1 bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 p-6 flex flex-col justify-start items-center">
              <h2 className="text-xl font-semibold mb-4 text-center text-gray-200">
                {uiText.aiAnalysisTitle[language]}
              </h2>
              {/* Robot GIF/Animation */}
              <div className="bg-zinc-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-zinc-700">
                <img src="/Anima-Bot.gif" alt="AI Robot Animation" className="w-full h-full object-contain" />
              </div>
              <div className="rounded-lg shadow-lg p-6 text-lg font-semibold text-white w-full text-center bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 leading-relaxed">
                {displayedAiSummary} {/* displayedAiSummary kullanılıyor */}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;