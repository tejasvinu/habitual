
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, LogIn, UserPlus, Settings, LogOut, UserCircle, Loader2 as LoaderIcon, Gem } from 'lucide-react'; 

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
  useSidebar,
} from '@/components/ui/sidebar';
// import { Button } from '@/components/ui/button'; // Button import not used here
import { Separator } from '@/components/ui/separator';
import { AddHabitDialog } from '@/components/habits/add-habit-dialog';
import React from 'react';
import { useAuth } from '@/context/auth-context'; 
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // AvatarImage not used

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, toggleSidebar } = useSidebar();
  const [isAddHabitOpen, setIsAddHabitOpen] = React.useState(false);
  const { user, logoutUser, isLoading } = useAuth(); 

   const closeSidebar = () => {
     // @ts-ignore access internal openMobile state
     if (isMobile && (state === 'expanded' || (useSidebar() ).openMobile)) { 
       toggleSidebar();
     }
   };
  
  const handleLogout = () => {
    logoutUser();
    closeSidebar();
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
                <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
            </svg>
            <Link href="/" className={cn("font-semibold text-lg", state === 'collapsed' && 'hidden')}>Habitual</Link>
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

            {user && ( 
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
            {isLoading ? (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Loading..." disabled>
                  <LoaderIcon className="animate-spin" /> 
                  <span>Loading...</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : user ? (
              <>
                <SidebarMenuItem>
                   <SidebarMenuButton 
                     tooltip={user.email || "User"} 
                     className="cursor-default hover:bg-transparent focus-visible:ring-0 active:bg-transparent justify-start w-full"
                     // Prevent click if it's not a link/button that should navigate
                     onClick={(e) => e.preventDefault()} 
                    >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                        {user.email ? user.email.substring(0, 2).toUpperCase() : <UserCircle />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("flex flex-col items-start", state === 'collapsed' && 'hidden')}>
                        <span className="truncate max-w-[120px] text-sm leading-tight">{user.email}</span>
                        {user.points !== undefined && (
                           <span className="text-xs text-muted-foreground flex items-center gap-1">
                             <Gem className="w-3 h-3 text-primary"/> {user.points} pts
                           </span>
                        )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                 <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/settings'} 
                    tooltip="Settings"
                  >
                   <Link href="/settings" onClick={closeSidebar}>
                     <Settings />
                     <span>Settings</span>
                   </Link>
                 </SidebarMenuButton>
               </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                    <LogOut />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            ) : (
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
                 <SidebarMenuItem>
                  <SidebarMenuButton 
                      asChild 
                      isActive={pathname === '/settings'} 
                      tooltip="Settings"
                      disabled={!user} 
                    >
                    <Link href="/settings" onClick={closeSidebar}>
                        <Settings />
                        <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
