// Single source of truth for keyboard shortcuts.
// Both the shortcut handler in App.jsx and the ShortcutsHelp modal read from here.
// Adding or renaming an entry here automatically updates the help modal.

export const SHORTCUTS = [
  {
    id: 'open-search',
    category: 'Search',
    keys: ['⌘/Ctrl', 'K'],
    combo: true,
    description: 'Open quick search',
  },
  {
    id: 'go-dashboard',
    category: 'Navigation',
    keys: ['G', 'D'],
    combo: false,
    description: 'Go to Dashboard',
  },
  {
    id: 'go-test-cases',
    category: 'Navigation',
    keys: ['G', 'T'],
    combo: false,
    description: 'Go to Test Cases',
  },
  {
    id: 'go-test-suites',
    category: 'Navigation',
    keys: ['G', 'S'],
    combo: false,
    description: 'Go to Test Suites',
  },
  {
    id: 'go-bugs',
    category: 'Navigation',
    keys: ['G', 'B'],
    combo: false,
    description: 'Go to Bugs',
  },
  {
    id: 'go-test-runs',
    category: 'Navigation',
    keys: ['G', 'R'],
    combo: false,
    description: 'Go to Test Runs',
  },
  {
    id: 'go-settings',
    category: 'Navigation',
    keys: ['G', 'P'],
    combo: false,
    description: 'Go to Settings',
  },
  {
    id: 'show-help',
    category: 'General',
    keys: ['?'],
    combo: false,
    description: 'Show keyboard shortcuts',
  },
  {
    id: 'close-modal',
    category: 'General',
    keys: ['Esc'],
    combo: false,
    description: 'Close modal',
  },
];

// Derived: map of shortcut id → definition (for programmatic lookups)
export const SHORTCUT_MAP = Object.fromEntries(SHORTCUTS.map(s => [s.id, s]));
