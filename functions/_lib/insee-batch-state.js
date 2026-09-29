export function createCursor(){return{departmentIndex:0,nafIndex:0,offset:0,seen:0,written:0,requests:0};}
export function advanceCursor(cursor,departments,nafs,total,pageCount,pageSize=100){
 const next={...cursor,seen:Number(cursor.seen||0)+Number(pageCount||0),requests:Number(cursor.requests||0)+1};
 const hasNextPage=Number(total||0)>Number(cursor.offset||0)+pageSize;
 if(hasNextPage){next.offset=Number(cursor.offset||0)+pageSize;return next;}
 next.offset=0;next.nafIndex=Number(cursor.nafIndex||0)+1;
 if(next.nafIndex>=nafs.length){next.nafIndex=0;next.departmentIndex=Number(cursor.departmentIndex||0)+1;}
 if(next.departmentIndex>=departments.length)next.done=true;
 return next;
}
export function currentScope(cursor,departments,nafs){if(cursor?.done)return null;const department=departments[cursor.departmentIndex],naf=nafs[cursor.nafIndex];return department&&naf?{department,naf,offset:Number(cursor.offset||0)}:null;}
