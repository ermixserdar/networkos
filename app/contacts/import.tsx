import {useCallback,useState} from 'react';
import {Alert,FlatList,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {ContactsImportService,DeviceContact} from '@/services/ContactsImportService';
import {BackLink,Btn,Card,Checkbox,Empty,Loading,Screen,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {hitSlop,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function ImportContacts(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [contacts,setContacts]=useState<DeviceContact[]>([]);
 const [linked,setLinked]=useState<Set<string>>(new Set());
 const [selected,setSelected]=useState<string[]>([]);
 const [loading,setLoading]=useState(true);
 const [permission,setPermission]=useState(false);
 const [importing,setImporting]=useState(false);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const ok=await ContactsImportService.requestPermission();
   setPermission(ok);
   if(ok){
    const [data,already]=await Promise.all([ContactsImportService.list(),ContactsImportService.linkedDeviceIds()]);
    setContacts(data);
    setLinked(already);
    // Only the people who are not here yet start out selected; the rest would be skipped anyway.
    setSelected(data.map(x=>x.id).filter(id=>id&&!already.has(id)) as string[]);
   }
  }catch{Alert.alert(t('importFailed'),t('importFailedBody'))}
  finally{setLoading(false)}
 },[t]);
 useFocusRefresh(load);

 const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);

 const runImport=async()=>{
  setImporting(true);
  try{
   const result=await ContactsImportService.import(contacts.filter(x=>x.id&&selected.includes(x.id)));
   Alert.alert(t('importComplete'),t('importResult',result.imported,result.skipped),[{text:t('ok'),onPress:()=>router.back()}]);
  }catch{Alert.alert(t('importFailed'),t('importFailedBody'))}
  finally{setImporting(false)}
 };

 return <Screen>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('importContacts')}</Title>
  <Subtitle>{t('importSubtitle')}</Subtitle>

  {loading?<Loading/>:!permission?<Card>
   <Text style={{fontSize:18,fontWeight:'800',color:c.ink}}>{t('contactsPermission')}</Text>
   <Text style={{color:c.muted,lineHeight:22,marginTop:7}}>{t('contactsPermissionBody')}</Text>
   <Btn label={t('allowContacts')} style={{marginTop:18}} onPress={()=>void load()}/>
  </Card>:<>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
    <Text style={{color:c.muted,fontWeight:'700'}}>{t('selectedCount',selected.length)}</Text>
    <Pressable accessibilityRole="button" hitSlop={hitSlop} onPress={()=>setSelected(selected.length===contacts.length?[]:contacts.map(x=>x.id).filter(Boolean) as string[])}>
     <Text style={{color:c.coral,fontWeight:'800'}}>{selected.length===contacts.length?t('clear'):t('selectAll')}</Text>
    </Pressable>
   </View>
   <Text style={{color:c.muted,marginBottom:10}}>{t('newInPhoneBook',contacts.filter(x=>x.id&&!linked.has(x.id)).length)}</Text>
   <FlatList data={contacts} keyExtractor={x=>x.id!} contentContainerStyle={{paddingBottom:95}}
    ListEmptyComponent={<Empty>{t('noImportable')}</Empty>}
    renderItem={({item})=><Checkbox checked={selected.includes(item.id!)} label={item.name||`${item.firstName??''} ${item.lastName??''}`.trim()}
     sublabel={linked.has(item.id!)?t('alreadyImported'):item.phoneNumbers?.[0]?.number||item.emails?.[0]?.email||undefined} onPress={()=>toggle(item.id!)}/>}/>
   <Btn label={t('importSelected')} busy={importing} disabled={!selected.length} onPress={()=>void runImport()} style={{marginBottom:22}}/>
  </>}
 </Screen>;
}
