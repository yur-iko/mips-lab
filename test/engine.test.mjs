import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons, initial, execute, instruction, parseAnswer, gradeAnswer, address} from '../engine.js';

const session = id => lessons.find(lesson => lesson.id === id);
const traces = {
  arithmetic: {steps:5,regs:{zero:0,t0:5,t1:3,t2:5}},
  memory: {steps:4,regs:{t0:16,t1:16},memory:{4096:12,4100:16}},
  branches: {steps:10,regs:{t0:0,t1:0,t2:7}},
  logic: {steps:5,regs:{t0:-22137,t1:54904,t2:54904}},
  constants: {steps:5,regs:{t0:0x12348000,t1:0x8000,t2:65535}},
  arrays: {steps:6,regs:{t0:2,t1:8,t2:34,s1:4104},memory:{4096:10,4100:20,4104:34}},
  signed: {steps:4,regs:{t0:1,t1:0,t2:1,s0:-1,s1:1}},
  procedures: {steps:12,regs:{t0:10,t1:3,t2:7,v0:7,s0:99,sp:8192,ra:address(1)},memory:{8188:99}}
};

test('the library contains twenty uniquely identified sessions across all chapters', () => {
  assert.equal(lessons.length, 20);
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, 20);
  assert.deepEqual([...new Set(lessons.map(lesson => lesson.chapter))].sort(), ['1','2','3','4','5']);
  assert.equal(lessons.filter(lesson => lesson.kind === 'trace').length, 8);
  assert.equal(lessons.filter(lesson => lesson.kind === 'guided').length, 12);
  assert.equal(lessons.filter(lesson => lesson.steps).reduce((sum, lesson) => sum + lesson.steps.length, 0), 78);
  for (const lesson of lessons) assert.match(lesson.source, new RegExp(`^Chapter${lesson.chapter}\\.pdf, slides `));
});

for (const [id, expected] of Object.entries(traces)) {
  test(`trace ${id} has the expected complete execution and does not mutate prior states`, () => {
    const lesson = session(id);
    let state = initial(lesson), steps = 0;
    while (true) {
      const saved = structuredClone(state);
      const next = execute(lesson, state);
      assert.deepEqual(state, saved);
      if (!next) break;
      assert.ok(++steps <= 200, 'Trace did not terminate');
      assert.equal(next.state.regs.zero, 0);
      assert.ok(Object.values(next.state.regs).every(value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647));
      assert.equal(gradeAnswer(lesson, next, String(next.value)).correct, true);
      state = next.state;
    }
    assert.equal(steps, expected.steps);
    for (const [name, value] of Object.entries(expected.regs)) assert.equal(state.regs[name], value, name);
    if (expected.memory) assert.deepEqual(state.memory, expected.memory);
  });
}

for (const lesson of lessons.filter(lesson => lesson.kind === 'guided')) {
  test(`guided ${lesson.id} grades every answer and reaches completion`, () => {
    let state = initial(lesson);
    for (const question of lesson.steps) {
      const next = execute(lesson, state);
      assert.equal(next.question, question);
      assert.equal(gradeAnswer(lesson, next, String(question.answer)).correct, true);
      assert.equal(gradeAnswer(lesson, next, '').valid, false);
      const wrong = question.choices ? question.choices.find(choice => choice !== question.answer) : String(question.answer + 1);
      assert.equal(gradeAnswer(lesson, next, wrong).correct, false);
      assert.ok(question.prompt && question.explain && question.givens.length);
      state = next.state;
    }
    assert.equal(execute(lesson, state), null);
  });
}

test('number parsing accepts supported formats and rejects partial or nonfinite input', () => {
  for (const [input, value] of [['0.975',0.975],['1e3',1000],['0xFFFFFFFF',4294967295],['0b1000',8],['-128',-128],['.5',0.5]]) assert.equal(parseAnswer(input), value);
  for (const input of ['', '12oops', '0x', '1.2.3', 'Infinity', 'NaN']) assert.ok(Number.isNaN(parseAnswer(input)));
  const lesson = session('cpu-time');
  assert.equal(gradeAnswer(lesson, execute(lesson, initial(lesson)), '1e999').valid, false);
});

test('a signed trace result accepts its equivalent unsigned hexadecimal bit pattern', () => {
  const lesson = {kind:'trace',regs:{s0:0},memory:{},code:[['nor','t0','s0','zero']]};
  const next = execute(lesson, initial(lesson));
  assert.equal(next.value, -1);
  assert.equal(gradeAnswer(lesson, next, '0xffffffff').correct, true);
  assert.equal(gradeAnswer(lesson, next, '0x1ffffffff').valid, false);
  assert.equal(gradeAnswer(lesson, next, '0.5').valid, false);
});

test('rounding tolerance accepts the requested rounding and rejects a wrong result', () => {
  const lesson = session('cpu-time');
  const next = execute(lesson, {pc:4});
  assert.equal(gradeAnswer(lesson, next, '1.238').correct, true);
  assert.equal(gradeAnswer(lesson, next, '1.237').correct, false);
});

test('performance answers agree with independent arithmetic from the slide example', () => {
  const steps = session('cpu-time').steps;
  const cycles = 300*2.5 + 100*1 + 200*1.5 + 400*2;
  assert.equal(steps[0].answer, cycles);
  assert.equal(steps[1].answer, cycles/1000);
  assert.equal(steps[2].answer, cycles/2e9*1e6);
  assert.equal(steps[3].answer, (300*1.25+100+200*1.5+400*2)/1000);
});

test('machine encoding uses the correct register fields and PC+4', () => {
  const steps = session('encoding').steps;
  assert.equal(steps[0].answer, (9<<21)|(10<<16)|(8<<11)|0x20);
  assert.equal(steps[2].answer, (0x00400004-(0x00400014+4))/4);
  assert.equal(steps[3].answer, ((4<<26)|(8<<21)|0xfffb)>>>0);
  assert.equal(steps[4].answer, ((2<<26)|(0x00400020>>>2))>>>0);
  assert.equal(steps[5].answer, (((0x0ffffffc+4)&0xf0000000)|(0x00100008<<2))>>>0);
});

test('IEEE-754 answers match actual binary32 encoding', () => {
  const bytes = new ArrayBuffer(4), view = new DataView(bytes);
  view.setFloat32(0,12.75,false);
  assert.equal(session('floating-point').steps[3].answer, view.getUint32(0,false));
  view.setUint32(0,0xc14c0000,false);
  assert.equal(session('floating-point').steps[4].answer, view.getFloat32(0,false));
});

test('cache fields and virtual translation retain the correct offset units', () => {
  const cache = session('cache-address').steps;
  assert.deepEqual(cache.map(question => question.answer), [Math.log2(16),Math.log2(64),32-6-4,Math.floor(1200/16),Math.floor(1200/16)%64,1200%16,Math.floor(1200/1024)]);
  assert.equal(session('virtual-memory').steps[3].answer, 7*4096+(0x1234%4096));
  assert.equal(session('cache-time').steps[4].answer, 1+0.02*20+0.005*400);
});

test('the cache trace has the expected LRU and associativity outcomes', () => {
  const blocks=[0,8,0,6,8];
  const simulate=(sets,ways)=>{
    const cache=Array.from({length:sets},()=>[]);
    return blocks.map(block=>{
      const set=cache[block%sets],position=set.indexOf(block),hit=position!==-1;
      if(hit)set.splice(position,1); else if(set.length===ways)set.shift();
      set.push(block);
      return hit?'Hit':'Miss';
    });
  };
  const steps=session('cache-trace').steps;
  assert.deepEqual(steps.slice(0,5).map(question=>question.answer),simulate(2,2));
  assert.equal(steps[5].answer,simulate(4,1).filter(value=>value==='Miss').length);
  assert.equal(steps[6].answer,simulate(1,4).filter(value=>value==='Miss').length);
});

test('logical immediates zero-extend, addi sign-extends, and logical right shift clears high bits', () => {
  const run=code=>{const lesson={kind:'trace',regs:{s0:-1},memory:{},code:[code]};return execute(lesson,initial(lesson)).value;};
  assert.equal(run(['andi','t0','s0',0xffff]),65535);
  assert.equal(run(['addi','t0','zero',0xffff]),-1);
  assert.equal(run(['srl','t0','s0',1]),2147483647);
  assert.equal(run(['lui','t0',0xffff]),-65536);
});

test('signed overflow, misaligned memory, and unknown instructions fail explicitly', () => {
  const run=(code,regs={})=>{const lesson={kind:'trace',regs,memory:{},code:[code]};return execute(lesson,initial(lesson));};
  assert.throws(()=>run(['addi','t0','s0',1],{s0:2147483647}),/overflow/);
  assert.throws(()=>run(['lw','t0',2,'zero']),/aligned/);
  assert.throws(()=>run(['lw','t0',0,'zero']),/initialized/);
  assert.throws(()=>run(['unknown','t0','zero','zero']),/Unsupported/);
});

test('instruction labels display branch, call, return, immediate, and shift operands correctly', () => {
  assert.equal(instruction(['jal',3]),'jal L4');
  assert.equal(instruction(['jr','ra']),'jr $ra');
  assert.equal(instruction(['lui','t0',0x1234]),'lui $t0, 0x1234');
  assert.equal(instruction(['ori','t0','t0',0x8000]),'ori $t0, $t0, 0x8000');
  assert.equal(instruction(['sll','t1','t0',2]),'sll $t1, $t0, 2');
});
