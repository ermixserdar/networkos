import {useCallback,useState} from 'react';
import {FlatList,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Company} from '@/types';
import {CompanyRepository} from '@/repositories/CompanyRepository';
import {BackLink,Empty,Screen,Subtitle,Title,useFocusRefresh,useGoBack} from '@/components/ui';
import {HIT,hitSlop,radius,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function Companies(){
 const [items,setItems]=useState<(Company&{contact_count?:number})[]>([]);
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const goBack=useGoBack('/(tabs)/more');
 useFocusRefresh(useCallback(async()=>{setItems(await CompanyRepository.list())},[]));

 return <Screen>
  <BackLink label={t('backMore')} onPress={goBack}/>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
   <View style={{flex:1}}>
    <Title>{t('companies')}</Title>
    <Subtitle>{t('companiesSubtitle')}</Subtitle>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel={t('addCompany')} hitSlop={hitSlop} onPress={()=>router.push('/companies/new' as never)}
    style={{width:HIT,height:HIT,borderRadius:HIT/2,backgroundColor:c.coral,alignItems:'center',justifyContent:'center',marginTop:14}}>
    <Ionicons name="add" size={24} color="#fff"/>
   </Pressable>
  </View>
  <FlatList data={items} keyExtractor={x=>x.id} contentContainerStyle={{paddingTop:8,paddingBottom:30}}
   ListEmptyComponent={<Empty>{t('noCompanies')}</Empty>}
   renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={()=>router.push(`/companies/${item.id}` as never)}
    style={{backgroundColor:c.card,borderRadius:radius.md,padding:17,marginBottom:10,minHeight:HIT+20}}>
    <Text style={{fontSize:17,fontWeight:'800',color:c.ink}}>{item.name}</Text>
    <Text style={{color:c.muted,marginTop:5}}>{[item.industry,item.city].filter(Boolean).join(' · ')||t('addIndustry')}</Text>
    <Text style={{color:c.coral,fontWeight:'800',marginTop:6}}>{t('peopleAtEvent',item.contact_count??0)}</Text>
   </Pressable>}/>
 </Screen>;
}
