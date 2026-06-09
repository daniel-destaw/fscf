import { Link } from "@tanstack/react-router"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const textColor = isDark ? "text-zinc-100" : "text-black"

  const fullLogo = (
    <h1
      className={cn(
        "font-bold tracking-tight flex items-center gap-0",
        className,
      )}
    >
      {/* I */}
      <span className={cn(textColor)}>I</span>

      {/* nvo */}
      <span className="text-chart-5">nvo</span>

      {/* i with dot */}
      <span className={cn("relative inline-block", textColor)}>
        i
        <span className="absolute -top-2 right-0 h-2 w-2 rounded-full bg-chart-5" />
      </span>

      {/* ca */}
      <span className="text-chart-5">ca</span>
    </h1>
  )

  const iconLogo = (
    <div
      className={cn(
        "font-bold flex items-center justify-center",
        className,
      )}
    >
      <span className={cn(textColor)}>I</span>
      <span className="text-chart-5">i</span>
    </div>
  )

  const content =
    variant === "responsive" ? (
      <>
        {/* full version */}
        <div className="group-data-[collapsible=icon]:hidden">
          {fullLogo}
        </div>

        {/* icon version */}
        <div className="hidden group-data-[collapsible=icon]:flex">
          {iconLogo}
        </div>
      </>
    ) : variant === "full" ? (
      fullLogo
    ) : (
      iconLogo
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}