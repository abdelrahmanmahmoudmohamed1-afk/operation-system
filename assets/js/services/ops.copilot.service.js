import EnterpriseData from './enterprise.data.js';
import PaymentService from './payment.service.js';
import ApiService from './api.service.js';
import AuthManager from '../managers/auth.manager.js';
import ENDPOINTS from '../constants/endpoints.js';

function norm(v){return String(v??'').trim().toLowerCase();}
function money(v){return Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});}
function pct(v){return `${Math.round(Number(v||0)*1000)/10}%`;}
function isArabic(s){return /[\u0600-\u06FF]/.test(String(s||''));}
function cleanEmail(x){const m=String(x||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return m?m[0]:'';}
function titleCase(s){return String(s||'').replace(/\b\w/g,c=>c.toUpperCase());}
function num(x){const n=Number(String(x??'').replace(/,/g,'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;}
function avg(rows,key){return rows.length?rows.reduce((s,x)=>s+Number(x[key]||0),0)/rows.length:0;}
function sum(rows,key){return rows.reduce((s,x)=>s+Number(x[key]||0),0);}
function projectFromText(q){if(/mersea|ميرسي/.test(q))return'Mersea';if(/layana|لايانا/.test(q))return'Layana';return'';}
function statusNorm(v){const s=norm(v);if(/sold|سولد|مباع/.test(s))return'sold';if(/contract|كونتراكت/.test(s))return'contracted';if(/reserve|ريسيرف|حجز/.test(s))return'reserved';if(/avail|متاح/.test(s))return'available';return s;}

function parseRelativeReminder(q){
  const now=Date.now(); const text=norm(q); let ms=0; let m;
  m=text.match(/(?:بعد|in)\s*(نص|نصف|half|\d+)\s*(دقيقة|دقايق|دقيقه|minutes?|mins?)/i);
  if(m)ms=(['نص','نصف','half'].includes(m[1])?30:Number(m[1]||0))*60000;
  if(!ms){m=text.match(/(?:بعد|in)\s*(نص|نصف|half|\d+)\s*(ساعة|ساعه|ساعات|hours?|hrs?)/i);if(m)ms=(['نص','نصف','half'].includes(m[1])?.5:Number(m[1]||0))*3600000;}
  if(!ms && /بعد\s*(نص|نصف)\s*ساعة|in\s*half\s*an?\s*hour/i.test(text))ms=30*60000;
  if(!ms && /بعد\s*ساعة|in\s*an?\s*hour/i.test(text))ms=60*60000;
  return ms?new Date(now+ms):null;
}

function extractPercent(text,labels=[]){
  const q=String(text||'');
  for(const label of labels){
    const esc=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const a=q.match(new RegExp(`(?:${esc})\\s*[:=\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*%`,'i'));
    if(a)return Number(a[1])/100;
    const b=q.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s*(?:${esc})`,'i'));
    if(b)return Number(b[1])/100;
  }
  return null;
}
function extractYears(text){const m=String(text||'').match(/(\d{1,2})\s*(?:سنين|سنة|سنه|years?|yrs?)/i);return m?Number(m[1]):null;}
function extractMoney(text){
  const q=String(text||'');
  const patterns=[
    /(?:سعر(?:\s*الوحدة)?|price|ticket)\s*[:=\-]?\s*([\d,.]+)\s*(مليون|million|m)?/i,
    /([\d,.]+)\s*(مليون|million)\b/i,
    /(?:budget|ميزانية|بميزانية)\s*[:=\-]?\s*([\d,.]+)/i
  ];
  for(const p of patterns){const m=q.match(p);if(m){let n=num(m[1]);if(/مليون|million/i.test(m[2]||''))n*=1e6;return n;}}
  return 0;
}
function extractMonthlyBudget(text){
  const q=String(text||'');
  const m=q.match(/(?:شهري|شهريا|شهرياً|monthly|في\s*الشهر|budget)\s*(?:بتاعه|بتاعها|حوالي|=|:)?\s*([\d,.]+)\s*(الف|ألف|k|thousand)?/i) || q.match(/([\d,.]+)\s*(الف|ألف|k|thousand)?\s*(?:شهري|شهريا|شهرياً|monthly|في\s*الشهر)/i);
  if(!m)return 0; let n=num(m[1]);if(/الف|ألف|k|thousand/i.test(m[2]||''))n*=1000;return n;
}
function extractFrequency(text){const q=norm(text);if(/month|شهري/.test(q))return'monthly';if(/quarter|ربع/.test(q))return'quarter';if(/semi|نصف سنوي|نصف\s*سنوي/.test(q))return'semi';if(/annual|سنوي/.test(q))return'annual';return null;}

class OpsCopilotService {
  constructor(){this.history=[];this.memory={lastPlan:null,lastIntent:null,lastProject:'',lastEmail:null};}
  remember(role,text,meta={}){this.history.push({role,text,meta,at:Date.now()});this.history=this.history.slice(-30);}
  context(){return this.history.slice(-10);}

  async workspace(){
    const live=await EnterpriseData.loadAll();
    const units=EnterpriseData.normalizeUnits(live.inventory||[]);
    const clients=EnterpriseData.normalizeClients(live.clients||[]);
    const eoi=Array.isArray(live.eoi)?live.eoi:[];
    return {live,units,clients,eoi};
  }

  scope(data,q){
    const project=projectFromText(q)||this.memory.lastProject||'';
    if(project)this.memory.lastProject=project;
    const scopedUnits=project?data.units.filter(x=>norm(x.project)===norm(project)):data.units;
    const scopedClients=project?data.clients.filter(x=>norm(x.project)===norm(project)):data.clients;
    const scopedEoi=project?data.eoi.filter(x=>norm(x.project||x.Project).includes(norm(project))):data.eoi;
    return {project,units:scopedUnits,clients:scopedClients,eoi:scopedEoi};
  }

  eoiSummary(eoi=[]){
    const byProject={};
    eoi.forEach(r=>{const p=String(r.project||r.Project||'Unknown').trim()||'Unknown';byProject[p]=(byProject[p]||0)+1;});
    return {total:eoi.length,byProject};
  }

  executiveSummary(scope,ar){
    const statuses={available:0,reserved:0,contracted:0,sold:0};
    scope.units.forEach(u=>{const s=statusNorm(u.status);if(statuses[s]!==undefined)statuses[s]++;});
    const totalValue=sum(scope.units,'price'); const closed=statuses.reserved+statuses.contracted+statuses.sold;
    const coverage=scope.clients.length?scope.clients.filter(x=>x.mobile1).length/scope.clients.length:0;
    const eoi=this.eoiSummary(scope.eoi);
    return {
      title:ar?'الملخص التنفيذي':'Executive brief',
      answer:ar?`النطاق الحالي فيه ${scope.units.length} وحدة؛ ${statuses.available} Available، ${statuses.reserved} Reserved، ${statuses.contracted} Contracted، ${statuses.sold} Sold. إجمالي EOI ${eoi.total}. تغطية أرقام الموبايل ${pct(coverage)}.`:`Current scope has ${scope.units.length} units: ${statuses.available} available, ${statuses.reserved} reserved, ${statuses.contracted} contracted and ${statuses.sold} sold. Total EOI: ${eoi.total}. CRM mobile coverage: ${pct(coverage)}.`,
      rows:[{label:ar?'قيمة المحفظة':'Portfolio value',value:money(totalValue)},{label:ar?'الوحدات في الـ closed pipeline':'Closed pipeline',value:String(closed)},{label:'EOI',value:String(eoi.total)},{label:ar?'تغطية CRM':'CRM coverage',value:pct(coverage)}],
      route:'commandcenter',expert:'Executive'
    };
  }

  parsePlan(qRaw,scope){
    const q=String(qRaw||''); const previous=this.memory.lastPlan||{};
    const years=extractYears(q) ?? previous.years ?? 8;
    const downRate=extractPercent(q,['dp','down payment','مقدم','داون','دفعة مقدمة']) ?? previous.downRate ?? null;
    const discountRate=extractPercent(q,['discount','خصم','ديسكاونت']) ?? previous.discountRate ?? null;
    const maintenanceRate=extractPercent(q,['maintenance','صيانه','صيانة']) ?? previous.maintenanceRate ?? 0;
    const frequency=extractFrequency(q) ?? previous.frequency ?? 'monthly';
    const explicitPrice=extractMoney(q);
    const available=scope.units.filter(u=>statusNorm(u.status)==='available' && u.price>0);
    const portfolioPrice=available.length?avg(available,'price'):avg(scope.units.filter(u=>u.price>0),'price');
    const ticketPrice=explicitPrice || previous.ticketPrice || portfolioPrice || 10000000;
    return {ticketPrice,years,downRate,discountRate,maintenanceRate,frequency,usedPortfolioPrice:!explicitPrice&&!previous.ticketPrice};
  }

  scorePlan(plan,scope){
    const cash36=plan.collectedRateAt36Months;
    const discountCost=plan.discountRate;
    const dp=plan.downPayment/Math.max(plan.discountedPrice,1);
    const affordability=plan.installmentAmount/Math.max(plan.discountedPrice,1);
    let score=50;
    score += Math.min(25,Math.max(-20,(cash36-.5)*100));
    score += dp>=.1?8:dp>=.05?2:-6;
    score -= Math.max(0,discountCost-.05)*80;
    score += plan.years<=8?6:plan.years<=9?2:-2;
    if(plan.validation?.passed)score+=8; else score-=10;
    score=Math.max(0,Math.min(100,Math.round(score)));
    const grade=score>=80?'Strong':score>=65?'Good':score>=50?'Balanced':'Risky';
    return {score,grade,cash36,discountCost,affordability};
  }

  paymentPlanAdvice(qRaw,scope,ar){
    let p=this.parsePlan(qRaw,scope);
    let options={frequency:p.frequency,maintenanceRate:p.maintenanceRate};
    if(p.downRate!==null)options.downRate=p.downRate;
    if(p.discountRate!==null)options.discountRate=p.discountRate;
    let plan;
    try{plan=PaymentService.calculate({ticketPrice:p.ticketPrice,years:p.years,bookingDate:new Date(),options});}
    catch(err){return {title:ar?'محتاج تعديل في المواصفات':'Plan needs adjustment',answer:ar?`مدة التقسيط ${p.years} سنة غير مدعومة حالياً. المتاح: ${PaymentService.getAvailableYears().join('، ')} سنوات.`:`${p.years} years is not supported. Available durations: ${PaymentService.getAvailableYears().join(', ')} years.`,type:'clarify'};}
    const score=this.scorePlan(plan,scope); const budget=extractMonthlyBudget(qRaw);
    const monthlyEquivalent=plan.frequency==='monthly'?plan.installmentAmount:plan.installmentAmount/(plan.frequency==='quarter'?3:plan.frequency==='semi'?6:12);
    const budgetFit=budget?monthlyEquivalent<=budget:null;
    this.memory.lastPlan={ticketPrice:p.ticketPrice,years:p.years,downRate:plan.downPayment/plan.discountedPrice,discountRate:plan.discountRate,maintenanceRate:p.maintenanceRate,frequency:p.frequency};
    let recommendation;
    if(ar){
      recommendation=score.grade==='Strong'?'الخطة قوية من ناحية التحصيل المبكر ومش محتاجة تنازل كبير في السعر.':score.grade==='Good'?'الخطة جيدة ومتوازنة، لكن راقب تأثير الخصم ومدة التحصيل على الـ cash flow.':score.grade==='Balanced'?'الخطة قابلة للتطبيق، لكن محتاجة موازنة أفضل بين الـ DP والخصم ومدة التقسيط.':'الخطة فيها مخاطرة Cash Flow واضحة؛ الأفضل تزود الـ DP أو تقلل المدة/الخصم.';
      if(budget)recommendation+=budgetFit?` وكمان القسط المكافئ مناسب لميزانية ${money(budget)} شهرياً.`:` لكن القسط المكافئ ${money(monthlyEquivalent)} أعلى من ميزانية ${money(budget)} شهرياً.`;
    }else{
      recommendation=score.grade==='Strong'?'Strong early-cash profile with limited price sacrifice.':score.grade==='Good'?'A good balanced plan; watch discount cost and collection timing.':score.grade==='Balanced'?'Workable, but DP, discount and duration should be rebalanced.':'Cash-flow risk is high; increase DP or reduce duration/discount.';
    }
    const sourceNote=p.usedPortfolioPrice?(ar?'استخدمت متوسط سعر الوحدات المتاحة لأنك ماحددتش سعر وحدة.':'I used the average available-unit price because no ticket price was provided.'):(ar?'الحساب مبني على السعر اللي ذكرته.':'Calculated from the ticket price you provided.');
    return {
      title:ar?`تحليل Payment Plan · ${score.grade}`:`Payment Plan Analysis · ${score.grade}`,
      answer:ar?`${recommendation} ${sourceNote} التقييم ${score.score}/100، والتحصيل المتوقع خلال 36 شهر ${pct(plan.collectedRateAt36Months)} من سعر البيع بعد الخصم.`:`${recommendation} ${sourceNote} Score: ${score.score}/100. Expected collection within 36 months: ${pct(plan.collectedRateAt36Months)} of discounted price.`,
      rows:[
        {label:ar?'سعر الوحدة':'Ticket price',value:money(plan.ticketPrice)},
        {label:ar?'السعر بعد الخصم':'After discount',value:money(plan.discountedPrice)},
        {label:'DP',value:`${pct(plan.downPayment/plan.discountedPrice)} · ${money(plan.downPayment)}`},
        {label:ar?'المدة':'Duration',value:`${plan.years} ${ar?'سنوات':'years'}`},
        {label:ar?'القسط':'Installment',value:`${money(plan.installmentAmount)} · ${plan.frequencyLabel}`},
        {label:ar?'المكافئ الشهري':'Monthly equivalent',value:money(monthlyEquivalent)},
        {label:ar?'تحصيل 36 شهر':'36-month collection',value:`${money(plan.collectedAt36Months)} · ${pct(plan.collectedRateAt36Months)}`},
        {label:ar?'تكلفة الخصم':'Discount cost',value:`${pct(plan.discountRate)} · ${money(plan.ticketPrice-plan.discountedPrice)}`},
        {label:ar?'التقييم التجاري':'Commercial score',value:`${score.score}/100 · ${score.grade}`}
      ],
      actions:[{kind:'route',label:ar?'افتح Payment':'Open Payment',payload:{route:'payment'}}],
      type:'analysis',expert:'Payment Strategy',plan
    };
  }

  findBestPlan(qRaw,scope,ar){
    const base=this.parsePlan(qRaw,scope); const budget=extractMonthlyBudget(qRaw); const candidates=[];
    for(const years of PaymentService.getAvailableYears()){
      for(const dp of [.05,.1,.15,.2]){
        for(const discount of [0,.05,.1,.15]){
          try{
            const plan=PaymentService.calculate({ticketPrice:base.ticketPrice,years,bookingDate:new Date(),options:{frequency:'monthly',downRate:dp,discountRate:discount}});
            const s=this.scorePlan(plan,scope); const monthly=plan.installmentAmount;
            let fit=s.score; if(budget){const ratio=monthly/budget;fit+=ratio<=1?15:Math.max(-35,-35*(ratio-1));}
            candidates.push({plan,score:s.score,fit,monthly});
          }catch{}
        }
      }
    }
    candidates.sort((a,b)=>b.fit-a.fit); const best=candidates[0];
    if(!best)return {title:'Payment Plan',answer:ar?'مش قادر أبني سيناريو من البيانات الحالية.':'Unable to build a scenario from current data.'};
    this.memory.lastPlan={ticketPrice:best.plan.ticketPrice,years:best.plan.years,downRate:best.plan.downPayment/best.plan.discountedPrice,discountRate:best.plan.discountRate,maintenanceRate:0,frequency:'monthly'};
    return {title:ar?'أفضل سيناريو مقترح':'Recommended payment scenario',answer:ar?`من السيناريوهات اللي اختبرتها، أفضل توازن حالياً: ${pct(best.plan.downPayment/best.plan.discountedPrice)} DP، ${best.plan.years} سنوات، خصم ${pct(best.plan.discountRate)}، بقسط شهري حوالي ${money(best.monthly)}. التقييم ${best.score}/100.${budget?` ميزانية العميل ${money(budget)} شهرياً.`:''}`:`Best current balance: ${pct(best.plan.downPayment/best.plan.discountedPrice)} DP, ${best.plan.years} years, ${pct(best.plan.discountRate)} discount, monthly installment about ${money(best.monthly)}. Score ${best.score}/100.`,rows:candidates.slice(0,5).map((x,i)=>({label:`#${i+1} · ${pct(x.plan.downPayment/x.plan.discountedPrice)} DP · ${x.plan.years}Y · ${pct(x.plan.discountRate)} Disc`,value:`${money(x.monthly)}/mo · ${x.score}/100`})),actions:[{kind:'route',label:ar?'افتح Payment':'Open Payment',payload:{route:'payment'}}],type:'analysis',expert:'Payment Strategy'};
  }

  emailIntent(qRaw,scope,ar){
    const q=norm(qRaw); const recipient=cleanEmail(qRaw)||'';
    if(!recipient)return {title:ar?'محتاج البريد الإلكتروني':'Recipient needed',answer:ar?'اكتبلي الإيميل اللي عايز أبعتله وأنا أجهز الرسالة كاملة للمراجعة.':'Give me the recipient email and I’ll prepare the full message for review.',type:'clarify'};
    const wantsEOI=/\beoi\b|اي او اي|إي او إي/.test(q);
    let subject=ar?'رسالة من Operation System':'Message from Operation System';
    let body=ar?'مرحباً،\n\nأرسل لك هذه الرسالة من خلال Operation System.\n\nتحياتي،':'Hello,\n\nThis message was prepared from Operation System.\n\nRegards,';
    if(wantsEOI){
      const stats=this.eoiSummary(scope.eoi); subject=ar?'EOI Summary':'EOI Summary';
      const lines=Object.entries(stats.byProject).map(([p,n])=>`- ${p}: ${n}`).join('\n');
      body=ar?`مرحباً،\n\nإجمالي عدد الـ EOI الحالي: ${stats.total}.\n${lines?`\nالتوزيع حسب المشروع:\n${lines}\n`:''}\nتم استخراج الأرقام من Operation System.\n\nتحياتي،`:`Hello,\n\nCurrent total EOI: ${stats.total}.\n${lines?`\nBy project:\n${lines}\n`:''}\nFigures were prepared from Operation System.\n\nRegards,`;
    }
    const out={title:ar?'الإيميل جاهز للمراجعة':'Email ready for review',answer:ar?`فهمت إنك عايز تبعت${wantsEOI?' إجمالي الـ EOI':''} إلى ${recipient}. جهزت المحتوى من بيانات النظام. راجعه واضغط فتح الإرسال.`:`I prepared${wantsEOI?' the EOI summary':''} for ${recipient}. Review it, then open the compose window.`,actions:[{kind:'email',label:ar?'راجع وافتح الإرسال':'Review & open email',payload:{to:recipient,subject,body}}],preview:{to:recipient,subject,body},type:'action',expert:'Communications'};
    this.memory.lastEmail=out.preview; return out;
  }

  async remoteConversation(question,scope){
    try{
      const context={project:scope.project||'ALL',units:{total:scope.units.length,available:scope.units.filter(x=>statusNorm(x.status)==='available').length,reserved:scope.units.filter(x=>statusNorm(x.status)==='reserved').length,contracted:scope.units.filter(x=>statusNorm(x.status)==='contracted').length,sold:scope.units.filter(x=>statusNorm(x.status)==='sold').length,value:sum(scope.units,'price')},clients:{total:scope.clients.length,missingMobile:scope.clients.filter(x=>!x.mobile1).length},eoi:this.eoiSummary(scope.eoi)};
      const res=await ApiService.post(ENDPOINTS.AI_CHAT,{token:AuthManager.getToken(),data:{question,context,history:this.context()}},{cacheTTL:0});
      const data=res?.data?.data||res?.data; if(res.ok&&data?.enabled&&data.answer)return{title:'Operation AI',answer:data.answer,expert:data.expert||'Chief Operations AI',suggestions:data.suggestedActions||[],type:'conversation'};
    }catch(e){console.warn('AI brain fallback',e);}
    return null;
  }

  async ask(question){
    const qRaw=String(question||'').trim(); if(!qRaw)return{title:'AI',answer:''};
    const q=norm(qRaw); const ar=isArabic(qRaw); this.remember('user',qRaw);
    const data=await this.workspace(); const scope=this.scope(data,q);
    const finish=(out,intent='')=>{this.memory.lastIntent=intent||this.memory.lastIntent;this.remember('assistant',out.answer||'',{intent:intent||''});return out;};

    // 1) Reminders / tasks
    if(/فكرني|ذكرني|remind me|reminder|alarm|نبهني/.test(q)){
      const due=parseRelativeReminder(qRaw); if(!due)return finish({title:ar?'تذكير جديد':'New reminder',answer:ar?'تمام. قولي بعد قد إيه، مثال: «فكرني بعد نص ساعة أراجع العقود».':'Tell me when, e.g. “remind me in 30 minutes to review contracts”.',type:'clarify'},'reminder');
      let task=qRaw.replace(/^(.*?)(فكرني|ذكرني|remind me|نبهني)/i,'').replace(/(?:بعد|in)\s*(?:نص|نصف|half|\d+)\s*(?:دقيقة|دقايق|دقيقه|minutes?|mins?|ساعة|ساعه|ساعات|hours?|hrs?).*$/i,'').trim();task=task.replace(/^(ان|أني|اني|to)\s+/i,'').trim()||(ar?'متابعة المهمة':'Follow-up task');
      return finish({title:ar?'التذكير جاهز':'Reminder ready',answer:ar?`هفكرك بـ «${task}» الساعة ${due.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}. اضغط تفعيل لتسجيل التنبيه.`:`I’ll remind you to “${task}” at ${due.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. Confirm to activate it.`,actions:[{kind:'reminder',label:ar?'تفعيل التذكير':'Set reminder',payload:{title:task,dueAt:due.toISOString()}}],type:'action',expert:'Tasks'},'reminder');
    }

    // 2) Email / request composition (before generic search)
    if(/ابعت|ابعث|ارسل|إرسل|send|email/.test(q) && /(ايميل|إيميل|email|mail|request|ريكويست|طلب|@)/.test(q)) return finish(this.emailIntent(qRaw,scope,ar),'email');

    // 3) Payment strategy & simulations
    const isPlan=/payment\s*plan|بايمنت|بأيمنت|خطة\s*سداد|خطة\s*تقسيط|تقسيط|dp\b|down\s*payment|مقدم/.test(q);
    if(isPlan && /أفضل|افضل|best|optimi|اقترح|انسب|أنسب/.test(q)) return finish(this.findBestPlan(qRaw,scope,ar),'payment-plan-best');
    if(isPlan || (this.memory.lastIntent?.startsWith('payment-plan') && /طب|طيب|لو|what if|instead/.test(q))) return finish(this.paymentPlanAdvice(qRaw,scope,ar),'payment-plan');

    // 4) Executive / strategic questions
    if(/summary|overview|ملخص|وضع الشركة|الدنيا|رأيك في الأداء|رأيك فى الأداء|company status/.test(q)) return finish(this.executiveSummary(scope,ar),'executive');
    if(/هدف|target/.test(q) && /(بيع|sales|وحدة|وحدات)/.test(q)){
      const target=(qRaw.match(/(\d+)\s*(?:وحدة|وحدات|unit)/i)||[])[1]; const n=Number(target||0); const contracted=scope.clients.filter(c=>statusNorm(c.status)==='contracted').length; const sold=scope.clients.filter(c=>statusNorm(c.status)==='sold').length; const base=Math.max(contracted+sold,1); const multiplier=n?Math.max(1,Math.round(n/base)):1;
      return finish({title:ar?'خطة تحقيق الهدف':'Target strategy',answer:ar?`للوصول إلى ${n||'الهدف'} وحدة، ابدأ من الـ funnel بالعكس. على معدل الإغلاق الظاهر حالياً، أنت محتاج تقريباً تضاعف النشاط الحالي ×${multiplier}. أنصح تربط الهدف بـ Leads → Visits → EOI → Reserved → Contracted وتراجع النسب أسبوعياً بدل انتظار نهاية الشهر.`:`To reach ${n||'the target'} units, work backward from the funnel. At the visible closing pace, activity needs to scale by roughly ×${multiplier}. Track Leads → Visits → EOI → Reserved → Contracted weekly.`,rows:[{label:'Current closed records',value:String(contracted+sold)},{label:'Target',value:n?String(n):'Not specified'},{label:'Required activity scale',value:`×${multiplier}`}],route:'analytics',expert:'Strategy'},'strategy');
    }

    // 5) Navigation
    const routes=[['crm',['crm','عميل','العملاء']],['reports',['report','reports','تقرير','تقارير']],['inventory',['inventory','مخزون','الوحدات']],['payment',['payment','بايمنت','سداد']],['tasks',['tasks','task','مهام','مهمة']],['contracts',['contracts','contract','العقود']],['leads',['leads','lead','ليد','ليدز']],['analytics',['analytics','تحليل','اداء','أداء']],['digitaltwin',['digital twin','خريطة الوحدات','المباني']],['eoi',['eoi','اي او اي','إي او إي']]];
    if(/افتح|روح|ادخل|open|go to/.test(q)){const hit=routes.find(([,words])=>words.some(w=>q.includes(w)));if(hit)return finish({title:ar?'تنقل سريع':'Navigation',answer:ar?`تمام، هفتح ${hit[0]}.`:`I can open ${titleCase(hit[0])} now.`,actions:[{kind:'route',label:ar?'افتح الآن':'Open now',payload:{route:hit[0]}}],type:'action'},'navigation');}

    // 6) EOI analytics
    if(/\beoi\b|اي او اي|إي او إي/.test(q)){
      const e=this.eoiSummary(scope.eoi); return finish({title:'EOI',answer:ar?`إجمالي الـ EOI${scope.project?` في ${scope.project}`:''}: ${e.total}.`:`Total EOI${scope.project?` in ${scope.project}`:''}: ${e.total}.`,rows:Object.entries(e.byProject).map(([p,n])=>({label:p,value:String(n)})),route:'eoi',expert:'EOI'},'eoi');
    }

    // 7) Sales / inventory / data quality
    if(/top|best|highest|اكتر|أكتر|افضل|أفضل/.test(q) && /sales|سيلز/.test(q)){
      const map={}; scope.clients.forEach(c=>{const s=c.sales||'Unassigned';const x=map[s]||(map[s]={name:s,value:0,count:0,sold:0,contracted:0});x.count++;x.value+=Number(c.value||0);if(statusNorm(c.status)==='sold')x.sold++;if(statusNorm(c.status)==='contracted')x.contracted++;}); const rows=Object.values(map).sort((a,b)=>(b.sold*5+b.contracted*3+b.value/1e6)-(a.sold*5+a.contracted*3+a.value/1e6)).slice(0,5);
      return finish({title:ar?'أفضل أداء مبيعات':'Top sales performance',answer:rows.length?(ar?`${rows[0].name} متصدر حالياً: ${rows[0].sold} Sold و ${rows[0].contracted} Contracted.`:`${rows[0].name} leads with ${rows[0].sold} sold and ${rows[0].contracted} contracted.`):(ar?'لا توجد بيانات أداء متاحة.':'No sales performance data is available.'),rows:rows.map(x=>({label:x.name,value:`${x.sold} sold · ${x.contracted} contracted · ${money(x.value)}`})),route:'analytics',expert:'Sales'},'sales');
    }
    const statuses=['available','sold','contracted','reserved']; for(const s of statuses){const aliases={available:/available|متاح|متاحة/,sold:/sold|مباع|سولد/,contracted:/contract|كونتراكت/,reserved:/reserved|reserve|ريسيرف|حجز/}[s];if(aliases.test(q)){const rows=scope.units.filter(x=>statusNorm(x.status)===s);return finish({title:`${titleCase(s)} portfolio`,answer:ar?`${rows.length} وحدة ${titleCase(s)} بقيمة إجمالية ${money(sum(rows,'price'))}.`:`${rows.length} ${s} unit(s), combined value ${money(sum(rows,'price'))}.`,rows:rows.slice(0,12).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${x.building||'-'} · ${money(x.price)}`})),route:s==='available'?'digitaltwin':'reports',expert:'Inventory'},s);}}
    if(/mobile|phone|موبايل|تليفون/.test(q) && /missing|ناقص|مش/.test(q)){const rows=scope.clients.filter(x=>!x.mobile1);return finish({title:ar?'جودة بيانات CRM':'CRM mobile quality',answer:ar?`${rows.length} عميل ناقص رقم الموبايل الأساسي.`:`${rows.length} client record(s) are missing a primary mobile number.`,rows:rows.slice(0,12).map(x=>({label:x.clientName||'Client',value:`${x.project} · ${x.unitCode||'-'}`})),route:'quality',expert:'Data Quality'},'quality');}

    // 8) Search only when the request actually looks like a lookup. Never turn unknown instructions into "0 results".
    const lookup=/دور|ابحث|search|find|هات بيانات|جيب بيانات|وريني/.test(q);
    if(lookup){const terms=q.split(/\s+/).filter(x=>x.length>1&&!['دور','ابحث','search','find','هات','جيب','وريني','بيانات'].includes(x));const unitMatches=scope.units.filter(x=>terms.some(t=>Object.values(x).some(v=>norm(v).includes(t)))).slice(0,8);const clientMatches=scope.clients.filter(x=>terms.some(t=>Object.values(x).some(v=>norm(v).includes(t)))).slice(0,8);return finish({title:ar?'بحث في النظام':'Workspace search',answer:ar?`لقيت ${unitMatches.length} وحدة و ${clientMatches.length} عميل مطابقين.`:`Found ${unitMatches.length} matching unit(s) and ${clientMatches.length} client record(s).`,rows:[...unitMatches.map(x=>({label:x.unitCode||'Unit',value:`Unit · ${x.project} · ${x.status}`})),...clientMatches.map(x=>({label:x.clientName||'Client',value:`Client · ${x.project} · ${x.mobile1||'No mobile'}`}))].slice(0,12),route:unitMatches.length?'digitaltwin':'crm'},'search');}

    // 9) Natural conversation: use the production AI brain when configured, otherwise clarify safely.
    const remote=await this.remoteConversation(qRaw,scope); if(remote)return finish(remote,'conversation');
    return finish({title:ar?'فاهمك، بس محتاج أحدد التنفيذ':'I need one detail',answer:ar?'بص، الطلب بالشكل ده محتاج معلومة زيادة عشان أنفذه صح. قولّي عايز النتيجة في صورة إيه، أو المشروع/الفترة/السعر لو الموضوع تحليل أو Payment Plan. ولو في حاجة في الطلب مش منطقية هقولك عليها واقترح البديل.':'I need one more detail to execute this correctly. Tell me the desired outcome or the project/period/price for analysis or a payment plan.',type:'clarify',expert:'Planner'},'clarify');
  }
}
export default new OpsCopilotService();
