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
import { NewsletterLoadingCard } from "./newsletter-loading-card";
import {
  saveGeneratedNewsletter,
  type GeneratedNewsletter,
} from "@/actions/generate-newsletter";
import {
  useNewsletterStream,
  type GenerationParams,
} from "@/lib/hooks/use-newsletter-stream";

/**
 * Newsletter Generation Page
 *
 * This component handles the full newsletter generation flow:
 * 1. Reads generation parameters from URL
 * 2. Auto-starts generation on mount
 * 3. Displays real-time progress updates
 * 4. Shows the generated newsletter
 * 5. Allows saving for Pro users
 */
export function NewsletterGenerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStartedRef = React.useRef(false);

  // Use custom hook for streaming (abstracts SSE complexity)
  const {
    isGenerating,
    loadingPhase,
    newsletter,
    articlesAnalyzed,
    feedCount,
    generate,
  } = useNewsletterStream();

  // Parse generation parameters from URL query string
  const feedIds = searchParams.get("feedIds");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const userInput = searchParams.get("userInput");

  let params: GenerationParams | null = null;

  if (feedIds && startDate && endDate) {
    try {
      params = {
        feedIds: JSON.parse(feedIds),
        startDate,
        endDate,
        userInput: userInput || undefined,
      };
    } catch {
      params = null;
    }
  }

  // Start generation automatically when component mounts (only once)
  React.useEffect(() => {
    if (!params || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    generate(params);
  }, [params, generate]);

  // Navigation guard - warn users before leaving during generation
  // This prevents accidental loss of work if they close the tab
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

  /**
   * Saves the generated newsletter to database (Pro users only)
   */
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
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
        <div className="container mx-auto py-12 px-6 lg:px-8">
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">
                Invalid Generation Request
              </CardTitle>
              <CardDescription className="text-base">
                Missing required parameters for newsletter generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleBackToDashboard}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <div className="container mx-auto py-12 px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
              disabled={isGenerating}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-4 w-px bg-border" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Newsletter Generation
              </h1>
            </div>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-base">
              <div className="inline-flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-purple-600 text-white animate-pulse">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-medium">
                Generating
                {articlesAnalyzed > 0 && ` (${articlesAnalyzed} articles)`}
              </span>
            </div>
          )}
        </div>

        {/* Show loading card during preparation phases */}
        {isGenerating &&
          !newsletter &&
          (loadingPhase === "refreshing" ||
            loadingPhase === "analyzing" ||
            loadingPhase === "generating") && (
            <div className="transition-opacity duration-300 ease-in-out">
              <NewsletterLoadingCard
                phase={loadingPhase}
                feedCount={feedCount}
                articlesAnalyzed={articlesAnalyzed}
              />
            </div>
          )}

        {/* Newsletter display with smooth transition */}
        {newsletter && (
          <div className="transition-opacity duration-500 ease-in-out animate-in fade-in">
            <NewsletterDisplay
              newsletter={newsletter}
              onSave={handleSave}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {/* If generation hasn't started yet */}
        {!isGenerating && !newsletter && loadingPhase === "idle" && (
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Preparing to Generate</CardTitle>
              <CardDescription className="text-base">
                Setting up newsletter generation...
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
