import { Appearance } from "@/components/Common/Appearance"
import { Footer } from "./Footer"

interface RegistrationLayoutProps {
  children: React.ReactNode
}

export function RegistrationLayout({ children }: RegistrationLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Left side - Hidden on mobile, visible on desktop */}
      <div className="bg-primary dark:bg-zinc-900 fixed left-0 top-0 h-full w-80 hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-black/5 dark:hidden" />

        <div className="relative z-10 text-center px-6">
          {/* Invoica Logo */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            {/* I = White */}
            <span className="text-white dark:text-zinc-100">I</span>

            {/* nvo = Yellow */}
            <span className="text-chart-5">nvo</span>

            {/* i = White with yellow dot */}
            <span className="relative inline-block text-white dark:text-zinc-100">
              i
              <span className="absolute -top-3 right-0 h-3 w-3 rounded-full bg-chart-5" />
            </span>

            {/* ca = Yellow */}
            <span className="text-chart-5">ca</span>
          </h1>

          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <p className="mt-4 text-sm text-white/70 dark:text-zinc-400">
            Smart Supply Chain Financing Solutions
          </p>
        </div>
      </div>

      {/* Right side - Full width content */}
      <div className="lg:pl-80 min-h-screen flex flex-col">
        <div className="flex justify-end p-4">
          <Appearance />
        </div>

        <div className="flex-1">
          {children}
        </div>

        <Footer />
      </div>
    </div>
  )
}