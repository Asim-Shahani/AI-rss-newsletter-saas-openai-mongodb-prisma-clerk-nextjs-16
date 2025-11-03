import { auth } from "@clerk/nextjs/server";
import { upsertUserFromClerk } from "@/actions/user";
import { getNewslettersByUserId } from "@/actions/newsletter";
import { NewsletterHistoryList } from "@/components/dashboard/newsletter-history-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, History as HistoryIcon } from "lucide-react";
import { PricingCards } from "@/components/dashboard/pricing-cards";

export default async function HistoryPage() {
  const { userId, has } = await auth();

  if (!userId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to view your newsletter history.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isPro = await has({ plan: "pro" });
  const user = await upsertUserFromClerk(userId);
  const newsletters = isPro ? await getNewslettersByUserId(user.id) : [];

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Newsletter History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your saved newsletters
          </p>
        </div>
        {isPro && (
          <Badge variant="default" className="gap-1">
            <Crown className="h-3 w-3" />
            Pro
          </Badge>
        )}
      </div>

      {/* Free User Upgrade Prompt */}
      {!isPro && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8" style={{ color: "#6A47FB" }} />
              <CardTitle className="text-2xl" style={{ color: "#6A47FB" }}>
                Upgrade to Pro
              </CardTitle>
            </div>
            <CardDescription>
              Save and access your newsletter history with a Pro plan
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="space-y-4 flex-1">
              <p className="text-base font-medium">
                Pro users can save unlimited newsletters and access them anytime
                from their history, including:
              </p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <HistoryIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Unlimited newsletter storage and history access
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <HistoryIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Search and filter through past newsletters
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <HistoryIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Export and reuse successful newsletter templates
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <HistoryIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Never lose a great newsletter again
                  </span>
                </li>
              </ul>
            </div>

            {/* Pricing Cards */}
            <div className="w-full lg:w-auto lg:flex-1">
              <PricingCards compact />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Newsletter List */}
      {isPro && <NewsletterHistoryList newsletters={newsletters} />}
    </div>
  );
}
