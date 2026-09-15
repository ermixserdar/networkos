import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const stamp=()=>new Date().toISOString().slice(0,10);

/** File-level plumbing shared by backups, shares and sync bundles. */
export const EnvelopeFile={
 write:async(prefix:string,contents:string,extension='networkos')=>{
  const uri=`${FileSystem.documentDirectory}${prefix}-${stamp()}.${extension}`;
  await FileSystem.writeAsStringAsync(uri,contents);
  return uri;
 },
 share:async(uri:string,dialogTitle:string,mimeType='application/octet-stream')=>{
  if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{dialogTitle,mimeType});
  return uri;
 },
 pick:async()=>{
  const picked=await DocumentPicker.getDocumentAsync({type:['application/octet-stream','application/json','*/*'],copyToCacheDirectory:true,multiple:false});
  if(picked.canceled||!picked.assets?.[0])return null;
  return FileSystem.readAsStringAsync(picked.assets[0].uri);
 },
};
