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

const CURRENT_VERSION = '15.15.0';
const RELEASE_DATE = 'February 27, 2026';

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
              <li>• Material Inspection Receipt (MIR) system with Dolibarr PO integration</li>
              <li>• Per-item quality inspection: surface, dimensional, thickness, specs, MTC</li>
              <li>• Partial receiving support with quantity tracking</li>
              <li>• Purchase orders now show supplier name and project reference</li>
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
