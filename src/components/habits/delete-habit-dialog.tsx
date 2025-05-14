
"use client";

import * as React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { deleteHabit } from "@/lib/actions/habits";
import type { Habit } from "@/lib/types";

interface DeleteHabitDialogProps {
  habit: Habit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHabitDeleted: () => void;
}

export function DeleteHabitDialog({ habit, open, onOpenChange, onHabitDeleted }: DeleteHabitDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!habit || !user) {
      toast({ variant: "destructive", title: "Error", description: "Cannot delete habit." });
      return;
    }
    setIsDeleting(true);
    try {
      const result = await deleteHabit(habit.id, user.id);
      if (result.success) {
        toast({
          title: "Habit Deleted",
          description: `"${habit.name}" has been successfully deleted.`,
        });
        onHabitDeleted();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Error Deleting Habit",
          description: result.error || "Failed to delete habit.",
        });
      }
    } catch (error) {
      console.error("Failed to delete habit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while deleting the habit.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!habit) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <AlertDialogTitle>Delete Habit: &quot;{habit.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this habit? All associated logs and progress
            for this habit will also be permanently removed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Habit"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
