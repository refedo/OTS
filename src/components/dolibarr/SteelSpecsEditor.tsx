'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Save,
  Loader2,
  Package,
  Ruler,
  Weight,
  Shield,
  Wrench,
} from 'lucide-react';

interface SteelSpecsEditorProps {
  product: any;
  refData: any;
  onClose: () => void;
  onSaved: () => void;
}

export function SteelSpecsEditor({ product, refData, onClose, onSaved }: SteelSpecsEditorProps) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullProduct, setFullProduct] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    steel_grade: '',
    grade_standard: '',
    profile_type: '',
    profile_size: '',
    thickness_mm: '',
    width_mm: '',
    height_mm: '',
    length_mm: '',
    outer_diameter_mm: '',
    inner_diameter_mm: '',
    wall_thickness_mm: '',
    web_thickness_mm: '',
    flange_thickness_mm: '',
    flange_width_mm: '',
    weight_per_meter: '',
    weight_per_sqm: '',
    yield_strength_mpa: '',
    tensile_strength_mpa: '',
    elongation_pct: '',
    surface_finish: '',
    coating_type: '',
    coating_thickness_um: '',
    is_standard_stock: false,
    lead_time_days: '',
    min_order_qty: '',
    fabrication_notes: '',
    welding_notes: '',
  });

  // Load full product details with existing specs
  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/dolibarr/products/${product.dolibarr_id}`);
        if (res.ok) {
          const data = await res.json();
          setFullProduct(data);

          // Pre-fill form with existing specs
          const p = data.product;
          if (p) {
            setForm(prev => ({
              ...prev,
              steel_grade: p.steel_grade || '',
              grade_standard: p.grade_standard || '',
              profile_type: p.profile_type || '',
              profile_size: p.profile_size || '',
              thickness_mm: p.thickness_mm ? String(p.thickness_mm) : '',
              width_mm: p.spec_width_mm ? String(p.spec_width_mm) : '',
              height_mm: p.spec_height_mm ? String(p.spec_height_mm) : '',
              length_mm: p.length_mm ? String(p.length_mm) : '',
              outer_diameter_mm: p.outer_diameter_mm ? String(p.outer_diameter_mm) : '',
              inner_diameter_mm: p.inner_diameter_mm ? String(p.inner_diameter_mm) : '',
              wall_thickness_mm: p.wall_thickness_mm ? String(p.wall_thickness_mm) : '',
              web_thickness_mm: p.web_thickness_mm ? String(p.web_thickness_mm) : '',
              flange_thickness_mm: p.flange_thickness_mm ? String(p.flange_thickness_mm) : '',
              flange_width_mm: p.flange_width_mm ? String(p.flange_width_mm) : '',
              weight_per_meter: p.weight_per_meter ? String(p.weight_per_meter) : '',
              weight_per_sqm: p.weight_per_sqm ? String(p.weight_per_sqm) : '',
              yield_strength_mpa: p.yield_strength_mpa ? String(p.yield_strength_mpa) : '',
              tensile_strength_mpa: p.tensile_strength_mpa ? String(p.tensile_strength_mpa) : '',
              elongation_pct: p.elongation_pct ? String(p.elongation_pct) : '',
              surface_finish: p.surface_finish || '',
              coating_type: p.coating_type || '',
              coating_thickness_um: p.coating_thickness_um ? String(p.coating_thickness_um) : '',
              is_standard_stock: p.is_standard_stock === 1,
              lead_time_days: p.lead_time_days ? String(p.lead_time_days) : '',
              min_order_qty: p.min_order_qty ? String(p.min_order_qty) : '',
              fabrication_notes: p.fabrication_notes || '',
              welding_notes: p.welding_notes || '',
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [product.dolibarr_id]);

  // Auto-fill dimensions when profile_size changes
  const handleProfileSizeChange = (profileSize: string) => {
    setForm(prev => ({ ...prev, profile_size: profileSize }));

    if (refData?.profiles && profileSize) {
      const profile = refData.profiles.find((p: any) => p.profile_size === profileSize);
      if (profile) {
        setForm(prev => ({
          ...prev,
          height_mm: profile.height_mm ? String(profile.height_mm) : prev.height_mm,
          width_mm: profile.width_mm ? String(profile.width_mm) : prev.width_mm,
          web_thickness_mm: profile.web_thickness_mm ? String(profile.web_thickness_mm) : prev.web_thickness_mm,
          flange_thickness_mm: profile.flange_thickness_mm ? String(profile.flange_thickness_mm) : prev.flange_thickness_mm,
          weight_per_meter: profile.weight_per_meter ? String(profile.weight_per_meter) : prev.weight_per_meter,
        }));
      }
    }
  };

  // Auto-fill grade properties when steel_grade changes
  const handleGradeChange = (gradeCode: string) => {
    setForm(prev => ({ ...prev, steel_grade: gradeCode }));

    if (refData?.grades && gradeCode) {
      const grade = refData.grades.find((g: any) => g.grade_code === gradeCode);
      if (grade) {
        setForm(prev => ({
          ...prev,
          grade_standard: grade.grade_standard || prev.grade_standard,
          yield_strength_mpa: grade.min_yield_mpa ? String(grade.min_yield_mpa) : prev.yield_strength_mpa,
        }));
      }
    }
  };

  // Get available profile sizes for selected profile type
  const availableProfileSizes = refData?.profiles?.filter(
    (p: any) => p.profile_type === form.profile_type
  ) || [];

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        dolibarr_product_id: product.dolibarr_id,
      };

      // Map form fields, converting empty strings to null and numbers
      const numFields = [
        'thickness_mm', 'width_mm', 'height_mm', 'length_mm',
        'outer_diameter_mm', 'inner_diameter_mm', 'wall_thickness_mm',
        'web_thickness_mm', 'flange_thickness_mm', 'flange_width_mm',
        'weight_per_meter', 'weight_per_sqm',
        'yield_strength_mpa', 'tensile_strength_mpa', 'elongation_pct',
        'coating_thickness_um', 'min_order_qty',
      ];
      const intFields = ['lead_time_days'];
      const strFields = [
        'steel_grade', 'grade_standard', 'profile_type', 'profile_size',
        'surface_finish', 'coating_type', 'fabrication_notes', 'welding_notes',
      ];

      for (const f of strFields) {
        payload[f] = (form as any)[f] || null;
      }
      for (const f of numFields) {
        const val = (form as any)[f];
        payload[f] = val !== '' ? parseFloat(val) : null;
      }
      for (const f of intFields) {
        const val = (form as any)[f];
        payload[f] = val !== '' ? parseInt(val, 10) : null;
      }
      payload.is_standard_stock = form.is_standard_stock;

      const res = await fetch('/api/dolibarr/steel-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-8 overflow-y-auto">
      <div className="w-full max-w-3xl mx-4 mb-8">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Steel Specs — {product.ref}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{product.label}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Product Info (read-only from Dolibarr) */}
                <div className="grid grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-medium">{Number(product.price || 0).toFixed(2)} SAR</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Cost (PMP)</p>
                    <p className="font-medium">{product.pmp ? Number(product.pmp).toFixed(2) : '—'} SAR</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="font-medium">{product.stock_reel !== null ? Number(product.stock_reel).toFixed(0) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <Badge variant="outline" className="text-xs">{product.product_type === 0 ? 'Product' : 'Service'}</Badge>
                  </div>
                </div>

                {/* Steel Grade & Profile */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4" /> Material & Profile
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Steel Grade</Label>
                      <Select value={form.steel_grade} onValueChange={handleGradeChange}>
                        <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(refData?.grades || []).map((g: any) => (
                            <SelectItem key={g.grade_code} value={g.grade_code}>{g.grade_code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Grade Standard</Label>
                      <Input value={form.grade_standard} onChange={e => setForm(f => ({ ...f, grade_standard: e.target.value }))} placeholder="e.g. EN 10025" />
                    </div>
                    <div>
                      <Label className="text-xs">Profile Type</Label>
                      <Select value={form.profile_type} onValueChange={v => setForm(f => ({ ...f, profile_type: v === 'none' ? '' : v, profile_size: '' }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {['IPE', 'HEA', 'HEB', 'UPN', 'Plate', 'Tube-Round', 'Tube-Square', 'Flat Bar', 'Round Bar', 'L-Angle', 'T-Section'].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Profile Size</Label>
                      {availableProfileSizes.length > 0 ? (
                        <Select value={form.profile_size} onValueChange={handleProfileSizeChange}>
                          <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {availableProfileSizes.map((p: any) => (
                              <SelectItem key={p.profile_size} value={p.profile_size}>{p.profile_size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={form.profile_size} onChange={e => setForm(f => ({ ...f, profile_size: e.target.value }))} placeholder="e.g. IPE200" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Ruler className="h-4 w-4" /> Dimensions (mm)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { key: 'thickness_mm', label: 'Thickness' },
                      { key: 'width_mm', label: 'Width' },
                      { key: 'height_mm', label: 'Height' },
                      { key: 'length_mm', label: 'Length' },
                      { key: 'web_thickness_mm', label: 'Web Thickness' },
                      { key: 'flange_thickness_mm', label: 'Flange Thickness' },
                      { key: 'flange_width_mm', label: 'Flange Width' },
                      { key: 'outer_diameter_mm', label: 'Outer Diameter' },
                      { key: 'inner_diameter_mm', label: 'Inner Diameter' },
                      { key: 'wall_thickness_mm', label: 'Wall Thickness' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-xs">{label}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(form as any)[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder="mm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weight & Material Properties */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Weight className="h-4 w-4" /> Weight & Material Properties
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs">Weight/m (kg/m)</Label>
                      <Input type="number" step="0.001" value={form.weight_per_meter} onChange={e => setForm(f => ({ ...f, weight_per_meter: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Weight/m² (kg/m²)</Label>
                      <Input type="number" step="0.001" value={form.weight_per_sqm} onChange={e => setForm(f => ({ ...f, weight_per_sqm: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Yield (MPa)</Label>
                      <Input type="number" step="0.01" value={form.yield_strength_mpa} onChange={e => setForm(f => ({ ...f, yield_strength_mpa: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Tensile (MPa)</Label>
                      <Input type="number" step="0.01" value={form.tensile_strength_mpa} onChange={e => setForm(f => ({ ...f, tensile_strength_mpa: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Elongation (%)</Label>
                      <Input type="number" step="0.01" value={form.elongation_pct} onChange={e => setForm(f => ({ ...f, elongation_pct: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Surface & Coating */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4" /> Surface & Coating
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Surface Finish</Label>
                      <Select value={form.surface_finish} onValueChange={v => setForm(f => ({ ...f, surface_finish: v === 'none' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select finish" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(refData?.surfaceFinishes || []).map((sf: string) => (
                            <SelectItem key={sf} value={sf}>{sf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Coating Type</Label>
                      <Input value={form.coating_type} onChange={e => setForm(f => ({ ...f, coating_type: e.target.value }))} placeholder="e.g. Zinc" />
                    </div>
                    <div>
                      <Label className="text-xs">Coating Thickness (μm)</Label>
                      <Input type="number" step="0.01" value={form.coating_thickness_um} onChange={e => setForm(f => ({ ...f, coating_thickness_um: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Operational */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Wrench className="h-4 w-4" /> Operational
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="is_standard_stock"
                        checked={form.is_standard_stock}
                        onChange={e => setForm(f => ({ ...f, is_standard_stock: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="is_standard_stock" className="text-xs cursor-pointer">Standard Stock Item</Label>
                    </div>
                    <div>
                      <Label className="text-xs">Lead Time (days)</Label>
                      <Input type="number" value={form.lead_time_days} onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Min Order Qty</Label>
                      <Input type="number" step="0.01" value={form.min_order_qty} onChange={e => setForm(f => ({ ...f, min_order_qty: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Fabrication Notes</Label>
                    <Textarea
                      value={form.fabrication_notes}
                      onChange={e => setForm(f => ({ ...f, fabrication_notes: e.target.value }))}
                      placeholder="Special fabrication instructions..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Welding Notes</Label>
                    <Textarea
                      value={form.welding_notes}
                      onChange={e => setForm(f => ({ ...f, welding_notes: e.target.value }))}
                      placeholder="Welding requirements and procedures..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Steel Specs
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
