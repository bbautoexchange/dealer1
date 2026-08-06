import { useEffect } from 'react'

declare global {
  interface Window {
    LiveAgent?: { createButton: (buttonId: string, target: HTMLElement) => void }
  }
}

const scriptId = 'la_x2s6df8d'
const buttonId = 'nkh87sho'
const scriptUrl = 'https://ontime.ladesk.com/scripts/track.js'

export default function LiveAgentChat() {
  useEffect(() => {
    if (document.getElementById(scriptId)) return

    const script = document.createElement('script')
    script.id = scriptId
    script.defer = true
    script.src = scriptUrl
    script.addEventListener('load', () => window.LiveAgent?.createButton(buttonId, script), { once: true })
    document.body.appendChild(script)
  }, [])

  return null
}
