import {useCallback} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,Switch,Text,TextInput,TextInputProps,View,ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect,useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {HIT,hitSlop,radius,shadow,spacing,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

/** Re-runs whenever the screen regains focus, so navigating back never shows stale rows. */
export function useFocusRefresh(load:()=>void|Promise<void>){
 useFocusEffect(useCallback(()=>{void load();},[load]));
}

/** `router.back()` silently does nothing when there is no history; this always leads somewhere. */
export function useGoBack(fallback:string){
 const router=useRouter();
 return useCallback(()=>{if(router.canGoBack())router.back();else router.replace(fallback as never)},[router,fallback]);
}

/** The device reports its own inset; 58 pt was only ever right for one class of hardware. */
export function useTopInset(){
 const insets=useSafeAreaInsets();
 return Math.max(insets.top,20)+spacing.md;
}

export function Screen({children,style}:{children:React.ReactNode;style?:ViewStyle}){
 const {c}=useTheme();
 return <View style={[{flex:1,backgroundColor:c.paper,paddingHorizontal:spacing.lg,paddingTop:useTopInset()},style]}>{children}</View>;
}

export function ScreenScroll({children,tint}:{children:React.ReactNode;tint?:string}){
 const {c}=useTheme();
 const top=useTopInset();
 // Forms run to the bottom of the screen; without this the last field sits under the keyboard.
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
  <ScrollView style={{backgroundColor:tint??c.paper}} contentContainerStyle={{padding:spacing.lg,paddingTop:top,paddingBottom:44}} keyboardShouldPersistTaps="handled">{children}</ScrollView>
 </KeyboardAvoidingView>;
}

export function BackLink({label,onPress}:{label:string;onPress:()=>void}){
 const {c}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={hitSlop} style={{minHeight:HIT,justifyContent:'center'}}>
  <Text style={{color:c.ink,fontWeight:'800'}}>{label}</Text>
 </Pressable>;
}

/** A setting that is on or off, with the sentence explaining what it costs or protects. */
export function SwitchRow({label,body,value,onChange,disabled,style}:{label:string;body:string;value:boolean;onChange:(value:boolean)=>void;disabled?:boolean;style?:ViewStyle}){
 const {c}=useTheme();
 return <Card style={[{marginTop:spacing.sm},style] as never}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Text style={{fontSize:16,fontWeight:'800',color:c.ink,flex:1,paddingRight:12}}>{label}</Text>
   <Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} trackColor={{true:c.teal,false:c.line}}/>
  </View>
  <Text style={{color:c.muted,marginTop:6,lineHeight:20}}>{body}</Text>
 </Card>;
}

export function Title({children,style}:{children:React.ReactNode;style?:ViewStyle}){
 const {c}=useTheme();
 return <Text accessibilityRole="header" style={[{fontSize:32,fontWeight:'800',color:c.ink,marginTop:spacing.sm},style as never]}>{children}</Text>;
}
export function Subtitle({children}:{children:React.ReactNode}){
 const {c}=useTheme();
 return <Text style={{color:c.muted,fontSize:16,lineHeight:23,marginTop:7,marginBottom:spacing.lg}}>{children}</Text>;
}
export function SectionLabel({children,style}:{children:React.ReactNode;style?:ViewStyle}){
 const {c}=useTheme();
 return <Text style={[{fontSize:13,fontWeight:'900',color:c.muted,marginBottom:9,letterSpacing:0.6},style as never]}>{children}</Text>;
}

export function Card({children,tone='card',style}:{children:React.ReactNode;tone?:'card'|'sage'|'coral';style?:ViewStyle}){
 const {c}=useTheme();
 const background=tone==='sage'?c.sage:tone==='coral'?c.coralSoft:c.card;
 return <View style={[{backgroundColor:background,borderRadius:radius.lg,padding:spacing.md,...shadow},style]}>{children}</View>;
}

type BtnProps={label:string;onPress:()=>void;variant?:'primary'|'outline'|'ghost'|'danger';disabled?:boolean;busy?:boolean;icon?:keyof typeof Ionicons.glyphMap;style?:ViewStyle};
export function Btn({label,onPress,variant='primary',disabled,busy,icon,style}:BtnProps){
 const {c}=useTheme();
 const off=disabled||busy;
 const palette={
  primary:{bg:off?c.line:c.coral,fg:off?c.muted:'#fff',border:'transparent'},
  danger:{bg:'transparent',fg:c.coral,border:c.coral},
  outline:{bg:'transparent',fg:c.ink,border:c.ink},
  ghost:{bg:c.sage,fg:c.onSage,border:'transparent'},
 }[variant];
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:Boolean(off)}} disabled={off} onPress={onPress}
  style={[{minHeight:HIT+8,borderRadius:radius.md,paddingVertical:16,paddingHorizontal:spacing.md,backgroundColor:palette.bg,borderWidth:palette.border==='transparent'?0:1,borderColor:palette.border,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},style]}>
  {busy?<ActivityIndicator color={palette.fg}/>:<>
   {icon?<Ionicons name={icon} size={18} color={palette.fg}/>:null}
   <Text style={{color:palette.fg,fontWeight:'800',fontSize:16,textAlign:'center'}}>{label}</Text>
  </>}
 </Pressable>;
}

type FieldProps=TextInputProps&{label:string;hint?:string};
export function Field({label,hint,style,...props}:FieldProps){
 const {c}=useTheme();
 return <View style={{marginBottom:12}}>
  <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginBottom:6}}>{label}</Text>
  <TextInput accessibilityLabel={label} placeholderTextColor={c.placeholder} placeholder={hint}
   style={[{backgroundColor:c.field,borderRadius:radius.sm,padding:15,fontSize:16,color:c.ink,minHeight:HIT+6,borderWidth:1,borderColor:c.line},style]} {...props}/>
 </View>;
}

export function Chip({label,selected,onPress,accessibilityLabel}:{label:string;selected?:boolean;onPress:()=>void;accessibilityLabel?:string}){
 const {c}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityState={{selected:Boolean(selected)}} accessibilityLabel={accessibilityLabel??label} onPress={onPress}
  style={{minHeight:HIT,justifyContent:'center',backgroundColor:selected?c.teal:c.card,borderRadius:radius.md,paddingHorizontal:14,paddingVertical:10,borderWidth:1,borderColor:selected?c.teal:c.line}}>
  <Text style={{color:selected?c.onTeal:c.ink,fontWeight:'700'}}>{label}</Text>
 </Pressable>;
}

export function Rating({value,onChange,label}:{value:number;onChange:(value:number)=>void;label:string}){
 const {c}=useTheme();
 return <View style={{marginBottom:spacing.md}}>
  <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginBottom:8}}>{label} · {value}/5</Text>
  <View style={{flexDirection:'row',gap:10}}>
   {[1,2,3,4,5].map(x=><Pressable key={x} accessibilityRole="adjustable" accessibilityLabel={`${label} ${x}/5`} accessibilityState={{selected:x===value}} onPress={()=>onChange(x)}
    style={{width:HIT,height:HIT,borderRadius:HIT/2,backgroundColor:x<=value?c.coral:c.card,borderWidth:1,borderColor:x<=value?c.coral:c.line,alignItems:'center',justifyContent:'center'}}>
    <Text style={{color:x<=value?'#fff':c.ink,fontWeight:'800'}}>{x}</Text>
   </Pressable>)}
  </View>
 </View>;
}

export function Checkbox({checked,label,onPress,sublabel}:{checked:boolean;label:string;onPress:()=>void;sublabel?:string}){
 const {c}=useTheme();
 return <Pressable accessibilityRole="checkbox" accessibilityState={{checked}} accessibilityLabel={label} onPress={onPress}
  style={{minHeight:HIT+12,backgroundColor:checked?c.sage:c.card,borderRadius:radius.md,padding:15,marginBottom:9,flexDirection:'row',alignItems:'center'}}>
  <View style={{width:26,height:26,borderRadius:8,borderWidth:2,borderColor:checked?c.teal:c.line,backgroundColor:checked?c.teal:'transparent',alignItems:'center',justifyContent:'center'}}>
   {checked?<Ionicons name="checkmark" size={16} color="#fff"/>:null}
  </View>
  <View style={{marginLeft:12,flex:1}}>
   <Text style={{color:c.ink,fontSize:16,fontWeight:'800'}}>{label}</Text>
   {sublabel?<Text style={{color:c.muted,marginTop:3}}>{sublabel}</Text>:null}
  </View>
 </Pressable>;
}

export function Empty({children}:{children:React.ReactNode}){
 const {c}=useTheme();
 return <Text style={{color:c.muted,textAlign:'center',marginTop:34,lineHeight:22}}>{children}</Text>;
}

export function Loading(){
 const {c}=useTheme();
 return <ActivityIndicator color={c.coral} style={{marginTop:40}}/>;
}

export function ErrorNote({onRetry}:{onRetry:()=>void}){
 const {c}=useTheme();
 const {t}=useTranslation();
 return <View style={{marginTop:24,alignItems:'center'}}>
  <Text style={{color:c.muted,marginBottom:12}}>{t('somethingWrong')}</Text>
  <Btn label={t('retry')} variant="outline" onPress={onRetry}/>
 </View>;
}
