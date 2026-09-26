// Monetary calculations are performed in integer cents to avoid floating-point drift.
const cents=v=>Math.round(Number(v)*100);
const money=v=>Math.round(v)/100;
export function createPaymentPlan({unit,client,downPaymentPercent=10,installments=32,startDate,deliveryDate,maintenancePercent=10,requestId}){
  if(String(unit?.status||'').trim().toLowerCase()!=='reserved')throw new Error('Payment plans require a Reserved unit.');
  const unitCode=String(unit?.unit_code||'').trim(),clientCode=String(client?.unit_code||'').trim();
  const project=String(unit?.project||'').trim().toLowerCase();
  if(!unitCode||unitCode.toLowerCase()!==clientCode.toLowerCase()||project!==String(client?.project||'').trim().toLowerCase())throw new Error('Client reservation must match the unit and project.');
  const clientName=String(client?.client_name||'').trim();if(!clientName)throw new Error('Reserved client name is required.');
  const price=Number(unit.price);if(unit.price==null||!Number.isFinite(price)||price<=0)throw new Error('Discounted price is unavailable.');
  const dp=Number(downPaymentPercent),count=Number(installments),maintenance=Number(maintenancePercent);
  if(!Number.isFinite(dp)||dp<0||dp>100||!Number.isInteger(count)||count<1||count>240||!Number.isFinite(maintenance)||maintenance<0||maintenance>100)throw new Error('Invalid payment percentages or installment count.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate||'')||Number.isNaN(Date.parse(startDate)))throw new Error('A valid start date is required.');
  const delivery=deliveryDate||`${Number(startDate.slice(0,4))+3}${startDate.slice(4)}`;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(delivery)||Number.isNaN(Date.parse(delivery))||delivery<startDate)throw new Error('Delivery must be on or after the start date.');
  const total=cents(price),deposit=Math.round(total*dp/100),remaining=total-deposit,base=Math.floor(remaining/count);
  const rows=Array.from({length:count},(_,i)=>({number:i+1,amount:money(base+(i===count-1?remaining-base*count:0))}));
  return {requestId:String(requestId||'').trim(),project:unit.project,unitCode,clientName,discountedPrice:money(total),downPaymentPercent:dp,downPayment:money(deposit),installments:rows,installmentTotal:money(remaining),maintenancePercent:maintenance,maintenanceDeposit:money(Math.round(total*maintenance/100)),startDate,deliveryDate:delivery,totalContractPrice:money(total)};
}
