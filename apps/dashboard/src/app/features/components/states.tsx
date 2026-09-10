import { EmptyState } from "../dashboard/ui/EmptyState";

interface TransitionStatesProps {
  showBackgroundDot: boolean;
  isError: boolean;
  error: Error | null;
}

export function TransitionStates ({
    showBackgroundDot,
    isError,
    error
}: TransitionStatesProps) {

    return (
        <>
            {showBackgroundDot && (
                <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                aria-label="Mise à jour en cours"
                />
            )}
                    
            {isError && (
                <EmptyState tone="error">
                Erreur de chargement{error instanceof Error ? ` : ${error.message}` : ""}.
                </EmptyState>
            )}
        </>
    )
}