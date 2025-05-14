
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AppSidebar } from '@/components/layout/sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, Palette, DatabaseZap, LogOut, KeyRound, Edit3, AlertTriangle, Settings as SettingsIcon, Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { exportUserData } from '@/lib/actions/habits';


export default function SettingsPage() {
  const { user, isLoading: authIsLoading, logoutUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    if (!authIsLoading && !user) {
      router.push('/login');
    }
  }, [authIsLoading, user, router]);

  if (authIsLoading || (!user && !authIsLoading)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = () => {
    logoutUser();
  };

  const handleChangePassword = () => {
    toast({ title: "Feature Coming Soon", description: "Password change functionality is not yet implemented." });
  };
  const handleUpdateProfile = () => {
    toast({ title: "Feature Coming Soon", description: "Profile update functionality is not yet implemented." });
  };
  
  const handleExportData = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to export data." });
        return;
    }
    setIsExporting(true);
    try {
        const result = await exportUserData(user.id);
        if (result.success && result.csvData) {
            const blob = new Blob([result.csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) { // feature detection
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `habitual_data_${user.email}_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            toast({ title: "Data Exported", description: "Your habit data has been prepared for download." });
        } else {
            toast({ variant: "destructive", title: "Export Failed", description: result.error || "Could not export your data." });
        }
    } catch (error) {
        console.error("Data export error:", error);
        toast({ variant: "destructive", title: "Export Error", description: "An unexpected error occurred during data export." });
    } finally {
        setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    toast({ variant: "destructive", title: "Account Deletion (Not Implemented)", description: "This critical action requires backend implementation and is not yet functional." });
  };


  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="md:hidden" />
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h1 className="flex-1 text-xl font-semibold tracking-tight">Settings</h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
            {/* Account Settings Card */}
            <Card className="shadow-lg h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-medium flex items-center">
                  <UserCircle className="mr-2 h-5 w-5 text-primary" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-md font-semibold break-all">{user?.email}</p>
                </div>
                <div className="space-y-2 pt-2">
                    <Button variant="outline" className="w-full justify-start text-sm" onClick={handleChangePassword}>
                        <KeyRound className="mr-2 h-4 w-4" /> Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-sm" onClick={handleUpdateProfile}>
                        <Edit3 className="mr-2 h-4 w-4" /> Update Profile
                    </Button>
                </div>
                 <Button variant="outline" className="w-full mt-6 justify-start text-sm border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </CardContent>
            </Card>

            {/* Appearance Settings Card */}
            <Card className="shadow-lg h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Palette className="mr-2 h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Customize the look and feel of your application.
                </CardDescription>
                 <div className="p-4 bg-muted/50 rounded-lg text-center border border-dashed border-border">
                    <p className="text-sm text-foreground">Theme settings and display options are coming soon!</p>
                </div>
              </CardContent>
            </Card>

            {/* Data Management Settings Card */}
            <Card className="shadow-lg h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-medium flex items-center">
                  <DatabaseZap className="mr-2 h-5 w-5 text-primary" />
                  Data & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="mb-4">
                  Manage your application data and account.
                </CardDescription>
                <Button variant="outline" className="w-full justify-start text-sm" onClick={handleExportData} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isExporting ? "Exporting..." : "Export My Data"}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start text-sm">
                      <AlertTriangle className="mr-2 h-4 w-4" /> Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers. This is not reversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
