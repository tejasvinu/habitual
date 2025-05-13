
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose, // Import DialogClose
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { addHabit } from "@/lib/actions/habits";
import type { HabitFrequency } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";


const formSchema = z.object({
  name: z.string().min(2, {
    message: "Habit name must be at least 2 characters.",
  }).max(50, {
      message: "Habit name must not exceed 50 characters."
  }),
  frequency: z.enum(["daily", "weekly", "monthly"], {
      required_error: "Please select a frequency.",
  }),
});

type AddHabitDialogProps = {
  children?: React.ReactNode; // To allow using it as a wrapper with a custom trigger
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Optional prop to pre-fill the name (e.g., from suggestions)
  defaultName?: string;
};


export function AddHabitDialog({ children, open: controlledOpen, onOpenChange: setControlledOpen, defaultName = "" }: AddHabitDialogProps) {
   // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Determine if controlled or uncontrolled
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = setControlledOpen ?? setInternalOpen;


  // Default trigger if no children are provided
  const trigger = children ? React.Children.only(children) : (
     <Button>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Habit
      </Button>
  );

  return (
     <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {open && ( // Only render content when open to easily reset form state
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Add New Habit</DialogTitle>
            <DialogDescription>
                Define a new habit you want to track. Click save when you&apos;re done.
            </DialogDescription>
            </DialogHeader>
            {/* Render form content internally */}
            <AddHabitFormContent
                key={defaultName || 'new'} // Use key to force re-render/reset form if defaultName changes significantly
                defaultName={defaultName}
                closeDialog={() => onOpenChange(false)}
            />
        </DialogContent>
      )}
    </Dialog>
  );
}


// --- Internal Form Component ---

interface AddHabitFormContentProps {
    defaultName: string;
    closeDialog: () => void;
}

function AddHabitFormContent({ defaultName, closeDialog }: AddHabitFormContentProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: defaultName || "",
            frequency: undefined,
        },
    });

    // Reset form if defaultName changes (e.g., opening dialog for different suggestion)
     React.useEffect(() => {
         form.reset({ name: defaultName, frequency: undefined });
     }, [defaultName, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', values.name);
            formData.append('frequency', values.frequency);

            const result = await addHabit(formData);
            if (result.success) {
                toast({
                    title: "Habit Added",
                    description: `"${values.name}" has been added successfully.`,
                });
                form.reset(); // Reset form fields
                closeDialog(); // Close dialog
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "Failed to add habit.",
                });
            }
        } catch (error) {
            console.error("Failed to add habit:", error);
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
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4"> {/* Remove py-4 added pt-4 */}
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
                 <DialogFooter>
                     {/* Use DialogClose for the cancel button */}
                    <DialogClose asChild>
                         <Button type="button" variant="outline" disabled={isSubmitting}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Habit"
                      )}
                    </Button>
                 </DialogFooter>
            </form>
        </Form>
    )
}
