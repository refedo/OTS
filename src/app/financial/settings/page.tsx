'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Settings, Landmark } from 'lucide-react';

interface Account {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  account_category: string | null;
  is_active: number;
}

const CONFIG_FIELDS = [
  { key: 'default_ar_account', label: 'Accounts Receivable', description: 'Default AR account for customer invoices', filterType: 'asset' },
  { key: 'default_ap_account', label: 'Accounts Payable', description: 'Default AP account for supplier invoices', filterType: 'liability' },
  { key: 'default_revenue_account', label: 'Default Revenue', description: 'Default revenue account for sales', filterType: 'revenue' },
  { key: 'default_expense_account', label: 'Default Expense/COGS', description: 'Default expense account for purchases', filterType: 'expense' },
  { key: 'vat_output_15_account', label: 'VAT Output 15%', description: 'VAT collected on sales at 15%', filterType: 'liability' },
  { key: 'vat_output_5_account', label: 'VAT Output 5%', description: 'VAT collected on sales at 5%', filterType: 'liability' },
  { key: 'vat_input_15_account', label: 'VAT Input 15%', description: 'VAT paid on purchases at 15%', filterType: 'asset' },
  { key: 'vat_input_5_account', label: 'VAT Input 5%', description: 'VAT paid on purchases at 5%', filterType: 'asset' },
];

export default function FinancialSettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [acctRes, cfgRes, bankRes] = await Promise.all([
        fetch('/api/financial/chart-of-accounts'),
        fetch('/api/financial/config'),
        fetch('/api/financial/bank-accounts'),
      ]);
      if (acctRes.ok) setAccounts(await acctRes.json());
      if (cfgRes.ok) setConfig(await cfgRes.json());
      if (bankRes.ok) setBankAccounts(await bankRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/financial/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Settings</h1>
          <p className="text-muted-foreground mt-1">Configure default account mappings for journal entry generation</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      {/* Default Account Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Default Account Mappings
          </CardTitle>
          <CardDescription>
            These accounts are used when generating journal entries from synced invoices and payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CONFIG_FIELDS.map(field => {
              const filteredAccounts = accounts.filter(a =>
                a.account_type === field.filterType && a.is_active !== 0
              );
              return (
                <div key={field.key}>
                  <Label className="font-medium">{field.label}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
                  <Select
                    value={config[field.key] || ''}
                    onValueChange={v => setConfig({ ...config, [field.key]: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map(a => (
                        <SelectItem key={a.account_code} value={a.account_code}>
                          {a.account_code} — {a.account_name}
                        </SelectItem>
                      ))}
                      {filteredAccounts.length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground">
                          No {field.filterType} accounts found. Add them in Chart of Accounts.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bank Account Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Bank Account Mapping
          </CardTitle>
          <CardDescription>
            Map each Dolibarr bank account to a chart of accounts entry. The account_number field from Dolibarr is used as the accounting code for journal entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bank accounts synced yet. Run a sync first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Bank Account</th>
                    <th className="text-left p-3 font-medium">Bank</th>
                    <th className="text-left p-3 font-medium">IBAN</th>
                    <th className="text-left p-3 font-medium">Accounting Code</th>
                    <th className="text-right p-3 font-medium">Balance</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bankAccounts.map((bank: any) => (
                    <tr key={bank.dolibarr_id} className="border-b">
                      <td className="p-3 font-medium">{bank.label}</td>
                      <td className="p-3 text-muted-foreground">{bank.bank_name}</td>
                      <td className="p-3 font-mono text-xs">{bank.iban || '—'}</td>
                      <td className="p-3 font-mono font-semibold">{bank.account_number || '—'}</td>
                      <td className="p-3 text-right font-mono">
                        {new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(Number(bank.balance))}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={bank.is_open ? 'default' : 'secondary'}>
                          {bank.is_open ? 'Open' : 'Closed'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
