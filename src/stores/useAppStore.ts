import {create} from 'zustand';
import type {Language} from '@/i18n';
import type {ThemeMode} from '@/theme';
type State={
 ready:boolean;onboarded:boolean;language:Language;themeMode:ThemeMode;
 setReady:()=>void;setOnboarded:(value:boolean)=>void;completeOnboarding:()=>void;
 setLanguage:(language:Language)=>void;setThemeMode:(mode:ThemeMode)=>void;
};
export const useAppStore=create<State>(set=>({
 ready:false,onboarded:false,language:'en',themeMode:'system',
 setReady:()=>set({ready:true}),
 setOnboarded:(value)=>set({onboarded:value}),
 completeOnboarding:()=>set({onboarded:true}),
 setLanguage:(language)=>set({language}),
 setThemeMode:(themeMode)=>set({themeMode}),
}));
