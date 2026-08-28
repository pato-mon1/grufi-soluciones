import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  requerido?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Envoltorio de un campo de formulario: etiqueta + control + mensaje de error. */
export function Field({
  id,
  label,
  error,
  requerido,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-foreground">
        {label}
        {requerido && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
