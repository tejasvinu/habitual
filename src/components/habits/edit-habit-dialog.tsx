
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { updateHabit } from "@/lib/actions/habits";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import type { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";

const daysOfWeek = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
] as const;

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Habit name must be at least 2 characters.",
  }).max(50, {
      message: "Habit name must not exceed 50 characters."
  }),
  frequency: z.enum(["daily", "weekly", "monthly"], {
      required_error: "Please select a frequency.",
  }),
  specificDays: z.array(z.number().min(0).max(6)).optional(),
});

type EditHabitDialogProps = {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHabitUpdated: () => void; // Callback to refresh list or state
};

export function EditHabitDialog({ habit, open, onOpenChange, onHabitUpdated }: EditHabitDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: habit.name || "",
      frequency: habit.frequency || undefined,
      specificDays: habit.specificDays || [],
    },
  });
  
  React.useEffect(() => {
    if (open) { // Reset form when dialog opens with new habit data or same habit data
        form.reset({
            name: habit.name || "",
            frequency: habit.frequency || undefined,
            specificDays: habit.specificDays || [],
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habit]);


  const watchedFrequency = form.watch("frequency");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update a habit." });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('frequency', values.frequency);
      formData.append('userId', user.id); // Important for validation in action

      if (values.frequency === 'weekly' && values.specificDays && values.specificDays.length > 0) {
        formData.append('specificDays', values.specificDays.join(','));
      } else if (values.frequency !== 'weekly') {
        // Ensure specificDays is not sent if not weekly, or action handles removing it
         formData.append('specificDays', ''); // Send empty to indicate removal or non-applicability
      }


      const result = await updateHabit(habit.id, formData);
      if (result.success) {
        toast({
          title: "Habit Updated",
          description: `"${values.name}" has been updated successfully.`,
        });
        onHabitUpdated(); // Notify parent to refresh
        onOpenChange(false); // Close dialog
      } else {
        toast({
          variant: "destructive",
          title: "Error Updating Habit",
          description: result.error || "Failed to update habit.",
        });
      }
    } catch (error) {
      console.error("Failed to update habit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Habit</DialogTitle>
          <DialogDescription>
            Update the details of your habit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habit Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Meditate for 10 minutes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select how often" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedFrequency === 'weekly' && (
                 <FormField
                    control={form.control}
                    name="specificDays"
                    render={() => (
                        <FormItem>
                            <div className="mb-2">
                                <FormLabel className="text-base">Specific Days (Optional)</FormLabel>
                                <FormDescription>
                                    Select which days this weekly habit applies to. If none selected, it's a general weekly habit.
                                </FormDescription>
                            </div>
                             <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                                {daysOfWeek.map((day) => (
                                    <FormField
                                        key={day.id}
                                        control={form.control}
                                        name="specificDays"
                                        render={({ field }) => {
                                            return (
                                                <FormItem
                                                    key={day.id}
                                                    className={cn(
                                                        "flex flex-col items-center space-y-1 rounded-md border p-2 transition-colors hover:bg-accent/50",
                                                        field.value?.includes(day.id) ? "bg-accent text-accent-foreground" : "text-foreground"
                                                    )}
                                                     onClick={() => {
                                                        const currentDays = field.value || [];
                                                        const updatedDays = currentDays.includes(day.id)
                                                            ? currentDays.filter((d) => d !== day.id)
                                                            : [...currentDays, day.id];
                                                        field.onChange(updatedDays.sort((a,b) => a-b));
                                                    }}
                                                >
                                                    <FormLabel className="text-sm font-normal cursor-pointer w-full text-center">{day.label}</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className="sr-only"
                                                            checked={field.value?.includes(day.id)}
                                                            onCheckedChange={(checked) => {
                                                                const currentDays = field.value || [];
                                                                return checked
                                                                    ? field.onChange([...currentDays, day.id].sort((a,b) => a-b))
                                                                    : field.onChange(currentDays.filter((value) => value !== day.id).sort((a,b) => a-b));
                                                            }}
                                                        />
                                                    </FormControl>
                                                     {field.value?.includes(day.id) && <Check className="h-4 w-4 text-primary" />}
                                                </FormItem>
                                            );
                                        }}
                                    />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!user || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
