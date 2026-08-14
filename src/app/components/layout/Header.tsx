import { useUIStore } from "@/stores/uiStore";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { NotificationBell } from "../notifications/NotificationBell";

export function Header() {
  const {
    toggleSidebar,
    sidebarCollapsed,
    toggleSidebarCollapse,
  } = useUIStore();

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between gap-3 px-3 transition-colors sm:px-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">
          {/* Page title will be set by each page */}
        </h1>
        {/* Botón de colapsar/expandir sidebar - solo visible en desktop */}
        <button
          onClick={toggleSidebarCollapse}
          className="hidden lg:flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors cursor-pointer"
          title={
            sidebarCollapsed ? "Expandir menú" : "Colapsar menú"
          }
        >
          {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
