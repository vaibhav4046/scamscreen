import { analyze, NEXT_STEPS } from '/src/rules.mjs';

const EXAMPLES = [
  // Synthetic, for demonstration only.
  `ROYAL MAIL: Your parcel could not be delivered on 14/11. A redelivery fee of GBP 1.99 is required. Pay within 24 hours or the parcel will be returned to sender: http://royalmail-redelivery.top/pay`,
  `HMRC TAX NOTICE: Our records show you are due a rebate of 482.60 GBP. This is your final reminder - claim within 48 hours or the rebate expires. Confirm your card details here: https://bit.ly/3xRebate`,
  `Hi mum, my phone fell in water, this is my new number, save it please. I urgently need to pay a bill today, can you transfer 200 to this sort code and account number? I will explain everything later, love you xxx`,
];

const $ = id => document.getElementById(id);

document.querySelectorAll('.ex').forEach(btn => {
  btn.onclick = () => {
    $('msg').value = EXAMPLES[+btn.dataset.ex];
    $('msg').focus();
  };
});

$('clear').onclick = () => { $('msg').value = ''; $('result').hidden = true; };

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

$('go').onclick = () => {
  const text = $('msg').value.trim();
  if (!text) { $('msg').focus(); return; }
  const r = analyze(text);

  const banner = $('banner');
  banner.className = r.tone;
  const sub = {
    alert: 'This message shows strong scam patterns. Do not click, pay, or reply.',
    caution: 'Some things here are worth checking before you trust this message.',
    calm: 'None of the common scam patterns showed up - see the note below before you rely on that.',
  }[r.tone];
  banner.innerHTML = `<h2>${esc(r.verdict)}</h2><p>${esc(sub)}</p>`;

  const flags = $('flags');
  flags.innerHTML = r.flags.map(f => `
    <div class="flag ${f.weight >= 30 ? '' : (f.weight >= 15 ? 'caution' : 'info')}">
      <h3>${esc(f.label)}</h3>
      <p>${esc(f.explain)}</p>
      ${f.evidence.map(e => `<div class="ev">&ldquo;${esc(e)}&rdquo;</div>`).join('')}
    </div>`).join('');

  const steps = r.tone === 'alert' ? NEXT_STEPS.likely : r.tone === 'caution' ? NEXT_STEPS.suspicious : NEXT_STEPS.calm;
  $('steps').innerHTML = steps.map(s => `<li>${esc(s)}</li>`).join('');
  $('disclaimer').textContent = r.disclaimer;

  $('result').hidden = false;
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
