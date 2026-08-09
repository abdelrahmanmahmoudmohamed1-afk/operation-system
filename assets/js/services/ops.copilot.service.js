import EnterpriseData from './enterprise.data.js';
import Container from '../core/container.js';

function norm(v){return String(v??'').trim().toLowerCase();}
function money(v){return Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});}
function isArabic(s){return /[\u0600-\u06FF]/.test(String(s||''));}
function cleanEmail(x){const m=String(x||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return m?m[0]:'';}
function titleCase(s){return String(s||'').replace(/\b\w/g,c=>c.toUpperCase());}

function parseRelativeReminder(q){
  const now=Date.now(); const text=norm(q);
  let ms=0;
  let m=text.match(/(?:بعد|in)\s*(نص|نصف|half|\d+)\s*(دقيقة|دقايق|minutes?|mins?)/i);
  if(m){ms=(['نص','نصف','half'].includes(m[1])?30:Number(m[1]||0))*60000;}
  if(!ms){m=text.match(/(?:بعد|in)\s*(\d+)\s*(ساعة|ساعات|hours?|hrs?)/i);if(m)ms=Number(m[1])*3600000;}
  if(!ms && /بعد\s*(نص|نصف)\s*ساعة|in\s*half\s*an?\s*hour/i.test(text))ms=30*60000;
  if(!ms && /بعد\s*ساعة|in\s*an?\s*hour/i.test(text))ms=60*60000;
  return ms?new Date(now+ms):null;
}

class OpsCopilotService {
  constructor(){this.history=[];}
  remember(role,text){this.history.push({role,text,at:Date.now()});this.history=this.history.slice(-14);}
  context(){return this.history.slice(-6);}

  async ask(question){
    const qRaw=String(question||'').trim(); const q=norm(qRaw); const ar=isArabic(qRaw);
    this.remember('user',qRaw);
    const live=await EnterpriseData.loadAll();
    const units=EnterpriseData.normalizeUnits(live.inventory||[]);
    const clients=EnterpriseData.normalizeClients(live.clients||[]);
    const project = ['layana','mersea','لايانا','ميرسي'].find(p=>q.includes(p));
    const projectKey=project?(/mersea|ميرسي/.test(project)?'Mersea':'Layana'):'';
    const scopedUnits=projectKey?units.filter(x=>norm(x.project)===norm(projectKey)):units;
    const scopedClients=projectKey?clients.filter(x=>norm(x.project)===norm(projectKey)):clients;
    const byStatus=s=>scopedUnits.filter(x=>norm(x.status)===s);
    const sold=byStatus('sold'), contracted=byStatus('contracted'), reserved=byStatus('reserved'), available=byStatus('available');

    // Reminder / alarm intent
    if(/فكرني|ذكرني|remind me|reminder|alarm|نبهني/.test(q)){
      const due=parseRelativeReminder(qRaw);
      if(!due){
        const out={title:ar?'تذكير جديد':'New reminder',answer:ar?'تمام. قولي بعد قد إيه أو الساعة كام، مثال: «فكرني بعد نص ساعة أراجع العقود».':'Sure. Tell me when, e.g. “remind me in 30 minutes to review contracts”.',type:'clarify'}; this.remember('assistant',out.answer);return out;
      }
      let task=qRaw.replace(/^(.*?)(فكرني|ذكرني|remind me|نبهني)/i,'').replace(/(?:بعد|in)\s*(?:نص|نصف|half|\d+)\s*(?:دقيقة|دقايق|minutes?|mins?|ساعة|ساعات|hours?|hrs?).*$/i,'').trim();
      task=task.replace(/^(ان|أني|اني|to)\s+/i,'').trim() || (ar?'متابعة المهمة':'Follow up task');
      const action={kind:'reminder',label:ar?'تفعيل التذكير':'Set reminder',payload:{title:task,dueAt:due.toISOString()}};
      const out={title:ar?'التذكير جاهز':'Reminder ready',answer:ar?`هفكرك بـ «${task}» الساعة ${due.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}. اضغط تفعيل علشان أسجله وأشغل التنبيه.`:`I’ll remind you to “${task}” at ${due.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. Confirm to activate it.`,actions:[action],type:'action'};this.remember('assistant',out.answer);return out;
    }

    // Email / request intent
    if(/ابعت|ارسل|إرسل|send/.test(q) && /(ايميل|إيميل|email|request|ريكويست|طلب)/.test(q)){
      const explicit=cleanEmail(qRaw);
      const terms=qRaw.split(/\s+/).filter(x=>x.length>2);
      const client=scopedClients.find(c=>terms.some(t=>norm(c.clientName).includes(norm(t))) && c.email);
      const recipient=explicit || client?.email || '';
      const isRequest=/request|ريكويست|طلب/.test(q);
      const subject=isRequest?(ar?'طلب من Operation System':'Request from Operation System'):(ar?'رسالة من Operation System':'Message from Operation System');
      const body=ar?'مرحباً،\n\nأرسل لك هذه الرسالة من خلال Operation System.\n\nتحياتي،':'Hello,\n\nThis message was prepared from Operation System.\n\nRegards,';
      if(!recipient){const out={title:ar?'محتاج البريد الإلكتروني':'Recipient needed',answer:ar?'تمام. اكتبلي الإيميل أو اسم عميل موجود في CRM وله بريد إلكتروني، وأنا أجهز الرسالة للمراجعة.':'Sure. Give me the email address, or a CRM client name with an email, and I’ll prepare the message.',type:'clarify'};this.remember('assistant',out.answer);return out;}
      const out={title:ar?'الإيميل جاهز للمراجعة':'Email ready for review',answer:ar?`جهزت رسالة إلى ${recipient}. حفاظاً على الأمان، الإرسال الخارجي يحتاج تأكيدك؛ بعد التأكيد هفتح نافذة الإرسال الجاهزة.`:`I prepared an email to ${recipient}. External sending requires your confirmation; confirming opens the prepared compose window.`,actions:[{kind:'email',label:ar?'راجع وافتح الإرسال':'Review & open email',payload:{to:recipient,subject,body}}],preview:{to:recipient,subject,body},type:'action'};this.remember('assistant',out.answer);return out;
    }

    // Navigation/action intents
    const routes=[['crm',['crm','عميل','العملاء']],['reports',['report','reports','تقرير','تقارير']],['inventory',['inventory','مخزون','الوحدات']],['tasks',['tasks','task','مهام','مهمة']],['contracts',['contracts','contract','العقود']],['leads',['leads','lead','ليد','ليدز']],['analytics',['analytics','تحليل','اداء','أداء']],['digitaltwin',['digital twin','خريطة الوحدات','المباني']]];
    if(/افتح|روح|ادخل|open|go to/.test(q)){
      const hit=routes.find(([,words])=>words.some(w=>q.includes(w)));
      if(hit){const out={title:ar?'تنقل سريع':'Navigation',answer:ar?`تمام، أقدر أفتح ${hit[0]} دلوقتي.`:`I can open ${titleCase(hit[0])} now.`,actions:[{kind:'route',label:ar?'افتح الآن':'Open now',payload:{route:hit[0]}}],type:'action'};this.remember('assistant',out.answer);return out;}
    }

    if(/top|best|highest|اكتر|أكتر|افضل|أفضل/.test(q) && /sales|سيلز/.test(q)){
      const map={}; scopedClients.forEach(c=>{const s=c.sales||'Unassigned';const x=map[s]||(map[s]={name:s,value:0,count:0,sold:0,contracted:0});x.count++;x.value+=Number(c.value||0);if(norm(c.status)==='sold')x.sold++;if(norm(c.status)==='contracted')x.contracted++;});
      const rows=Object.values(map).sort((a,b)=>(b.sold*5+b.contracted*3+b.value/1e6)-(a.sold*5+a.contracted*3+a.value/1e6)).slice(0,5);
      const out={title:ar?'أفضل أداء مبيعات':'Top sales performance',answer:rows.length?(ar?`${rows[0].name} متصدر حالياً: ${rows[0].sold} Sold و ${rows[0].contracted} Contracted.`:`${rows[0].name} currently leads with ${rows[0].sold} sold and ${rows[0].contracted} contracted records.`):(ar?'لا توجد بيانات أداء متاحة.':'No sales performance data is available.'),rows:rows.map(x=>({label:x.name,value:`${x.sold} sold · ${x.contracted} contracted · ${money(x.value)}`})),route:'analytics'};this.remember('assistant',out.answer);return out;
    }
    if(/available|متاح|متاحة/.test(q)){const out={title:ar?'الوحدات المتاحة':'Available inventory',answer:ar?`عندك ${available.length} وحدة متاحة${projectKey?` في ${projectKey}`:''}.`:`${available.length} available unit(s) are visible${projectKey?` in ${projectKey}`:''}.`,rows:available.slice(0,12).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${x.building||'-'} · ${money(x.price)}`})),route:'digitaltwin'};this.remember('assistant',out.answer);return out;}
    if(/sold|مباع|سولد/.test(q)){const out={title:ar?'الوحدات المباعة':'Sold portfolio',answer:ar?`${sold.length} وحدة Sold بقيمة إجمالية ${money(sold.reduce((s,x)=>s+Number(x.price||0),0))}.`:`${sold.length} sold unit(s) with a combined value of ${money(sold.reduce((s,x)=>s+Number(x.price||0),0))}.`,rows:sold.slice(0,10).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${money(x.price)}`})),route:'reports'};this.remember('assistant',out.answer);return out;}
    if(/contract|كونتراكت|contracted/.test(q)){const out={title:ar?'الوحدات المتعاقد عليها':'Contracted portfolio',answer:ar?`${contracted.length} وحدة Contracted بقيمة إجمالية ${money(contracted.reduce((s,x)=>s+Number(x.price||0),0))}.`:`${contracted.length} contracted unit(s) with a combined value of ${money(contracted.reduce((s,x)=>s+Number(x.price||0),0))}.`,rows:contracted.slice(0,10).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${money(x.price)}`})),route:'reports'};this.remember('assistant',out.answer);return out;}
    if(/reserved|reserve|ريسيرف/.test(q)){const out={title:ar?'الحجوزات':'Reserved portfolio',answer:ar?`${reserved.length} وحدة Reserved في النطاق الحالي.`:`${reserved.length} reserved unit(s) are visible.`,rows:reserved.slice(0,10).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${money(x.price)}`})),route:'achievement'};this.remember('assistant',out.answer);return out;}
    if(/mobile|phone|موبايل|تليفون/.test(q) && /missing|ناقص|مش/.test(q)){const rows=scopedClients.filter(x=>!x.mobile1);const out={title:ar?'جودة بيانات CRM':'CRM mobile quality',answer:ar?`${rows.length} عميل ناقص رقم الموبايل الأساسي.`:`${rows.length} client record(s) are missing a primary mobile number.`,rows:rows.slice(0,12).map(x=>({label:x.clientName||'Client',value:`${x.project} · ${x.unitCode||'-'}`})),route:'quality'};this.remember('assistant',out.answer);return out;}
    if(/summary|overview|ملخص|وضع الشركة|status|الدنيا/.test(q)){const answer=ar?`ملخص سريع: ${scopedUnits.length} وحدة؛ ${available.length} Available، ${reserved.length} Reserved، ${contracted.length} Contracted، ${sold.length} Sold. وعندك ${scopedClients.length} سجل عميل.`:`Visible scope contains ${scopedUnits.length} unit(s): ${available.length} available, ${reserved.length} reserved, ${contracted.length} contracted and ${sold.length} sold. CRM contains ${scopedClients.length} client record(s).`;const out={title:ar?'الملخص التنفيذي':'Executive summary',answer,rows:[{label:ar?'قيمة المحفظة':'Portfolio value',value:money(scopedUnits.reduce((s,x)=>s+Number(x.price||0),0))},{label:ar?'خط المبيعات المغلق':'Closed pipeline',value:String(reserved.length+contracted.length+sold.length)},{label:ar?'تغطية الموبايل':'CRM coverage',value:`${scopedClients.filter(x=>x.mobile1).length}/${scopedClients.length}`}],route:'commandcenter'};this.remember('assistant',out.answer);return out;}

    const terms=q.split(/\s+/).filter(x=>x.length>1);
    const unitMatches=scopedUnits.filter(x=>terms.some(t=>Object.values(x).some(v=>norm(v).includes(t)))).slice(0,8);
    const clientMatches=scopedClients.filter(x=>terms.some(t=>Object.values(x).some(v=>norm(v).includes(t)))).slice(0,8);
    const answer=ar?`لقيت ${unitMatches.length} وحدة و ${clientMatches.length} عميل مطابقين للكلام ده. تقدر تكمل سؤالك بشكل طبيعي وأنا هحافظ على سياق المحادثة.`:`I found ${unitMatches.length} matching unit(s) and ${clientMatches.length} client record(s). You can keep talking naturally and I’ll retain recent conversation context.`;
    const out={title:ar?'بحث ذكي في النظام':'Workspace search',answer,rows:[...unitMatches.map(x=>({label:x.unitCode||'Unit',value:`Unit · ${x.project} · ${x.status}`})),...clientMatches.map(x=>({label:x.clientName||'Client',value:`Client · ${x.project} · ${x.mobile1||'No mobile'}`}))].slice(0,12),route:unitMatches.length?'digitaltwin':'crm'};this.remember('assistant',out.answer);return out;
  }
}
export default new OpsCopilotService();
