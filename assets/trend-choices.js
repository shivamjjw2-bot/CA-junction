const refKey = value => String(value || '').replace(/\s/g, '').toLowerCase();
const key = q => q.section + '|' + refKey(q.ref);
const numberOf = q => Number(String(q.ref).match(/\d+/)?.[0]);

// Internal choices have their own cardinality. They are independent of the
// section's choice between main questions, and may contain composite branches.
export function choiceCalculator(questions, choices) {
  const inventory = new Map(questions.map(q => [key(q), q]));
  const used = new Set(), ids = new Set(), groups = [];
  if (choices !== undefined && !Array.isArray(choices)) throw Error('Invalid internal-choice inventory.');
  for (const choice of choices || []) {
    const id = choice.section + '|' + choice.id;
    const count = choice.choose_count;
    if (!choice.id || ids.has(id) || !Array.isArray(choice.alternatives)
      || !Number.isInteger(count) || count < 1 || count >= choice.alternatives.length)
      throw Error('Read the printed number of alternatives to answer for each internal choice.');
    ids.add(id);
    let mainNumber;
    const branches = choice.alternatives.map(branch => {
      if (!Array.isArray(branch.refs) || !branch.refs.length) throw Error('An internal-choice branch has no question references.');
      return branch.refs.map(ref => {
        const k=choice.section+'|'+refKey(ref), q=inventory.get(k);
        if (!q || used.has(k)) throw Error('Internal-choice references are missing, duplicated or overlapping: '+ref);
        if (mainNumber === undefined) mainNumber=numberOf(q);
        if (numberOf(q)!==mainNumber) throw Error('An internal choice crosses main questions; use a section choice rule instead.');
        used.add(k);return q;
      });
    });
    groups.push({count,branches});
  }
  // Backward compatibility only for explicitly named OR/Option alternatives.
  // Never infer "choose one" from an arbitrary optionalGroup label.
  if (choices === undefined) {
    const legacy=new Map();
    for (const q of questions) {
      if (!q.optionalGroup || !/\b(?:option|alternative|or)\b/i.test(q.ref)) continue;
      const base=q.ref.match(/(\d+)\s*\(?([a-z])\)?/i);
      if (!base) continue;
      const k=q.section+'|'+q.optionalGroup+'|'+base[1]+base[2].toLowerCase();
      if (!legacy.has(k)) legacy.set(k,[]);
      legacy.get(k).push([q]);
    }
    for(const branches of legacy.values())if(branches.length>1)groups.push({count:1,branches});
  }
  return items => {
    const included=new Set(items.map(key));
    let min=items.reduce((n,q)=>n+q.marks,0),max=min;
    for(const {count,branches} of groups){
      const members=branches.flat(),present=members.filter(q=>included.has(key(q))).length;
      if(!present)continue;
      if(present!==members.length)throw Error('An internal choice is split across incompatible question allocations.');
      const marks=branches.map(branch=>branch.reduce((n,q)=>n+q.marks,0)).sort((a,b)=>a-b);
      const offered=marks.reduce((n,v)=>n+v,0);
      min+=marks.slice(0,count).reduce((n,v)=>n+v,0)-offered;
      max+=marks.slice(-count).reduce((n,v)=>n+v,0)-offered;
    }
    return {min,max};
  };
}
