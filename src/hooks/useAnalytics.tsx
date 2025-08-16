import { useCallback } from 'react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

export const useAnalytics = () => {
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    const eventData: AnalyticsEvent = {
      event,
      properties: {
        timestamp: Date.now(),
        url: window.location.href,
        ...properties
      }
    };

    // Check if PostHog is available
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(event, eventData.properties);
    } else {
      // Fallback logging
      console.log(`Analytics: ${event}`, eventData.properties);
    }

    // Also send to backend for tracking
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    }).catch(() => {
      // Silently fail - analytics shouldn't break the app
    });
  }, []);

  return { track };
};