import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";

function Dashboard() {
  return (
    <div>
      Dashboard
      <SignOutButton>
        <Button size="lg" className="w-full sm:w-auto">
          Sign Out
        </Button>
      </SignOutButton>
    </div>
  );
}

export default Dashboard;
