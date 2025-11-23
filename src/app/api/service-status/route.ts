import { NextResponse } from 'next/server';
import { ServiceStatusTracker, DEFAULT_SERVICE_CONFIG } from '@/utils/service-health';

/**
 * Comprehensive service status monitoring endpoint
 * Provides real-time health status of all critical services
 */
export async function GET() {
  const tracker = new ServiceStatusTracker();
  
  // Define critical service endpoints to monitor with appropriate HTTP methods
  const services = [
    {
      name: 'primary-api',
      endpoint: '/api/generate',
      method: 'HEAD',
      description: 'Primary content generation API'
    },
    {
      name: 'fallback-api',
      endpoint: '/api/fallback',
      method: 'HEAD',
      description: 'Fallback content generation API'
    },
    {
      name: 'health-api',
      endpoint: '/api/health',
      method: 'HEAD',
      description: 'Service health check endpoint'
    },
    {
      name: 'listings-api',
      endpoint: '/api/listings',
      method: 'HEAD',
      description: 'Property listings management API'
    },
    {
      name: 'auth-api',
      endpoint: '/api/auth/user',
      method: 'HEAD',
      description: 'User authentication API'
    }
  ];
  
  try {
    // Check all services concurrently
    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        const startTime = Date.now();
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${service.endpoint}`, {
            method: service.method || 'HEAD',
            signal: AbortSignal.timeout(DEFAULT_SERVICE_CONFIG.baseTimeout)
          });
          
          const responseTime = Date.now() - startTime;
          
          return {
            name: service.name,
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime,
            statusCode: response.status,
            description: service.description,
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          const responseTime = Date.now() - startTime;
          return {
            name: service.name,
            status: 'error',
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            description: service.description,
            lastChecked: new Date().toISOString()
          };
        }
      })
    );
    
    // Process results
    const results = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index].name,
          status: 'error',
          responseTime: 0,
          error: 'Health check failed',
          description: services[index].description,
          lastChecked: new Date().toISOString()
        };
      }
    });
    
    // Calculate overall system health
    const healthyServices = results.filter(r => r.status === 'healthy').length;
    const totalServices = results.length;
    const systemHealth = {
      overall: healthyServices === totalServices ? 'healthy' : 
               healthyServices > totalServices / 2 ? 'degraded' : 'unhealthy',
      healthyCount: healthyServices,
      totalCount: totalServices,
      uptime: `${((healthyServices / totalServices) * 100).toFixed(1)}%`
    };
    
    // Add performance metrics
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
    const slowServices = results.filter(r => r.responseTime > 5000).length;
    
    return NextResponse.json({
      system: systemHealth,
      services: results,
      metrics: {
        averageResponseTime: Math.round(avgResponseTime),
        slowServices,
        totalResponseTime: results.reduce((sum, r) => sum + (r.responseTime || 0), 0)
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    console.error('Service status monitoring error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check service status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}