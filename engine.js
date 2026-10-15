import {lessons} from './lessons.js?v=3';
export {lessons};

export const address = pc => 4194304 + pc * 4;
const signed16 = value => (value << 16) >> 16;
const hex = value => '0x' + (value >>> 0).toString(16).padStart(8, '0');

export function initial(lesson) {
  if (lesson.kind === 'guided') return {pc: 0};
  const regs = {zero: 0, t0: 0, t1: 0, t2: 0, s0: 0, ...lesson.regs};
  for (const ins of lesson.code) {
    for (const operand of ins.slice(1)) {
      if (typeof operand === 'string' && !(operand in regs)) regs[operand] = 0;
    }
  }
  for (const name of Object.keys(regs)) regs[name] |= 0;
  regs.zero = 0;
  return {regs, memory: {...lesson.memory}, pc: 0};
}

export function execute(lesson, state) {
  const length = lesson.kind === 'guided' ? lesson.steps.length : lesson.code.length;
  if (state.pc >= length) return null;
  if (state.pc < 0 || !Number.isInteger(state.pc)) throw new Error('Invalid instruction position');
  if (lesson.kind === 'guided') {
    const question = lesson.steps[state.pc];
    return {state: {pc: state.pc + 1}, target: question.label, value: question.answer, explain: question.explain, question};
  }

  const next = structuredClone(state);
  const [op, a, b, c] = lesson.code[state.pc];
  const reg = name => state.regs[name] | 0;
  let target = a;
  let value;
  let explain;
  next.pc++;

  if (['add', 'addi', 'sub'].includes(op)) {
    const left = reg(b);
    const right = op === 'addi' ? signed16(c) : reg(c);
    value = op === 'sub' ? left - right : left + right;
    if (value < -2147483648 || value > 2147483647) throw new Error('Signed arithmetic overflow');
    explain = `${op}: ${left} ${op === 'sub' ? '−' : '+'} ${right} = ${value}. Write the result to $${a}.`;
  } else if (['and', 'or', 'nor', 'andi', 'ori'].includes(op)) {
    const left = reg(b);
    const right = op.endsWith('i') ? c & 0xffff : reg(c);
    if (op === 'and' || op === 'andi') value = left & right;
    else if (op === 'nor') value = ~(left | right);
    else value = left | right;
    explain = `${op}: combine ${hex(left)} and ${hex(right)} bit by bit to get ${hex(value)} (${value | 0} signed). ${op.endsWith('i') ? 'The 16-bit logical immediate is zero-extended.' : op === 'nor' ? 'NOR inverts every bit of the OR result.' : 'The result keeps the selected bit pattern.'}`;
  } else if (op === 'lui') {
    value = (b & 0xffff) << 16;
    explain = `lui puts 0x${(b & 0xffff).toString(16).padStart(4, '0')} into the upper 16 bits and fills the lower 16 bits with zeros: ${hex(value)}.`;
  } else if (op === 'sll' || op === 'srl') {
    value = op === 'sll' ? reg(b) << c : reg(b) >>> c;
    explain = `${op}: shift ${hex(reg(b))} ${c} positions ${op === 'sll' ? 'left' : 'right'}, filling the new positions with zeros. The result is ${hex(value)} (${value | 0} signed).`;
  } else if (['slt', 'sltu', 'slti'].includes(op)) {
    const left = op === 'sltu' ? reg(b) >>> 0 : reg(b);
    const right = op === 'slti' ? signed16(c) : op === 'sltu' ? reg(c) >>> 0 : reg(c);
    value = left < right ? 1 : 0;
    explain = `${op} compares ${left} < ${right} as ${op === 'sltu' ? 'unsigned' : 'signed'} numbers. This is ${value ? 'true' : 'false'}, so $${a} becomes ${value}.`;
  } else if (op === 'lw' || op === 'sw') {
    const addr = (reg(c) + signed16(b)) >>> 0;
    if (addr % 4) throw new Error('Word addresses must be aligned to four bytes');
    if (op === 'lw' && !Object.hasOwn(state.memory, addr)) throw new Error('This word has not been initialized');
    target = op === 'sw' ? `memory[${addr}]` : a;
    value = op === 'sw' ? reg(a) : state.memory[addr] | 0;
    explain = `Address = $${c} (${reg(c)}) + ${signed16(b)} bytes = ${hex(addr)}. ${op === 'lw' ? `Load ${value} into $${a}` : `Store $${a} (${value}) at this address`}.`;
    if (op === 'sw') next.memory[addr] = value;
  } else if (op === 'beq' || op === 'bne') {
    const taken = op === 'beq' ? reg(a) === reg(b) : reg(a) !== reg(b);
    next.pc = taken ? c : state.pc + 1;
    target = 'PC';
    value = address(next.pc);
    explain = `${op} tests whether ${reg(a)} ${op === 'beq' ? 'equals' : 'differs from'} ${reg(b)}. ${taken ? `True: jump to line ${c + 1}` : 'False: continue to the next line'}. Next PC = ${hex(value)}. Delay slots are disabled.`;
  } else if (op === 'j' || op === 'jal') {
    next.pc = a;
    target = op === 'jal' ? 'ra' : 'PC';
    value = op === 'jal' ? address(state.pc + 1) : address(a);
    explain = op === 'jal' ? `jal saves PC+4 = ${hex(value)} in $ra, then jumps to line ${a + 1}. There is no delay slot in this teaching model.` : `j transfers control to ${a === length ? 'the end of this example' : `line ${a + 1}`}. Next PC = ${hex(value)}.`;
  } else if (op === 'jr') {
    target = 'PC';
    value = reg(a) >>> 0;
    next.pc = (value - address(0)) / 4;
    if (!Number.isInteger(next.pc) || next.pc < 0 || next.pc > length) throw new Error('Return target is outside this example');
    explain = `jr copies $${a} (${hex(value)}) into PC, returning to line ${next.pc + 1}. The stack and saved registers should already be restored.`;
  } else {
    throw new Error(`Unsupported instruction: ${op}`);
  }

  if (target !== 'PC' && !target.startsWith('memory[')) {
    value = a === 'zero' ? 0 : value | 0;
    next.regs[target] = value;
    if (a === 'zero') explain += ' Writes to $zero are ignored, so it remains 0.';
  }
  next.regs.zero = 0;
  return {state: next, target, value, explain};
}

export function instruction(ins) {
  const [op, a, b, c] = ins;
  if (op === 'j' || op === 'jal') return `${op} L${a + 1}`;
  if (op === 'jr') return `jr $${a}`;
  if (op === 'lui') return `lui $${a}, 0x${b.toString(16)}`;
  if (op === 'lw' || op === 'sw') return `${op} $${a}, ${b}($${c})`;
  if (op === 'beq' || op === 'bne') return `${op} $${a}, $${b}, L${c + 1}`;
  const operand = typeof c === 'string' ? '$' + c : op === 'andi' || op === 'ori' ? '0x' + c.toString(16) : c;
  return `${op} $${a}, $${b}, ${operand}`;
}

export function parseAnswer(input) {
  const value = String(input).trim();
  if (/^0x[0-9a-f]+$/i.test(value) || /^0b[01]+$/i.test(value)) return Number(value);
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) ? Number(value) : NaN;
}

export function gradeAnswer(lesson, next, input) {
  if (next.question?.choices) {
    const chosen = String(input).trim();
    return {valid: next.question.choices.includes(chosen), correct: chosen === next.value};
  }
  const value = parseAnswer(input);
  const valid = Number.isFinite(value) && (lesson.kind === 'guided' || (Number.isInteger(value) && value >= -2147483648 && value <= 4294967295));
  const correct = valid && (lesson.kind === 'guided' ? Math.abs(value - next.value) <= (next.question.tolerance ?? 1e-9) : (value >>> 0) === (next.value >>> 0));
  return {valid, correct};
}
