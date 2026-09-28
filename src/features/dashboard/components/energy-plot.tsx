import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPlotValue, type PlotPoint } from '../chart-format'

export type EnergyPlotProps = {
  points: PlotPoint[]
  unit: 'kWh' | 'usd'
  showScenario: boolean
  showGeneration: boolean
  typical: boolean
}

function EnergyTooltip({
  active,
  payload,
  unit,
  showScenario,
  showGeneration,
}: {
  active?: boolean
  payload?: readonly { payload?: PlotPoint }[]
  unit: 'kWh' | 'usd'
  showScenario: boolean
  showGeneration: boolean
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="max-w-64 rounded-xl border border-line bg-surface p-4 text-sm shadow-lg">
      <p className="mb-2 font-semibold text-ink">{point.label}</p>
      <p className="text-accent-ink">
        Recorded: {formatPlotValue(point.baseline, unit)}
      </p>
      {showScenario && (
        <p className="mt-1 text-scenario">
          Scenario: {formatPlotValue(point.scenario, unit)}
        </p>
      )}
      {showGeneration && (
        <p className="mt-1 text-positive">
          Generation: {formatPlotValue(point.generation, 'kWh')}
        </p>
      )}
      {point.note && <p className="mt-2 text-xs text-muted">{point.note}</p>}
    </div>
  )
}

export default function EnergyPlot({
  points,
  unit,
  showScenario,
  showGeneration,
  typical,
}: EnergyPlotProps) {
  const maximum = Math.max(
    1,
    ...points.map((point) =>
      Math.max(
        point.baseline ?? 0,
        showGeneration ? (point.generation ?? 0) : 0,
      ),
    ),
  )
  const grid = (
    <CartesianGrid
      stroke="var(--color-line)"
      strokeDasharray="4 6"
      vertical={false}
    />
  )
  const xAxis = (
    <XAxis
      dataKey="shortLabel"
      axisLine={false}
      tickLine={false}
      minTickGap={35}
      tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
      dy={10}
    />
  )
  const yAxis = (
    <YAxis
      domain={[0, Math.ceil(maximum * 1.08)]}
      width={48}
      axisLine={false}
      tickLine={false}
      tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
      tickFormatter={(value: number) =>
        unit === 'usd' ? `$${value}` : `${value}`
      }
    />
  )
  const tooltip = (
    <Tooltip
      content={
        <EnergyTooltip
          unit={unit}
          showScenario={showScenario}
          showGeneration={showGeneration}
        />
      }
      cursor={{ stroke: 'var(--color-muted)', strokeDasharray: '3 3' }}
    />
  )
  const scenarioLine = showScenario ? (
    <Line
      name="Scenario"
      type="linear"
      dataKey="scenario"
      stroke="var(--color-scenario)"
      strokeWidth={2}
      strokeDasharray="6 4"
      dot={false}
      connectNulls={false}
      isAnimationActive={false}
    />
  ) : null
  const generationLine = showGeneration ? (
    <Line
      name="Reported generation"
      type="linear"
      dataKey="generation"
      stroke="var(--color-positive)"
      strokeWidth={1.8}
      strokeDasharray="2 3"
      dot={false}
      connectNulls={false}
      isAnimationActive={false}
    />
  ) : null

  return (
    <figure
      className="h-80 w-full min-w-0"
      aria-label={
        typical
          ? 'Average electricity by hour; full values in the data table below'
          : 'Historical electricity; full values in the data table below'
      }
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {typical ? (
          <ComposedChart
            accessibilityLayer
            data={points}
            margin={{ top: 16, right: 12, bottom: 12, left: 0 }}
          >
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <ReferenceArea
              x1="5 PM"
              x2="8 PM"
              fill="var(--color-accent)"
              fillOpacity={0.08}
            />
            <Bar
              name="Recorded consumption"
              dataKey="baseline"
              fill="var(--color-consumption)"
              fillOpacity={0.65}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
            {scenarioLine}
            {generationLine}
          </ComposedChart>
        ) : (
          <LineChart
            accessibilityLayer
            data={points}
            margin={{ top: 16, right: 12, bottom: 12, left: 0 }}
          >
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Line
              name="Recorded consumption"
              type="linear"
              dataKey="baseline"
              stroke="var(--color-consumption)"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {scenarioLine}
            {generationLine}
          </LineChart>
        )}
      </ResponsiveContainer>
    </figure>
  )
}
