"use client";

import { getToolName, isToolUIPart, type DynamicToolUIPart, type ToolUIPart, type UIMessage } from "ai";
import { GlobeIcon } from "lucide-react";

type SearchResult = { title: string; url: string };

export function CoachMessage({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 whitespace-pre-wrap">
        {message.parts.map((part, index) => (part.type === "text" ? <span key={index}>{part.text}</span> : null))}
      </div>
    );
  }

  return (
    <div className="grid max-w-[95%] gap-2">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <p key={index} className="leading-relaxed whitespace-pre-wrap">
              {part.text}
            </p>
          );
        }
        if (isToolUIPart(part) && getToolName(part) === "web_search") {
          return <SearchPart key={index} part={part} />;
        }
        return null;
      })}
    </div>
  );
}

function SearchPart({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const query = searchQuery(part.input);
  if (part.state === "output-error") {
    return <p className="text-xs text-muted-foreground">Web search failed.</p>;
  }
  if (part.state !== "output-available") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground motion-safe:animate-pulse">
        <GlobeIcon className="size-3.5" />
        Searching the web{query ? ` for “${query}”` : ""}…
      </p>
    );
  }

  const results = searchResults(part.output).slice(0, 3);
  return (
    <div className="grid gap-1 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5">
        <GlobeIcon className="size-3.5" />
        Searched{query ? ` “${query}”` : " the web"}
      </p>
      {results.length > 0 ? (
        <ul className="grid gap-0.5 pl-5">
          {results.map((result) => (
            <li key={result.url} className="truncate">
              <a href={result.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                {result.title || result.url}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function searchQuery(input: unknown): string | null {
  if (typeof input !== "object" || input === null || !("query" in input)) return null;
  const { query } = input;
  if (typeof query === "string") return query;
  if (Array.isArray(query)) return query.filter((item) => typeof item === "string").join(", ");
  return null;
}

function searchResults(output: unknown): SearchResult[] {
  if (typeof output !== "object" || output === null || !("results" in output)) return [];
  const { results } = output;
  if (!Array.isArray(results)) return [];
  return results.filter(isSearchResult);
}

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.url === "string" && typeof record.title === "string";
}
