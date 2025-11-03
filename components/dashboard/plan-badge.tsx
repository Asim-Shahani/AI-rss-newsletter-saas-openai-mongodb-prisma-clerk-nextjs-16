"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PlanBadge() {
  const { has } = useAuth();
  const [isPro, setIsPro] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkPlan = async () => {
      if (has) {
        const proStatus = await has({ plan: "pro" });
        setIsPro(proStatus);
      }
    };
    checkPlan();
  }, [has]);

  if (isPro === null) {
    return null;
  }

  return (
    <Link href="/dashboard/pricing">
      <Button variant="outline" size="sm" className="gap-2">
        <span className="text-sm text-muted-foreground">Current Plan:</span>
        <span className="font-semibold">{isPro ? "Pro" : "Starter"}</span>
      </Button>
    </Link>
  );
}
