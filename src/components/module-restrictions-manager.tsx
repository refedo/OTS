'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MODULE_RESTRICTIONS } from '@/lib/module-restrictions';
import { AlertCircle, Lock, DollarSign, Settings, TrendingUp, Briefcase } from 'lucide-react';

type ModuleRestrictionsManagerProps = {
  restrictedModules: string[];
  onChange: (restrictedModules: string[]) => void;
  disabled?: boolean;
};

const categoryIcons = {
  financial: DollarSign,
  operational: Briefcase,
  administrative: Settings,
  strategic: TrendingUp,
};

const categoryColors = {
  financial: 'text-red-600 bg-red-50 border-red-200',
  operational: 'text-blue-600 bg-blue-50 border-blue-200',
  administrative: 'text-purple-600 bg-purple-50 border-purple-200',
  strategic: 'text-green-600 bg-green-50 border-green-200',
};

export function ModuleRestrictionsManager({ 
  restrictedModules, 
  onChange, 
  disabled = false 
}: ModuleRestrictionsManagerProps) {
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(restrictedModules)
  );

  const handleToggle = (moduleId: string) => {
    const newSelected = new Set(selectedModules);
    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);
    }
    setSelectedModules(newSelected);
    onChange(Array.from(newSelected));
  };

  const groupedModules = MODULE_RESTRICTIONS.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, typeof MODULE_RESTRICTIONS>);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Module Restrictions</strong> allow you to create admin-level roles with limited access to sensitive modules.
          Select modules to <strong>restrict access</strong> for this role. Users with this role will have full admin permissions
          except for the selected restricted modules.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {Object.entries(groupedModules).map(([category, modules]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const colorClass = categoryColors[category as keyof typeof categoryColors];
          
          return (
            <Card key={category} className={`border-2 ${colorClass}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-lg capitalize">{category} Modules</CardTitle>
                </div>
                <CardDescription>
                  {category === 'financial' && 'Sensitive financial data and contract information'}
                  {category === 'operational' && 'Day-to-day operations and production management'}
                  {category === 'administrative' && 'User, role, and system administration'}
                  {category === 'strategic' && 'Business planning and strategic initiatives'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {modules.map((module) => {
                  const isRestricted = selectedModules.has(module.id);
                  
                  return (
                    <div
                      key={module.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isRestricted 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        id={module.id}
                        checked={isRestricted}
                        onCheckedChange={() => handleToggle(module.id)}
                        disabled={disabled}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <label
                          htmlFor={module.id}
                          className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                        >
                          {module.name}
                          {isRestricted && (
                            <Badge variant="destructive" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Restricted
                            </Badge>
                          )}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {module.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {module.permissions.slice(0, 5).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm.split('.')[1]}
                            </Badge>
                          ))}
                          {module.permissions.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{module.permissions.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedModules.size > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{selectedModules.size} module(s) restricted.</strong> Users with this role will NOT have access to 
            the selected modules, even if they have admin-level permissions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
