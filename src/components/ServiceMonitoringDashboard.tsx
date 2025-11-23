'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, TrendingUp, Activity, Server } from 'lucide-react';
import { ServiceStatusTracker, checkServiceHealth } from '@/utils/service-health';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  responseTime?: number;
  lastChecked?: Date;
  uptime?: number;
}

interface ErrorMetrics {
  timestamp: string;
  errorType: string;
  count: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function ServiceMonitoringDashboard() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const serviceEndpoints = [
    { name: 'Main API', endpoint: '/api/health', critical: true },
    { name: 'Web Scraping', endpoint: '/api/generate', critical: false },
    { name: 'AI Service', endpoint: '/api/generate', critical: true },
    { name: 'Database', endpoint: '/api/health', critical: true }
  ];

  const checkAllServices = async () => {
    setIsLoading(true);
    const tracker = new ServiceStatusTracker();
    
    const serviceChecks = await Promise.all(
      serviceEndpoints.map(async (service) => {
        const startTime = Date.now();
        const isHealthy = await checkServiceHealth(service.endpoint, 5000);
        const responseTime = Date.now() - startTime;
        
        return {
          name: service.name,
          status: isHealthy ? 'healthy' : 'unhealthy' as 'healthy' | 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          uptime: Math.random() * 100 // Mock uptime data
        };
      })
    );

    setServices(serviceChecks);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const generateErrorMetrics = () => {
    const mockMetrics: ErrorMetrics[] = [
      { timestamp: new Date().toISOString(), errorType: 'Web Scraping Unavailable', count: 12, severity: 'MEDIUM' },
      { timestamp: new Date().toISOString(), errorType: 'AI Service Timeout', count: 3, severity: 'HIGH' },
      { timestamp: new Date().toISOString(), errorType: 'Network Issues', count: 8, severity: 'LOW' },
      { timestamp: new Date().toISOString(), errorType: 'Rate Limiting', count: 5, severity: 'MEDIUM' }
    ];
    setErrorMetrics(mockMetrics);
  };

  useEffect(() => {
    checkAllServices();
    generateErrorMetrics();
    
    const interval = setInterval(() => {
      checkAllServices();
      generateErrorMetrics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
  const avgResponseTime = services.reduce((acc, s) => acc + (s.responseTime || 0), 0) / services.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground">
              {healthyServices} healthy, {unhealthyServices} unhealthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.length > 0 ? Math.round((healthyServices / services.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall system health</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Average across all services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastUpdated ? `${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago` : '...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>Real-time status of all services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-gray-500">
                        {service.responseTime && `${service.responseTime}ms`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {service.uptime && `${service.uptime.toFixed(1)}% uptime`}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Checking services...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Metrics</CardTitle>
            <CardDescription>Recent error patterns and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errorMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{metric.errorType}</p>
                    <p className="text-xs text-gray-500">{metric.count} occurrences</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(metric.severity)}`}>
                    {metric.severity}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={checkAllServices}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Refresh All'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}