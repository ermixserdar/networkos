import * as ImagePicker from 'expo-image-picker';
import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';

/**
 * Faces are the strongest recall cue an app about remembering people can offer, so photos are
 * first-class data rather than a file on the side: a small JPEG thumbnail is stored as base64 in
 * the encrypted database, which means it is protected at rest and travels with backups and sync
 * for free. Full-resolution originals are deliberately not kept.
 */
export const THUMBNAIL_SIZE=256;
const QUALITY=0.7;
/** Guards against a pathological source blowing up the row and, through it, the backup file. */
export const MAX_THUMBNAIL_BYTES=200_000;

export const PhotoService={
 /** Resizes and re-encodes whatever the caller has into a storable data URI. */
 thumbnail:async(uri:string)=>{
  const rendered=await ImageManipulator.manipulate(uri).resize({width:THUMBNAIL_SIZE,height:THUMBNAIL_SIZE}).renderAsync();
  const saved=await rendered.saveAsync({format:SaveFormat.JPEG,compress:QUALITY,base64:true});
  if(!saved.base64)return null;
  const data=`data:image/jpeg;base64,${saved.base64}`;
  return data.length>MAX_THUMBNAIL_BYTES?null:data;
 },
 pick:async()=>{
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!permission.granted)return null;
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:1});
  if(result.canceled||!result.assets?.[0])return null;
  return PhotoService.thumbnail(result.assets[0].uri);
 },
 capture:async()=>{
  const permission=await ImagePicker.requestCameraPermissionsAsync();
  if(!permission.granted)return null;
  const result=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:1});
  if(result.canceled||!result.assets?.[0])return null;
  return PhotoService.thumbnail(result.assets[0].uri);
 },
};
