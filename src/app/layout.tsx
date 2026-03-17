import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Accurat Archive',
  description: 'Accurat project case study archive',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
