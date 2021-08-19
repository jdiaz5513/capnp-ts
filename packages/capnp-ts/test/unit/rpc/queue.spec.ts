import { Queue } from "../../../lib/rpc/queue";
import tap from "tap";

class Ints {
  data: number[];
  constructor(len: number) {
    this.data = new Array(len).fill(0);
  }

  len(): number {
    return this.data.length;
  }

  clear(i: number) {
    this.data[i] = 0;
  }
}

tap.test("Queue new", t => {
  const qi = new Ints(5);
  const q = new Queue(qi, 0);

  t.equal(q.len(), 0);
  t.end();
});

tap.test("Queue prepush", t => {
  const qi = new Ints(5);
  qi.data[0] = 42;

  const q = new Queue(qi, 1);
  t.equal(q.len(), 1);
  t.equal(q.front(), 0);
  t.end();
});

tap.test("Queue push", t => {
  const qi = new Ints(5);
  const q = new Queue(qi, 0);

  const i = q.push();
  t.notEqual(i, -1);
  qi.data[i] = 42;

  t.equal(q.len(), 1);
  t.equal(q.front(), i);
  t.end();
});

tap.test("Queue push full", t => {
  const qi = new Ints(5);
  const q = new Queue(qi, 0);
  const ok: boolean[] = Array(6).fill(false);

  const push = (n: number, val: number) => {
    const i = q.push();
    if (i === -1) {
      return;
    }
    ok[n] = true;
    qi.data[i] = val;
  };
  push(0, 10);
  push(1, 11);
  push(2, 12);
  push(3, 13);
  push(4, 14);
  push(5, 15);

  for (let i = 0; i < 5; i++) {
    t.true(ok[i]);
  }
  t.false(ok[5]);
  t.equal(q.len(), 5);
  t.end();
});

tap.test("Queue pop", t => {
  const qi = new Ints(5);
  const q = new Queue(qi, 0);
  qi.data[q.push()] = 1;
  qi.data[q.push()] = 2;
  qi.data[q.push()] = 3;

  const outs: number[] = Array(3).fill(0);
  for (let n = 0; n < outs.length; n++) {
    const i = q.front();
    t.notEqual(i, -1);
    outs[n] = qi.data[i];
    t.true(q.pop());
  }

  t.equal(q.len(), 0);
  t.equal(outs[0], 1);
  t.equal(outs[1], 2);
  t.equal(outs[2], 3);
  for (let i = 0; i < qi.len(); i++) {
    t.equal(qi.data[i], 0);
  }

  t.end();
});

tap.test("Queue wrap", t => {
  const qi = new Ints(5);
  const q = new Queue(qi, 0);

  qi.data[q.push()] = 10;
  qi.data[q.push()] = 11;
  qi.data[q.push()] = 12;
  q.pop();
  q.pop();
  qi.data[q.push()] = 13;
  qi.data[q.push()] = 14;
  qi.data[q.push()] = 15;
  qi.data[q.push()] = 16;

  t.equal(q.len(), 5);
  for (let i = 12; q.len() > 0; i++) {
    t.equal(qi.data[q.front()], i);
    t.true(q.pop());
  }
  t.end();
});
