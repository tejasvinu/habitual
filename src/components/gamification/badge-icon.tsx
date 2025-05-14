
'use client';
import * as LucideIcons from 'lucide-react';
import type { SVGProps } from 'react';

interface BadgeIconProps extends SVGProps<SVGSVGElement> {
  iconName: string;
  className?: string;
}

export function BadgeIcon({ iconName, className = "h-6 w-6", ...props }: BadgeIconProps) {
  // @ts-ignore Dynamically access Lucide icons
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as LucideIcons.LucideIcon | undefined;

  if (!IconComponent) {
    if (iconName.startsWith('<svg')) {
      return <div dangerouslySetInnerHTML={{ __html: iconName }} className={className} />;
    }
    // Default fallback icon if the name doesn't match a Lucide icon or SVG string
    return <LucideIcons.Award className={className} {...props} />; 
  }

  return <IconComponent className={className} {...props} />;
}
