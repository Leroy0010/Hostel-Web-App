import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

export function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
        </Button>
    );
}
