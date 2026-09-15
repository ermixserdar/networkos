import {useCallback,useState} from 'react';
import {Alert,Platform,Text} from 'react-native';
import {useRouter} from 'expo-router';
import * as Contacts from 'expo-contacts';
import {AddressBookSyncService} from '@/services/AddressBookSyncService';
import {BackLink,Btn,Card,ScreenScroll,Subtitle,SwitchRow,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {formatDate} from '@/utils/format';
import {useTranslation} from '@/i18n';

export default function AddressBook(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [enabled,setEnabled]=useState(false);
 const [limited,setLimited]=useState(false);
 const [lastRun,setLastRun]=useState<{at:number|null;updated:number}>({at:null,updated:0});
 const [busy,setBusy]=useState(false);

 const load=useCallback(async()=>{
  const [on,permission,run]=await Promise.all([
   AddressBookSyncService.isEnabled(),
   Contacts.getPermissionsAsync().catch(()=>null),
   AddressBookSyncService.lastRun(),
  ]);
  setEnabled(on);
  setLimited(permission?.accessPrivileges==='limited');
  setLastRun(run);
 },[]);
 useFocusRefresh(load);

 const toggle=async(value:boolean)=>{
  setBusy(true);
  try{
   // The toggle is the only place this feature may ask for the contacts permission.
   const ok=await AddressBookSyncService.setEnabled(value);
   if(!ok){Alert.alert(t('contactsPermission'),t('contactsPermissionBody'));return}
   await load();
  }finally{setBusy(false)}
 };

 const widenAccess=async()=>{
  setBusy(true);
  try{await AddressBookSyncService.presentAccessPicker();await load()}
  finally{setBusy(false)}
 };

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('addressBookSync')}</Title>
  <Subtitle>{t('addressBookSyncSubtitle')}</Subtitle>

  <SwitchRow label={t('addressBookEnable')} body={t('addressBookEnableBody')} value={enabled} disabled={busy}
   onChange={value=>void toggle(value)}/>

  {enabled?<Card style={{marginTop:12}}>
   <Text style={{color:c.ink,fontWeight:'800'}}>{lastRun.at?t('addressBookLastRun',formatDate(lastRun.at,language)):t('addressBookNeverRun')}</Text>
   {lastRun.at?<Text style={{color:c.muted,marginTop:6}}>{t('addressBookUpdatedCount',lastRun.updated)}</Text>:null}
  </Card>:<Card style={{marginTop:12}}>
   <Text style={{color:c.muted,lineHeight:20}}>{t('addressBookOffBody')}</Text>
  </Card>}

  {enabled&&limited&&Platform.OS==='ios'?<Card tone="sage" style={{marginTop:12}}>
   <Text style={{color:c.ink,lineHeight:20}}>{t('addressBookLimited')}</Text>
   <Btn label={t('addressBookChooseMore')} variant="outline" busy={busy} style={{marginTop:12}} onPress={()=>void widenAccess()}/>
  </Card>:null}
 </ScreenScroll>;
}
