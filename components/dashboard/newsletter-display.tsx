"use client";

import * as React from "react";
import { Copy, Check, Download, Save } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { GeneratedNewsletter } from "@/actions/generate-newsletter";

interface NewsletterDisplayProps {
  newsletter: Partial<GeneratedNewsletter>;
  onSave: () => Promise<void>;
}

export function NewsletterDisplay({
  newsletter,
  onSave,
}: NewsletterDisplayProps) {
  const { has } = useAuth();
  const [isPro, setIsPro] = React.useState(false);

  React.useEffect(() => {
    const checkPlan = async () => {
      if (has) {
        const proStatus = await has({ plan: "pro" });
        setIsPro(proStatus);
      }
    };
    checkPlan();
  }, [has]);
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const downloadNewsletter = () => {
    const formatSection = (title: string, items: string[]) =>
      `${title}:\n${items.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;

    const sections = [
      "NEWSLETTER",
      "",
      formatSection("TITLE OPTIONS", newsletter.suggestedTitles ?? []),
      "",
      formatSection(
        "SUBJECT LINE OPTIONS",
        newsletter.suggestedSubjectLines ?? [],
      ),
      "",
      "NEWSLETTER BODY:",
      newsletter.body ?? "",
      "",
      formatSection("TOP 5 ANNOUNCEMENTS", newsletter.topAnnouncements ?? []),
    ];

    if (newsletter.additionalInfo) {
      sections.push("", "ADDITIONAL INFORMATION:", newsletter.additionalInfo);
    }

    const content = sections.join("\n").trim();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `newsletter-${new Date().toISOString().split("T")[0]}.txt`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Newsletter downloaded!");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generated Newsletter</CardTitle>
            <CardDescription>
              Copy sections individually or download the full newsletter
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isPro && (
              <Button variant="outline" size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={downloadNewsletter}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <NewsletterSection
          title="Newsletter Title Options"
          items={newsletter.suggestedTitles ?? []}
          onCopy={(text) => copyToClipboard(text, "titles")}
          isCopied={copiedSection === "titles"}
        />

        <NewsletterSection
          title="Email Subject Line Options"
          items={newsletter.suggestedSubjectLines ?? []}
          onCopy={(text) => copyToClipboard(text, "subjects")}
          isCopied={copiedSection === "subjects"}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Newsletter Body</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                newsletter.body && copyToClipboard(newsletter.body, "body")
              }
              disabled={!newsletter.body}
            >
              {copiedSection === "body" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="border rounded-lg p-6 prose prose-sm max-w-none dark:prose-invert">
            {newsletter.body ? (
              <ReactMarkdown>{newsletter.body}</ReactMarkdown>
            ) : (
              <span className="text-muted-foreground italic">
                Generating newsletter body...
              </span>
            )}
          </div>
        </div>

        <NewsletterSection
          title="Top 5 Announcements"
          items={newsletter.topAnnouncements ?? []}
          onCopy={(text) => copyToClipboard(text, "announcements")}
          isCopied={copiedSection === "announcements"}
        />

        {newsletter.additionalInfo && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Additional Information
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  newsletter.additionalInfo &&
                  copyToClipboard(newsletter.additionalInfo, "additional")
                }
              >
                {copiedSection === "additional" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="border rounded-lg p-6 prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{newsletter.additionalInfo}</ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NewsletterSectionProps {
  title: string;
  items: string[];
  onCopy: (text: string) => void;
  isCopied: boolean;
}

function NewsletterSection({
  title,
  items,
  onCopy,
  isCopied,
}: NewsletterSectionProps) {
  const safeItems = items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">{title}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(safeItems.join("\n"))}
          disabled={safeItems.length === 0}
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="border rounded-lg p-4 space-y-2">
        {safeItems.length === 0 ? (
          <p className="text-muted-foreground italic text-sm">
            Generating {title.toLowerCase()}...
          </p>
        ) : (
          safeItems.map((item, index) => (
            <div
              key={`${title}-${item.substring(0, 20)}-${index}`}
              className="flex items-start gap-2"
            >
              <Badge variant="secondary">{index + 1}</Badge>
              <p className="flex-1">{item}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
