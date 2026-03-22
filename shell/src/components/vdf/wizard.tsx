'use client';

import { useState } from 'react';

interface WizardField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'currency' | 'toggle';
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: { min?: number; max?: number; pattern?: string };
  placeholder?: string;
}

interface WizardData {
  steps: {
    title: string;
    description?: string;
    fields: WizardField[];
  }[];
  onComplete: string;
}

interface Props {
  data: WizardData | null | undefined;
  variant?: string;
}

export default function Wizard({ data }: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});

  if (!data?.steps?.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <span className="text-muted text-sm">No wizard data</span>
      </div>
    );
  }

  const current = data.steps[step];
  if (!current) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <span className="text-muted text-sm">No wizard data</span>
      </div>
    );
  }

  const isLast = step === data.steps.length - 1;

  const updateField = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {data.steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-hover'}`}
          />
        ))}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">{current.title}</h3>
      {current.description && <p className="text-sm text-muted mb-4">{current.description}</p>}

      <div className="space-y-4">
        {(current.fields ?? []).map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              {f.label}
              {f.required && <span className="text-danger ml-0.5">*</span>}
            </label>
            {f.type === 'select' ? (
              <select
                value={(values[f.key] as string) || ''}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select...</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'toggle' ? (
              <input
                type="checkbox"
                checked={!!values[f.key]}
                onChange={(e) => updateField(f.key, e.target.checked)}
                className="rounded border-border w-5 h-5"
              />
            ) : (
              <input
                type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={(values[f.key] as string) || ''}
                onChange={(e) => updateField(f.key, e.target.value)}
                placeholder={f.placeholder}
                min={f.validation?.min}
                max={f.validation?.max}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 rounded-md text-sm border border-border hover:bg-surface-hover disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={() => (isLast ? undefined : setStep((s) => s + 1))}
          className="px-4 py-2 rounded-md text-sm bg-primary text-primary-fg hover:bg-primary-hover"
        >
          {isLast ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}
