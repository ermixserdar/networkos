import {create} from 'zustand';
import type {Language} from '@/i18n';
type State={ready:boolean;onboarded:boolean;language:Language;setReady:()=>void;completeOnboarding:()=>void;setLanguage:(language:Language)=>void};
export const useAppStore=create<State>(set=>({ready:false,onboarded:false,language:'en',setReady:()=>set({ready:true}),completeOnboarding:()=>set({onboarded:true}),setLanguage:(language)=>set({language})}));
