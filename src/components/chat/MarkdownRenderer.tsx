import { Check, Copy } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ShikiHighlighter, { rehypeInlineCodeProperty } from 'react-shiki';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  streaming?: boolean; // true while the message is still being streamed
}

// Copy code button component
function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-muted-foreground hover:text-primary transition-colors duration-150"
      title="Copiar código"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// Custom components for ReactMarkdown
const components: ComponentProps<typeof ReactMarkdown>['components'] = {
  // Code blocks and inline code
  code({ inline, className, children, ...props }) {
    const language = className?.match(/language-(\w+)/)?.[1];
    const code = String(children).trim();

    if (inline) {
      return (
        <code
          className="bg-surface border border-border/60 rounded px-1.5 py-0.5 text-sm font-mono text-orange-400"
          {...props}
        >
          {code}
        </code>
      );
    }

    // @ts-expect-error - streaming prop is passed through MarkdownRenderer
    const streaming = props['data-streaming'] === 'true';

    return (
      <div className="relative group my-4">
        {language && (
          <div className="flex items-center justify-between bg-surface border border-border rounded-t-lg px-4 py-1.5">
            <span className="text-xs text-muted-foreground font-mono">{language}</span>
            <CopyCodeButton code={code} />
          </div>
        )}
        <ShikiHighlighter
          language={language ?? 'text'}
          theme="github-dark"
          delay={streaming ? 150 : 0}
          className={`text-sm font-mono overflow-x-auto border border-border ${language ? 'border-t-0 rounded-b-lg' : 'rounded-lg'}`}
          style={{ margin: 0 }}
        >
          {code}
        </ShikiHighlighter>
      </div>
    );
  },

  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-foreground mt-6 mb-3 border-b border-border pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-foreground mt-4 mb-1">{children}</h3>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="text-[15px] leading-7 text-foreground mb-3 last:mb-0">{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1 text-[15px] leading-7">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1 text-[15px] leading-7">{children}</ol>
  ),
  li: ({ children }) => <li className="text-foreground">{children}</li>,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary pl-4 my-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),

  // Tables (from remark-gfm)
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse border border-border rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface text-muted-foreground">{children}</thead>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left font-medium border-b border-border">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-2 border-b border-border/50">{children}</td>,

  // Horizontal rule
  hr: () => <hr className="border-border my-4" />,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors duration-150"
    >
      {children}
    </a>
  ),

  // Strong / Em
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
};

export function MarkdownRenderer({ content, streaming = false }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeInlineCodeProperty, rehypeSanitize]}
      components={components}
      // Pass streaming state to code blocks via data attribute
      {...{ 'data-streaming': String(streaming) }}
    >
      {content}
    </ReactMarkdown>
  );
}
