(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const drawer = $('.ai-drawer');
  const backdrop = $('.ai-backdrop');
  const thread = $('#ai-thread');
  const input = $('#ai-input');

  function openAI(question = '') {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('open');
    if (question) answer(question);
    else input.focus();
  }
  function closeAI() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('open');
  }
  function answer(question) {
    const q = document.createElement('div');
    q.className = 'ai-message'; q.textContent = question;
    const a = document.createElement('div');
    a.className = 'ai-message';
    const lower = question.toLowerCase();
    a.textContent = lower.includes('terraform') || lower.includes('aws')
      ? 'The strongest evidence is multi-account Terraform Enterprise and Environment-as-Code delivery, plus reusable ECS/EKS, VPC, IAM, ALB/NLB, and Route 53 modules.'
      : lower.includes('kubernetes')
        ? 'Jwala provisioned production EKS clusters with ALB ingress, managed node groups, IRSA, and Container Insights, and built KubeSage AI for evidence-led Kubernetes incident investigation.'
        : 'The core reliability evidence is Route 53 health-check failover improving recovery from 45 minutes to under 60 seconds, and Dynatrace/Splunk reducing detection from 45 minutes to under 2 minutes.';
    thread.append(q, a); thread.scrollTop = thread.scrollHeight;
  }
  $$('[data-ai-open]').forEach(button => button.addEventListener('click', () => openAI()));
  $$('[data-ai-close]').forEach(button => button.addEventListener('click', closeAI));
  $$('.ai-suggestions button').forEach(button => button.addEventListener('click', () => answer(button.dataset.question)));
  $('#ai-form').addEventListener('submit', event => { event.preventDefault(); answer(input.value); input.value = ''; });

  const palette = $('#command-palette');
  const paletteInput = $('#palette-input');
  const paletteList = $('#palette-list');
  const commands = [
    ['Experience', () => location.hash = '#experience'], ['Infrastructure evidence', () => location.hash = '#infrastructure-evidence'],
    ['Systems', () => location.hash = '#projects'], ['Capabilities', () => location.hash = '#skills'], ['Contact', () => location.hash = '#contact'],
    ['Ask about reliability', () => openAI('What production reliability problems have you solved?')], ['Ask about AWS and Terraform', () => openAI('Show me AWS and Terraform experience.')]
  ];
  function renderCommands(filter = '') {
    const matched = commands.filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()));
    paletteList.replaceChildren(...matched.map(([name, run]) => { const button = document.createElement('button'); button.textContent = name; button.addEventListener('click', () => { closePalette(); run(); }); return button; }));
  }
  function openPalette() { palette.classList.add('open'); palette.setAttribute('aria-hidden', 'false'); renderCommands(); paletteInput.value = ''; paletteInput.focus(); }
  function closePalette() { palette.classList.remove('open'); palette.setAttribute('aria-hidden', 'true'); }
  $('[data-palette-open]').addEventListener('click', openPalette);
  paletteInput.addEventListener('input', () => renderCommands(paletteInput.value));
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openPalette(); } if (event.key === 'Escape') { closePalette(); closeAI(); } });
  palette.addEventListener('click', event => { if (event.target === palette) closePalette(); });

  const lenses = { 'Platform Engineering': 'Terraform Enterprise, reusable AWS modules, delivery controls, and ECS/EKS patterns.', 'SRE / Reliability': 'Route 53 failover, observability, incident response, and measurable recovery and detection improvements.', 'AWS Infrastructure': 'AWS ECS, EKS, VPC, IAM, ALB/NLB, Route 53, CloudWatch, and Terraform automation.' };
  $$('.lens-button').forEach(button => button.addEventListener('click', () => { $('#lens-output').textContent = lenses[button.dataset.lens]; }));
})();
