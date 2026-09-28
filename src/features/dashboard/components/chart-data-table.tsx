import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { formatPlotValue, type PlotPoint } from '../chart-format'

export function ChartDataTable({
  points,
  unit,
  showScenario,
  showGeneration,
}: {
  points: PlotPoint[]
  unit: 'kWh' | 'usd'
  showScenario: boolean
  showGeneration: boolean
}) {
  const [page, setPage] = useState(0)
  const pageSize = 30
  const lastPage = Math.max(0, Math.ceil(points.length / pageSize) - 1)
  const safePage = Math.min(page, lastPage)
  return (
    <details className="border-t border-line px-5 py-4">
      <summary className="w-fit cursor-pointer text-sm font-medium text-muted hover:text-ink">
        View data table
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <caption className="sr-only">
            All values in the current chart, paginated in groups of thirty
          </caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="p-2 font-medium" scope="col">
                Period
              </th>
              <th className="p-2 font-medium" scope="col">
                Recorded
              </th>
              {showScenario && (
                <th className="p-2 font-medium" scope="col">
                  Scenario
                </th>
              )}
              {showGeneration && (
                <th className="p-2 font-medium" scope="col">
                  Generation
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {points
              .slice(safePage * pageSize, (safePage + 1) * pageSize)
              .map((point) => (
                <tr key={point.label} className="border-b border-line/60">
                  <th scope="row" className="p-2 font-normal">
                    {point.label}
                    {point.note && (
                      <span className="block text-xs text-muted">
                        {point.note}
                      </span>
                    )}
                  </th>
                  <td className="p-2">
                    {formatPlotValue(point.baseline, unit)}
                  </td>
                  {showScenario && (
                    <td className="p-2">
                      {formatPlotValue(point.scenario, unit)}
                    </td>
                  )}
                  {showGeneration && (
                    <td className="p-2">
                      {formatPlotValue(point.generation, 'kWh')}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {lastPage > 0 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted">
            Page {safePage + 1} of {lastPage + 1}
          </span>
          <Button
            variant="secondary"
            disabled={safePage === lastPage}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </details>
  )
}
