import { UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and profile information
        </p>
      </div>

      <UserProfile
        routing="hash"
        appearance={{
          elements: {
            rootBox: {
              width: "100%",
            },
            card: {
              boxShadow: "none",
              border: "1px solid hsl(var(--border))",
            },
          },
        }}
      />
    </div>
  );
}
