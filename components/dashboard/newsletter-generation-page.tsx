"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { NewsletterDisplay } from "./newsletter-display";
import {
  saveGeneratedNewsletter,
  type GeneratedNewsletter,
} from "@/actions/generate-newsletter";

interface GenerationParams {
  feedIds: string[];
  startDate: string;
  endDate: string;
  userInput?: string;
}

export function NewsletterGenerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [newsletter, setNewsletter] =
    React.useState<Partial<GeneratedNewsletter> | null>(null);
  const [articlesAnalyzed, setArticlesAnalyzed] = React.useState(0);
  const hasStartedRef = React.useRef(false);

  // Parse generation params from URL search params
  const params = React.useMemo<GenerationParams | null>(() => {
    const feedIds = searchParams.get("feedIds");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userInput = searchParams.get("userInput");

    if (!feedIds || !startDate || !endDate) {
      return null;
    }

    try {
      return {
        feedIds: JSON.parse(feedIds),
        startDate,
        endDate,
        userInput: userInput || undefined,
      };
    } catch {
      return null;
    }
  }, [searchParams]);

  const handleGenerate = React.useCallback(
    async (generationParams: GenerationParams) => {
      try {
        setIsGenerating(true);
        setNewsletter(null);
        setArticlesAnalyzed(0);

        // Show generating toast
        toast.info(
          `Preparing ${generationParams.feedIds.length} feed${generationParams.feedIds.length > 1 ? "s" : ""}...`,
        );

        // Fetch streaming response
        const response = await fetch("/api/newsletter/generate-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feedIds: generationParams.feedIds,
            startDate: generationParams.startDate,
            endDate: generationParams.endDate,
            userInput: generationParams.userInput,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate newsletter");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let localArticlesAnalyzed = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE messages (format: "data: {json}\n\n")
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "metadata") {
                  localArticlesAnalyzed = data.articlesAnalyzed;
                  setArticlesAnalyzed(localArticlesAnalyzed);
                  toast.info(`Analyzing ${localArticlesAnalyzed} articles...`);
                } else if (data.type === "partial") {
                  // Update newsletter with partial data
                  setNewsletter(data.data);
                } else if (data.type === "complete") {
                  toast.success(
                    `Newsletter generated from ${localArticlesAnalyzed} articles!`,
                  );
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                // Skip malformed JSON (could be incomplete chunks)
                console.warn("Failed to parse SSE chunk:", parseError);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to generate newsletter:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to generate newsletter",
        );
        setNewsletter(null);
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  // Start generation automatically when component mounts
  React.useEffect(() => {
    if (!params || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    handleGenerate(params);
  }, [params, handleGenerate]);

  // Navigation guard - warn before leaving during generation
  React.useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isGenerating]);

  const handleSave = async () => {
    if (!newsletter || !params) {
      return;
    }

    try {
      await saveGeneratedNewsletter({
        newsletter: newsletter as GeneratedNewsletter,
        feedIds: params.feedIds,
        startDate: new Date(params.startDate),
        endDate: new Date(params.endDate),
        userInput: params.userInput,
      });

      toast.success("Newsletter saved to history!");
    } catch (error) {
      console.error("Failed to save newsletter:", error);
      toast.error("Failed to save newsletter");
    }
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  // If no params, show error
  if (!params) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Generation Request</CardTitle>
            <CardDescription>
              Missing required parameters for newsletter generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            disabled={isGenerating}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-xl font-semibold">Newsletter Generation</h1>
          </div>
        </div>
        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>
              Generating
              {articlesAnalyzed > 0 && ` (${articlesAnalyzed} articles)`}
            </span>
          </div>
        )}
      </div>

      {/* Newsletter display */}
      {newsletter && (
        <NewsletterDisplay
          newsletter={newsletter}
          onSave={handleSave}
          isGenerating={isGenerating}
        />
      )}

      {/* If generation hasn't started yet */}
      {!isGenerating && !newsletter && (
        <Card>
          <CardHeader>
            <CardTitle>Preparing to Generate</CardTitle>
            <CardDescription>
              Setting up newsletter generation...
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
