// Range pagination avoids treating the server's default page limit as all data.
export async function readAllPages(fetchPage) {
 const rows=[];let offset=0;
 while(true){const page=await fetchPage(offset,offset+499);if(!Array.isArray(page))throw new Error('Invalid database page');if(!page.length)return rows;rows.push(...page);offset+=page.length;}
}
