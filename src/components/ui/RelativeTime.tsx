import { formatAbsoluteTime, formatRelativeTime } from '../../lib/dates'
import { Tooltip } from './Tooltip'

interface Props {
  iso: string
  className?: string
}

const DEFAULT_CLASS = 'text-xs text-gray-500'

export function RelativeTime({ iso, className = DEFAULT_CLASS }: Props) {
  return (
    <Tooltip content={formatAbsoluteTime(iso)}>
      <span className={className}>{formatRelativeTime(iso)}</span>
    </Tooltip>
  )
}