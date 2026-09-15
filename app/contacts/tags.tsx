import {useCallback,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Tag} from '@/types';
import {TagRepository} from '@/repositories/TagRepository';
import {BackLink,Btn,Field,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {HIT,hitSlop,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function ContactTags(){
 const {contactId}=useLocalSearchParams<{contactId:string}>();
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [tags,setTags]=useState<Tag[]>([]);
 const [assigned,setAssigned]=useState<Tag[]>([]);
 const [name,setName]=useState('');

 const load=useCallback(async()=>{
  const [all,mine]=await Promise.all([TagRepository.list(),TagRepository.forContact(contactId)]);
  setTags(all);setAssigned(mine);
 },[contactId]);
 useFocusRefresh(load);

 const isAssigned=(tag:Tag)=>assigned.some(x=>x.id===tag.id);
 const toggle=async(tag:Tag)=>{
  if(isAssigned(tag))await TagRepository.unassign(contactId,tag.id);
  else await TagRepository.assign(contactId,tag.id);
  await load();
 };
 const create=async()=>{
  if(!name.trim())return;
  const id=await TagRepository.create(name);
  await TagRepository.assign(contactId,id);
  setName('');
  await load();
 };

 return <ScreenScroll>
  <BackLink label={t('backContact')} onPress={()=>router.back()}/>
  <Title>{t('tags')}</Title>
  <Subtitle>{t('tagContextHint')}</Subtitle>

  <SectionLabel>{t('assignedTags')}</SectionLabel>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:8}}>
   {assigned.length?assigned.map(tag=><Pressable key={tag.id} accessibilityRole="button" accessibilityLabel={`${tag.name} — ${t('removeTag')}`} hitSlop={hitSlop} onPress={()=>void toggle(tag)}
    style={{minHeight:HIT,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.teal,borderRadius:18,paddingHorizontal:14}}>
    <Text style={{color:c.onTeal,fontWeight:'700'}}>{tag.name}</Text>
    <Ionicons name="close" size={15} color={c.onTeal}/>
   </Pressable>):<Text style={{color:c.muted}}>{t('noTagsAssigned')}</Text>}
  </View>

  <View style={{flexDirection:'row',gap:8,alignItems:'flex-end',marginTop:18}}>
   <View style={{flex:1}}><Field label={t('newTag')} value={name} onChangeText={setName} onSubmitEditing={()=>void create()} returnKeyType="done"/></View>
   <Btn label={t('add')} onPress={()=>void create()} disabled={!name.trim()} style={{marginBottom:12}}/>
  </View>

  <SectionLabel style={{marginTop:12}}>{t('availableTags')}</SectionLabel>
  {tags.map(tag=><Pressable key={tag.id} accessibilityRole="button" accessibilityState={{selected:isAssigned(tag)}} accessibilityLabel={tag.name} onPress={()=>void toggle(tag)}
   style={{minHeight:HIT+8,paddingVertical:16,borderBottomWidth:1,borderBottomColor:c.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Text style={{color:isAssigned(tag)?c.muted:c.ink,fontWeight:'700'}}>{tag.name}</Text>
   <Text style={{color:isAssigned(tag)?c.muted:c.coral,fontWeight:'800'}}>{isAssigned(tag)?t('removeTag'):t('addTag')}</Text>
  </Pressable>)}
 </ScreenScroll>;
}
