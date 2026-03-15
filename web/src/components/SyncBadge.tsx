// src/components/SyncBadge.tsx
import type { SyncStatus } from '../store/types'

interface SyncBadgeProps {
    status: SyncStatus
    attempts?: number
    lastAttempt?: string
}

export function SyncBadge({ status, attempts = 0, lastAttempt }: SyncBadgeProps) {
    const config = {
        unsent: {
            className: 'badge-teal',
            icon: '📤',
            label: 'Unsent'
        },
        pending: {
            className: 'badge-amber',
            icon: '⏳',
            label: 'Syncing...'
        },
        sent: {
            className: 'badge-green',
            icon: '✓',
            label: 'Sent'
        },
        failed: {
            className: 'badge-red',
            icon: '✗',
            label: 'Failed'
        }
    }

    const c = config[status]

    const tooltipText = lastAttempt
        ? `Last attempt: ${new Date(lastAttempt).toLocaleString()}\nAttempts: ${attempts}`
        : attempts > 0
            ? `Attempts: ${attempts}`
            : undefined

    return (
        <span
            className={`badge ${c.className}`}
            title={tooltipText}
            style={{ cursor: tooltipText ? 'help' : 'default' }}
        >
            <span>{c.icon}</span>
            <span>{c.label}</span>
            {attempts > 1 && <span style={{ opacity: 0.7 }}>({attempts})</span>}
        </span>
    )
}
