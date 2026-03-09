import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Users, Inbox, ClipboardList } from "lucide-react";
import { formatWONumber } from "@/lib/business";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const companyId = useCompanyId();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: results } = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      if (query.length < 2) return { clients: [], leads: [], orders: [] };
      const q = `%${query}%`;
      const [clients, leads, orders] = await Promise.all([
        supabase.from("clients").select("id,name,phone").or(`name.ilike.${q},phone.ilike.${q}`).limit(5),
        supabase.from("leads").select("id,name,phone,status").or(`name.ilike.${q},phone.ilike.${q}`).limit(5),
        supabase.from("work_orders").select("id,number").limit(5),
      ]);
      // Filter orders client-side by formatted number
      const filteredOrders = (orders.data ?? []).filter(o =>
        formatWONumber(o.number).includes(query) || String(o.number).includes(query)
      );
      return {
        clients: clients.data ?? [],
        leads: leads.data ?? [],
        orders: filteredOrders,
      };
    },
    enabled: query.length >= 2 && !!companyId,
  });

  const go = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  }, [navigate]);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar cliente, lead, OS..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {results?.clients && results.clients.length > 0 && (
            <CommandGroup heading="Clientes">
              {results.clients.map((c: any) => (
                <CommandItem key={c.id} onSelect={() => go(`/clientes/${c.id}`)}>
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{c.name}</span>
                  {c.phone && <span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results?.leads && results.leads.length > 0 && (
            <CommandGroup heading="Leads">
              {results.leads.map((l: any) => (
                <CommandItem key={l.id} onSelect={() => go("/leads")}>
                  <Inbox className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{l.name}</span>
                  {l.phone && <span className="ml-auto text-xs text-muted-foreground">{l.phone}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results?.orders && results.orders.length > 0 && (
            <CommandGroup heading="Ordens de Serviço">
              {results.orders.map((o: any) => (
                <CommandItem key={o.id} onSelect={() => go(`/ordens/${o.id}`)}>
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>OS {formatWONumber(o.number)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function useGlobalSearchOpen() {
  // Expose a way to open search from header
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
