import {Pressable,Text,View} from 'react-native';
import {Contact} from '@/types';
import {HIT,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';
import {Avatar} from './Avatar';

export const contactName=(contact:Contact)=>contact.display_name||`${contact.first_name} ${contact.last_name??''}`.trim();

export function ContactRow({contact,onPress,trailing}:{contact:Contact;onPress:()=>void;trailing?:React.ReactNode}){
 const {c}=useTheme();
 const {t}=useTranslation();
 const name=contactName(contact);
 const detail=[contact.job_title,contact.company_name].filter(Boolean).join(' · ')||t('addRoleCompany');
 return <Pressable accessibilityRole="button" accessibilityLabel={`${name}. ${detail}`} onPress={onPress}
  style={{flexDirection:'row',alignItems:'center',minHeight:HIT+18,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.line}}>
  <Avatar name={name} photo={contact.photo}/>
  <View style={{marginLeft:12,flex:1}}>
   <Text style={{fontSize:16,fontWeight:'700',color:c.ink}}>{name}</Text>
   <Text style={{color:c.muted,marginTop:3}}>{detail}</Text>
  </View>
  {trailing??<Text accessibilityLabel={t('strengthOf',contact.relationship_strength)} style={{color:c.coralInk,fontWeight:'800'}}>● {contact.relationship_strength}</Text>}
 </Pressable>;
}
