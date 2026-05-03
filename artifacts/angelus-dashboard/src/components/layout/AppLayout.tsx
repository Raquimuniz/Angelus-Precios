import { Sidebar } from "./Sidebar";
import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col h-full">
          <header className="flex h-14 items-center justify-between border-b px-6 bg-card">
            <h1 className="text-lg font-semibold text-foreground">Angelus Pharma Intelligence</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Admin User</span>
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}