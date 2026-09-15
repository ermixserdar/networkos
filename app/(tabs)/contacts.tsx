import {useCallback,useState} from 'react';
import {FlatList,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Tag} from '@/types';
import {useContacts} from '@/hooks/useContacts';
import {TagRepository} from '@/repositories/TagRepository';
import {ContactRow} from '@/components/ContactRow';
import {Chip,Empty,Loading,useFocusRefresh} from '@/components/ui';
import {HIT,radius,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function Contacts(){
 const [q,setQ]=useState('');
 const [tagId,setTagId]=useState<string|undefined>();
 const [tags,setTags]=useState<Tag[]>([]);
 const {contacts,total,loading,loadMore,hasMore}=useContacts({q,tagId});
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();

 useFocusRefresh(useCallback(async()=>{setTags(await TagRepository.list())},[]));

 return <View style={{flex:1,padding:22,paddingTop:62,backgroundColor:c.paper}}>
  <Text accessibilityRole="header" style={{fontSize:34,fontWeight:'800',color:c.ink}}>{t('people')}</Text>
  <Text style={{color:c.muted,marginTop:5,marginBottom:16}}>{total?t('peopleCount',total):t('peopleSubtitle')}</Text>
  <TextInput accessibilityLabel={t('searchNetwork')} value={q} onChangeText={setQ} placeholder={t('searchNetwork')} placeholderTextColor={c.placeholder} returnKeyType="search"
   style={{backgroundColor:c.field,borderRadius:radius.sm,padding:15,fontSize:16,color:c.ink,minHeight:HIT+6,borderWidth:1,borderColor:c.line}}/>

  {tags.length?<FlatList horizontal showsHorizontalScrollIndicator={false} data={[{id:'',name:t('allPeople')},...tags]} keyExtractor={x=>x.id||'all'}
   style={{marginTop:12,flexGrow:0}} contentContainerStyle={{gap:8,paddingRight:12}}
   renderItem={({item})=><Chip label={item.name} selected={(item.id||undefined)===tagId} onPress={()=>setTagId(item.id||undefined)}/>}/>:null}

  {loading&&!contacts.length?<Loading/>:<FlatList
   data={contacts}
   keyExtractor={x=>x.id}
   style={{marginTop:12}}
   onEndReachedThreshold={0.4}
   onEndReached={()=>{void loadMore()}}
   renderItem={({item})=><ContactRow contact={item} onPress={()=>router.push(`/contacts/${item.id}` as never)}/>}
   ListFooterComponent={hasMore?<Loading/>:null}
   ListEmptyComponent={<Empty>{q||tagId?t('noMatches'):t('noPeople')}</Empty>}/>}
 </View>;
}
