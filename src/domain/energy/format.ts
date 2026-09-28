export const TARIFF_CENTS_PER_KWH = 14
export const whToKwh = (wh: number) => wh / 1000
export const whToUsd = (wh: number) => (wh * TARIFF_CENTS_PER_KWH) / 100000
export const formatEnergy = (wh: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(whToKwh(wh))
export const formatMoney = (wh: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(whToUsd(wh))
export const formatDate = (
  date: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
) =>
  new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
