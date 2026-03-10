import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Clock, MapPin, User, Plus, MessageCircle, ClipboardList, ChevronLeft, ChevronRight, List, CalendarDays, Calendar as CalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendarServices } from "@/hooks/useServices";
import { useCreateWorkOrder } from "@/hooks/useWorkOrders";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmptyState } from "@/components/EmptyState";
import { NewServiceModal } from "@/components/agenda/NewServiceModal";
import { whatsappLink } from "@/lib/business";
import { useIsMobile } from "@/hooks/use-mobile";

const statusLabel: Record<string, { label: string; dotColor: string }> = {
  scheduled: { label: "Agendado", dotColor: "bg-blue-500" },
  in_progress: { label: "Em andamento", dotColor: "bg-amber-500" },
  completed: { label: "Concluído", dotColor: "bg-green-500" },
  cancelled: { label: "Cancelado", dotColor: "bg-gray-400" },
};

type ViewMode = "week" | "day" | "list";

export default function Agenda() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [newServiceOpen, setNewServiceOpen] = useState(false);
  const navigate = useNavigate();
  const createWO = useCreateWorkOrder();
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "list" : "week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const defaultClientId = searchParams.get("client_id") || undefined;
  const defaultLeadId = searchParams.get("lead_id") || undefined;

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setNewServiceOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const startStr = viewMode === "day" ? format(selectedDay, "yyyy-MM-dd") : format(weekStart, "yyyy-MM-dd");
  const endStr = viewMode === "day" ? format(selectedDay, "yyyy-MM-dd") : format(weekEnd, "yyyy-MM-dd");

  const { data: services, isLoading } = useCalendarServices(startStr, endStr);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const servicesByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    services?.forEach((s: any) => {
      const day = s.scheduled_date || "unscheduled";
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    });
    return map;
  }, [services]);

  const navigateWeek = (dir: number) => {
    setCurrentDate((d) => (dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
  };

  const navigateDay = (dir: number) => {
    setSelectedDay((d) => addDays(d, dir));
  };

  const renderServiceCard = (item: any) => {
    const st = statusLabel[item.status] || statusLabel.scheduled;
    return (
      <div
        key={item.id}
        className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer space-y-1.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${st.dotColor}`} />
            {item.start_time && (
              <span className="text-xs font-semibold text-foreground">
                {item.start_time?.slice(0, 5)}
                {item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ""}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{st.label}</span>
        </div>
        <p className="font-semibold text-sm text-foreground truncate">{item.client?.name || "—"}</p>
        <p className="text-xs text-muted-foreground">{item.service_type}</p>
        {item.tech?.full_name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> {item.tech.full_name}
          </p>
        )}
        <div className="flex gap-1.5 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
            disabled={createWO.isPending}
            onClick={async (e) => {
              e.stopPropagation();
              const result = await createWO.mutateAsync(item.id);
              if (result?.id) navigate(`/ordens/${result.id}`);
            }}
          >
            <ClipboardList className="w-3 h-3" /> OS
          </Button>
          {item.client?.phone && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 px-2"
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  whatsappLink(item.client.phone!, `Olá ${item.client.name}! Confirmando seu serviço de ${item.service_type}. 😊`),
                  "_blank"
                );
              }}
            >
              <MessageCircle className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {([
              { key: "week" as ViewMode, icon: CalendarDays, label: "Semana" },
              { key: "day" as ViewMode, icon: CalIcon, label: "Dia" },
              { key: "list" as ViewMode, icon: List, label: "Lista" },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => (viewMode === "day" ? navigateDay(-1) : navigateWeek(-1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          {viewMode === "day" ? (
            <div>
              <p className="font-semibold text-foreground">{format(selectedDay, "EEEE", { locale: ptBR })}</p>
              <p className="text-sm text-muted-foreground">{format(selectedDay, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-foreground">
                {format(weekStart, "d MMM", { locale: ptBR })} – {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => (viewMode === "day" ? navigateDay(1) : navigateWeek(1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Views */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayServices = servicesByDay.get(dayStr) || [];
            const today = isToday(day);
            return (
              <div
                key={dayStr}
                className={`min-h-[120px] rounded-lg border p-2 ${
                  today ? "border-primary bg-primary-pale" : "border-border bg-card"
                }`}
              >
                <button
                  onClick={() => { setSelectedDay(day); setViewMode("day"); }}
                  className="w-full text-center mb-2"
                >
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-lg font-bold ${today ? "text-primary-mid" : "text-foreground"}`}>
                    {format(day, "d")}
                  </p>
                </button>
                <div className="space-y-1.5">
                  {dayServices.map((s: any) => {
                    const st = statusLabel[s.status] || statusLabel.scheduled;
                    return (
                      <div
                        key={s.id}
                        className="bg-background border border-border/50 rounded p-1.5 cursor-pointer hover:shadow-sm"
                        onClick={() => { setSelectedDay(day); setViewMode("day"); }}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
                          <span className="text-[10px] font-medium truncate">{s.start_time?.slice(0, 5) || "—"}</span>
                        </div>
                        <p className="text-[10px] text-foreground truncate font-medium">{s.client?.name || "—"}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{s.service_type}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "day" && (
        <div className="space-y-3">
          {(() => {
            const dayStr = format(selectedDay, "yyyy-MM-dd");
            const dayServices = servicesByDay.get(dayStr) || [];
            if (dayServices.length === 0) {
              return (
                <EmptyState
                  icon="📅"
                  title="Sem serviços neste dia"
                  description="Agende um serviço para este dia"
                  action={{ label: "Novo Serviço", onClick: () => setNewServiceOpen(true) }}
                />
              );
            }
            return dayServices.map(renderServiceCard);
          })()}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-3">
          {(!services || services.length === 0) ? (
            <EmptyState
              icon="📅"
              title="Sem serviços esta semana"
              description="Agende um serviço a partir de um lead fechado"
              action={{ label: "Novo Serviço", onClick: () => setNewServiceOpen(true) }}
            />
          ) : (
            services.map((item: any) => (
              <div key={item.id}>
                {renderServiceCard(item)}
              </div>
            ))
          )}
        </div>
      )}

      <NewServiceModal
        open={newServiceOpen}
        onOpenChange={setNewServiceOpen}
        defaultClientId={defaultClientId}
        defaultLeadId={defaultLeadId}
      />

      <Button
        onClick={() => setNewServiceOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground z-30"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
