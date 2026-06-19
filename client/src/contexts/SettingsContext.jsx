import { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  theme: 'system',
  default_severity: 'Minor',
  default_page_size: 20,
  timezone: 'UTC',
  auto_generate_report: true,
};

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSettings: () => Promise.resolve({ success: false, data: null, error: null }),
});

function applyTheme(theme) {
  const el = document.documentElement;
  if (theme === 'light') {
    el.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    el.setAttribute('data-theme', 'dark');
  } else {
    // system: resolve via media query, then apply explicitly so CSS only needs [data-theme] rules
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setSettings(json.data);
          applyTheme(json.data.theme);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function updateSettings(updates) {
    const res  = await fetch('/api/settings', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.success) {
      setSettings(json.data);
      applyTheme(json.data.theme);
    }
    return json;
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
