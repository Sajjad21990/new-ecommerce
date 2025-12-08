"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  height?: number;
  preview?: "edit" | "live" | "preview";
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  height = 200,
  preview = "edit",
}: MarkdownEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="border rounded-md bg-background p-3 text-sm text-muted-foreground"
        style={{ minHeight: height }}
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div data-color-mode="light" className="dark:hidden">
      <MDEditor
        value={value}
        onChange={onChange}
        preview={preview}
        height={height}
        textareaProps={{
          placeholder,
        }}
      />
    </div>
  );
}
