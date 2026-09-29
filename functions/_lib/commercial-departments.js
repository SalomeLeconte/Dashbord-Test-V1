import {normalizeDepartments} from './insee-sync.js';
export function commercialDepartmentsFromUsers(users=[]){
 const values=[];
 for(const user of users){
  if(String(user?.role||'').toUpperCase()!=='COMMERCIAL')continue;
  if(Array.isArray(user?.scope?.departments))values.push(...user.scope.departments);
 }
 return normalizeDepartments(values);
}
