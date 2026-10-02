import {useEffect,useRef,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Contact} from '@/types';
import {useContacts} from '@/hooks/useContacts';
import {ContactRepository} from '@/repositories/ContactRepository';
import {RelationshipRepository} from '@/repositories/RelationshipRepository';
import {suggestRelationshipType} from '@/utils/autofill';
import {contactName} from '@/components/ContactRow';
import {BackLink,Btn,Chip,Field,Rating,ScreenScroll,SectionLabel,Subtitle,Title} from '@/components/ui';
import {HIT,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

const TYPES=['friend','colleague','former_colleague','business','partner','investor','advisor','family','introduced_by','event','other'] as const;

export default function NewRelationship(){
 const {contactId}=useLocalSearchParams<{contactId:string}>();
 const [query,setQuery]=useState('');
 const {contacts}=useContacts({q:query,pageSize:10});
  const [other,setOther]=useState<Contact|null>(null);
  const [type,setType]=useState<string>('friend');
  const [strength,setStrength]=useState(3);
  const [saving,setSaving]=useState(false);
  const [self,setSelf]=useState<Contact|null>(null);
  // A manual type choice wins; the guess only fills the untouched default.
  const typeTouched=useRef(false);
  useEffect(()=>{if(contactId)void ContactRepository.get(contactId).then(row=>setSelf(row))},[contactId]);
  const pickOther=(contact:Contact)=>{
   setOther(contact);
   if(!typeTouched.current&&self){
    const suggestion=suggestRelationshipType(self,contact);
    if(suggestion)setType(suggestion);
   }
  };
  const pickType=(value:string)=>{typeTouched.current=true;setType(value)};
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();

 const choices=contacts.filter(x=>x.id!==contactId).slice(0,8);
 const save=async()=>{
  if(!contactId||!other)return;
  setSaving(true);
  try{await RelationshipRepository.create(contactId,other.id,type,strength);router.back()}
  finally{setSaving(false)}
 };

 return <ScreenScroll>
  <BackLink label={t('backContact')} onPress={()=>router.back()}/>
  <Title>{t('addConnection')}</Title>
  <Subtitle>{t('relationshipSubtitle')}</Subtitle>
  <Field label={t('findOther')} value={query} onChangeText={setQuery} autoCapitalize="words"/>
  {choices.map(contact=><Pressable key={contact.id} accessibilityRole="button" accessibilityState={{selected:other?.id===contact.id}} accessibilityLabel={contactName(contact)} onPress={()=>pickOther(contact)}
   style={{minHeight:HIT,justifyContent:'center',padding:14,borderBottomWidth:1,borderBottomColor:c.line,backgroundColor:other?.id===contact.id?c.sage:'transparent'}}>
   <Text style={{fontWeight:'800',color:c.ink}}>{contactName(contact)}</Text>
  </Pressable>)}

  <SectionLabel style={{marginTop:22}}>{t('relationshipTypeLabel')}</SectionLabel>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:22}}>
   {TYPES.map(x=><Chip key={x} label={t(`rel_${x}` as never)} selected={type===x} onPress={()=>pickType(x)}/>)}
  </View>
  <Rating label={t('connectionStrength',strength).replace(/ · .*/,'')} value={strength} onChange={setStrength}/>
  <Btn label={t('saveConnection')} busy={saving} disabled={!other} onPress={()=>void save()} style={{marginTop:10}}/>
 </ScreenScroll>;
}
