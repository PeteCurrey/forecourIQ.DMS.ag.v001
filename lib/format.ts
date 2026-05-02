import { format } from 'date-fns'

export const formatCurrency = (amount: number | string | null) => {
  if (amount === null || amount === undefined) return '£0'
  const val = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(val)
}

export const formatDate = (date: string | Date | null, formatStr: string = 'dd MMM yyyy') => {
  if (!date) return '-'
  return format(new Date(date), formatStr)
}

export const formatNumber = (num: number | null) => {
  if (num === null || num === undefined) return '0'
  return new Intl.NumberFormat('en-GB').format(num)
}

export const formatRegistration = (reg: string | null) => {
  if (!reg) return ''
  const clean = reg.replace(/\s+/g, '').toUpperCase()
  if (clean.length === 7) {
    return `${clean.substring(0, 4)} ${clean.substring(4)}`
  }
  return clean
}
