import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile logo */}
        <span className="md:hidden font-bold text-base text-foreground">PragaZero</span>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente, lead, OS..."
            className="bg-transparent border-none outline-none text-sm flex-1 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-danger-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </Button>
        <Button variant="ghost" size="icon">
          <User className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
