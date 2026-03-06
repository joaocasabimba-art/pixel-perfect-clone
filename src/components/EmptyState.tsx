import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="bg-primary-mid hover:bg-primary-mid/90 text-primary-mid-foreground">
          {action.label}
        </Button>
      )}
    </div>
  );
}
