'use client';

import { useCallback, useEffect, useState } from 'react';
import { Car, Wrench, Calendar, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarAsset {
  id: string;
  assetCode: string;
  name: string;
  plateNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
}

interface MaintenanceRecord {
  id: string;
  assetId: string;
  maintenanceDate: string;
  maintenanceType: string;
  description: string;
  serviceCenter: string | null;
  odometer: number | null;
  cost: string | null;
  nextServiceDate: string | null;
  partsReplaced: string | null;
  invoiceNumber: string | null;
  technician: string | null;
  notes: string | null;
  createdAt: string;
}

interface Props { employeeId: string; }

const TYPE_LABELS: Record<string, string> = {
  OIL_CHANGE: 'Oil Change', BRAKE_SERVICE: 'Brake Service', TIRE_ROTATION: 'Tire Rotation',
  TIRE_REPLACEMENT: 'Tire Replacement', BATTERY_REPLACEMENT: 'Battery Replacement',
  AC_SERVICE: 'AC Service', GENERAL_SERVICE: 'General Service', INSPECTION: 'Inspection',
  REPAIR: 'Repair', ACCIDENT_REPAIR: 'Accident Repair', FILTER_REPLACEMENT: 'Filter Replacement',
  SPARK_PLUGS: 'Spark Plugs', TRANSMISSION_SERVICE: 'Transmission Service',
  COOLANT_FLUSH: 'Coolant Flush', OTHER: 'Other',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function money(v: string | null) {
  if (!v) return '—';
  return `SAR ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function daysUntil(s: string) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(s + 'T00:00:00').getTime() - now.getTime()) / 86400000);
}

export function EmployeeCarMaintenanceTab({ employeeId }: Props) {
  const [cars, setCars] = useState<CarAsset[]>([]);
  const [records, setRecords] = useState<Record<string, MaintenanceRecord[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const assignRes = await fetch(`/api/hr/asset-assignments?employeeId=${employeeId}&category=CAR&status=ACTIVE`);
      const assignData = await assignRes.json();
      const assignments = Array.isArray(assignData) ? assignData : [];
      const carList: CarAsset[] = assignments.map((a: { asset: CarAsset }) => a.asset).filter(Boolean);
      setCars(carList);

      const maintenance: Record<string, MaintenanceRecord[]> = {};
      await Promise.all(carList.map(async car => {
        const res = await fetch(`/api/hr/car-maintenance?assetId=${car.id}`);
        const data = await res.json();
        maintenance[car.id] = Array.isArray(data) ? data : [];
      }));
      setRecords(maintenance);
    } catch { setCars([]); setRecords({}); } finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const totalCost = Object.values(records).flat().reduce((s, r) => s + Number(r.cost ?? 0), 0);
  const allRecords = Object.values(records).flat();

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>;
  }

  if (cars.length === 0) {
    return (
      <div className="rounded-2xl border bg-white shadow-sm p-12 text-center py-2">
        <Car className="h-10 w-10 text-slate-200 mx-auto mb-3 mt-4" />
        <p className="text-slate-500 font-medium">No company cars currently assigned to this employee</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-3">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Assigned Cars</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{cars.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-3">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Service Records</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{allRecords.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-3">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Cost</p>
          <p className="text-xl font-bold text-violet-700 mt-1">SAR {totalCost.toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
        </div>
      </div>

      {cars.map(car => {
        const carRecords = records[car.id] ?? [];
        const open = expanded.has(car.id);
        const nextService = carRecords.find(r => r.nextServiceDate && daysUntil(r.nextServiceDate) >= 0);
        const nextDays = nextService?.nextServiceDate ? daysUntil(nextService.nextServiceDate) : null;

        return (
          <div key={car.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div
              className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b"
              onClick={() => toggle(car.id)}
            >
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Car className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">{car.name}</span>
                  {car.plateNumber && (
                    <span className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{car.plateNumber}</span>
                  )}
                  <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[car.vehicleMake, car.vehicleModel, car.vehicleYear].filter(Boolean).join(' ')} · {carRecords.length} service records
                </p>
                {nextDays !== null && (
                  <p className={cn('text-xs font-medium mt-1', nextDays <= 7 ? 'text-rose-600' : nextDays <= 30 ? 'text-amber-600' : 'text-slate-400')}>
                    <AlertCircle className="h-3 w-3 inline mr-1" />Next service in {nextDays}d
                  </p>
                )}
              </div>
              {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
            </div>

            {open && (
              carRecords.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">No maintenance records for this vehicle.</div>
              ) : (
                <div className="divide-y">
                  {carRecords.map(r => (
                    <div key={r.id} className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Wrench className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-800">{TYPE_LABELS[r.maintenanceType] ?? r.maintenanceType}</span>
                        {r.cost && <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">{money(r.cost)}</span>}
                      </div>
                      <p className="text-xs text-slate-600">{r.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(r.maintenanceDate)}</span>
                        {r.serviceCenter && <span>{r.serviceCenter}</span>}
                        {r.odometer && <span>{r.odometer.toLocaleString()} km</span>}
                        {r.invoiceNumber && <span>Inv: {r.invoiceNumber}</span>}
                        {r.nextServiceDate && <span className="text-emerald-600">Next: {fmtDate(r.nextServiceDate)}</span>}
                      </div>
                      {r.partsReplaced && <p className="text-xs text-slate-400 italic">Parts: {r.partsReplaced}</p>}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
