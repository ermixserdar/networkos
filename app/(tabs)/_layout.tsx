import {Tabs} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

const icons:Record<string,keyof typeof Ionicons.glyphMap>={index:'home-outline',contacts:'people-outline',network:'git-network-outline',followup:'calendar-outline',more:'ellipsis-horizontal'};

export default function TabsLayout(){
 const {t}=useTranslation();
 const {c}=useTheme();
 const insets=useSafeAreaInsets();
 return <Tabs screenOptions={({route})=>({
  headerShown:false,
  tabBarActiveTintColor:c.coralInk,
  tabBarInactiveTintColor:c.muted,
  tabBarStyle:{height:56+Math.max(insets.bottom,12),paddingTop:8,paddingBottom:Math.max(insets.bottom,12),borderTopColor:c.line,backgroundColor:c.card},
  tabBarLabelStyle:{fontSize:11,fontWeight:'700'},
  // The bar has a fixed height; unbounded scaling clips the labels instead of growing them.
  tabBarLabelPosition:'below-icon',
  tabBarIcon:({color,size})=><Ionicons name={icons[route.name]??'ellipse-outline'} size={size} color={color}/>,
 })}>
  <Tabs.Screen name="index" options={{title:t('home')}}/>
  <Tabs.Screen name="contacts" options={{title:t('contacts')}}/>
  <Tabs.Screen name="network" options={{title:t('network')}}/>
  <Tabs.Screen name="followup" options={{title:t('followUp')}}/>
  <Tabs.Screen name="more" options={{title:t('more')}}/>
 </Tabs>;
}
