import { useMemo, useState } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { Badge, Card, Input } from './ui';
import {
  breakEvenMonths as calcBreakEven,
  estimateMarketValue,
  isHighValue as calcHighValue,
  roiPercent as calcRoi,
} from '../lib/value';

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ROICalculator() {
  const [cost, setCost] = useState(100);
  const [da, setDa] = useState(30);
  const [backlinks, setBacklinks] = useState(200);
  const [authorityLinks, setAuthorityLinks] = useState(2);

  const { value, roi, breakEvenMonths, isHighValue } = useMemo(() => {
    const v = estimateMarketValue(da, backlinks, authorityLinks);
    return {
      value: v,
      roi: calcRoi(v, cost),
      breakEvenMonths: calcBreakEven(backlinks, cost),
      isHighValue: calcHighValue(da, backlinks),
    };
  }, [cost, da, backlinks, authorityLinks]);

  return (
    <Card className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />
          <h2 className="text-base font-semibold tracking-tight text-content">ROI Calculator</h2>
        </div>
        {isHighValue && (
          <Badge variant="info" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
            High Value
          </Badge>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Acquisition Cost (€)"
          type="number"
          min={0}
          value={cost}
          onChange={(e) => setCost(Math.max(0, Number(e.target.value)))}
        />

        <Input
          label="Estimated Backlinks"
          type="number"
          min={0}
          value={backlinks}
          onChange={(e) => setBacklinks(Math.max(0, Number(e.target.value)))}
        />

        <div className="sm:col-span-2">
          <label
            htmlFor="roi-da"
            className="mb-2 flex items-center justify-between text-sm font-medium text-content-muted"
          >
            <span>Domain Authority</span>
            <span className="nums font-semibold text-content">{da}</span>
          </label>
          <input
            id="roi-da"
            type="range"
            min={0}
            max={100}
            value={da}
            onChange={(e) => setDa(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="roi-authority"
            className="mb-2 flex items-center justify-between text-sm font-medium text-content-muted"
          >
            <span>Authority Links Count</span>
            <span className="nums font-semibold text-content">{authorityLinks}</span>
          </label>
          <input
            id="roi-authority"
            type="range"
            min={0}
            max={20}
            value={authorityLinks}
            onChange={(e) => setAuthorityLinks(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-surface-raised p-6 text-center">
        <p className="text-sm text-content-muted">Estimated Market Value</p>
        <p className="nums mt-1 text-4xl font-semibold tracking-tight text-content">
          {formatEur(value)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center">
            <p className="mb-1.5 text-xs text-content-subtle">ROI</p>
            <Badge variant={roi === null ? 'neutral' : roi >= 0 ? 'success' : 'danger'}>
              {roi === null ? 'N/A' : `${roi.toFixed(1)}%`}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-content-subtle">Break-even</p>
            <p className="nums mt-1 text-sm font-medium text-content">
              {breakEvenMonths === null || !Number.isFinite(breakEvenMonths)
                ? 'N/A'
                : `${breakEvenMonths.toFixed(1)} mo`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
