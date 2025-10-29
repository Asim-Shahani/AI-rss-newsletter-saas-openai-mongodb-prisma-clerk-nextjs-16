"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";

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
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Current Plan:</span>
      <span className="font-semibold">{isPro ? "Pro" : "Starter"}</span>
    </div>
  );
}
