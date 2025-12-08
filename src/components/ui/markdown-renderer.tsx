"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string | null | undefined;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
          ),
          ul: ({ ...props }) => <ul {...props} className="list-disc pl-4 space-y-1" />,
          ol: ({ ...props }) => <ol {...props} className="list-decimal pl-4 space-y-1" />,
          li: ({ ...props }) => <li {...props} className="text-sm" />,
          p: ({ ...props }) => <p {...props} className="text-sm leading-relaxed mb-2" />,
          h1: ({ ...props }) => <h1 {...props} className="text-lg font-bold mb-2" />,
          h2: ({ ...props }) => <h2 {...props} className="text-base font-bold mb-2" />,
          h3: ({ ...props }) => <h3 {...props} className="text-sm font-bold mb-2" />,
          h4: ({ ...props }) => <h4 {...props} className="text-sm font-semibold mb-1" />,
          strong: ({ ...props }) => <strong {...props} className="font-semibold" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
