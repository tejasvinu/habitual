
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListChecks, BarChart3, Sparkles, Settings, Plus, LogIn, UserPlus } from 'lucide-react';

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AddHabitDialog } from '@/components/habits/add-habit-dialog'; // Renamed form component
import React from 'react';

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, toggleSidebar } = useSidebar();
  const [isAddHabitOpen, setIsAddHabitOpen] = React.useState(false);

   const closeSidebar = () => {
     if (isMobile) {
       toggleSidebar();
     }
   };

  // Placeholder for authentication status, replace with actual auth check
  const isAuthenticated = false; 

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
                <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
            </svg>

            <span className={cn("font-semibold text-lg", state === 'collapsed' && 'hidden')}>Habitual</span>
          </div>
        </SidebarHeader>

        <SidebarContent className="flex-1 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/'}
                tooltip="Dashboard"
              >
                <Link href="/" onClick={closeSidebar}>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isAuthenticated && (
              <SidebarMenuItem>
                <AddHabitDialog open={isAddHabitOpen} onOpenChange={setIsAddHabitOpen}>
                    <SidebarMenuButton
                      onClick={() => setIsAddHabitOpen(true)}
                      tooltip="Add New Habit"
                    >
                      <Plus />
                      <span>Add Habit</span>
                    </SidebarMenuButton>
                  </AddHabitDialog>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2">
           <Separator className="my-2" />
           <SidebarMenu>
            {!isAuthenticated && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/login'}
                    tooltip="Login"
                  >
                    <Link href="/login" onClick={closeSidebar}>
                      <LogIn />
                      <span>Login</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/signup'}
                    tooltip="Sign Up"
                  >
                    <Link href="/signup" onClick={closeSidebar}>
                      <UserPlus />
                      <span>Sign Up</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <Separator className="my-2" />
              </>
            )}
              <SidebarMenuItem>
                 <SidebarMenuButton tooltip="Settings">
                   {/* <Link href="/settings"> */}
                     <Settings />
                     <span>Settings</span>
                   {/* </Link> */}
                 </SidebarMenuButton>
               </SidebarMenuItem>
               {/* TODO: Add Logout button if authenticated */}
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
