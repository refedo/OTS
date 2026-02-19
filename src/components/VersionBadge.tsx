'use client';

/**
 * Version Badge Component
 * Displays current system version
 */

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRouter } from 'next/navigation';

const CURRENT_VERSION = '13.5.3';
const RELEASE_DATE = 'February 19, 2026';

export default function VersionBadge() {
  const router = useRouter();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          <Info className="h-3 w-3 mr-1" />
          v{CURRENT_VERSION}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Hexa Steel OTS</h4>
            <p className="text-xs text-muted-foreground">Operation Tracking System</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-mono font-semibold">{CURRENT_VERSION}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Released:</span>
              <span>{RELEASE_DATE}</span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <h5 className="text-xs font-semibold mb-2">Latest Updates</h5>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Task approval tracking & filters</li>
              <li>• Project management view with expand/collapse</li>
              <li>• Multi-select status & priority filters</li>
              <li>• PTS sync data preview before import</li>
            </ul>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push('/changelog')}
          >
            View Full Changelog
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
