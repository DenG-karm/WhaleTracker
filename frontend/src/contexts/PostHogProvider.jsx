import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import posthog from 'posthog-js';

const POSTHOG_KEY  = process.env.REACT_APP_POSTHOG_KEY;
const POSTHOG_HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://app.posthog.com';

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host:           POSTHOG_HOST,
    capture_pageview:   false,   // manuel olarak yakalıyoruz
    autocapture:        false,
    persistence:        'localStorage',
  });
}

export default function PostHogProvider({ children }) {
  const location = useLocation();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.capture('$pageview', { path: location.pathname });
  }, [location.pathname]);

  return children;
}
