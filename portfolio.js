(() => {
  'use strict';
  const data = window.PORTFOLIO_DATA;
  const endpoint = window.PORTFOLIO_AI_ENDPOINT || '';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = { context: '', history: [], lastQuestion: '', lastAnswer: '', previousFocus: null };
  const drawer = $('.ai-drawer');
  const input = $('#ai-input');
  const thread = $('#ai-thread');
  const status = $('#ai-status');
  const contextValue = $('#ai-context-value');

  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const project = id => data.projects.find(item => item.id === id);
  const evidence = (text, links, followups) => ({ text, links, followups });
  const intents = [
    { terms: ['flowpilot', 'sdlc', 'qa', 'human approval', 'agent handoff'], answer: () => evidence(project('flowpilot').description, [{ label: 'View FlowPilot', highlight: '#flowpilot' }], ['How are the human approval gates used?', 'Which other systems show AI-assisted engineering?']) },
    { terms: ['kubesage', 'kubernetes', 'k8s', 'eks', 'container', 'retrieval'], answer: () => evidence(project('kubesage').description, [{ label: 'View KubeSage', highlight: '#kubesage' }, { label: 'View Kubernetes experience', highlight: '#experience' }], ['How does the retrieval layer work?', 'What Kubernetes experience supports this project?']) },
    { terms: ['reliability', 'incident', 'recovery', 'failover', 'mttd', 'mttr', 'failure'], answer: () => evidence('The strongest reliability evidence is the Cognizant / JPMC-CCB platform: Route 53 health-check failover reduced recovery from 45 minutes to under 60 seconds, while Dynatrace and Splunk across 30+ endpoints reduced MTTD from 45 minutes to under 2 minutes. Event Store-Replay reduced MTTR from 4–6 hours to 45 minutes.', [{ label: 'View production impact', highlight: '#cognizant-role' }, { label: 'View Event Store-Replay', highlight: '#replay' }], ['Show me the AWS and Terraform evidence.', 'What is the strongest Kubernetes project?']) },
    { terms: ['aws', 'terraform', 'iac', 'cloud', 'provision', 'platform engineering'], answer: () => evidence('The strongest AWS and Terraform evidence is the multi-region Amazon ECS Fargate platform at Cognizant / JPMC-CCB, provisioned across 3 AWS accounts with Terraform Enterprise and Environment-as-Code. Delivery improved from 3–5 days to under 30 minutes. AWS Platform IaC adds reusable ECS/EKS, VPC, IAM, ALB/NLB, and Route53 modules with GitHub Actions gating.', [{ label: 'View production impact', highlight: '#cognizant-role' }, { label: 'View AWS Platform IaC', highlight: '#iac' }], ['What has Jwala built with Kubernetes?', 'Summarize the platform engineering evidence.']) },
    { terms: ['ai', 'agent', 'rag', 'bedrock', 'classifier'], answer: () => evidence('The AI engineering work spans Amazon Bedrock and Claude for document classification, a RAG pipeline with S3 ingestion and embeddings, KubeSage AI for Kubernetes incident intelligence, and FlowPilot for governed SDLC-to-QA handoffs. These are presented as applied systems with context, retrieval, classification, or human approval.', [{ label: 'View AI systems', highlight: '#projects' }, { label: 'View AI capability map', highlight: '#skills' }], ['Tell me about KubeSage AI.', 'Tell me about FlowPilot.']) }
  ];

  function localSearch(question) {
    const query = question.toLowerCase();
    const ranked = intents.map(intent => ({ intent, score: intent.terms.reduce((score, term) => score + (query.includes(term) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
    if (ranked[0]?.score) return ranked[0].intent.answer();
    if (/(summary|background|experience|who)/.test(query)) return evidence(`${data.summary} The strongest evidence is the current Cognizant / JPMC-CCB role, supported by AWS platform delivery, reliability outcomes, controlled pipelines, and observability improvements.`, [{ label: 'View experience', highlight: '#experience' }, { label: 'View capabilities', highlight: '#skills' }], ['What production reliability problems have been solved?', 'Which projects demonstrate platform engineering?']);
    return evidence("I can answer from verified portfolio data about platform engineering, SRE, AWS, Kubernetes, Terraform, AI systems, projects, and outcomes. I don't have verified portfolio information outside that scope.", [], ['Ask about reliability.', 'Ask about AWS and Terraform.', 'Ask about FlowPilot.']);
  }
  function focusables(container) { return [...container.querySelectorAll('button:not([disabled]), [href], input:not([disabled])')]; }
  function setContext(context = '') { state.context = context; contextValue.textContent = context || 'All verified portfolio data'; }
  function openAI(question = '', context = '') { state.previousFocus = document.activeElement; setContext(context); document.body.classList.add('ai-open'); drawer.setAttribute('aria-hidden', 'false'); input.value = question; input.focus(); if (question) ask(question); }
  function closeAI() { document.body.classList.remove('ai-open'); drawer.setAttribute('aria-hidden', 'true'); state.previousFocus?.focus(); }
  function addMessage(role, text, links = [], followups = []) {
    const message = document.createElement('article');
    message.className = `ai-message ${role}`;
    message.innerHTML = `<small>${role === 'user' ? 'You' : 'Portfolio Intelligence'}</small><p>${escapeHtml(text)}</p>${links.map(link => `<button class="ai-evidence" type="button" data-highlight="${link.highlight || ''}">${escapeHtml(link.label)} →</button>`).join(' ')}${followups.length ? `<div class="ai-followups">${followups.map(item => `<button class="ai-followup" type="button" data-question="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}</div>` : ''}`;
    thread.append(message);
    message.querySelectorAll('[data-highlight]').forEach(button => button.addEventListener('click', () => go(button.dataset.highlight, true)));
    message.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => ask(button.dataset.question)));
    thread.scrollTop = thread.scrollHeight;
  }
  async function ask(question) {
    const clean = question.trim().slice(0, 240); if (!clean) return;
    state.lastQuestion = clean; addMessage('user', clean); input.value = ''; status.textContent = 'Searching verified portfolio context...';
    let result;
    try {
      if (!endpoint) throw new Error('No live endpoint configured');
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: clean, context: data, focus: state.context }), signal: controller.signal }); clearTimeout(timeout);
      if (!response.ok) throw new Error('Live endpoint unavailable');
      const payload = await response.json(); result = evidence(payload.answer || "I don't have verified portfolio information about that.", payload.links || [], payload.followups || []); $('#ai-mode').textContent = 'AI connected'; status.textContent = 'AI connected — grounded in verified career data.';
    } catch (_) { result = localSearch(clean); $('#ai-mode').textContent = 'Local portfolio index'; status.textContent = 'Local portfolio index — deterministic search of verified career data.'; }
    state.lastAnswer = result.text; addMessage('assistant', result.text, result.links, result.followups);
  }
  function go(target, closeDrawer = false) { const node = $(target); if (!node) return; if (closeDrawer) closeAI(); node.scrollIntoView({ behavior: 'smooth', block: 'center' }); node.classList.add('highlight'); setTimeout(() => node.classList.remove('highlight'), 1200); history.replaceState(null, '', target); }
  function initAI() {
    $$('[data-ai-open]').forEach(button => button.addEventListener('click', () => openAI(button.dataset.question || '', button.dataset.context || '')));
    $$('[data-ai-close]').forEach(element => element.addEventListener('click', closeAI));
    $('#ai-clear-context').addEventListener('click', () => setContext());
    $('#ai-form').addEventListener('submit', event => { event.preventDefault(); ask(input.value); });
    $('#ai-suggestions').addEventListener('click', event => { const button = event.target.closest('[data-question]'); if (button) ask(button.dataset.question); });
    document.addEventListener('keydown', event => { if (!document.body.classList.contains('ai-open')) return; if (event.key === 'Escape') { event.preventDefault(); closeAI(); } if (event.key === 'Tab') { const items = focusables(drawer); const first = items[0], last = items.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
  }
  function initArchitecture() { const nodes = $$('.arch-node'), arrows = $$('.arch-arrow'), help = $('#arch-help'); let active = 0; const show = index => { nodes.forEach((node, i) => node.classList.toggle('flow-active', i === index)); arrows.forEach((arrow, i) => arrow.classList.toggle('flow-active', i === index)); help.textContent = nodes[index].dataset.purpose; }; nodes.forEach((node, index) => ['focus', 'mouseenter'].forEach(event => node.addEventListener(event, () => show(index)))); show(0); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => show(active = (active + 1) % nodes.length), 2800); }
  function initLenses() { const output = $('#lens-output'); $$('[data-lens]').forEach(button => button.addEventListener('click', () => { const lens = data.aiContext.lenses[button.dataset.lens]; $$('[data-lens]').forEach(item => item.classList.toggle('active', item === button)); output.classList.add('visible'); output.innerHTML = `<strong>${button.dataset.lens} lens</strong><p>Relevant evidence: ${lens.projects.map(id => project(id)?.name).join(' · ')}</p><p>Relevant stack: ${lens.skills.flatMap(key => data.skills[key]).join(' · ')}</p><div class="actions">${lens.questions.map(question => `<button class="button" type="button" data-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`).join('')}</div>`; output.querySelectorAll('[data-question]').forEach(item => item.addEventListener('click', () => openAI(item.dataset.question, button.dataset.lens))); })); }
  function initMap() { $$('[data-map-target]').forEach(button => button.addEventListener('click', () => button.dataset.question ? openAI(button.dataset.question, button.dataset.context) : go(button.dataset.mapTarget))); }
  function initAnalytics() {
    document.addEventListener('click', event => {
      const cta = event.target.closest('[data-cta]');
      if (!cta) return;
      window.dispatchEvent(new CustomEvent('portfolio:cta', { detail: { name: cta.dataset.cta, href: cta.href || '' } }));
    });
  }
  function initPalette() { const palette = $('#command-palette'), paletteInput = $('#palette-input'), list = $('#palette-list'); let previousFocus, index = 0; const commands = [['Navigate', 'Experience', () => go('#experience')], ['Navigate', 'Projects', () => go('#projects')], ['Navigate', 'Technical Expertise', () => go('#skills')], ['Navigate', 'Contact', () => go('#contact')], ['Ask', 'Ask about reliability', () => openAI('What production reliability problems have you solved?', 'SRE / Reliability')], ['Ask', 'Ask about Kubernetes', () => openAI('What has Jwala built with Kubernetes?', 'Kubernetes')], ['Ask', 'Ask about AWS/Terraform', () => openAI('Show me your strongest AWS and Terraform experience.', 'AWS Infrastructure')], ['Ask', 'Ask about AI systems', () => openAI('What is the AI engineering experience?', 'AI Infrastructure')], ['Ask', 'Ask about KubeSage', () => openAI('Tell me about KubeSage AI.', 'KubeSage AI')], ['Explore', 'KubeSage architecture', () => go('#kubesage-architecture')], ['Explore', 'FlowPilot', () => go('#flowpilot')], ['Explore', 'AWS Platform IaC', () => go('#iac')], ['Contact', 'LinkedIn', () => window.open(data.identity.links.linkedin, '_blank', 'noopener,noreferrer')], ['Contact', 'GitHub', () => window.open(data.identity.links.github, '_blank', 'noopener,noreferrer')], ['Contact', 'Email', () => { window.location.href = data.identity.links.email; }]];
    const render = () => { const filtered = commands.filter(command => `${command[0]} ${command[1]}`.toLowerCase().includes(paletteInput.value.toLowerCase())); index = Math.min(index, Math.max(0, filtered.length - 1)); let group = ''; list.innerHTML = filtered.map((command, i) => { const heading = command[0] !== group ? `<div class="palette-group">${command[0]}</div>` : ''; group = command[0]; return `${heading}<button class="palette-item${i === index ? ' active' : ''}" type="button" data-index="${i}"><span>${command[1]}</span><kbd>Enter</kbd></button>`; }).join('') || '<div class="palette-empty">No commands match.</div>'; list.querySelectorAll('[data-index]').forEach(item => item.addEventListener('click', () => { close(); filtered[Number(item.dataset.index)][2](); })); };
    const open = () => { previousFocus = document.activeElement; palette.classList.add('open'); palette.setAttribute('aria-hidden', 'false'); index = 0; paletteInput.value = ''; render(); paletteInput.focus(); }; const close = () => { palette.classList.remove('open'); palette.setAttribute('aria-hidden', 'true'); previousFocus?.focus(); };
    window.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); palette.classList.contains('open') ? close() : open(); return; } if (!palette.classList.contains('open')) return; if (event.key === 'Escape') { event.preventDefault(); close(); } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const count = list.querySelectorAll('[data-index]').length; if (count) { index = (index + (event.key === 'ArrowDown' ? 1 : -1) + count) % count; render(); } } else if (event.key === 'Enter') { event.preventDefault(); list.querySelector(`[data-index="${index}"]`)?.click(); } }); paletteInput.addEventListener('input', () => { index = 0; render(); });
  }
  initAI(); initArchitecture(); initLenses(); initMap(); initAnalytics(); initPalette();
})();
