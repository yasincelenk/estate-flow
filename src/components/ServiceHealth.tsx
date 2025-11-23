'use client';

import { useState, useEffect, useCallback } from 'react';
import { checkServiceHealth } from '@/utils/service-health';

interface ServiceHealthIndicatorProps {
  showDetailed?: boolean;
  className?: string;
  hideWhenHealthy?: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  responseTime?: number;
  lastChecked?: Date;
}

const SERVICE_ENDPOINTS = {
  scraping: '/api/health/scraping',
  ai: '/api/health/ai',
  main: '/api/health'
};

// Environment-based service detection (unused but kept for reference)
// const checkEnvironmentServices = () => {
//   const services = [
//     { name: 'Main API', status: 'checking' as const }
//   ];
//   
//   // Add AI service if OpenAI is configured
//   if (typeof process !== 'undefined' && process.env.OPENAI_API_KEY) {
//     services.push({ name: 'AI Service', status: 'checking' as const });
//   }
//   
//   // Add scraping service (always available due to fallback)
//   services.push({ name: 'Web Scraping', status: 'checking' as const });
//   
//   return services;
// };

export function ServiceHealthIndicator({ showDetailed = false, className = '', hideWhenHealthy = false }: ServiceHealthIndicatorProps) {
  const [services, setServices] = useState<ServiceStatus[]>(() => {
    // Initialize services based on environment configuration
    const initialServices = [
      { name: 'Main API', status: 'checking' as const }
    ];
    
    // Check if we're in browser environment and OpenAI is configured
    if (typeof window !== 'undefined') {
      // In browser, we'll determine this from health checks
      initialServices.push({ name: 'AI Service', status: 'checking' as const });
    }
    
    // Always include web scraping (has fallback)
    initialServices.push({ name: 'Web Scraping', status: 'checking' as const });
    
    return initialServices;
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const checkServices = useCallback(async () => {
    const updatedServices = await Promise.all(
      Object.entries(SERVICE_ENDPOINTS).map(async ([key, endpoint]) => {
        const startTime = Date.now();
        let isHealthy = false;
        let responseTime = 0;
        
        try {
          isHealthy = await checkServiceHealth(endpoint, 3000);
          responseTime = Date.now() - startTime;
        } catch (error) {
          console.warn(`Health check failed for ${endpoint}:`, error);
          // For missing endpoints, we'll handle them gracefully
          if (key === 'ai') {
            // AI service - check if OpenAI is configured
            isHealthy = !!process.env.OPENAI_API_KEY;
          } else if (key === 'scraping') {
            // Scraping service - always healthy due to fallback
            isHealthy = true;
          } else if (key === 'main') {
            // Main API - check the main health endpoint
            isHealthy = await checkServiceHealth('/api/health', 3000);
          }
          responseTime = Date.now() - startTime;
        }
        
        const serviceNames = {
          scraping: 'Web Scraping',
          ai: 'AI Service',
          main: 'Main API'
        };

        return {
          name: serviceNames[key as keyof typeof serviceNames],
          status: isHealthy ? 'healthy' : 'unhealthy' as 'healthy' | 'unhealthy',
          responseTime,
          lastChecked: new Date()
        };
      })
    );

    setServices(updatedServices);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const performCheck = async () => {
      if (isMounted) {
        await checkServices();
      }
    };
    
    performCheck();
    const interval = setInterval(performCheck, 30000); // Check every 30 seconds
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkServices]);

  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
  const isAllHealthy = unhealthyCount === 0;
  const checkingCount = services.filter(s => s.status === 'checking').length;

  const getStatusMessage = () => {
    if (checkingCount > 0) {
      return 'Checking services...';
    }
    if (isAllHealthy) {
      return 'All systems operational';
    }
    return `${unhealthyCount} service${unhealthyCount > 1 ? 's' : ''} unavailable`;
  };

  const getOverallStatusColor = () => {
    if (checkingCount > 0) return 'bg-yellow-500 animate-pulse';
    return isAllHealthy ? 'bg-green-500' : 'bg-red-500';
  };

  // Hide the indicator if all services are healthy and hideWhenHealthy is true
  if (hideWhenHealthy && isAllHealthy && checkingCount === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'unhealthy': return '❌';
      default: return '⏳';
    }
  };

  if (!showDetailed) {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getOverallStatusColor()}`} />
        <span className="text-gray-600">
          {getStatusMessage()}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Service Health</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div className="space-y-2">
        {services.map((service, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm">{getStatusIcon(service.status)}</span>
              <span className="text-sm text-gray-700">{service.name}</span>
            </div>
            {isExpanded && service.responseTime && (
              <div className="text-xs text-gray-500">
                {service.responseTime}ms
              </div>
            )}
          </div>
        ))}
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={checkServices}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            🔄 Refresh Check
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for monitoring service health
 */
export function useServiceHealth() {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      setIsHealthy(response.ok);
      setLastChecked(new Date());
    } catch (error) {
      console.warn('Health check failed:', error);
      setIsHealthy(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const performHealthCheck = async () => {
      if (isMounted) {
        await checkHealth();
      }
    };
    
    performHealthCheck();
    const interval = setInterval(performHealthCheck, 60000); // Check every minute
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkHealth]);

  return { isHealthy, lastChecked, checkHealth };
}

/**
 * Service health dashboard component
 */
export function ServiceHealthDashboard() {
  const { isHealthy, lastChecked, checkHealth } = useServiceHealth();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Service Health Dashboard</h2>
        <button
          onClick={checkHealth}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Main Service</p>
              <p className="text-xs text-gray-500">{isHealthy ? 'Operational' : 'Issues detected'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">Last Check</p>
          <p className="text-xs text-gray-500">
            {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">Status</p>
          <p className="text-xs text-gray-500">
            Auto-checking every minute
          </p>
        </div>
      </div>
    </div>
  );
}