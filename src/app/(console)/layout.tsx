import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || "user";

  return (
    <div className="flex h-full">
      <div className="hidden md:flex">
        <Sidebar userRole={userRole} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
