import { Link, useLocation } from "wouter";
import { LayoutDashboard, BarChart2, TrendingDown, BellRing, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Resumen Ejecutivo",       href: "/",                      icon: LayoutDashboard },
  { name: "Angelus vs Angelus",      href: "/angelus-vs-angelus",    icon: BarChart2 },
  { name: "Angelus vs Competencia",  href: "/angelus-vs-competencia",icon: TrendingDown },
  { name: "Alertas y Precio Sugerido", href: "/alertas",             icon: BellRing },
  { name: "Stock por Droguería",     href: "/stock",                 icon: Package },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="flex h-14 items-center px-6 font-bold text-lg border-b border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground">
        Angelus Intelligence
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}