import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import TestCasesPage from './pages/TestCasesPage';
import TestSuitesPage from './pages/TestSuitesPage';
import SuiteDetailPage from './pages/SuiteDetailPage';
import BugsPage from './pages/BugsPage';
import BugDetailPage from './pages/BugDetailPage';
import TestRunsPage from './pages/TestRunsPage';
import TestRunDetailPage from './pages/TestRunDetailPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <span className="nav-brand">QA App</span>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/test-cases">Test Cases</NavLink>
        <NavLink to="/test-suites">Test Suites</NavLink>
        <NavLink to="/bugs">Bugs</NavLink>
        <NavLink to="/test-runs">Test Runs</NavLink>
        <NavLink to="/reports">Reports</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/test-cases" element={<TestCasesPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/test-suites/:id" element={<SuiteDetailPage />} />
        <Route path="/bugs" element={<BugsPage />} />
        <Route path="/bugs/:id" element={<BugDetailPage />} />
        <Route path="/test-runs" element={<TestRunsPage />} />
        <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
