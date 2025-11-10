// Unified process color system across the application
// Based on production workflow stages

export const PROCESS_COLORS = {
  'Preparation': {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-500',
    bgLight: 'bg-blue-100',
    textDark: 'text-blue-700',
    hex: '#3B82F6'
  },
  'Fit-up': {
    bg: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-500',
    bgLight: 'bg-amber-100',
    textDark: 'text-amber-700',
    hex: '#F59E0B'
  },
  'Welding': {
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-600',
    bgLight: 'bg-red-100',
    textDark: 'text-red-700',
    hex: '#DC2626'
  },
  'Visualization': {
    bg: 'bg-green-600',
    text: 'text-white',
    border: 'border-green-600',
    bgLight: 'bg-green-100',
    textDark: 'text-green-700',
    hex: '#16A34A'
  },
  'Dispatch to Sandblasting': {
    bg: 'bg-cyan-600',
    text: 'text-white',
    border: 'border-cyan-600',
    bgLight: 'bg-cyan-100',
    textDark: 'text-cyan-700',
    hex: '#0891B2'
  },
  'Sandblasting': {
    bg: 'bg-cyan-700',
    text: 'text-white',
    border: 'border-cyan-700',
    bgLight: 'bg-cyan-100',
    textDark: 'text-cyan-800',
    hex: '#0E7490'
  },
  'Dispatch to Galvanization': {
    bg: 'bg-purple-600',
    text: 'text-white',
    border: 'border-purple-600',
    bgLight: 'bg-purple-100',
    textDark: 'text-purple-700',
    hex: '#9333EA'
  },
  'Galvanization': {
    bg: 'bg-purple-700',
    text: 'text-white',
    border: 'border-purple-700',
    bgLight: 'bg-purple-100',
    textDark: 'text-purple-800',
    hex: '#7E22CE'
  },
  'Dispatch to Painting': {
    bg: 'bg-pink-600',
    text: 'text-white',
    border: 'border-pink-600',
    bgLight: 'bg-pink-100',
    textDark: 'text-pink-700',
    hex: '#DB2777'
  },
  'Painting': {
    bg: 'bg-sky-600',
    text: 'text-white',
    border: 'border-sky-600',
    bgLight: 'bg-sky-100',
    textDark: 'text-sky-700',
    hex: '#0284C7'
  },
  'Dispatch to Customs': {
    bg: 'bg-indigo-600',
    text: 'text-white',
    border: 'border-indigo-600',
    bgLight: 'bg-indigo-100',
    textDark: 'text-indigo-700',
    hex: '#4F46E5'
  },
  'Dispatch to Site': {
    bg: 'bg-violet-600',
    text: 'text-white',
    border: 'border-violet-600',
    bgLight: 'bg-violet-100',
    textDark: 'text-violet-700',
    hex: '#7C3AED'
  },
  'Dispatch to Customer': {
    bg: 'bg-fuchsia-600',
    text: 'text-white',
    border: 'border-fuchsia-600',
    bgLight: 'bg-fuchsia-100',
    textDark: 'text-fuchsia-700',
    hex: '#C026D3'
  },
  'Erection': {
    bg: 'bg-orange-600',
    text: 'text-white',
    border: 'border-orange-600',
    bgLight: 'bg-orange-100',
    textDark: 'text-orange-700',
    hex: '#EA580C'
  },
} as const;

export type ProcessType = keyof typeof PROCESS_COLORS;

export function getProcessColor(processType: string) {
  return PROCESS_COLORS[processType as ProcessType] || {
    bg: 'bg-gray-500',
    text: 'text-white',
    border: 'border-gray-500',
    bgLight: 'bg-gray-100',
    textDark: 'text-gray-700',
    hex: '#6B7280'
  };
}

export function getProcessBadgeClasses(processType: string) {
  const colors = getProcessColor(processType);
  return `${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-medium`;
}

export function getProcessBorderClass(processType: string) {
  const colors = getProcessColor(processType);
  return `border-l-4 ${colors.border}`;
}
