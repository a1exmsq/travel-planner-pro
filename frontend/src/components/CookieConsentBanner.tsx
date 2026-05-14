import { useEffect, useState } from 'react'

const CONSENT_KEY = 'travel-planner-consent-v1'

type ConsentChoice = 'essential' | 'full'

interface SavedConsent {
  choice: ConsentChoice
  savedAt: string
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY)
    setVisible(!saved)
  }, [])

  const saveConsent = (choice: ConsentChoice) => {
    const payload: SavedConsent = {
      choice,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-consent-shell">
      <div className="cookie-consent-card">
        <div className="cookie-consent-copy">
          <div className="cookie-consent-kicker">Privacy and storage</div>
          <h2 className="cookie-consent-title">Keep the app usable without storing more than it needs.</h2>
          <p className="cookie-consent-text">
            We use local storage for the session, theme, route drafts, offline map behavior, and a few product preferences.
            There is no ad tracking layer here. You can keep only the essential storage, or allow the extra convenience layer too.
          </p>
        </div>

        <div className="cookie-consent-actions">
          <button type="button" onClick={() => saveConsent('essential')} className="app-button app-button-secondary">
            Essential only
          </button>
          <button type="button" onClick={() => saveConsent('full')} className="app-button app-button-primary">
            Allow preferences
          </button>
        </div>
      </div>
    </div>
  )
}