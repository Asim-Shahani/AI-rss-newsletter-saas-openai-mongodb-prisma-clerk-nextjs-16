"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  parseSSEChunk,
  type AnyStreamEvent,
} from "@/lib/streaming/sse-helpers";
import type { GeneratedNewsletter } from "@/actions/generate-newsletter";

/**
 * Loading phases during newsletter generation
 *
 * These represent the different stages of the generation process:
 * - idle: Not started or completed
 * - refreshing: Fetching new articles from RSS feeds
 * - analyzing: Processing articles from database
 * - generating: AI is creating newsletter content
 * - complete: Generation finished successfully
 */
export type LoadingPhase =
  | "idle"
  | "refreshing"
  | "analyzing"
  | "generating"
  | "complete";

/**
 * Parameters for newsletter generation
 */
export interface GenerationParams {
  feedIds: string[];
  startDate: string;
  endDate: string;
  userInput?: string;
}

/**
 * State returned by the hook
 */
export interface NewsletterStreamState {
  isGenerating: boolean;
  loadingPhase: LoadingPhase;
  newsletter: Partial<GeneratedNewsletter> | null;
  articlesAnalyzed: number;
  feedCount: number;
  generate: (params: GenerationParams) => Promise<void>;
}

/**
 * Custom hook for streaming newsletter generation
 *
 * This hook abstracts away the complexity of:
 * - Server-Sent Events (SSE) stream handling
 * - State management during generation
 * - Error handling and user feedback
 *
 * Usage:
 * ```tsx
 * const { isGenerating, newsletter, generate } = useNewsletterStream();
 *
 * await generate({
 *   feedIds: ['id1', 'id2'],
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 * });
 * ```
 *
 * @returns State and generate function for newsletter generation
 */
export function useNewsletterStream(): NewsletterStreamState {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("idle");
  const [newsletter, setNewsletter] =
    useState<Partial<GeneratedNewsletter> | null>(null);
  const [articlesAnalyzed, setArticlesAnalyzed] = useState(0);
  const [feedCount, setFeedCount] = useState(0);

  // Track current article count for final toast message
  const articleCountRef = useRef(0);

  /**
   * Processes a single SSE event and updates state accordingly
   */
  const handleStreamEvent = (event: AnyStreamEvent) => {
    switch (event.type) {
      case "refreshing":
        setLoadingPhase("refreshing");
        setFeedCount(event.feedCount);
        break;

      case "analyzing":
        setLoadingPhase("analyzing");
        setFeedCount(event.feedCount);
        break;

      case "metadata":
        articleCountRef.current = event.articlesAnalyzed;
        setArticlesAnalyzed(event.articlesAnalyzed);
        setLoadingPhase("generating");
        break;

      case "partial":
        // Update newsletter with partial AI-generated data
        setNewsletter(event.data as Partial<GeneratedNewsletter>);
        setLoadingPhase("generating");
        break;

      case "complete":
        setLoadingPhase("complete");
        toast.success(
          `Newsletter generated from ${articleCountRef.current} articles!`
        );
        break;

      case "error":
        throw new Error(event.error);
    }
  };

  /**
   * Generates a newsletter by streaming from the API
   */
  const generate = async (params: GenerationParams) => {
    try {
      // Reset state
      setIsGenerating(true);
      setNewsletter(null);
      setArticlesAnalyzed(0);
      setFeedCount(0);
      setLoadingPhase("idle");
      articleCountRef.current = 0;

      // Fetch streaming response from API
      const response = await fetch("/api/newsletter/generate-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate newsletter");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Parse all SSE events in this chunk
        const events = parseSSEChunk(chunk);

        // Process each event
        for (const event of events) {
          handleStreamEvent(event);
        }
      }
    } catch (error) {
      console.error("Failed to generate newsletter:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate newsletter"
      );
      setNewsletter(null);
      setLoadingPhase("idle");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    loadingPhase,
    newsletter,
    articlesAnalyzed,
    feedCount,
    generate,
  };
}
