import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import TestCasesPage from './pages/TestCasesPage';
import TestSuitesPage from './pages/TestSuitesPage';
import SuiteDetailPage from './pages/SuiteDetailPage';
import BugsPage from './pages/BugsPage';
import BugDetailPage from './pages/BugDetailPage';
import './App.css';

function Home() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetch('/api/hello').then(r => r.json()).then(d => setMessage(d.message));
  }, []);
  return (
    <div className="container">
      <h1>My App</h1>
      <p>{message || 'Loading...'}</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <span className="nav-brand">My App</span>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/test-cases">Test Cases</NavLink>
        <NavLink to="/test-suites">Test Suites</NavLink>
        <NavLink to="/bugs">Bugs</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test-cases" element={<TestCasesPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/test-suites/:id" element={<SuiteDetailPage />} />
        <Route path="/bugs" element={<BugsPage />} />
        <Route path="/bugs/:id" element={<BugDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
