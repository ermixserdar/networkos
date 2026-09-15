import {Pressable,ScrollView,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {HIT,ThemeMode,useTheme} from '@/theme';
import {TranslationKey,saveLanguage,saveThemeMode,useTranslation} from '@/i18n';
import {Chip,SectionLabel} from '@/components/ui';

const ROWS:{key:TranslationKey;href:string;icon:keyof typeof Ionicons.glyphMap}[]=[
 {key:'todayFocus',href:'/today',icon:'sunny-outline'},
 {key:'insights',href:'/insights',icon:'sparkles-outline'},
 {key:'meetingPrep',href:'/meetings/prep',icon:'chatbubbles-outline'},
 {key:'introductions',href:'/introductions',icon:'people-circle-outline'},
 {key:'eventMode',href:'/events',icon:'calendar-outline'},
 {key:'promises',href:'/commitments',icon:'checkmark-done-outline'},
 {key:'goals',href:'/goals',icon:'flag-outline'},
 {key:'companies',href:'/companies',icon:'business-outline'},
 {key:'tags',href:'/tags',icon:'pricetags-outline'},
 {key:'duplicates',href:'/duplicates',icon:'git-merge-outline'},
 {key:'vault',href:'/vault',icon:'eye-off-outline'},
 {key:'trash',href:'/trash',icon:'trash-outline'},
 {key:'profile',href:'/profile',icon:'person-outline'},
 {key:'importContacts',href:'/contacts/import',icon:'download-outline'},
 {key:'addressBookSync',href:'/address-book',icon:'sync-circle-outline'},
 {key:'secureSharing',href:'/share',icon:'share-outline'},
 {key:'syncDevices',href:'/sync',icon:'swap-horizontal-outline'},
 {key:'backup',href:'/backup',icon:'archive-outline'},
 {key:'security',href:'/security',icon:'lock-closed-outline'},
 {key:'about',href:'/about',icon:'information-circle-outline'},
];
const THEMES:{mode:ThemeMode;key:TranslationKey}[]=[{mode:'system',key:'themeSystem'},{mode:'light',key:'themeLight'},{mode:'dark',key:'themeDark'}];

export default function More(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c,mode}=useTheme();

 return <ScrollView style={{flex:1,backgroundColor:c.paper}} contentContainerStyle={{padding:22,paddingTop:62,paddingBottom:40}}>
  <Text accessibilityRole="header" style={{fontSize:34,fontWeight:'800',color:c.ink}}>{t('more')}</Text>
  <Text style={{color:c.muted,marginTop:5,marginBottom:22}}>{t('privateByDesign')}</Text>

  <SectionLabel>{t('language')}</SectionLabel>
  <View style={{flexDirection:'row',gap:8,marginBottom:18}}>
   {(['en','tr'] as const).map(x=><Chip key={x} label={x==='en'?t('english'):t('turkish')} selected={language===x} onPress={()=>void saveLanguage(x)}/>)}
  </View>

  <SectionLabel>{t('appearance')}</SectionLabel>
  <View style={{flexDirection:'row',gap:8,marginBottom:22}}>
   {THEMES.map(option=><Chip key={option.mode} label={t(option.key)} selected={mode===option.mode} onPress={()=>void saveThemeMode(option.mode)}/>)}
  </View>

  {ROWS.map(row=><Pressable key={row.key} accessibilityRole="button" accessibilityLabel={t(row.key)} onPress={()=>router.push(row.href as never)}
   style={{minHeight:HIT+14,paddingVertical:18,borderBottomWidth:1,borderBottomColor:c.line,flexDirection:'row',alignItems:'center'}}>
   <Ionicons name={row.icon} size={20} color={c.muted} style={{width:30}}/>
   <Text style={{fontSize:17,fontWeight:'700',color:c.ink,flex:1}}>{t(row.key)}</Text>
   <Ionicons name="chevron-forward" size={18} color={c.coral}/>
  </Pressable>)}
 </ScrollView>;
}
