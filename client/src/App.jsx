import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { SettingsProvider } from './contexts/SettingsContext';
import DashboardPage from './pages/DashboardPage';
import TestCasesPage from './pages/TestCasesPage';
import TestSuitesPage from './pages/TestSuitesPage';
import SuiteDetailPage from './pages/SuiteDetailPage';
import BugsPage from './pages/BugsPage';
import BugDetailPage from './pages/BugDetailPage';
import TestRunsPage from './pages/TestRunsPage';
import TestRunDetailPage from './pages/TestRunDetailPage';
import FlakyTestsPage from './pages/FlakyTestsPage';
import ImportTestCasesPage from './pages/ImportTestCasesPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import SettingsPage from './pages/SettingsPage';
import QuickSearch from './components/QuickSearch';
import ShortcutsHelp from './components/ShortcutsHelp';
import './App.css';

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',  end: true  },
  { to: '/test-cases',  label: 'Test Cases'             },
  { to: '/test-suites', label: 'Test Suites'            },
  { to: '/test-runs',   label: 'Test Runs'              },
  { to: '/flaky-tests', label: 'Flaky Tests'            },
  { to: '/bugs',        label: 'Bugs'                   },
  { to: '/reports',     label: 'Reports'                },
  { to: '/settings',    label: 'Settings',  right: true },
];

function isTyping(e) {
  const tag = e.target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
}

// AppShell is rendered inside BrowserRouter so it can use useNavigate
function AppShell() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen,   setHelpOpen]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);

  // Refs keep the handler closure fresh without re-registering on every render
  const searchOpenRef = useRef(searchOpen);
  const helpOpenRef   = useRef(helpOpen);
  searchOpenRef.current = searchOpen;
  helpOpenRef.current   = helpOpen;

  const gPendingRef = useRef(false);
  const gTimerRef   = useRef(null);

  useEffect(() => {
    function onKeyDown(e) {
      // Escape: always works, even inside inputs
      if (e.key === 'Escape') {
        if (searchOpenRef.current)    { setSearchOpen(false); return; }
        if (helpOpenRef.current)      { setHelpOpen(false);   return; }
        return;
      }

      // Cmd/Ctrl+K: open quick search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setHelpOpen(false);
        setSearchOpen(true);
        return;
      }

      // All remaining shortcuts are single-key — skip when the user is typing
      if (isTyping(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // G-sequence navigation (G then a second key within 1.5 s)
      if (gPendingRef.current) {
        clearTimeout(gTimerRef.current);
        gPendingRef.current = false;
        switch (e.key.toLowerCase()) {
          case 'd': navigate('/');            return;
          case 't': navigate('/test-cases');  return;
          case 's': navigate('/test-suites'); return;
          case 'b': navigate('/bugs');        return;
          case 'r': navigate('/test-runs');   return;
          case 'p': navigate('/settings');    return;
        }
        return; // unrecognised G-sequence: ignore silently
      }

      if (e.key.toLowerCase() === 'g') {
        gPendingRef.current = true;
        clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => { gPendingRef.current = false; }, 1500);
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setSearchOpen(false);
        setHelpOpen(true);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navigate]); // navigate is stable; refs handle modal state without re-registering

  // Close mobile menu when route changes
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <>
      <nav className="nav" aria-label="Main navigation">
        <span className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#0f172a"/>
            <rect x="6" y="8.5" width="3.5" height="3.5" rx="1" fill="#334155"/>
            <rect x="12" y="9.5" width="14" height="1.5" rx="0.75" fill="#334155"/>
            <rect x="6" y="14.25" width="3.5" height="3.5" rx="1" fill="#3b82f6"/>
            <path d="M7 16l1.1 1.1 2-2" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="12" y="15.25" width="14" height="1.5" rx="0.75" fill="#3b82f6" opacity="0.65"/>
            <rect x="6" y="20" width="3.5" height="3.5" rx="1" fill="#334155"/>
            <rect x="12" y="21" width="10" height="1.5" rx="0.75" fill="#334155"/>
          </svg>
          <span className="nav-brand-name">QA Command Center</span>
        </span>
        <button
          className={`nav-toggle${menuOpen ? ' nav-toggle--open' : ''}`}
          onClick={() => setMenuOpen(m => !m)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-links"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <div
          id="nav-links"
          className={`nav-links${menuOpen ? ' nav-links--open' : ''}`}
        >
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={item.right
                ? ({ isActive }) => 'nav-end' + (isActive ? ' active' : '')
                : undefined
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Routes>
        <Route path="/"                element={<DashboardPage />} />
        <Route path="/test-cases"      element={<TestCasesPage />} />
        <Route path="/test-cases/import" element={<ImportTestCasesPage />} />
        <Route path="/test-suites"     element={<TestSuitesPage />} />
        <Route path="/test-suites/:id" element={<SuiteDetailPage />} />
        <Route path="/bugs"            element={<BugsPage />} />
        <Route path="/bugs/:id"        element={<BugDetailPage />} />
        <Route path="/test-runs"       element={<TestRunsPage />} />
        <Route path="/test-runs/:id"   element={<TestRunDetailPage />} />
        <Route path="/flaky-tests"     element={<FlakyTestsPage />} />
        <Route path="/reports"         element={<ReportsPage />} />
        <Route path="/reports/:id"     element={<ReportDetailPage />} />
        <Route path="/settings"        element={<SettingsPage />} />
      </Routes>

      {searchOpen && <QuickSearch onClose={() => setSearchOpen(false)} />}
      {helpOpen   && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </SettingsProvider>
  );
}
