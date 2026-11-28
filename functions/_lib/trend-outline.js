import {getOutline} from '../api/ai-planner.js';

// ICAI's IBS syllabus lists integrated subject areas, not numbered chapters.
// Source: https://resource.cdn.icai.org/92189bos-aps5087-final-p6.pdf
export const IBS_AREAS=Object.freeze([
 'Financial Reporting',
 'Advanced Financial Management',
 'Advanced Auditing, Assurance and Professional Ethics',
 'Direct Tax Laws & International Taxation',
 'Indirect Tax Laws',
 'Corporate and Economic Laws',
 'Strategic Cost & Performance Management'
]);
export async function getTrendOutline(level,subject){
 if(level==='Final'&&subject==='Integrated Business Solutions (Multidisciplinary Case Study with Strategic Management)')return {subject,chapters:IBS_AREAS.map(area=>'Syllabus area: '+area),url:'https://resource.cdn.icai.org/92189bos-aps5087-final-p6.pdf'};
 return getOutline(level,subject);
}
