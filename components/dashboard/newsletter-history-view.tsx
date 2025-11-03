"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, FileText, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewsletterDisplay } from "./newsletter-display";
import { deleteNewsletterAction } from "@/actions/delete-newsletter";
import { toast } from "sonner";

interface Newsletter {
  id: string;
  userId: string;
  suggestedTitles: string[];
  suggestedSubjectLines: string[];
  body: string;
  topAnnouncements: string[];
  additionalInfo: string | null;
  startDate: Date;
  endDate: Date;
  userInput: string | null;
  feedsUsed: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface NewsletterHistoryViewProps {
  newsletter: Newsletter;
}

export function NewsletterHistoryView({
  newsletter,
}: NewsletterHistoryViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleBackToHistory = () => {
    router.push("/dashboard/history");
  };

  const handleDelete = () => {
    const title = newsletter.suggestedTitles[0] || "this newsletter";
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteNewsletterAction(newsletter.id);
        toast.success("Newsletter deleted successfully");
        router.push("/dashboard/history");
      } catch (error) {
        console.error("Failed to delete newsletter:", error);
        toast.error("Failed to delete newsletter");
      }
    });
  };

  // No-op save function since newsletter is already saved
  const handleSave = async () => {
    // Newsletter is already saved, this is just for component compatibility
  };

  return (
    <div className="container mx-auto py-4 px-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackToHistory}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-xl font-semibold">Newsletter</h1>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Newsletter Information</CardTitle>
          <CardDescription>
            Generated on{" "}
            {new Date(newsletter.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date Range</p>
                <p className="text-muted-foreground">
                  {new Date(newsletter.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(newsletter.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Feeds Used</p>
                <p className="text-muted-foreground">
                  {newsletter.feedsUsed.length} RSS feed
                  {newsletter.feedsUsed.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {newsletter.userInput && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Custom Context</p>
                  <p className="text-muted-foreground line-clamp-2">
                    {newsletter.userInput}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Newsletter Display (without save button) */}
      <NewsletterDisplay
        newsletter={{
          suggestedTitles: newsletter.suggestedTitles,
          suggestedSubjectLines: newsletter.suggestedSubjectLines,
          body: newsletter.body,
          topAnnouncements: newsletter.topAnnouncements,
          additionalInfo: newsletter.additionalInfo ?? undefined,
        }}
        onSave={handleSave}
        isGenerating={false}
        hideSaveButton={true}
      />
    </div>
  );
}
