import {useColorScheme} from 'react-native';
import {useAppStore} from '@/stores/useAppStore';

export type Palette=typeof lightColors;
/** `onSage` exists because dark `teal` on dark `sage` measures 1.27:1 — text on sage needs its own token. */
export const lightColors={ink:'#102F38',muted:'#5B6E72',paper:'#F6F8F7',card:'#FFFFFF',teal:'#0B4B52',tealDeep:'#082F36',coral:'#F0644F',coralSoft:'#F9D8D1',coralInk:'#9E4738',line:'#E1E9E7',sage:'#E3F0ED',onSage:'#0B4B52',cream:'#FBFCFA',white:'#FFFFFF',onTeal:'#FFFFFF',tealMuted:'#B8D7D2',field:'#FFFFFF',placeholder:'#9BA3A3',good:'#2E8C78',warn:'#A85A4A'};
export const darkColors:Palette={ink:'#EDF4F2',muted:'#9DB5B1',paper:'#0B1E22',card:'#123037',teal:'#12454C',tealDeep:'#071A1E',coral:'#F0644F',coralSoft:'#3A2220',coralInk:'#F2A796',line:'#1E3D43',sage:'#183239',onSage:'#B8D7D2',cream:'#0B1E22',white:'#123037',onTeal:'#FFFFFF',tealMuted:'#8FB6B1',field:'#16343B',placeholder:'#6E8A87',good:'#5FBFA6',warn:'#E08774'};

/** Kept as the default (light) palette so non-component modules can still import a constant. */
export const colors=lightColors;
export const shadow={shadowColor:'#082F36',shadowOpacity:0.1,shadowRadius:20,shadowOffset:{width:0,height:8},elevation:4};
export const spacing={xs:6,sm:10,md:16,lg:22,xl:30} as const;
export const radius={sm:12,md:16,lg:18,xl:24} as const;
export const MAX_FONT_SCALE=1.6;
export const type={hero:32 as const,title:25 as const,body:16 as const,caption:13 as const,eyebrow:11 as const};
/** iOS HIG minimum interactive target. */
export const HIT=44;
export const hitSlop={top:8,bottom:8,left:8,right:8};

export type ThemeMode='system'|'light'|'dark';
export function useTheme(){
 const system=useColorScheme();
 const mode=useAppStore(s=>s.themeMode);
 const dark=mode==='dark'||(mode==='system'&&system==='dark');
 return {c:dark?darkColors:lightColors,dark,mode};
}
