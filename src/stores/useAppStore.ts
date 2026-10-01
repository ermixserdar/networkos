import {create} from 'zustand';
import type {Language} from '@/i18n';
import type {ThemeMode} from '@/theme';
export type Toast={message:string;actionLabel?:string;action?:()=>void};
type State={
 ready:boolean;onboarded:boolean;language:Language;themeMode:ThemeMode;toast:Toast|null;
 setReady:()=>void;setOnboarded:(value:boolean)=>void;completeOnboarding:()=>void;
 setLanguage:(language:Language)=>void;setThemeMode:(mode:ThemeMode)=>void;
 showToast:(toast:Toast)=>void;hideToast:()=>void;
};
export const useAppStore=create<State>(set=>({
 ready:false,onboarded:false,language:'en',themeMode:'system',toast:null,
 setReady:()=>set({ready:true}),
 setOnboarded:(value)=>set({onboarded:value}),
 completeOnboarding:()=>set({onboarded:true}),
 setLanguage:(language)=>set({language}),
 setThemeMode:(themeMode)=>set({themeMode}),
 showToast:(toast)=>set({toast}),
 hideToast:()=>set({toast:null}),
}));
