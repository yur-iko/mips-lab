import {lessons, initial, execute, instruction, address, gradeAnswer} from './engine.js?v=3';
import {chapters} from './lessons.js?v=3';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const done = new Set();
let index = 0, history = [], state, hex = false, chapterFilter = 'all';
const fmt = value => hex ? '0x' + (value >>> 0).toString(16).padStart(8, '0') : String(value);
const number = value => String(value).padStart(2, '0');
const filtered = () => lessons.map((lesson, i) => i).filter(i => chapterFilter === 'all' || lessons[i].chapter === chapterFilter).sort((a, b) => Number(lessons[a].chapter) - Number(lessons[b].chapter) || a - b);

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  $('theme').setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
$('theme').onclick = () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try { localStorage.setItem('mips-lab-theme', theme); } catch {}
};

function renderNavigation() {
  $('chapter-filter').innerHTML = '<option value="all">All chapters</option>' + chapters.map(([id, title]) => `<option value="${id}">Chapter ${id} · ${escape(title)}</option>`).join('');
  $('chapter-filter').value = chapterFilter;
  $('session-picker').innerHTML = chapters.filter(([id]) => chapterFilter === 'all' || id === chapterFilter).map(([id, title]) => `<optgroup label="Chapter ${id} · ${escape(title)}">${lessons.map((lesson, i) => ({lesson, i})).filter(item => item.lesson.chapter === id).map(({lesson, i}) => `<option value="${i}">${escape(lesson.short)}${done.has(i) ? ' · complete' : ''}</option>`).join('')}</optgroup>`).join('');
  $('session-picker').value = String(index);
  $('progress').textContent = `${done.size} of ${lessons.length} sessions complete`;
}

function select(i) {
  index = i;
  state = initial(lessons[i]);
  history = [];
  render();
}

function renderVisual(visual) {
  if (!visual) return '';
  if (visual.type === 'bits') {
    return `<div class="figure-scroll" role="region" aria-label="Bit fields" tabindex="0"><div class="bit-fields">${visual.segments.map(([label, width, value]) => `<div style="flex:${width}"><span>${escape(label)}</span><code>${escape(value)}</code></div>`).join('')}</div></div><p class="figure-hint">Scroll the fields sideways on a narrow screen.</p>`;
  }
  const cycles = Math.max(...visual.rows.map(row => row[1].length));
  return `<div class="figure-scroll" role="region" aria-label="Pipeline timing diagram" tabindex="0"><table class="pipeline-table"><caption>Each column is one clock cycle</caption><thead><tr><th scope="col">Instruction</th>${Array.from({length: cycles}, (_, i) => `<th scope="col">${i + 1}</th>`).join('')}</tr></thead><tbody>${visual.rows.map(([label, stages]) => `<tr><th scope="row">${escape(label)}</th>${stages.map(stage => `<td class="${stage.includes('stall') ? 'stall' : ''}">${escape(stage || '·')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="figure-hint">Scroll the timing diagram sideways to see all cycles.</p>`;
}

function renderState(lesson, next, previous) {
  const guided = lesson.kind === 'guided';
  $('format').hidden = guided;
  $('registers').hidden = guided;
  $('memory').hidden = guided;
  $('given-data').hidden = !guided;
  $('state-title').textContent = guided ? '02 / Given values' : '02 / Machine state';
  $('state-description').textContent = guided ? (next ? 'Use these values for the current checkpoint.' : 'You have reached the end of this session.') : 'Registers are tiny storage slots inside the CPU.';
  $('state-note').textContent = guided ? lesson.assumption : 'Highlighted values changed on the last step. $zero always stays 0.';
  if (guided) {
    const question = next?.question;
    $('given-data').innerHTML = question ? `<dl class="givens">${question.givens.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${renderVisual(question.visual)}` : '<p class="completion-note">Use Back to revisit a checkpoint, restart to practice again, or choose another session.</p>';
    return;
  }
  const role = name => name === 'zero' ? 'constant' : name === 'sp' ? 'stack pointer' : name === 'ra' ? 'return address' : name.startsWith('a') ? 'argument' : name.startsWith('v') ? 'return value' : name.startsWith('s') ? 'saved register' : 'temporary';
  $('registers').innerHTML = Object.entries(state.regs).map(([name, value]) => `<div class="reg ${previous && previous.regs[name] !== value ? 'changed' : ''}"><code>$${name}</code><strong>${fmt(value)}</strong><small>${role(name)}</small></div>`).join('');
  $('memory').innerHTML = Object.keys(state.memory).length ? '<h4>Memory · word values</h4>' + Object.entries(state.memory).map(([addr, value]) => `<div class="mem ${previous && previous.memory[addr] !== value ? 'changed' : ''}"><code>0x${Number(addr).toString(16)}</code><strong>${fmt(value)}</strong></div>`).join('') : '';
}

function render() {
  const lesson = lessons[index];
  const guided = lesson.kind === 'guided';
  const next = execute(lesson, state);
  const previous = history.at(-1);
  const length = guided ? lesson.steps.length : lesson.code.length;
  renderNavigation();
  $('chapter').textContent = `CHAPTER ${lesson.chapter} · ${guided ? 'GUIDED PRACTICE' : 'INSTRUCTION TRACE'}`;
  $('title').textContent = lesson.title;
  $('description').textContent = lesson.desc;
  $('source').textContent = 'From ' + lesson.source;
  $('analogy').textContent = lesson.cpp;
  $('activity-title').textContent = guided ? '01 / Checkpoints' : '01 / Instructions';
  $('position').textContent = next ? `${guided ? 'Checkpoint' : 'Line'} ${state.pc + 1} of ${length}` : 'Complete ✓';
  $('code').innerHTML = guided ? `<ol class="checkpoint-list">${lesson.steps.map((question, i) => `<li class="${i === state.pc ? 'current' : ''}"${i === state.pc ? ' aria-current="step"' : ''}><span>${i < state.pc ? '✓' : number(i + 1)}</span><span>${escape(question.label)}</span></li>`).join('')}</ol>` : lesson.code.map((ins, i) => `<div class="instruction ${i === state.pc ? 'current' : ''}"><span>${number(i + 1)}</span><code>${escape(instruction(ins))}</code><small>${i === state.pc ? '← next' : ''}</small></div>`).join('') + (lesson.code.some(ins => (ins[0] === 'j' || ins[0] === 'jal') && ins[1] === length) ? `<p class="end-label">L${length + 1}: end of example</p>` : '');
  $('step-hint').textContent = guided ? 'Work through one decision at a time.' : '→ highlighted line executes next';
  $('pc').hidden = guided;
  $('pc').textContent = guided ? '' : `PC 0x${address(state.pc).toString(16)}`;
  renderState(lesson, next, previous);
  $('back').disabled = !history.length;
  $('step').disabled = !next;
  $('step').textContent = guided ? 'Next checkpoint →' : 'Step instruction →';
  $('answer-form').hidden = !next;
  $('reveal').hidden = !next;
  $('question').textContent = next ? guided ? next.question.prompt : `After this instruction, what is ${next.target === 'PC' ? 'the next PC' : next.target.startsWith('memory') ? next.target : '$' + next.target}?` : 'Session complete. Nicely reasoned.';
  const options = next?.question?.choices;
  $('answer').hidden = !!options;
  $('choice-answer').hidden = !options;
  $('answer-label').htmlFor = options ? 'choice-answer' : 'answer';
  $('answer-label').textContent = options ? 'Your answer' : 'Your prediction';
  $('answer-hint').textContent = options ? 'Select one answer, then check your reasoning.' : guided ? `${next?.question?.unit ? 'Answer in ' + next.question.unit + '. ' : ''}Decimal, 0x hexadecimal, and 0b binary are accepted.` : 'Decimal, 0x hexadecimal, or 0b binary. Registers also accept the equivalent 32-bit bit pattern.';
  $('answer').value = '';
  $('choice-answer').innerHTML = options ? '<option value="">Choose an answer</option>' + options.map(option => `<option value="${escape(option)}">${escape(option)}</option>`).join('') : '';
  $('feedback').textContent = next ? 'Predict first, or reveal the explanation when you need a hint.' : 'Choose another session or restart to practice again.';
  $('feedback').className = '';
  $('explanation').hidden = true;
  $('explanation').textContent = next?.explain || '';
  $('reveal').textContent = 'Reveal explanation ↓';
  $('next-session').hidden = !!next || filtered().indexOf(index) === filtered().length - 1;
}

$('chapter-filter').onchange = event => {
  chapterFilter = event.target.value;
  select(filtered().includes(index) ? index : filtered()[0]);
};
$('session-picker').onchange = event => select(Number(event.target.value));
$('step').onclick = () => {
  const next = execute(lessons[index], state);
  if (!next) return;
  history.push(structuredClone(state));
  state = next.state;
  if (!execute(lessons[index], state)) done.add(index);
  render();
};
$('back').onclick = () => { if (history.length) { state = history.pop(); render(); } };
$('reset').onclick = () => select(index);
$('format').onclick = () => { hex = !hex; renderState(lessons[index], execute(lessons[index], state), history.at(-1)); };
$('answer-form').onsubmit = event => {
  event.preventDefault();
  const lesson = lessons[index];
  const next = execute(lesson, state);
  if (!next) return;
  const result = gradeAnswer(lesson, next, next.question?.choices ? $('choice-answer').value : $('answer').value);
  $('feedback').textContent = !result.valid ? next.question?.choices ? 'Choose an answer from the list, then try again.' : lesson.kind === 'guided' ? 'Enter a valid number, such as 8, 0.975, 0x8, or 0b1000.' : 'Enter a whole 32-bit value, such as 8, −1, 0x8, or 0b1000.' : result.correct ? 'Correct! Continue when you are ready.' : 'Not quite. Review the given values or reveal the explanation, then try again.';
  $('feedback').className = result.correct ? 'correct' : 'incorrect';
};
$('reveal').onclick = () => {
  $('explanation').hidden = !$('explanation').hidden;
  $('reveal').textContent = $('explanation').hidden ? 'Reveal explanation ↓' : 'Hide explanation ↑';
};
$('next-session').onclick = () => select(filtered()[filtered().indexOf(index) + 1]);
select(0);
