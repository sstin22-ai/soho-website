<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Request a Redesign · SoHo Media House</title>
<meta name="robots" content="noindex">
<style>
  :root{--bg:#0a0a0f;--panel:#111118;--line:rgba(255,255,255,0.1);--text:#fff;--muted:rgba(255,255,255,0.55);--accent:#FF6B35;--gold:#C9A96E}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px}
  .wrap{width:100%;max-width:620px}
  .brand{font-family:Georgia,serif;font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:28px}
  h1{font-family:Georgia,serif;font-weight:400;font-size:clamp(32px,6vw,48px);line-height:1.08;margin-bottom:14px}
  h1 em{color:var(--accent)}
  .lede{color:var(--muted);font-size:15px;line-height:1.7;margin-bottom:32px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:28px}
  label{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
  .opts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:24px}
  .opt{position:relative}
  .opt input{position:absolute;opacity:0}
  .opt span{display:block;border:1.5px solid var(--line);border-radius:12px;padding:14px;font-size:14px;cursor:pointer;transition:border-color .2s,background .2s}
  .opt span small{display:block;color:var(--muted);font-size:12px;margin-top:4px}
  .opt input:checked+span{border-color:var(--accent);background:rgba(255,107,53,0.08)}
  .opt input:focus-visible+span{outline:2px solid var(--accent);outline-offset:2px}
  textarea,input[type=text]{width:100%;background:#0d0d14;border:1.5px solid var(--line);border-radius:12px;padding:14px 16px;color:var(--text);font-size:14px;font-family:inherit;outline:none;margin-bottom:22px}
  textarea{min-height:140px;resize:vertical;line-height:1.6}
  textarea:focus,input[type=text]:focus{border-color:var(--accent)}
  button{width:100%;background:var(--accent);color:#fff;border:0;border-radius:999px;padding:16px;font-size:15px;font-weight:600;cursor:pointer;transition:transform .15s,opacity .2s}
  button:hover{transform:translateY(-1px)}
  button:disabled{opacity:.6;cursor:wait;transform:none}
  .msg{display:none;text-align:center;padding:30px 10px}
  .msg h2{font-family:Georgia,serif;font-weight:400;font-size:30px;margin-bottom:10px}
  .msg p{color:var(--muted);line-height:1.7}
  .err{color:#ff8a65;font-size:13px;margin:-8px 0 16px;display:none}
  @media(max-width:480px){.opts{grid-template-columns:1fr}}
</style>
</head>
<body>
<main class="wrap">
  <div class="brand">SoHo Media House</div>
  <div id="formView">
    <h1>Let's make it <em>exactly</em> you.</h1>
    <p class="lede">Tell us what you'd like changed and our creative team will design a fresh round of three concepts. Be as specific as you like — colors, mood, a show or brand you love, what didn't feel right.</p>
    <div class="card">
      <label>Start from</label>
      <div class="opts" role="radiogroup">
        <label class="opt"><input type="radio" name="base" value="fresh" checked><span>Start fresh<small>Three all-new directions</small></span></label>
        <label class="opt"><input type="radio" name="base" value="a"><span>Build on Concept A<small>Keep what worked</small></span></label>
        <label class="opt"><input type="radio" name="base" value="b"><span>Build on Concept B<small>Keep what worked</small></span></label>
        <label class="opt"><input type="radio" name="base" value="c"><span>Build on Concept C<small>Keep what worked</small></span></label>
      </div>
      <label for="feedback">What should change?</label>
      <textarea id="feedback" placeholder="e.g. Make it feel like a playful 90s Saturday-morning cartoon — brighter colors, wobbly hand-drawn shapes, chunkier fun lettering. Less luxury, more giggles."></textarea>
      <label for="inspo">Inspiration (optional)</label>
      <input type="text" id="inspo" placeholder="Shows, brands, or websites you love">
      <div class="err" id="err"></div>
      <button id="go">Send to the studio ↻</button>
    </div>
  </div>
  <div class="msg" id="doneView">
    <h2>It's in the studio.</h2>
    <p>Your new round of concepts is being designed now. Check your inbox for a confirmation — fresh concepts arrive within 24 hours.</p>
  </div>
</main>
<script>
(function(){
  var q = new URLSearchParams(location.search);
  var id = q.get('id'), t = q.get('t');
  var err = document.getElementById('err');
  function showErr(m){ err.textContent = m; err.style.display = 'block'; }
  if (!id || !t) { showErr('This redesign link is incomplete. Please use the link from your email.'); document.getElementById('go').disabled = true; }
  document.getElementById('go').addEventListener('click', function(){
    var btn = this;
    var feedback = document.getElementById('feedback').value.trim();
    if (feedback.length < 10) { showErr('Tell us a little more about what you would like changed.'); return; }
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Sending...';
    fetch('/api/redesign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, t: t, base: document.querySelector('input[name=base]:checked').value, feedback: feedback, inspiration: document.getElementById('inspo').value.trim() })
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(x){
        if (!x.ok) throw new Error((x.d && x.d.error) || 'Something went wrong.');
        document.getElementById('formView').style.display = 'none';
        document.getElementById('doneView').style.display = 'block';
      })
      .catch(function(e){ showErr(e.message || 'Something went wrong. Please email hello@sohomediahouse.com'); btn.disabled = false; btn.textContent = 'Send to the studio ↻'; });
  });
})();
</script>
</body>
</html>
