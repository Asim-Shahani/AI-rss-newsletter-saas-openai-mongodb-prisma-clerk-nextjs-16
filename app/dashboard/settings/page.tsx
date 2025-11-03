import { auth } from "@clerk/nextjs/server";
import { getCurrentUserSettings } from "@/actions/user-settings";
import { SettingsForm } from "@/components/dashboard/settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Settings as SettingsIcon } from "lucide-react";
import { PricingCards } from "@/components/dashboard/pricing-cards";

export default async function SettingsPage() {
  const { userId, has } = await auth();

  if (!userId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isPro = await has({ plan: "pro" });
  const settings = isPro ? await getCurrentUserSettings() : null;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure default settings for your newsletter generation. These
            settings will be automatically applied to all newsletters you
            create.
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
              Customize your newsletter with persistent settings
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="space-y-4 flex-1">
              <p className="text-base font-medium">
                Pro users can save default newsletter settings including:
              </p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <SettingsIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Newsletter name, description, and target audience
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <SettingsIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Brand voice, company information, and industry
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <SettingsIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Custom disclaimers, footers, and sender information
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <SettingsIcon
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#6A47FB" }}
                  />
                  <span className="text-foreground font-medium">
                    Automatic application to all generated newsletters
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

      {/* Settings Form */}
      {isPro && <SettingsForm initialSettings={settings} />}
    </div>
  );
}
