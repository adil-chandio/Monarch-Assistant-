import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguage } from './lib/detect.js';
import { buildReply, REPLIES } from './lib/replies.js';

test('detect: Urdu script -> urdu', () => {
  assert.equal(detectLanguage('السلام علیکم، میرا نام علی ہے'), 'urdu');
  assert.equal(detectLanguage('کیا ہو رہا ہے؟'), 'urdu');
});

test('detect: Roman Urdu -> roman', () => {
  assert.equal(detectLanguage('kya hal hai bhai'), 'roman');
  assert.equal(detectLanguage('Assalam o Alaikum, mera naam Ali hai'), 'roman');
  assert.equal(detectLanguage('mera name Ali hai, kaam hai meeting book karni hai'), 'roman');
  assert.equal(detectLanguage('sir, call karna tha payment ke baare me'), 'roman');
  assert.equal(detectLanguage('hello bhai'), 'roman');
});

test('detect: English -> english', () => {
  assert.equal(detectLanguage('I need your help please'), 'english');
  assert.equal(detectLanguage('Hello, my name is John and I want to talk about the order'), 'english');
  assert.equal(detectLanguage('What is my work today?'), 'english');
});

test('detect: empty/short falls back to roman', () => {
  assert.equal(detectLanguage(''), 'roman');
  assert.equal(detectLanguage('ok'), 'roman');
  assert.equal(detectLanguage(undefined), 'roman');
});

test('buildReply: roman uses sir ki exact lines', () => {
  const reply = buildReply('roman');
  assert.ok(reply.includes('Assalam-o-Alaikum, Monarch sir abhi busy hain, aapko jald hi reply mil jayega.'));
  assert.ok(reply.includes('Batayen main aapki kya madad kar sakta hun? Aapka naam aur kaam bata den taake sir aate hi aapse contact kar len.'));
});

test('buildReply: unknown language falls back to roman', () => {
  assert.equal(buildReply('spanish'), buildReply('roman'));
});

test('buildReply: every language mentions Monarch and asks for name+work', () => {
  for (const lang of Object.keys(REPLIES)) {
    const reply = buildReply(lang);
    assert.ok(/monarch|موناکھ/i.test(reply), `${lang} should mention Monarch`);
    assert.ok(reply.length > 50, `${lang} reply should be full`);
  }
});

test('rule 3: no language ever reveals being an AI', () => {
  for (const lang of Object.keys(REPLIES)) {
    const reply = buildReply(lang).toLowerCase();
    assert.ok(!/\bAI\b/.test(reply), `${lang} must not say "AI"`);
    assert.ok(!reply.includes('robot'));
    assert.ok(!reply.includes('bot'));
  }
});
