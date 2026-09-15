import {getDatabase} from '@/database/database';
import {Company,now,uuid} from '@/types';
import {VaultService} from '@/services/VaultService';

export const CompanyRepository={
 list:async()=>{const d=await getDatabase();return d.getAllAsync<Company&{contact_count:number}>(`SELECT co.*,(SELECT COUNT(*) FROM contacts c WHERE c.company_id=co.id AND c.deleted_at IS NULL${VaultService.clause()}) contact_count FROM companies co WHERE co.deleted_at IS NULL ORDER BY co.name COLLATE NOCASE`)},
 get:async(id:string)=>{const d=await getDatabase();return d.getFirstAsync<Company>('SELECT * FROM companies WHERE id=? AND deleted_at IS NULL',id)},
 findByName:async(name:string)=>{const d=await getDatabase();return d.getFirstAsync<Company>('SELECT * FROM companies WHERE lower(name)=lower(?) AND deleted_at IS NULL LIMIT 1',name.trim())},
 contacts:async(id:string)=>{const d=await getDatabase();return d.getAllAsync(`SELECT c.*,co.name company_name FROM contacts c JOIN companies co ON co.id=c.company_id WHERE c.company_id=? AND c.deleted_at IS NULL${VaultService.clause()} ORDER BY c.first_name COLLATE NOCASE`,id)},
 save:async(data:{id?:string;name:string;website?:string;industry?:string;city?:string;country?:string;description?:string})=>{
  const d=await getDatabase(),id=data.id??uuid(),t=now();
  await d.runAsync('INSERT INTO companies(id,name,website,industry,city,country,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,website=excluded.website,industry=excluded.industry,city=excluded.city,country=excluded.country,description=excluded.description,updated_at=excluded.updated_at,version=companies.version+1',id,data.name.trim(),data.website?.trim()||null,data.industry?.trim()||null,data.city?.trim()||null,data.country?.trim()||null,data.description?.trim()||null,t,t);
  return id;
 },
 remove:async(id:string)=>{const d=await getDatabase(),t=now();await d.withTransactionAsync(async()=>{
  await d.runAsync('UPDATE companies SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',t,t,id);
  // Contacts survive their company; they simply lose the link.
  await d.runAsync('UPDATE contacts SET company_id=NULL,updated_at=?,version=version+1 WHERE company_id=?',t,id);
 })},
};
