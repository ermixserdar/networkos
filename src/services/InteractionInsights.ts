import {Contact,Interaction} from '@/types';
import type {Language} from '@/i18n';

const COPY={
 en:{
  changed:'What has changed since you last connected?',
  work:(role:string)=>`How is your work as ${role} going?`,
  company:(name:string)=>`What is new at ${name}?`,
  followUp:(title:string)=>`Follow up on: ${title}`,
  promise:(text:string)=>`You still owe them: ${text}`,
  fallback:['What is most important for them right now?','What could you help move forward?','What should the next step be?'],
 },
 tr:{
  changed:'Son görüşmenizden bu yana neler değişti?',
  work:(role:string)=>`${role} olarak işler nasıl gidiyor?`,
  company:(name:string)=>`${name} tarafında yeni ne var?`,
  followUp:(title:string)=>`Şunu takip edin: ${title}`,
  promise:(text:string)=>`Hâlâ borçlu olduğunuz söz: ${text}`,
  fallback:['Şu anda onun için en önemli şey ne?','Neyi ilerletmesine yardım edebilirsiniz?','Sonraki adım ne olmalı?'],
 },
} as const;

export function meetingQuestions(contact:Contact,interactions:Interaction[],language:Language='en',openPromises:string[]=[]){
 const copy=COPY[language]??COPY.en;
 const questions:string[]=[];
 if(!contact.last_contact_at)questions.push(copy.changed);
 for(const promise of openPromises.slice(0,2))questions.push(copy.promise(promise));
 if(contact.job_title)questions.push(copy.work(contact.job_title));
 if(contact.company_name)questions.push(copy.company(contact.company_name));
 if(interactions[0]?.title)questions.push(copy.followUp(interactions[0].title));
 return questions.length?questions:[...copy.fallback];
}

/**
 * Deliberately local and dumb: it splits notes into sentences and lifts the ones that read like a
 * commitment. No model, no network — the summary never leaves the device because it never forms
 * anywhere else.
 */
export function summarizeInteraction(transcript:string){
 const sentences=transcript.split(/[.!?\n]+/).map(x=>x.trim()).filter(Boolean);
 const actions=sentences.filter(x=>/\b(I will|we will|i'll|we'll|send|follow up|call|share|göndereceğim|arayacağım|takip|paylaşacağım|yapacağım|ileteceğim)\b/i.test(x));
 return {summary:sentences.slice(0,3).join('. ')+(sentences.length?'.':''),actions:actions.slice(0,5)};
}
