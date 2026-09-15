import {useEffect,useMemo,useRef,useState} from 'react';
import {InteractionManager,Text,View,useWindowDimensions} from 'react-native';
import Svg,{Circle,G,Line,Path,Text as SvgText} from 'react-native-svg';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import Animated,{useAnimatedStyle,useSharedValue} from 'react-native-reanimated';
import {forceCenter,forceLink,forceManyBody,forceSimulation} from 'd3-force';
import {Contact} from '@/types';
import {GraphEdge,OWNER_ID} from '@/services/NetworkService';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export type CanvasNode={id:string;label:string;importance:number;owner?:boolean};
type Point=CanvasNode&{x:number;y:number};
const H=390;
const TICKS=60;
const CHUNK=12;

/**
 * The layout used to run all 60 force ticks synchronously on the JS thread, which froze the tab
 * for a beat on larger graphs. It now advances in chunks between frames and publishes once.
 */
function useLayout(nodes:CanvasNode[],edges:GraphEdge[],width:number){
 const [points,setPoints]=useState<Point[]>([]);
 const [settling,setSettling]=useState(false);
 const cancelled=useRef(false);

 useEffect(()=>{
  cancelled.current=false;
  if(!nodes.length){setPoints([]);return}
  setSettling(true);
  const raw=nodes.map((node,i)=>({...node,x:width/2+Math.cos(i*1.8)*105,y:H/2+Math.sin(i*1.8)*105}));
  const ids=new Set(raw.map(n=>n.id));
  const links=edges.filter(e=>ids.has(e.contact_a_id)&&ids.has(e.contact_b_id)).map(e=>({source:e.contact_a_id,target:e.contact_b_id}));
  const sim=forceSimulation(raw as never[])
   .force('charge',forceManyBody().strength(-190))
   .force('center',forceCenter(width/2,H/2))
   .force('link',forceLink(links as never[]).id((n:never)=>(n as unknown as Point).id).distance(100).strength(.4))
   .stop();
  let done=0;
  const step=()=>{
   if(cancelled.current)return;
   for(let i=0;i<CHUNK&&done<TICKS;i++,done++)sim.tick();
   if(done<TICKS){InteractionManager.runAfterInteractions(step);return}
   setPoints(raw.map(p=>({...p,x:Math.max(28,Math.min(width-28,p.x||width/2)),y:Math.max(28,Math.min(H-28,p.y||H/2))})));
   setSettling(false);
  };
  step();
  return()=>{cancelled.current=true;sim.stop()};
 },[nodes,edges,width]);

 return {points,settling};
}

export function NetworkCanvas({nodes,edges,onSelect,highlightedIds=[],emptyHint}:{nodes:CanvasNode[];edges:GraphEdge[];onSelect:(id:string)=>void;highlightedIds?:string[];emptyHint?:string}){
 const {t}=useTranslation();
 const {c}=useTheme();
 const {width}=useWindowDimensions();
 const W=Math.max(320,width);
 const {points,settling}=useLayout(nodes,edges,W);
 const scale=useSharedValue(1),savedScale=useSharedValue(1),panX=useSharedValue(0),panY=useSharedValue(0),savedPanX=useSharedValue(0),savedPanY=useSharedValue(0);
 const byId=useMemo(()=>new Map(points.map(p=>[p.id,p])),[points]);

 const pan=Gesture.Pan().averageTouches(true)
  .onUpdate(e=>{panX.value=savedPanX.value+e.translationX;panY.value=savedPanY.value+e.translationY})
  .onEnd(()=>{savedPanX.value=panX.value;savedPanY.value=panY.value});
 const pinch=Gesture.Pinch()
  .onUpdate(e=>{scale.value=Math.max(.72,Math.min(2.5,savedScale.value*e.scale))})
  .onEnd(()=>{savedScale.value=scale.value});
 const style=useAnimatedStyle(()=>({transform:[{translateX:panX.value},{translateY:panY.value},{scale:scale.value}]}));

 if(!nodes.length)return <View style={{height:H,justifyContent:'center',alignItems:'center'}}>
  <Text style={{color:'#A8C4C2',fontSize:16,fontWeight:'700'}}>{emptyHint??t('choosePerson')}</Text>
  <Text style={{color:'#7F9F9D',marginTop:6}}>{t('nearby')}</Text>
 </View>;

 return <View style={{height:H,backgroundColor:c.tealDeep,overflow:'hidden'}}>
  <GestureDetector gesture={Gesture.Simultaneous(pan,pinch)}>
   <Animated.View style={[{width:W,height:H},style]}>
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
     <Path d={`M 0 72 C 96 28 220 84 ${W} 35 M 0 315 C 100 360 230 286 ${W} 336`} stroke="#255860" strokeWidth="1" fill="none" opacity=".8"/>
     {edges.map(e=>{
      const a=byId.get(e.contact_a_id),b=byId.get(e.contact_b_id);
      if(!a||!b)return null;
      const hot=highlightedIds.includes(a.id)&&highlightedIds.includes(b.id);
      const owner=e.relationship_type==='owner';
      return <Line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot?c.coral:owner?'#356E70':'#4B7777'} strokeWidth={hot?4:owner?1:1+e.strength*.55} opacity={hot?1:owner?.5:.85} strokeDasharray={owner?'3 4':undefined}/>;
     })}
     {points.map(p=>{
      const highlighted=highlightedIds.includes(p.id);
      const radius=p.owner?27:15+p.importance*1.4;
      return <G key={p.id} accessible accessibilityRole="button" accessibilityLabel={p.owner?t('youLabel'):p.label} onPress={()=>onSelect(p.id)}>
       <Circle cx={p.x} cy={p.y} r={radius} fill={highlighted||p.owner?c.coral:c.sage} stroke={p.owner||highlighted?'#FFB0A0':'#9FC4BE'} strokeWidth={p.owner||highlighted?3:1.5}/>
       <SvgText x={p.x} y={p.y+4} textAnchor="middle" fill={p.owner||highlighted?'#fff':c.tealDeep} fontSize={p.owner?12:10} fontWeight="800">{p.label.slice(0,2).toUpperCase()}</SvgText>
       <SvgText x={p.x} y={p.y+radius+16} textAnchor="middle" fill="#D9E9E5" fontSize="10" fontWeight="700">{p.label.split(' ')[0]}</SvgText>
      </G>;
     })}
    </Svg>
   </Animated.View>
  </GestureDetector>
  {/* Carries the summary so a screen reader gets the shape of the map before touring the nodes. */}
  <View accessible accessibilityLabel={t('graphSummary',nodes.length,edges.length)}
   style={{position:'absolute',right:14,top:14,backgroundColor:'#194C52',borderRadius:12,paddingHorizontal:11,paddingVertical:8}}>
   <Text style={{color:'#C5DEDA',fontSize:11,fontWeight:'700'}}>{settling?t('graphLoading'):t('pinchHint')}</Text>
  </View>
 </View>;
}

export function toCanvasNodes(contacts:Contact[],owner?:{label:string}):CanvasNode[]{
 const nodes=contacts.map(c=>({id:c.id,label:c.display_name||`${c.first_name} ${c.last_name??''}`.trim(),importance:c.importance??3}));
 return owner?[{id:OWNER_ID,label:owner.label,importance:5,owner:true},...nodes]:nodes;
}
