import { SHORTCUTS } from '../shortcuts';
import './ShortcutsHelp.css';

// Group shortcuts by category, preserving insertion order
function groupByCategory(shortcuts) {
  const map = new Map();
  for (const s of shortcuts) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category).push(s);
  }
  return [...map.entries()];
}

const GROUPS = groupByCategory(SHORTCUTS);

function Keys({ keys, combo }) {
  return (
    <span className="sh-keys">
      {keys.map((k, i) => (
        <span key={i}>
          {i > 0 && (
            <span className="sh-sep">{combo ? '+' : ' then '}</span>
          )}
          <kbd className="sh-kbd">{k}</kbd>
        </span>
      ))}
    </span>
  );
}

export default function ShortcutsHelp({ onClose }) {
  return (
    <div className="sh-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="sh-modal" role="dialog" aria-label="Keyboard shortcuts">
        <div className="sh-head">
          <h2>Keyboard shortcuts</h2>
          <button className="sh-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sh-body">
          {GROUPS.map(([category, items]) => (
            <section key={category} className="sh-section">
              <h3 className="sh-category">{category}</h3>
              <ul className="sh-list">
                {items.map(s => (
                  <li key={s.id} className="sh-row">
                    <span className="sh-desc">{s.description}</span>
                    <Keys keys={s.keys} combo={s.combo} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
