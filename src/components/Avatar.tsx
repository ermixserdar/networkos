import {Image,Text,View} from 'react-native';
import {useTheme} from '@/theme';

/** Falls back to initials, so a network without photos still reads cleanly. */
export function Avatar({name,size=48,photo}:{name:string;size?:number;photo?:string|null}){
 const {c}=useTheme();
 const initials=name.split(' ').filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase();
 if(photo)return <Image accessibilityIgnoresInvertColors source={{uri:photo}} style={{width:size,height:size,borderRadius:size/2,backgroundColor:c.sage}}/>;
 return <View accessible={false} style={{width:size,height:size,borderRadius:size/2,backgroundColor:c.sage,alignItems:'center',justifyContent:'center'}}>
  <Text style={{color:c.onSage,fontWeight:'800',fontSize:size*.32}}>{initials||'?'}</Text>
 </View>;
}
