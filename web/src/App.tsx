// src/App.tsx
import { useState } from 'react'
import { CapturePage } from './pages/CapturePage'
import { ReviewPage } from './pages/ReviewPage'
import { ResultsPage, type AnalysisResult } from './pages/ResultsPage'
import ConsentPage from './pages/ConsentPage'

type Page = 'consent' | 'capture' | 'review' | 'results'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('consent')
  const [consentGiven, setConsentGiven] = useState(false)
  const [participantId, setParticipantId] = useState<string | undefined>()
  const [latestResult, setLatestResult] = useState<AnalysisResult | null>(null)

  const handleConsentGiven = (pid?: string) => {
    setConsentGiven(true)
    setParticipantId(pid)
    setCurrentPage('capture')
  }

  const handleResetConsent = () => {
    if (confirm('Are you sure you want to reset consent? This will return to the consent page.')) {
      setConsentGiven(false)
      setParticipantId(undefined)
      setCurrentPage('consent')
    }
  }

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setLatestResult(result)
    setCurrentPage('results')
  }

  return (
    <div style={{ minHeight: '100vh', padding: '8px' }}>
      {/* Header */}
      <header className="glass-card fade-in" style={{ marginBottom: '12px', maxWidth: '1400px', margin: '0 auto 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Logo */}
            <img
              src="/oralight_logo.png?v=2"
              alt="OralLight"
              style={{
                maxWidth: '250px',
                height: 'auto'
              }}
            />
          </div>

          {/* Trust Badge */}
          <div className="trust-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>AES-256 Encrypted</span>
          </div>
        </div>

        {/* Navigation - only show if consent given */}
        {consentGiven && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              className={currentPage === 'capture' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setCurrentPage('capture')}
              disabled={currentPage === 'capture'}
            >
              📸 Capture
            </button>
            <button
              className={currentPage === 'review' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setCurrentPage('review')}
              disabled={currentPage === 'review'}
            >
              📋 Review Cases
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleResetConsent}
              style={{ marginLeft: 'auto' }}
            >
              🔄 Reset Consent
            </button>
          </div>
        )}

        {/* Show consent status if given */}
        {consentGiven && participantId && (
          <div className="badge badge-green" style={{ marginTop: '12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Consent Obtained • Participant: {participantId}
          </div>
        )}
      </header>

      {/* Page content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {!consentGiven ? (
          <ConsentPage
            onConsentGiven={handleConsentGiven}
            onBack={() => { }} // No back button on first page
          />
        ) : currentPage === 'capture' ? (
          <CapturePage participantId={participantId} onAnalysisComplete={handleAnalysisComplete} />
        ) : currentPage === 'review' ? (
          <ReviewPage />
        ) : currentPage === 'results' && latestResult ? (
          <ResultsPage
            result={latestResult}
            onCaptureAnother={() => setCurrentPage('capture')}
            onViewAllCases={() => setCurrentPage('review')}
          />
        ) : null}
      </main>
    </div>
  )
}
