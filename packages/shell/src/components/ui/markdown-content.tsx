"use client"

import { useEffect, useMemo, useState } from "react"
import type { ComponentPropsWithoutRef } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { codeToHtml } from "shiki/bundle/web"
import type { BundledLanguage, BundledTheme } from "shiki/bundle/web"

import { cn } from "../../lib/utils"

type MarkdownContentProps = {
  content: string
  className?: string
  inverted?: boolean
}

const highlightCache = new Map<string, string>()

function normalizeLanguage(value?: string | null): BundledLanguage | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  const aliases: Record<string, string> = {
    shell: "bash",
    sh: "bash",
    zsh: "bash",
    env: "bash",
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    yml: "yaml",
    md: "markdown",
    plaintext: "text",
    text: "text",
    console: "bash",
    terminal: "bash",
    shellsession: "shellsession",
    ps1: "powershell",
    docker: "dockerfile",
  }

  return (aliases[normalized] || normalized) as BundledLanguage
}

function trimTrailingNewline(value: string) {
  return value.replace(/\n$/, "")
}

function isProbablyExternalHref(href?: string) {
  return Boolean(href && /^(?:https?:)?\/\//i.test(href))
}

function normalizeLiteralAngleTagsSegment(value: string) {
  return value.replace(/(<\/?[A-Za-z][A-Za-z0-9:_/-]*>)/g, "`$1`")
}

function normalizeLiteralAngleTags(content: string) {
  const fencePattern = /(```[\s\S]*?```)/g

  return content
    .split(fencePattern)
    .map((block) => {
      if (block.startsWith("```")) return block

      return block
        .split(/(`[^`]*`)/g)
        .map((segment) => (segment.startsWith("`") ? segment : normalizeLiteralAngleTagsSegment(segment)))
        .join("")
    })
    .join("")
}

function PlainCodeBlock({ code, inverted }: { code: string; inverted?: boolean }) {
  return (
    <pre
      className={cn(
        "mt-3 overflow-x-auto rounded-xl border px-4 py-3 text-xs leading-6",
        inverted ? "border-background/20 bg-background/10 text-background" : "bg-background/70 text-foreground",
      )}
    >
      <code>{code}</code>
    </pre>
  )
}

function HighlightedCodeBlock({
  code,
  language,
  inverted,
}: {
  code: string
  language: BundledLanguage | null
  inverted?: boolean
}) {
  const [html, setHtml] = useState<string | null>(null)

  const theme = useMemo<BundledTheme>(() => (inverted ? "github-dark" : "github-light"), [inverted])
  const source = useMemo(() => trimTrailingNewline(code), [code])

  useEffect(() => {
    let cancelled = false

    if (!language) {
      setHtml("")
      return () => {
        cancelled = true
      }
    }

    const cacheKey = `${theme}:${language}:${source}`
    const cached = highlightCache.get(cacheKey)
    if (cached) {
      setHtml(cached)
      return () => {
        cancelled = true
      }
    }

    setHtml(null)

    void codeToHtml(source, {
      lang: language,
      theme,
    })
      .then((next) => {
        if (cancelled) return
        highlightCache.set(cacheKey, next)
        setHtml(next)
      })
      .catch(() => {
        if (!cancelled) {
          setHtml("")
        }
      })

    return () => {
      cancelled = true
    }
  }, [language, source, theme])

  if (html === null || html === "") {
    return <PlainCodeBlock code={source} inverted={inverted} />
  }

  return (
    <div
      className={cn(
        "mt-3 overflow-hidden rounded-xl border",
        inverted ? "border-background/20" : "border-border/80",
        "[&_.shiki]:m-0 [&_.shiki]:overflow-x-auto [&_.shiki]:px-4 [&_.shiki]:py-3 [&_.shiki]:text-xs [&_.shiki]:leading-6",
        "[&_.shiki_code]:grid [&_.shiki_code]:min-w-full",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function createMarkdownComponents(inverted?: boolean): Components {
  const textColor = inverted ? "text-background" : "text-foreground"
  const subtleTextColor = inverted ? "text-background/80" : "text-muted-foreground"
  const borderColor = inverted ? "border-background/20" : "border-border"
  const surfaceColor = inverted ? "bg-background/10" : "bg-background/50"
  const inlineCodeColor = inverted ? "bg-background/10 text-background" : "bg-background/70 text-foreground"

  return {
    h1: ({ children }) => <h1 className={cn("mt-4 text-xl font-semibold tracking-tight", textColor)}>{children}</h1>,
    h2: ({ children }) => <h2 className={cn("mt-4 text-lg font-semibold tracking-tight", textColor)}>{children}</h2>,
    h3: ({ children }) => <h3 className={cn("mt-3 text-base font-semibold tracking-tight", textColor)}>{children}</h3>,
    h4: ({ children }) => <h4 className={cn("mt-3 text-sm font-semibold tracking-tight", textColor)}>{children}</h4>,
    p: ({ children }) => <p className={cn("leading-6 [&:not(:first-child)]:mt-3", textColor)}>{children}</p>,
    ul: ({ children }) => <ul className={cn("mt-3 list-disc space-y-1 pl-5", textColor)}>{children}</ul>,
    ol: ({ children }) => <ol className={cn("mt-3 list-decimal space-y-1 pl-5", textColor)}>{children}</ol>,
    li: ({ children }) => <li className="leading-6">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className={cn("mt-3 rounded-r-lg border-l-2 pl-4 italic", borderColor, subtleTextColor)}>{children}</blockquote>
    ),
    hr: () => <hr className={cn("my-4 border-t", borderColor)} />,
    a: ({ href, children }) => (
      <a
        href={href}
        target={isProbablyExternalHref(href) ? "_blank" : undefined}
        rel={isProbablyExternalHref(href) ? "noreferrer noopener" : undefined}
        className={cn("underline underline-offset-4 transition-opacity hover:opacity-80", textColor)}
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="mt-3 overflow-x-auto">
        <table className={cn("w-full min-w-max border-collapse text-sm", borderColor)}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className={cn("border-b", borderColor, surfaceColor)}>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className={cn("border-b last:border-b-0", borderColor)}>{children}</tr>,
    th: ({ children }) => <th className={cn("px-3 py-2 text-left font-medium", textColor)}>{children}</th>,
    td: ({ children }) => <td className={cn("px-3 py-2 align-top", textColor)}>{children}</td>,
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code"> & { node?: unknown; inline?: boolean }) => {
      const code = String(children ?? "")
      const language = normalizeLanguage(className?.replace(/^language-/, ""))

      if (!("inline" in props) || !props.inline) {
        return <HighlightedCodeBlock code={code} language={language} inverted={inverted} />
      }

      return (
        <code
          className={cn(
            "rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
            borderColor,
            inlineCodeColor,
          )}
        >
          {children}
        </code>
      )
    },
  }
}

export function MarkdownContent({ content, className, inverted }: MarkdownContentProps) {
  const components = useMemo(() => createMarkdownComponents(inverted), [inverted])
  const normalizedContent = useMemo(() => normalizeLiteralAngleTags(content), [content])

  return (
    <div className={cn("text-sm leading-6", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}
