import { cn } from "@/lib/utils";

interface Props {
  number: number;
  title: string;
  disabled?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}

export function Stage({ number, title, disabled, last, children }: Props) {
  return (
    <section className={cn(disabled && "opacity-50")}>
      <div className="flex h-8 flex-row items-center">
        {/* Circle representing the stage number */}
        <div className="mr-4 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground dark:bg-muted-foreground dark:text-muted-foreground">
          {number}
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div
        className={cn(
          "border-l-1 ml-4 border-l py-6 pl-8",
          last && "border-transparent"
        )}
      >
        {children}
      </div>
    </section>
  );
}
