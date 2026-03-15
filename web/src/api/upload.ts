// src/api/upload.ts
/**
 * Week 5: Mock upload endpoint for testing sync functionality
 * 
 * This simulates a server API that accepts case bundles and returns
 * a server-assigned case ID. In production, this would be replaced
 * with actual HTTP calls to your backend.
 */

import type { CaseBundle } from '../store/types'

export interface UploadResponse {
    success: boolean
    server_case_id?: string
    error?: string
}

/**
 * Mock upload function with simulated network delay and random failures
 * @param bundle - The case bundle to upload
 * @param failureRate - Probability of simulated failure (0-1), default 0.1 (10%)
 */
export async function uploadCase(
    bundle: CaseBundle,
    failureRate: number = 0.1
): Promise<UploadResponse> {
    // Validate that only Red/Amber cases are uploaded
    if (bundle.ml.decision === 'green') {
        return {
            success: false,
            error: 'Green cases should not be synced to server'
        }
    }

    // Simulate network delay (500-1500ms)
    const delay = 500 + Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, delay))

    // Simulate random failures for testing retry logic
    if (Math.random() < failureRate) {
        return {
            success: false,
            error: 'Network error: Connection timeout'
        }
    }

    // Simulate successful upload
    const serverCaseId = `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.log(`[Mock API] Successfully uploaded case ${bundle.meta.case_id}`)
    console.log(`[Mock API] Server assigned ID: ${serverCaseId}`)
    console.log(`[Mock API] Decision: ${bundle.ml.decision}, p=${(bundle.ml.p_suspicious * 100).toFixed(1)}%`)

    return {
        success: true,
        server_case_id: serverCaseId
    }
}

/**
 * Check if a case should be synced based on ML decision
 */
export function shouldSync(bundle: CaseBundle): boolean {
    return bundle.ml.decision === 'red' || bundle.ml.decision === 'amber'
}
