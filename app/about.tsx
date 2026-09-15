import {Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import Constants from 'expo-constants';
import {hasFullTextSearch,isEncrypted} from '@/database/database';
import {BackLink,Card,ScreenScroll,Subtitle,Title} from '@/components/ui';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function About(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const version=Constants.expoConfig?.version??'1.0.0';
 const row=(label:string,value:string,ok:boolean)=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:8}}>
  <Text style={{color:c.muted}}>{label}</Text>
  <Text style={{color:ok?c.good:c.coral,fontWeight:'800'}}>{value}</Text>
 </View>;

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('about')}</Title>
  <Subtitle>{t('aboutBody')}</Subtitle>
  <Card>
   {row('NetworkOS',version,true)}
   {/* Surfaced rather than assumed: a build without SQLCipher stores the database in plaintext. */}
   {row('SQLCipher',isEncrypted()?'on':'off',isEncrypted())}
   {row('FTS5',hasFullTextSearch()?'on':'off',hasFullTextSearch())}
  </Card>
 </ScreenScroll>;
}
