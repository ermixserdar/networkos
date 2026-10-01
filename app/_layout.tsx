import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,AppStateStatus,Pressable,Text,View} from 'react-native';
import {Stack,useRouter} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import {AddressBookSyncService} from '@/services/AddressBookSyncService';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {VaultService} from '@/services/VaultService';
import {getDatabase} from '@/database/database';
import {SecurityService} from '@/services/SecurityService';
import {NotificationService} from '@/services/NotificationService';
import {useAppStore} from '@/stores/useAppStore';
import {hitSlop,useTheme} from '@/theme';
import {loadLanguage,loadThemeMode,translate,useTranslation} from '@/i18n';
import {Btn} from '@/components/ui';
import {ErrorBoundary} from '@/components/ErrorBoundary';

NotificationService.configure();

function LockScreen({onUnlock,showButton}:{onUnlock:()=>void;showButton:boolean}){
 const {t}=useTranslation();
 const {c}=useTheme();
 return <View style={{flex:1,backgroundColor:c.teal,padding:26,paddingTop:120}}>
  <Text style={{color:c.coral,fontWeight:'900',letterSpacing:2}}>NETWORKOS</Text>
  <Text accessibilityRole="header" style={{color:'#fff',fontSize:34,fontWeight:'800',marginTop:24}}>{t('privateNetwork')}</Text>
  <Text style={{color:c.tealMuted,fontSize:16,lineHeight:24,marginTop:12}}>{t('unlockContinue')}</Text>
  {showButton?<Btn label={t('unlockBiometrics')} onPress={onUnlock} style={{marginTop:32}}/>:null}
 </View>;
}

function BootFailure({error,onRetry}:{error:Error;onRetry:()=>void}){
 const {t}=useTranslation();
 const {c}=useTheme();
 return <View style={{flex:1,backgroundColor:c.paper,padding:26,paddingTop:120}}>
  <Text accessibilityRole="header" style={{fontSize:28,fontWeight:'800',color:c.ink}}>{t('crashTitle')}</Text>
  <Text style={{color:c.muted,fontSize:16,lineHeight:24,marginTop:12}}>{t('crashBody')}</Text>
  <Text selectable style={{color:c.muted,fontSize:12,marginTop:24}}>{error.message}</Text>
  <Btn label={t('retry')} onPress={onRetry} style={{marginTop:28}}/>
 </View>;
}

/**
 * The lock used to be a one-time check at mount, so the app stayed open for the rest of its life
 * and still showed contacts in the app switcher. It now re-arms whenever the app leaves the
 * foreground, after the grace period the user chose.
 */
function LockGate({children}:{children:React.ReactNode}){
 const {c}=useTheme();
 const [checked,setChecked]=useState(false);
 const [unlocked,setUnlocked]=useState(false);
 const [covered,setCovered]=useState(false);
 const backgroundedAt=useRef<number|null>(null);
 const authenticating=useRef(false);

 const authenticate=useCallback(async()=>{
  if(authenticating.current)return;
  authenticating.current=true;
  try{
   const t=translate(useAppStore.getState().language);
   const result=await LocalAuthentication.authenticateAsync({promptMessage:t('unlockPrompt'),cancelLabel:t('cancel')});
   if(result.success)setUnlocked(true);
  }finally{authenticating.current=false}
 },[]);

 useEffect(()=>{
  // The language must be loaded before the Face ID sheet is up, or its prompt is always English.
  void Promise.all([SecurityService.getMode(),loadLanguage()]).then(async([mode])=>{
   if(mode==='biometric')await authenticate();
   else setUnlocked(true);
   setChecked(true);
  });
 },[authenticate]);

 useEffect(()=>{
  const onChange=async(state:AppStateStatus)=>{
   if(state==='active'){
    setCovered(false);
    const mode=await SecurityService.getMode();
    if(mode!=='biometric'||backgroundedAt.current===null)return;
    const grace=await SecurityService.getGrace();
    if(Date.now()-backgroundedAt.current>=grace){setUnlocked(false);void authenticate()}
    backgroundedAt.current=null;
   }else{
    // 'inactive' is also what the Face ID sheet produces; arming on it would re-lock in a loop.
    if(state==='background')backgroundedAt.current=Date.now();
    if(await SecurityService.getPrivacyScreen())setCovered(true);
   }
  };
  const subscription=AppState.addEventListener('change',state=>{void onChange(state)});
  return()=>subscription.remove();
 },[authenticate]);

 if(!checked||!unlocked)return <LockScreen showButton={checked} onUnlock={()=>void authenticate()}/>;
 return <View style={{flex:1}}>
  {children}
  {covered?<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:c.teal,alignItems:'center',justifyContent:'center'}}>
   <Text style={{color:c.coral,fontWeight:'900',letterSpacing:2}}>NETWORKOS</Text>
  </View>:null}
 </View>;
}

export default function Layout(){
 const setReady=useAppStore(s=>s.setReady);
 const setOnboarded=useAppStore(s=>s.setOnboarded);
 const {c}=useTheme();
 const router=useRouter();

 const [bootError,setBootError]=useState<Error|null>(null);

 // A failed open used to leave the splash colour on screen forever with nothing to report.
 const boot=useCallback(async()=>{
  setBootError(null);
  try{
   await Promise.all([loadLanguage(),loadThemeMode()]);
   const d=await getDatabase();
   const owner=await d.getFirstAsync('SELECT id FROM owner_profile LIMIT 1');
   setOnboarded(Boolean(owner));
   setReady();
   // Cold start is a foreground too, and it produces no AppState transition to listen for.
   void AddressBookSyncService.reconcile();
  }catch(error){setBootError(error instanceof Error?error:Error(String(error)))}
 },[setReady,setOnboarded]);
 useEffect(()=>{void boot()},[boot]);

 /**
  * Both triggers call the same reconcile, which decides for itself whether anything is due:
  * off, throttled, without permission or already running all return immediately.
  */
 useEffect(()=>{
  const foreground=AppState.addEventListener('change',state=>{if(state==='active')void AddressBookSyncService.reconcile()});
  const changed=AddressBookSyncService.attach();
  // The vault auto-locks on background; anything scheduled while it was open must not fire
  // with a private name after it closes. Reconcile drops those schedules on the transition.
  const releaseVault=VaultService.subscribe(open=>{if(!open)void ReminderPlanner.reconcile()});
  return()=>{foreground.remove();changed.remove();releaseVault()};
 },[]);

 // Tapping a follow-up or birthday reminder should land on the person it is about.
 useEffect(()=>{
  const subscription=Notifications.addNotificationResponseReceivedListener(response=>{
   const data=response.notification.request.content.data as {contactId?:string};
   if(data?.contactId)router.push(`/contacts/${data.contactId}` as never);
  });
  return()=>subscription.remove();
 },[router]);

 if(bootError)return <BootFailure error={bootError} onRetry={()=>void boot()}/>;
 return <SafeAreaProvider><ErrorBoundary><LockGate><View style={{flex:1}}>
  <Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:c.paper}}}/>
  <UndoToast/>
 </View></LockGate></ErrorBoundary></SafeAreaProvider>;
}

/** One transient bar for the whole app: delete-undo today, anything reversible tomorrow. */
function UndoToast(){
 const toast=useAppStore(s=>s.toast);
 const hideToast=useAppStore(s=>s.hideToast);
 const {c}=useTheme();
 useEffect(()=>{
  if(!toast)return;
  const id=setTimeout(hideToast,5000);
  return()=>clearTimeout(id);
 },[toast,hideToast]);
 if(!toast)return null;
 return <View style={{position:'absolute',left:16,right:16,bottom:96,backgroundColor:c.ink,borderRadius:14,paddingVertical:13,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:12}}>
  <Text style={{flex:1,color:c.paper,fontWeight:'700',fontSize:14,lineHeight:20}}>{toast.message}</Text>
  {toast.action?<Pressable accessibilityRole="button" accessibilityLabel={toast.actionLabel} hitSlop={hitSlop} onPress={()=>{hideToast();void toast.action?.()}}>
   <Text style={{color:c.coral,fontWeight:'800',fontSize:14}}>{toast.actionLabel}</Text>
  </Pressable>:null}
 </View>;
}
