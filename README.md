# ScamScreen

**Check a suspicious message before you act on it.** Paste a text, email, or DM and ScamScreen explains the red flags in plain English and tells you what to do next. Built for **SafeSpace Hacks**.

## The safety problem

Scam messages work because they look normal to non-technical people: a Royal Mail fee, an HMRC rebate, a "Hi mum, new number" text. The existing advice ("look for red flags") assumes people already know what those are. ScamScreen names each flag, shows the exact words that tripped it, and explains why it matters.

## Trust and privacy by design

- **100% on-device.** The whole analysis is local JavaScript. Nothing you paste is sent to any server - the site has no backend, no account, no analytics. (The local `run.mjs` only serves the static files.)
- **No black box.** Every flag includes the exact evidence snippet it matched.
- **No "safe" verdict.** The best result is "No red flags found", always with an explicit note that a new scam can pass every check and an odd genuine message can trip one.
- **Not a replacement for official help.** The disclaimer says so plainly, with 999 for emergencies and "call your bank on the number on your card" if money is already gone.

## What it checks

Pressure and urgency - untraceable payment asks (gift cards, crypto, wire) - credential and one-time-code fishing - "verify your account" bait - too-good-to-be-true offers - "Hi mum" family impersonation - generic greetings - impersonation of trusted UK organisations (HMRC, NHS, Royal Mail, banks) - and link forensics: raw IPs, punycode, shorteners, unusual TLDs, unencrypted http, and lookalike domains one letter off a real brand (edit-distance check per label, hyphens stripped).

Verdicts: **Likely a scam** / **Suspicious** / **No red flags found**, each with tailored next steps (7726 for texts, report@phishing.gov.uk for emails, Action Fraud, 159 for banks).

## Try it

- Live demo: (Vercel URL after deploy)
- Three clearly-labelled synthetic example messages are built into the page.

## Run locally

```
node run.mjs   # zero dependencies, Node 18+
# open http://localhost:4175
```

## Limitations (honest list)

- Pattern rules miss brand-new scam scripts and can flag unusual-but-genuine messages.
- It reads text only; it cannot check who really sent a message or where a link's landing page leads.
- Brand list is UK-weighted and finite.
- It is a second opinion that teaches, not a gatekeeper.

## License

MIT.
