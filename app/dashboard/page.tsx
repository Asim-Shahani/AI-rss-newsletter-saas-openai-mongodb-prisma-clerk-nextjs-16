import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";
import { RssFeedManager } from "@/components/dashboard/rss-feed-manager";
import { NewsletterGenerator } from "@/components/dashboard/newsletter-generator";
import { PlanBadge } from "@/components/dashboard/plan-badge";

async function Dashboard() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your RSS feeds and generate AI-powered newsletters
          </p>
        </div>
        <SignOutButton>
          <Button variant="outline">Sign Out</Button>
        </SignOutButton>
      </div>

      {/* Plan Badge */}
      <PlanBadge />

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - RSS Feed Manager */}
        <div>
          <RssFeedManager />
        </div>

        {/* Right Column - Newsletter Generator */}
        <div>
          <NewsletterGenerator />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
