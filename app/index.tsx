import {useState} from 'react';
import {Redirect} from 'expo-router';
import {Text,TextInput,View} from 'react-native';
import {useAppStore} from '@/stores/useAppStore';
import {seedOwner} from '@/database/database';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';
import {Btn} from '@/components/ui';

/**
 * Onboarding is decided by whether an owner profile exists, not by component state — otherwise
 * every cold start dropped the user back on the name form they already filled in.
 */
export default function Index(){
 const ready=useAppStore(s=>s.ready);
 const onboarded=useAppStore(s=>s.onboarded);
 const completeOnboarding=useAppStore(s=>s.completeOnboarding);
 const [first,setFirst]=useState('');
 const [last,setLast]=useState('');
 const [saving,setSaving]=useState(false);
 const {t}=useTranslation();
 const {c}=useTheme();

 if(!ready)return <View style={{flex:1,backgroundColor:c.teal}}/>;
 if(onboarded)return <Redirect href="/(tabs)"/>;

 const start=async()=>{
  if(!first.trim())return;
  setSaving(true);
  try{await seedOwner(first.trim(),last.trim());completeOnboarding()}
  finally{setSaving(false)}
 };

 const input={backgroundColor:'#28545A',color:'#fff',borderRadius:14,padding:17,fontSize:16,minHeight:52} as const;
 return <View style={{flex:1,backgroundColor:c.teal,padding:26,paddingTop:100}}>
  <Text style={{color:c.coral,fontWeight:'800',letterSpacing:1.4}}>NETWORKOS</Text>
  <Text accessibilityRole="header" style={{color:'#fff',fontSize:42,fontWeight:'800',lineHeight:47,marginTop:26}}>{t('onboardingTitle')}</Text>
  <Text style={{color:c.tealMuted,fontSize:18,lineHeight:27,marginTop:18}}>{t('onboardingSubtitle')}</Text>
  <View style={{marginTop:54}}>
   <TextInput accessibilityLabel={t('firstName')} placeholder={t('firstName')} placeholderTextColor="#89AAA8" value={first} onChangeText={setFirst} style={[input,{marginBottom:12}]}/>
   <TextInput accessibilityLabel={t('lastName')} placeholder={t('lastName')} placeholderTextColor="#89AAA8" value={last} onChangeText={setLast} style={input}/>
  </View>
  <Btn label={t('startBuilding')} busy={saving} disabled={!first.trim()} onPress={()=>void start()} style={{marginTop:22}}/>
  <Text style={{color:'#89AAA8',textAlign:'center',marginTop:20,fontSize:13}}>{t('noAccount')}</Text>
 </View>;
}
