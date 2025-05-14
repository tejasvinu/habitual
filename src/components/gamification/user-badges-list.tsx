
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getUserBadges } from '@/lib/actions/gamification';
import type { UserBadge } from '@/lib/types';
import { BadgeItem } from './badge-item';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react'; // Removed Loader2
import { Skeleton } from '../ui/skeleton'; // Corrected path

interface UserBadgesListProps {
  userId: string;
  refreshTrigger?: number; // Optional trigger to force refresh
}

function BadgesSkeleton() {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2.5">
            {[...Array(3)].map((_, i) => (
                 <Card key={i} className="flex flex-col items-center p-3 aspect-square justify-center">
                    <Skeleton className="h-8 w-8 rounded-full mb-1.5" />
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                </Card>
            ))}
        </div>
    )
}


export function UserBadgesList({ userId, refreshTrigger }: UserBadgesListProps) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    if (!userId) {
        setIsLoading(false);
        setBadges([]);
        return;
    }
    setIsLoading(true);
    try {
      const userBadges = await getUserBadges(userId);
      setBadges(userBadges);
    } catch (error) {
      console.error("Failed to fetch user badges:", error);
      // Optionally set an error state here to display to user
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges, refreshTrigger]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center"><Award className="mr-2 h-5 w-5 text-yellow-500" /> Badges</CardTitle>
                <CardDescription className="text-xs">Your earned achievements.</CardDescription>
            </CardHeader>
            <CardContent>
                <BadgesSkeleton />
            </CardContent>
        </Card>
    );
  }

  if (!badges.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center"><Award className="mr-2 h-5 w-5 text-yellow-500" /> Badges</CardTitle>
          <CardDescription className="text-xs">Your earned achievements.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No badges earned yet. Keep tracking!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center"><Award className="mr-2 h-5 w-5 text-yellow-500" /> Badges</CardTitle>
        <CardDescription className="text-xs">Your earned achievements.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2.5">
          {badges.map(badge => (
            <BadgeItem key={badge.id} userBadge={badge} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
