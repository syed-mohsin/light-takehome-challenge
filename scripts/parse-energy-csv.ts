import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import { sumEnergy } from '../src/domain/energy/aggregation'
import { isCalendarDate } from '../src/domain/energy/calendar'
import {
  ArtifactSchema,
  type DatasetId,
  type DayHour,
  type EnergyArtifact,
} from '../src/domain/energy/schema'

export const PIPELINE_VERSION = 'csv-parse-7|energy-schema-1|source-hour-1'
const HEADERS = ['datetime', 'duration', 'unit', 'consumption', 'generation']
const NumericStringSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER))
export const CsvRowSchema = z
  .object({
    datetime: z.string(),
    duration: z.literal('900'),
    unit: z.literal('Wh'),
    consumption: NumericStringSchema,
    generation: NumericStringSchema,
  })
  .strict()

export function parseTimestamp(value: string) {
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2}):(\d{2})$/.exec(
      value,
    )
  if (!match || !isCalendarDate(match[1]))
    throw new Error(
      'Invalid timestamp: use an explicit-offset ISO calendar timestamp.',
    )
  const [
    ,
    date,
    hourText,
    minuteText,
    secondText,
    sign,
    offsetHourText,
    offsetMinuteText,
  ] = match
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const offsetHour = Number(offsetHourText)
  const offsetMinute = Number(offsetMinuteText)
  if (
    hour > 23 ||
    minute > 59 ||
    second !== 0 ||
    minute % 15 !== 0 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  )
    throw new Error(
      'Invalid timestamp clock time, quarter-hour alignment, or UTC offset.',
    )
  const epochMs = Date.parse(value)
  if (!Number.isFinite(epochMs)) throw new Error('Invalid timestamp instant.')
  return {
    original: value,
    epochMs,
    date,
    hour,
    minute,
    offsetMinutes: (sign === '+' ? 1 : -1) * (offsetHour * 60 + offsetMinute),
  }
}

export function dataVersionFor(
  raw: string | Buffer,
  pipelineVersion = PIPELINE_VERSION,
): string {
  return createHash('sha256')
    .update(raw)
    .update('\0')
    .update(pipelineVersion)
    .digest('hex')
}

export function parseEnergyCsv(
  raw: string | Buffer,
  household: DatasetId,
): EnergyArtifact {
  const records = parse(raw, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: false,
    cast: false,
    columns(headers: string[]) {
      if (
        headers.length !== HEADERS.length ||
        headers.some((header, index) => header !== HEADERS[index])
      )
        throw new Error(
          `${household}: expected the exact header datetime,duration,unit,consumption,generation.`,
        )
      return headers
    },
  }) as unknown[]
  if (!records.length)
    throw new Error(`${household}: no interval records found.`)
  const hourly = new Map<string, DayHour>()
  const dates = new Set<string>()
  const offsetTransitions: EnergyArtifact['offsetTransitions'] = []
  let first: ReturnType<typeof parseTimestamp> | undefined
  let previous: ReturnType<typeof parseTimestamp> | undefined
  for (const [index, input] of records.entries()) {
    try {
      const record = CsvRowSchema.parse(input)
      const timestamp = parseTimestamp(record.datetime)
      if (previous && timestamp.epochMs - previous.epochMs !== 900_000)
        throw new Error(
          'Intervals must be strictly ordered and continuous at 900-second UTC steps (no gaps or duplicates).',
        )
      if (previous && timestamp.offsetMinutes !== previous.offsetMinutes)
        offsetTransitions.push({
          before: previous.original,
          after: timestamp.original,
          fromOffsetMinutes: previous.offsetMinutes,
          toOffsetMinutes: timestamp.offsetMinutes,
        })
      first ??= timestamp
      previous = timestamp
      dates.add(timestamp.date)
      const key = `${timestamp.date}/${timestamp.hour}`
      const bucket = hourly.get(key) ?? {
        date: timestamp.date,
        hour: timestamp.hour,
        consumptionWh: 0,
        generationWh: 0,
        intervalCount: 0,
      }
      bucket.consumptionWh += record.consumption
      bucket.generationWh += record.generation
      bucket.intervalCount += 1
      if (
        !Number.isSafeInteger(bucket.consumptionWh) ||
        !Number.isSafeInteger(bucket.generationWh)
      )
        throw new Error(
          'Hourly energy exceeds the supported safe-integer range.',
        )
      hourly.set(key, bucket)
    } catch (error) {
      throw new Error(
        `${household}: row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid record.'}`,
      )
    }
  }
  if (!first || !previous)
    throw new Error(`${household}: no valid interval timestamps.`)
  const dayHours = [...hourly.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.hour - b.hour,
  )
  const sortedDates = [...dates].sort()
  const partialDates = new Set<string>()
  if (first.hour !== 0 || first.minute !== 0) partialDates.add(first.date)
  if (previous.hour !== 23 || previous.minute !== 45)
    partialDates.add(previous.date)
  return ArtifactSchema.parse({
    household,
    dataVersion: dataVersionFor(raw),
    coverage: {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1],
    },
    firstTimestamp: first.original,
    lastTimestamp: previous.original,
    intervalCount: records.length,
    dayHours,
    completeDates: sortedDates.filter((date) => !partialDates.has(date)),
    partialDates: [...partialDates].sort(),
    offsetTransitions,
    totals: sumEnergy(dayHours),
  })
}
