import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Contact} from '@/types';
import {useContacts} from '@/hooks/useContacts';
import {contactName} from '@/components/ContactRow';
import {Avatar} from '@/components/Avatar';
import {Field} from '@/components/ui';
import {HIT,hitSlop,radius,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

/**
 * Pickers used to render a horizontal strip of the first 200 contacts, which silently hid
 * everyone after that. Searching happens in SQL here, so any contact is reachable by typing —
 * the visible rows are a preview, not the whole set.
 */
export function ContactSelect({label,value,onChange,exclude,rows=6}:{
 label:string;value:Contact|null;onChange:(contact:Contact|null)=>void;exclude?:string;rows?:number;
}){
 const [query,setQuery]=useState('');
 const {contacts,total}=useContacts({q:query,pageSize:rows+1});
 const {t}=useTranslation();
 const {c}=useTheme();
 const choices=contacts.filter(x=>x.id!==exclude&&x.id!==value?.id).slice(0,rows);
 const hidden=Math.max(0,total-choices.length-(value?1:0));

 if(value)return <View style={{marginBottom:14}}>
  <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginBottom:6}}>{label}</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={`${contactName(value)} — ${t('clear')}`} hitSlop={hitSlop} onPress={()=>onChange(null)}
   style={{minHeight:HIT+6,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:c.sage,borderRadius:radius.sm,paddingHorizontal:12,paddingVertical:8}}>
   <Avatar name={contactName(value)} size={30} photo={value.photo}/>
   <Text style={{color:c.teal,fontWeight:'800',fontSize:16,flex:1}}>{contactName(value)}</Text>
   <Ionicons name="close-circle" size={20} color={c.teal}/>
  </Pressable>
 </View>;

 return <View style={{marginBottom:14}}>
  <Field label={label} hint={t('findPerson')} value={query} onChangeText={setQuery} autoCapitalize="words"/>
  {choices.map(contact=><Pressable key={contact.id} accessibilityRole="button" accessibilityLabel={contactName(contact)} onPress={()=>{onChange(contact);setQuery('')}}
   style={{minHeight:HIT,justifyContent:'center',paddingVertical:11,borderBottomWidth:1,borderBottomColor:c.line}}>
   <Text style={{color:c.ink,fontWeight:'700'}}>{contactName(contact)}</Text>
   {contact.job_title||contact.company_name?<Text style={{color:c.muted,fontSize:12,marginTop:2}}>{[contact.job_title,contact.company_name].filter(Boolean).join(' · ')}</Text>:null}
  </Pressable>)}
  {!choices.length?<Text style={{color:c.muted,paddingVertical:10}}>{query?t('noMatches'):t('noPeople')}</Text>
   :hidden>0?<Text style={{color:c.muted,fontSize:12,paddingTop:8}}>{t('keepTypingToNarrow',hidden)}</Text>:null}
 </View>;
}
