import {Component,ReactNode} from 'react';
import {Text,View} from 'react-native';
import {lightColors} from '@/theme';
import {Language, translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';

type Props={children:ReactNode};
type State={error:Error|null};

/**
 * A render error used to take the whole app to a blank screen with no way back. This keeps the
 * failure visible and recoverable; the data itself is untouched on disk either way.
 */
export class ErrorBoundary extends Component<Props,State>{
 state:State={error:null};
 static getDerivedStateFromError(error:Error){return {error}}

 render(){
  if(!this.state.error)return this.props.children;
  // Deliberately palette-and-store-free of hooks: this must render even when the tree is broken.
  const language=(useAppStore.getState?.().language??'en') as Language;
  const t=translate(language);
  const c=lightColors;
  return <View style={{flex:1,backgroundColor:c.paper,padding:26,paddingTop:120}}>
   <Text accessibilityRole="header" style={{fontSize:28,fontWeight:'800',color:c.ink}}>{t('crashTitle')}</Text>
   <Text style={{color:c.muted,fontSize:16,lineHeight:24,marginTop:12}}>{t('crashBody')}</Text>
   <Text selectable style={{color:c.muted,fontSize:12,marginTop:24}}>{this.state.error.message}</Text>
   <View style={{marginTop:28}}>
    <Text accessibilityRole="button" onPress={()=>this.setState({error:null})}
     style={{backgroundColor:c.coral,color:'#fff',fontWeight:'800',fontSize:16,textAlign:'center',paddingVertical:16,borderRadius:16,overflow:'hidden'}}>
     {t('retry')}
    </Text>
   </View>
  </View>;
 }
}
