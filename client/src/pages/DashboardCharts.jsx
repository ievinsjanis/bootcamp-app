import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';

// ── Design tokens ─────────────────────────────────────────

const GREEN  = '#16a34a';
const RED    = '#dc2626';
const BORDER = '#e5e7eb';
const TEXT   = '#374151';
const MUTED  = '#6b7280';

const STATUS_COLOR = {
  draft:   '#9ca3af',
  ready:   '#2563eb',
  passed:  '#16a34a',
  failed:  '#dc2626',
  skipped: '#64748b',
};

const TICK  = { fontSize: 12, fill: MUTED };
const GRID  = { stroke: '#f1f5f9', strokeDasharray: '4 4', vertical: false };
const TIP   = {
  background: 'white', border: `1px solid ${BORDER}`,
  borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: 13, padding: '9px 13px',
};

// ── Custom tooltips ───────────────────────────────────────

function PassRateTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP}>
      <p style={{ fontWeight: 600, color: TEXT, marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ color: GREEN, fontWeight: 700 }}>{payload[0].value}% pass rate</p>
    </div>
  );
}

function BugsTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP}>
      <p style={{ fontWeight: 600, color: TEXT, marginBottom: 6, fontSize: 12 }}>
        Week of {label}
      </p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill, marginBottom: 2 }}>
          {p.value} bug{p.value !== 1 ? 's' : ''} {p.name.toLowerCase()}
        </p>
      ))}
    </div>
  );
}

function CoverageTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, fill } = payload[0];
  return (
    <div style={TIP}>
      <p style={{ textTransform: 'capitalize', fontWeight: 600, color: TEXT, marginBottom: 2, fontSize: 12 }}>
        {name}
      </p>
      <p style={{ color: fill || MUTED }}>
        {value} test case{value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ── Custom donut legend showing counts ────────────────────

function DonutLegend({ payload }) {
  if (!payload?.length) return null;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '5px 14px',
      justifyContent: 'center', marginTop: 10,
      paddingTop: 10, borderTop: `1px solid ${BORDER}`,
    }}>
      {payload.map(entry => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: entry.color, flexShrink: 0, display: 'inline-block',
          }} />
          <span style={{ color: MUTED, textTransform: 'capitalize' }}>{entry.value}</span>
          <span style={{ fontWeight: 700, color: TEXT }}>{entry.payload.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Card and empty-state wrappers ─────────────────────────

function ChartCard({ title, sub, children }) {
  return (
    <div className="db-chart-card">
      <p className="db-chart-title">{title}</p>
      {sub && <p className="db-chart-sub">{sub}</p>}
      <div className="db-chart-body">{children}</div>
    </div>
  );
}

function ChartEmpty({ message }) {
  return (
    <div className="db-chart-empty-wrap">
      <p className="db-chart-empty-msg">{message}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function DashboardCharts({ trends }) {
  if (!trends) {
    return (
      <div className="db-charts-wrap">
        <div className="db-charts-top">
          <div className="db-chart-card db-chart-skel">
            <div className="db-skel db-skel-chart-title" />
            <div className="db-skel db-skel-chart-body" />
          </div>
          <div className="db-chart-card db-chart-skel">
            <div className="db-skel db-skel-chart-title" />
            <div className="db-skel db-skel-chart-body" />
          </div>
        </div>
        <div className="db-chart-card db-chart-skel">
          <div className="db-skel db-skel-chart-title" />
          <div className="db-skel db-skel-chart-body" />
        </div>
      </div>
    );
  }

  const { pass_rate_trend, bugs_by_week, coverage_by_status } = trends;
  const totalCases      = coverage_by_status.reduce((s, r) => s + r.count, 0);
  const totalBugActivity = bugs_by_week.reduce((s, w) => s + w.opened + w.closed, 0);
  const maxBugVal        = Math.max(0, ...bugs_by_week.map(w => Math.max(w.opened, w.closed)));

  return (
    <div className="db-charts-wrap">
      <div className="db-charts-top">

        {/* ── Pass rate trend */}
        <ChartCard
          title="Pass Rate Trend"
          sub={
            pass_rate_trend.length > 0
              ? `Last ${pass_rate_trend.length} completed run${pass_rate_trend.length === 1 ? '' : 's'} · % of cases that passed`
              : undefined
          }
        >
          {pass_rate_trend.length === 0 ? (
            <ChartEmpty message="Run a test suite to see pass rate over time." />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={pass_rate_trend} margin={{ top: 10, right: 8, bottom: 0, left: -4 }}>
                <defs>
                  <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%"  stopColor={GREEN} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={TICK}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                />
                <Tooltip
                  content={<PassRateTip />}
                  cursor={{ stroke: BORDER, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="pass_rate"
                  stroke={GREEN}
                  strokeWidth={2.5}
                  fill="url(#passGrad)"
                  dot={{ r: 4, fill: 'white', stroke: GREEN, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'white', stroke: GREEN, strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── Test coverage donut */}
        <ChartCard
          title="Test Coverage by Status"
          sub={
            totalCases > 0
              ? `${totalCases} test case${totalCases === 1 ? '' : 's'} total`
              : undefined
          }
        >
          {totalCases === 0 ? (
            <ChartEmpty message="Create test cases to see coverage breakdown." />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={coverage_by_status}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="43%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {coverage_by_status.map(r => (
                    <Cell key={r.status} fill={STATUS_COLOR[r.status] || MUTED} />
                  ))}
                </Pie>
                <Tooltip content={<CoverageTip />} />
                <Legend content={DonutLegend} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>

      {/* ── Bugs opened vs closed */}
      <ChartCard
        title="Bugs Opened vs Closed"
        sub="Per week over the last 8 weeks"
      >
        {totalBugActivity === 0 ? (
          <ChartEmpty message="No bug activity in the last 8 weeks. File or resolve a bug to see it here." />
        ) : (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart
            data={bugs_by_week}
            margin={{ top: 10, right: 8, bottom: 16, left: -4 }}
            barCategoryGap="40%"
            barGap={4}
          >
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="label"
              tick={TICK}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={40}
            />
            <YAxis
              domain={[0, Math.max(4, maxBugVal + 1)]}
              allowDecimals={false}
              tick={TICK}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              content={<BugsTip />}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={value => <span style={{ color: TEXT }}>{value}</span>}
            />
            <Bar dataKey="opened" name="Opened" fill={RED}   radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="closed" name="Closed" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
