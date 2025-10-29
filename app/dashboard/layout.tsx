import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { has } = await auth();
  const hasPaidPlan =
    (await has({ plan: "pro" })) || (await has({ plan: "starter" }));

  if (!hasPaidPlan) {
    redirect("/#pricing");
  }
  return <>{children}</>;
}

export default Layout;
