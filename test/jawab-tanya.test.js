import test from 'node:test';
import assert from 'node:assert/strict';
import { jawabanBebas } from '../lib/parse.js';
import { jawabTanya } from '../lib/rules.js';
import { parseComment } from '../lib/parse.js';

const w = { username: 'cireng_michi', nama: 'Mumu', tier: 3, skill: null, asked: { skill: '2026-11-10T10:00:00.000Z' } };
const cek = (text, parentId = 'p1') => jawabTanya(w, { text, parentId, timestamp: '2026-11-11T10:00:00+0000' }, parseComment(text), 'duniapokomen');

test('jawaban balasan tanpa format "Skill:" dipasang sebagai skill', () => {
  assert.deepEqual(cek('@duniapokomen menyemburkan api'), { f: 'skill', v: 'menyemburkan api' });
  assert.deepEqual(cek('Skillnya bisa menghilang', null), { f: 'skill', v: 'bisa menghilang' });
  assert.deepEqual(cek('@duniapokomen skill nya terbang tinggi 🔥'), { f: 'skill', v: 'terbang tinggi' });
});
test('obrolan biasa / pertanyaan tidak dianggap skill', () => {
  assert.equal(cek('lucu banget hewannya', null), null);
  assert.equal(cek('@duniapokomen skill itu apa min?'), null);
  assert.equal(cek('@duniapokomen Tantang: Pega'), null);
  assert.equal(jawabTanya({ ...w, asked: {} }, { text: '@duniapokomen terbang', parentId: 'x' }, parseComment('@duniapokomen terbang'), 'duniapokomen'), null);
  assert.equal(jawabTanya({ ...w, skill: 'lari' }, { text: '@duniapokomen terbang', parentId: 'x' }, parseComment('@duniapokomen terbang'), 'duniapokomen'), null);
});
test('jawabanBebas membersihkan teks', () => {
  assert.equal(jawabanBebas('Min, skillnya adalah: pukulan petir!'), 'pukulan petir');
});

test('format DM "Kekuatan: ..." terbaca sebagai skill', () => {
  const p = parseComment('Kekuatan:navegi bisa mengendalikan badai salju dan letusan gunung berapi');
  assert.ok(p.skill && p.skill.includes('badai salju'));
});
