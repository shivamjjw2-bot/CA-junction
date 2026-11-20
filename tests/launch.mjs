import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {chapterKey, CHAPTERS, encode, metadata} from '../assets/paper-core.js';

const read = path => readFile(new URL('../'+path,import.meta.url),'utf8');
test('each collection has distinct question and solution keys',()=>{
  const keys=['previous_year','mtp','rtp','mock_test'].flatMap(series=>['question','solution'].map(kind=>chapterKey(series,kind)));
  assert.equal(new Set(keys).size,8);
  assert.deepEqual(new Set(keys),new Set(CHAPTERS));
});
test('existing attempt metadata round trips without reclassification',()=>{
  const sample={version:1,year:2025,attempt:'May',scheme:'Current'};
  assert.deepEqual(metadata({description:encode(sample)}),sample);
  assert.equal(metadata({description:'Older upload'}),null);
});
test('student and administrator login controls are on their own pages',async()=>{
  const student=await read('account.html'),admin=await read('admin.html');
  assert.match(student,/id="googleSignIn"/);
  assert.doesNotMatch(student,/Existing administrator|Free launch|id="loginPassword"/i);
  assert.match(admin,/id="loginPassword"/);
  assert.match(admin,/id="adminMfa"/);
});
test('new installations and migrations define the same ownership rules',async()=>{
  const schema=await read('supabase/schema.sql');
  const migration=await read('supabase/migrations/20261120000000_bind_submission_paths.sql');
  for(const policy of migration.match(/create policy [^;]+for insert[^;]+;/g)){
    assert.ok(schema.includes(policy));
    assert.ok(policy.includes('(storage.foldername(file_path))[1]=auth.uid()::text'));
  }
  const assurance=(await read('supabase/migrations/20261120000100_role_assurance.sql')).trim();
  assert.ok(schema.includes(assurance));
});

test('private entry points exclude indexing and share no sitemap entries',async()=>{
  const sitemap=await read('sitemap.xml');
  for(const page of ['admin','account','platform','tracker','upload']){
    assert.match(await read(page+'.html'),/name="robots" content="noindex,nofollow"/);
    assert.ok(!sitemap.includes('https://cajunction.in/'+page+'<'));
  }
});
test('the browser upload limit matches the private materials bucket',async()=>{
  const schema=await read('supabase/schema.sql'), uploader=await read('assets/papers.js');
  assert.match(schema,/[(]'ca-materials','ca-materials',false,52428800/);
  assert.ok(uploader.includes('fileValue.size>50*1024*1024'));
});
