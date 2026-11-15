import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {predictProbability,treePath,treeScores} from '../src/forest-core.mjs';
const forest=JSON.parse(readFileSync(new URL('../public/data/forest.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('../../artifacts/browser-fixtures.json',import.meta.url)));
test('browser forest matches Python across seeded, random and split-boundary fixtures',()=>{
 assert.equal(forest.model_sha256,fixture.model_sha256);
 assert.equal(forest.trees.length,220);
 let maxError=0;
 fixture.records.forEach((row,i)=>{const actual=predictProbability(forest,forest.features.map(f=>row[f]));maxError=Math.max(maxError,Math.abs(actual-fixture.probabilities[i]));assert.ok(Math.abs(actual-fixture.probabilities[i])<1e-12,`Parity failed at ${i}`)});
 console.log(`Matched ${fixture.records.length} Python reference predictions; max absolute error ${maxError}`);
});
test('tree paths terminate at real leaves and forest mean matches tree estimates',()=>{
 const values=forest.features.map(f=>fixture.records[0][f]);
 const scores=treeScores(forest,values);
 forest.trees.forEach(t=>{const path=treePath(t,values);assert.equal(t.left[path.at(-1)],-1);assert.ok(path.length<=13);assert.ok(path.length>1)});
 assert.equal(predictProbability(forest,values),scores.reduce((a,b)=>a+b,0)/220);
});
