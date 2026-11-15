// ScamScreen rule engine. Pure functions, no network, no deps.
// Every flag carries the exact evidence snippet it matched - no black box.
// The engine NEVER says "safe": its best verdict is "no red flags found",
// with an explicit not-a-guarantee note. That is a design rule, not a gap.

const BRANDS = [
  'paypal', 'amazon', 'microsoft', 'apple', 'netflix', 'royalmail', 'evri', 'dhl',
  'fedex', 'ups', 'hmrc', 'gov.uk', 'dvla', 'nhs', 'tvlicensing', 'barclays',
  'hsbc', 'natwest', 'lloyds', 'santander', 'monzo', 'revolut', 'halifax', 'tsb',
  'metro bank', 'coinbase', 'binance', 'metamask', 'facebook', 'instagram', 'whatsapp',
];

const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'shorturl.at', 'is.gd', 'buff.ly', 'ow.ly', 'tiny.cc', 'shorte.st'];
const SHADY_TLDS = ['.top', '.xyz', '.click', '.link', '.buzz', '.icu', '.cam', '.rest', '.quest', '.lol', '.monster', '.cfd', '.sbs', '.autos', '.beauty'];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

function extractUrls(text) {
  const out = [];
  const re = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ raw: m[0], index: m.index });
  // bare domains like secure-paypal.top (no scheme)
  const bare = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
  while ((m = bare.exec(text)) !== null) {
    if (!out.some(u => u.index <= m.index && m.index < u.index + u.raw.length)) out.push({ raw: m[0], index: m.index });
  }
  return out;
}

function hostOf(raw) {
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : 'http://' + raw).hostname.toLowerCase(); }
  catch { return null; }
}

function snippet(text, index, len = 70) {
  const start = Math.max(0, index - 10);
  return text.slice(start, start + len).replace(/\s+/g, ' ').trim();
}

const RX = (re, id, label, explain, weight) => ({
  id, label, explain, weight, type: 'regex',
  test(text) {
    const hits = [];
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = g.exec(text)) !== null && hits.length < 3) hits.push(snippet(text, m.index));
    return hits;
  },
});

const RULES = [
  RX(/\b(urgent|immediately|right away|act now|final (notice|warning|reminder)|within \d+\s*(hours?|minutes?|days?)|account (will be|has been|is) (suspended|closed|locked|limited|restricted)|expires? (today|in \d+)|legal action|arrest warrant)\b/i,
    'urgency', 'Pressure and urgency',
    'Scams rush you so you do not stop to think or check. Real organisations give you time and never punish you for verifying.',
    25),
  RX(/\b(gift cards?|itunes card|google play card|steam card|vouchers?|bitcoin|btc|crypto(currency)?|usdt|ethereum|wire transfer|western union|moneygram|bank transfer to|sort code|account number)\b/i,
    'payment', 'Untraceable payment request',
    'Gift cards, crypto, and wire transfers are how scammers get paid because the money cannot be recovered. No real company, bank, or government asks for these.',
    35),
  RX(/\b(password|passcode|one[- ]time (pass)?code|otp|verification code|6[- ]digit code|pin\b|cvv|cvc|security code|card number|full card|login details|sign[- ]in details|memorable (word|information)|mother'?s maiden)/i,
    'credentials', 'Asks for codes or credentials',
    'Real banks and services never ask for your password, PIN, full card details, or one-time codes by message. A code is a key - whoever gets it can get in.',
    35),
  RX(/\b(verify your (account|identity|details)|confirm your (details|identity|account|payment)|update your (details|payment|billing)|re-?activate|unusual (activity|sign[- ]in|login)|suspicious (activity|transaction|login)|unauthori[sz]ed)\b/i,
    'verify-bait', '"Verify your account" bait',
    'This is the classic opening of a phishing message: a made-up problem with your account plus a link to "fix" it. The fix page is the trap.',
    25),
  RX(/\b(congratulations|you (have|’ve|'ve) won|winner|prize|lottery|jackpot|inheritance|compensation (claim|payment)|unclaimed (funds|refund)|you (have been|’ve been|'ve been) (selected|chosen)|100% free|free gift|claim your)\b/i,
    'too-good', 'Too good to be true',
    'Unexpected prizes, refunds, and windfalls that need you to act (or pay a small fee first) are bait. If you did not enter, you did not win.',
    30),
  RX(/\b(hi (mum|dad|mom|son|daughter)|new number|lost my phone|phone (broke|is broken|got stolen)|save this number|text me on this number)\b/i,
    'family-impersonation', 'Family impersonation ("Hi mum")',
    'A "new number" message from a family member who then needs money is one of the most common UK scams. Always call their OLD number to check before doing anything.',
    40),
  RX(/\b(dear (customer|user|sir|madam|client|account holder)|valued customer)\b/i,
    'generic-greeting', 'Generic greeting',
    'Your bank, the NHS, HMRC, and delivery firms use your name. "Dear customer" often means the sender does not actually know you.',
    10),
  RX(/\b(hmrc|tax (rebate|refund|return)|council tax|tv licen[cs]e|dvla|nhs|royal mail|evri|dhl|parcel (delivery|redelivery)|customs (fee|charge)|missed delivery|redelivery fee)\b/i,
    'impersonation', 'Impersonates a trusted organisation',
    'Scammers borrow the names of organisations people trust. HMRC, the NHS, and delivery firms do not demand fees or details by text. Check via the official website or app, never the link in the message.',
    20),
];

function linkFlags(text) {
  const flags = [];
  const urls = extractUrls(text);
  for (const u of urls) {
    const host = hostOf(u.raw);
    if (!host) continue;
    const snip = snippet(text, u.index);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host))
      flags.push({ id: 'link-ip', label: 'Link is a raw IP address', weight: 30, evidence: [snip],
        explain: 'Legitimate organisations use named websites. A link that is just numbers hides where it really goes.' });
    if (host.includes('xn--'))
      flags.push({ id: 'link-punycode', label: 'Disguised internationalised domain', weight: 30, evidence: [snip],
        explain: 'This link uses punycode, a trick that lets lookalike letters (like a Cyrillic "a") impersonate a real address.' });
    if (SHORTENERS.includes(host))
      flags.push({ id: 'link-shortener', label: 'Shortened link hides the destination', weight: 20, evidence: [snip],
        explain: `Short links like ${host} hide where the link really goes. Do not tap it - you cannot see what you are opening.` });
    if (SHADY_TLDS.some(t => host.endsWith(t)))
      flags.push({ id: 'link-tld', label: 'Link uses an unusual domain ending', weight: 15, evidence: [snip],
        explain: 'Endings like .top, .xyz, or .click cost pennies and are heavily used by scam sites. Real UK organisations use .co.uk, .gov.uk, .nhs.uk or .com.' });
    if (/^http:\/\//i.test(u.raw))
      flags.push({ id: 'link-http', label: 'Link is not encrypted (http)', weight: 10, evidence: [snip],
        explain: 'A login or payment page without https sends what you type openly. Real services always use https.' });
    // lookalike: each non-TLD label, hyphens stripped, near a brand name
    const labels = host.replace(/^www\./, '').split('.').slice(0, -1)
      .map(l => l.replace(/-/g, '')).filter(l => l.length >= 4);
    for (const b of BRANDS) {
      const bb = b.replace(/[ .]/g, '');
      if (bb.length < 4) continue;
      if (host === bb || host.endsWith('.' + bb) || host.endsWith(b) || host.endsWith(b + '.uk') || host.endsWith(b + '.com')) continue;
      let verdict = null;
      for (const lab of labels) {
        if (lab === bb) continue;
        if (levenshtein(lab, bb) <= 1 || (lab.length > bb.length && levenshtein(lab.slice(0, bb.length), bb) <= 1)) { verdict = 'lookalike'; break; }
        if (lab.includes(bb)) { verdict = 'brandstuff'; break; }
      }
      if (verdict === 'lookalike') {
        flags.push({ id: 'link-lookalike', label: `Lookalike link imitating "${b}"`, weight: 40, evidence: [snip],
          explain: `"${host}" is one letter off from the real ${b} address. That tiny difference is the whole scam - the page will look real.` });
        break; // one brand verdict per link is enough
      } else if (verdict === 'brandstuff') {
        flags.push({ id: 'link-brandstuff', label: `Brand name "${b}" inside an unrelated link`, weight: 25, evidence: [snip],
          explain: `"${host}" contains "${b}" but is not the real ${b} site. Real addresses end with the brand's domain - anything before it is decoration.` });
        break;
      }
    }
  }
  return flags;
}

export function analyze(text) {
  const flags = [];
  for (const r of RULES) {
    const hits = r.test(text);
    if (hits.length) flags.push({ id: r.id, label: r.label, explain: r.explain, weight: r.weight, evidence: hits });
  }
  flags.push(...linkFlags(text));
  const score = flags.reduce((a, f) => a + f.weight, 0);
  let verdict, tone;
  if (score === 0) {
    verdict = 'No red flags found';
    tone = 'calm';
  } else if (score < 40) {
    verdict = 'Suspicious - treat with caution';
    tone = 'caution';
  } else {
    verdict = 'Likely a scam';
    tone = 'alert';
  }
  return {
    score, verdict, tone, flags,
    linksFound: extractUrls(text).length,
    disclaimer: 'This tool looks for common scam patterns. It cannot prove a message is safe or fake - a brand-new scam can pass every check, and an odd but genuine message can trip one. When in doubt, contact the organisation through its official app, website, or the phone number on your card or statement. Never use contact details from the message itself.',
  };
}

export const NEXT_STEPS = {
  likely: [
    'Do not reply, click links, or open attachments.',
    'Do not pay or send codes, even to "prove" it is you.',
    'If it claims to be your bank, call 159 (Stop Scams UK) to reach your bank safely.',
    'Forward scam texts to 7726 (free, all UK networks).',
    'Forward phishing emails to report@phishing.gov.uk.',
    'Report it to Action Fraud: actionfraud.police.uk or 0300 123 2040.',
    'If you already shared card or bank details, call your bank NOW using the number on your card.',
    'If you shared a password, change it everywhere you reuse it.',
  ],
  suspicious: [
    'Do not use links, numbers, or reply addresses from the message.',
    'Check independently: open the organisation\'s official app, or type its website yourself.',
    'If it mentions a family member, call them on the number you already have.',
    'Forward suspicious texts to 7726 (free).',
  ],
  calm: [
    'Nothing stood out, but stay sceptical of unexpected messages asking for action.',
    'If it later asks for money, codes, or details - re-check it here or verify directly with the organisation.',
  ],
};
