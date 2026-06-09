import { useMemo, useState } from 'react';
import { Card, Input, cn } from './ui';
import {
  breakEvenMonths as calcBreakEven,
  estimateMarketValue,
  roiPercent as calcRoi,
} from '../lib/value';
import { formatEur } from '../lib/format';

export default function ROICalculator() {
  const [cost, setCost] = useState(100);
  const [da, setDa] = useState(30);
  const [backlinks, setBacklinks] = useState(200);
  const [authorityLinks, setAuthorityLinks] = useState(2);

  const { value, roi, breakEvenMonths } = useMemo(() => {
    const v = estimateMarketValue(da, backlinks, authorityLinks);
    return {
      value: v,
      roi: calcRoi(v, cost),
      breakEvenMonths: calcBreakEven(backlinks, cost),
    };
  }, [cost, da, backlinks, authorityLinks]);

  return (
    <Card className="mx-auto max-w-2xl p-6">
      <h2 className="mb-6 text-base font-semibold tracking-tight text-content">ROI Calculator</h2>

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
            className="w-full accent-accent"
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
            className="w-full accent-accent"
          />
        </div>
      </div>

      {/* Results — only the ROI carries colour; value and break-even stay neutral. */}
      <dl className="mt-8 space-y-3 rounded-xl border border-line bg-surface-raised p-5">
        <div className="flex items-center justify-between">
          <dt className="text-sm text-content-muted">Est. value</dt>
          <dd className="nums text-2xl font-semibold tracking-tight text-content">
            {formatEur(value)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-content-muted">ROI</dt>
          <dd>
            <span
              className={cn(
                'nums inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold',
                roi === null
                  ? 'bg-white/[0.06] text-content-muted'
                  : roi >= 0
                    ? 'bg-positive-soft text-positive'
                    : 'bg-negative-soft text-negative',
              )}
            >
              {roi === null ? '—' : `${roi >= 0 ? '+' : ''}${roi.toFixed(0)}%`}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-content-muted">Break-even</dt>
          <dd className="nums text-sm font-medium text-content">
            {breakEvenMonths === null || !Number.isFinite(breakEvenMonths)
              ? '—'
              : `${breakEvenMonths.toFixed(1)} months`}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
