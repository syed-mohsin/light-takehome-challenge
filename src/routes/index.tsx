import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <p className="eyebrow">Light · Take-home challenge</p>
      <h1>My Energy Story</h1>
      <p>A clearer picture of how your home uses electricity.</p>
      <p className="status">Project foundation ready. Dashboard coming next.</p>
    </main>
  )
}
