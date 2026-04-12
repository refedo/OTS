'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';

type Agency = {
  id: string;
  nameEn: string;
  nameAr: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contractRef: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  status: string;
  slotCount: number;
};

type Props = { agencies: Agency[]; canManage: boolean };

const STATUS_COLOURS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  TERMINATED: 'bg-red-100 text-red-800',
};

export function AgenciesClient({ agencies, canManage }: Props) {
  const router = useRouter();
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manpower Agencies</h1>
          <p className="text-sm text-muted-foreground">{agencies.length} agencies total</p>
        </div>
        {canManage && (
          <Link href="/hr/agencies/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Agency
            </Button>
          </Link>
        )}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Name (EN)</th>
                  <th className="p-2 font-medium">Name (AR)</th>
                  <th className="p-2 font-medium">Contact</th>
                  <th className="p-2 font-medium">Contract</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Slots</th>
                </tr>
              </thead>
              <tbody>
                {agencies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No agencies yet.
                    </td>
                  </tr>
                )}
                {agencies.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b hover:bg-muted/40 cursor-pointer"
                    onClick={() => router.push(`/hr/agencies/${a.id}`)}
                  >
                    <td className="p-2 font-medium">{a.nameEn}</td>
                    <td className="p-2" dir="rtl">
                      {a.nameAr ?? '—'}
                    </td>
                    <td className="p-2">
                      {a.contactPerson ? (
                        <span>
                          {a.contactPerson}
                          {a.contactPhone ? ` · ${a.contactPhone}` : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {a.contractRef ?? '—'}
                      {a.contractEnd && (
                        <div className="text-muted-foreground">
                          until {a.contractEnd.slice(0, 10)}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOURS[a.status] ?? ''}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-2">{a.slotCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
