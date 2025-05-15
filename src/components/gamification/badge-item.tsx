
'use client';
import type { UserBadge } from '@/lib/types';
import { BADGE_DEFINITIONS } from '@/lib/gamification/badge-definitions';
import { Card, CardTitle, CardDescription } from '@/components/ui/card'; // Removed unused CardHeader, CardContent
import { BadgeIcon } from './badge-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface BadgeItemProps {
  userBadge: UserBadge;
}

export function BadgeItem({ userBadge }: BadgeItemProps) {
  // For dynamic badges, name, description, icon might be on userBadge itself
  // @ts-ignore
  const definitionId = userBadge.originalBadgeId || userBadge.badgeId;
  const definition = BADGE_DEFINITIONS.find(def => def.id === definitionId);

  if (!definition && !userBadge.name) { // If no definition and no dynamic name, can't render
    return null;
  }

  const displayName = userBadge.name || definition?.name || "Badge";
   // @ts-ignore
  const displayDescription = userBadge.description || definition?.description || "Achievement unlocked!";
   // @ts-ignore
  const displayIcon = userBadge.icon || definition?.icon || "Award";
   // @ts-ignore
  const displayPoints = userBadge.points || definition?.points;


  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="flex flex-col items-center p-3 text-center shadow-md hover:shadow-lg transition-shadow duration-200 aspect-square justify-center">
            <div className="p-2 bg-accent/20 rounded-full mb-1.5">
              <BadgeIcon iconName={displayIcon} className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xs font-semibold mb-0.5 leading-tight">{displayName}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {format(userBadge.awardedAt, 'MMM d, yy')}
            </CardDescription>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-center">
          <p className="font-semibold">{displayName}</p>
          <p className="text-xs">{displayDescription}</p>
          {displayPoints && <p className="text-xs text-primary">+{displayPoints} points</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
