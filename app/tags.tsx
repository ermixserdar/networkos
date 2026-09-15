import {useCallback,useState} from 'react';
import {Alert,FlatList,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Tag} from '@/types';
import {TagRepository} from '@/repositories/TagRepository';
import {BackLink,Btn,Empty,Field,Screen,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {HIT,hitSlop,radius,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function Tags(){
 const [tags,setTags]=useState<Tag[]>([]);
 const [name,setName]=useState('');
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();

 const load=useCallback(async()=>{setTags(await TagRepository.list())},[]);
 useFocusRefresh(load);

 const create=async()=>{
  if(!name.trim()){Alert.alert(t('enterTagName'));return}
  await TagRepository.create(name);
  setName('');
  await load();
 };
 const remove=(tag:Tag)=>Alert.alert(t('deleteTagConfirm'),t('deleteTagBody'),[
  {text:t('cancel'),style:'cancel'},
  {text:t('delete'),style:'destructive',onPress:async()=>{await TagRepository.remove(tag.id);await load()}},
 ]);

 return <Screen>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('tags')}</Title>
  <Subtitle>{t('tagsSubtitle')}</Subtitle>
  <View style={{flexDirection:'row',gap:8,alignItems:'flex-end'}}>
   <View style={{flex:1}}><Field label={t('newTag')} value={name} onChangeText={setName} onSubmitEditing={()=>void create()} returnKeyType="done"/></View>
   <Btn label={t('add')} onPress={()=>void create()} disabled={!name.trim()} style={{marginBottom:12}}/>
  </View>
  <FlatList data={tags} keyExtractor={x=>x.id} contentContainerStyle={{paddingTop:12,paddingBottom:30}}
   ListEmptyComponent={<Empty>{t('noTags')}</Empty>}
   renderItem={({item})=><View style={{backgroundColor:c.card,borderRadius:radius.sm,padding:16,marginBottom:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:HIT+12}}>
    <View style={{flex:1}}>
     <Text style={{color:c.ink,fontWeight:'800'}}>{item.name}</Text>
     <Text style={{color:c.muted,fontSize:12,marginTop:3}}>{t('tagUsage',item.contact_count??0)}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.name} — ${t('delete')}`} hitSlop={hitSlop} onPress={()=>remove(item)} style={{width:HIT,height:HIT,alignItems:'center',justifyContent:'center'}}>
     <Ionicons name="trash-outline" size={19} color={c.coral}/>
    </Pressable>
   </View>}/>
 </Screen>;
}
