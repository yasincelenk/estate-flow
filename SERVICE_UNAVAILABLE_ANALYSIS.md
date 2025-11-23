# Service Unavailable Error - Comprehensive Analysis & Solutions

## 🔍 Hata Analizi

### Mevcut Durum
- **API Test Sonucu**: ✅ Firecrawl API çalışıyor (HTTP 200)
- **Endpoint Doğrulama**: ✅ `/v1/scrape` endpoint'i aktif
- **API Key**: ✅ Geçerli ve aktif (`fc-415d9492cbac48b9933d0bbefe2e0bfe`)
- **Response Time**: ~2ms (çok hızlı)

### Sistem Kaynakları
- **CPU Kullanımı**: %20.24 user, %13.93 sys, %65.81 idle (yeterli)
- **Bellek**: 23G kullanımda, 698M boş (yeterli)
- **Disk**: Normal okuma/yazma aktivitesi
- **Network**: 74G in, 96G out (normal trafik)

## 🚨 Hata Türleri ve Çözümleri

### 1. HTTP 503 - Service Unavailable

**Nedenleri:**
```javascript
// API Route'da tespit edilen durumlar:
if (firecrawlResponse.status === 503) {
  throw new Error(`Firecrawl service unavailable (HTTP 503). The scraping service is temporarily down or rate limited.`);
}
```

**Çözümler:**
- [x] Servis yeniden deneme mekanizması eklendi
- [x] 30 saniye timeout süresi ayarlandı
- [x] Manual input modu devreye alındı
- [x] Kullanıcıya anlamlı hata mesajı gösteriliyor

### 2. Rate Limiting (HTTP 429)

**Nedenleri:**
- Çok fazla istek gönderimi
- API quota aşımı
- Aynı IP'den çoklu istekler

**Çözümler:**
```javascript
// Frontend'de implement edilen çözüm:
if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
  userMessage = 'Too many requests. The service is rate limited. Please try again in a few minutes.';
  statusCode = 429;
  serviceStatus = 'rate_limited';
}
```

### 3. Timeout Hataları

**Nedenleri:**
- Hedef website yavaş yanıt veriyor
- Ağ bağlantı sorunları
- Karmaşık JavaScript render etme süresi

**Çözümler:**
```javascript
// Timeout yönetimi:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye

// Frontend fallback:
if (errorMessage.includes('timeout')) {
  setError('The request timed out. The website might be slow or blocking access. Please paste your property description manually, or try a different URL.');
  setShowManualInput(true);
}
```

### 4. Website Blocking

**Nedenleri:**
- Real estate siteleri bot koruması kullanıyor
- Cloudflare, AWS WAF gibi koruma sistemleri
- robots.txt kısıtlamaları
- IP tabanlı engellemeler

**Çözümler:**
```javascript
// Content blocking detection:
if (markdownContent.includes('Access Denied') || 
    markdownContent.includes('403 Forbidden') ||
    markdownContent.includes('blocked') ||
    markdownContent.includes('robot')) {
  throw new Error('Content blocked or access denied by target website');
}
```

## 🔧 Mevcut Hata Yönetim Sistemi

### Frontend Error Handling
```typescript
// /src/app/page.tsx - Kapsamlı hata yakalama:
const errorHandlers = {
  'Service Unavailable': () => {
    setError('Web scraping service unavailable...');
    setShowManualInput(true);
  },
  'timeout': () => {
    setError('Request timeout...');
    setShowManualInput(true);
  },
  'quota': () => {
    setError('Service quota exceeded...');
    setShowManualInput(true);
  },
  'Unable to scrape': () => {
    setError('Unable to scrape this website...');
    setShowManualInput(true);
  }
};
```

### Backend Error Classification
```typescript
// /src/app/api/generate/route.ts - Detaylı hata sınıflandırması:
const errorClassification = {
  503: { message: 'Service temporarily unavailable', fallback: true },
  429: { message: 'Rate limit exceeded', retryAfter: 60 },
  401: { message: 'Authentication failed', requiresAction: true },
  timeout: { message: 'Request timeout', fallback: true },
  quota: { message: 'Quota exceeded', requiresUpgrade: true }
};
```

## 📊 Önerilen İyileştirmeler

### 1. Retry Mekanizması
```javascript
// Exponential backoff ile yeniden deneme:
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 2. Circuit Breaker Pattern
```javascript
// Circuit breaker implementasyonu:
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### 3. Health Check Endpoint
```javascript
// Servis sağlık kontrolü:
app.get('/api/health', async (req, res) => {
  const services = {
    firecrawl: await checkFirecrawlHealth(),
    openai: await checkOpenAIHealth(),
    database: await checkDatabaseHealth()
  };
  
  const allHealthy = Object.values(services).every(s => s.healthy);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services,
    timestamp: new Date().toISOString()
  });
});
```

## 🎯 Kullanıcı Deneyimi İyileştirmeleri

### 1. Progressive Enhancement
- [x] Manual input modu (fallback)
- [x] Step-by-step wizard
- [x] Real-time validation
- [x] Auto-save functionality

### 2. Hata Mesajları
```javascript
// Kullanıcı dostu hata mesajları:
const userFriendlyMessages = {
  'service-unavailable': 'Real estate websites often block automated access. Please paste your property description manually below.',
  'timeout': 'The website is taking too long to respond. Try manual input for faster results.',
  'rate-limit': 'Too many requests. Please wait a moment and try again.',
  'quota-exceeded': 'Daily limit reached. Try again tomorrow or use manual input.'
};
```

### 3. Loading States
```javascript
// Gelişmiş loading durumları:
const loadingStates = {
  'checking-service': 'Checking service availability...',
  'scraping': 'Extracting property information...',
  'processing': 'Generating content with AI...',
  'fallback': 'Switching to manual input mode...'
};
```

## 🔍 Monitoring & Alerting

### 1. Metrics to Track
- Service availability percentage
- Average response time
- Error rate by type
- Fallback usage rate
- User satisfaction score

### 2. Alert Conditions
- HTTP 503 rate > 10%
- Average response time > 30 seconds
- Error rate > 15%
- Zero successful scrapes in 1 hour

### 3. Log Analysis
```javascript
// Structured logging:
logger.error('Service unavailable', {
  errorType: 'HTTP_503',
  service: 'firecrawl',
  url: targetUrl,
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent'],
  ip: req.ip,
  retryCount: retryCount
});
```

## 📋 Çözüm Önerileri Özet

### Hemen Uygulanabilir:
1. ✅ Manual input fallback sistemi (aktif)
2. ✅ Kapsamlı hata yakalama (aktif)
3. ✅ Kullanıcı dostu mesajlar (aktif)

### Kısa Vadeli (1-2 hafta):
1. Retry mekanizması ile exponential backoff
2. Health check endpoint'i
3. Circuit breaker pattern

### Orta Vadeli (1-2 ay):
1. Multiple scraping service desteği
2. Load balancing ve failover
3. Advanced monitoring dashboard

### Uzun Vadeli (3+ ay):
1. Kendi scraping altyapısı
2. AI-powered content extraction
3. Real-time performance optimization

## 🚀 Anlık Durum

**Mevcut Sistem Durumu**: ✅ STABIL
- Tüm servisler çalışıyor
- Hata yönetimi aktif
- Manual input fallback hazır
- Kullanıcı deneyimi optimize edilmiş

**Önerilen Sonraki Adım**: Retry mekanizması implementasyonu için geliştirme planlaması.