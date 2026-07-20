# Sanket — 7-Minute Demo Script (word-for-word)

**Pre-demo (T-5 min):** `./dev.sh` · laptop = Officer/EN · phone (hotspot) =
Lakshmi · seed the resilience story: reset → Lakshmi profile → log intervention
"Visited; advised fodder pre-purchase + increased weekly savings" → do NOT
reset again · 3 printed SAAKH copies · fallback video cued in tab 3.

**Memorize five numbers:** 1.9% NPA · 46% SHGs unlinked · 45 days lead time ·
65% poultry feed share · 35% dairy fodder share.

## Timeline
| t | Scene | Action |
|---|---|---|
| 0:00 | Hook | Lakshmi story → "visibility problem, not repayment problem" |
| 0:45 | Problem | Officer console, calm portfolio, point at 45d lead-time card |
| 1:45 | Cascade | ▶ Feed-price spike → map recolors → read bulletin → open poultry ALERT → reasons |
| 3:15 | Offline | Phone: हिंदी toggle → airplane ON → 3-tap entry → Hindi alert |
| 4:45 | SAAKH | Tap "Get my Saakh Report" → hand printed copies |
| 5:30 | Close | e-Shakti line → four pillars → "Sanket sees her." |
| 6:15 | — | buffer / questions |

## Failure recovery
- Cascade hangs → `curl -X POST localhost:8000/simulate/shock/feed_spike` + refresh
- Phone/hotspot fails → narrow browser tab on laptop plays Lakshmi
- SAAKH render fails → "You're holding it — this is the live output"
- Laptop dies → fallback video / deployed link card

## Q&A one-liners
- Data entry? → 3 taps offline; 1.07 lakh BC Sakhis are a ready channel
- Accuracy? → lead time (45d median), not accuracy-% on synthetic data
- Why no DL? → flags must be defensible to the borrower's face
- Privacy? → aggregate indices only; SAAKH is consent-by-request
- vs e-Shakti? → descriptive vs predictive; we're its missing layer
- Who pays? → banks/RRBs; unlocks the 46% they can't underwrite
- Scale? → district-agnostic engine; swap the public data feeds
