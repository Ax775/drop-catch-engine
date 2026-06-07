# UX/UI optimalisatie — Drop-Catch Engine dashboard

Doel: voelt als een compacte professionele data-tool (Ahrefs/Semrush), niet als SaaS landing page.

## Plan
- [ ] `lib/time.ts` + `RelativeTime` component (relative "2u ago" + absolute op hover)
- [ ] Header: logo zonder decoratie, "Live"-pill weg, discrete "Last refreshed: X ago" rechtsonder
- [ ] App: StatsCards (kaarten + iconen) → inline statreeks "47 domains · 12 high value · 3 deployed · Total est. €24,380"
- [ ] useDomains: expose `lastUpdated` voor Last refreshed
- [ ] DomainTable: kolommen Domain | TLD | DA | Backlinks | Est. Value | ROI % | Status | Actions
  - [ ] DA: getal + dunne progress bar (0–100)
  - [ ] ROI %: groen/rood, dash bij N/A
  - [ ] Status: pill 4 varianten (Scanned grijs, High Value emerald, Deployed blauw, Archived gedimpt)
  - [ ] Actions: 3 icon-only buttons met tooltip (Blueprint, Deploy, Archive)
  - [ ] Lege staat: "No domains tracked yet. Use the form above to add your first domain."
  - [ ] high-value rij-tint/dot weg (status via pill)
- [ ] ROICalculator: decoratieve iconen + High Value badge weg; resultaat als Est. value / ROI / Break-even; alleen ROI gekleurd; sliders accent ipv emerald
- [ ] DeployModal: compact; Copy Blueprint URL als secundaire link; Confirm Deploy enige primary; decoratieve secties weg
- [ ] Algemeen: focus-rings (primair accent ipv cyan — design-systeem keuze), type op buttons, touch targets

## Verificatie
- [ ] tsc --noEmit clean
- [ ] npm run build
- [ ] commit + push, build + deploy

## Review
Alle punten doorgevoerd. tsc clean, build OK, 21 unit tests pass (de 2 "failed test files"
zijn pre-existing Playwright e2e specs die vitest oppikt — @playwright/test versieconflict,
los van deze wijziging). Visueel geverifieerd via preview: tabel + ROI-calculator.

Afwijking t.o.v. spec: focus-rings gebruiken het primaire accent (violet `ring-accent`)
i.p.v. `ring-cyan-500`, omdat de spec óók "geen willekeurige kleuraccenten naast het
primaire accent" vraagt — cyan zou dat principe schenden. Status-kleuren (emerald/blue)
zijn behouden als functionele state-indicatoren, niet als decoratie.
