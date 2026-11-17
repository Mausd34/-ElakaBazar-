import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'

type Area = { id:number; name:string; district:string }
export default function ShopkeeperApplicationPage() {
  const [areas,setAreas] = useState<Area[]>([])
  const [form,setForm] = useState({name:'',description:'',phone:'',address:'',area:'',delivery_fee:'30',minimum_order:'100'})
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  useEffect(()=>{api.get('/areas/').then(r=>setAreas(r.data.results||r.data)).catch(()=>setError('এলাকার তালিকা লোড করা যায়নি।'))},[])
  async function submit(e:FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await api.post('/shopkeeper/shops/apply/',{...form,area:Number(form.area),delivery_fee:form.delivery_fee,minimum_order:form.minimum_order})
      setMessage('আপনার দোকানের আবেদন জমা হয়েছে। Admin অনুমোদন করলে দোকানটি marketplace-এ দেখা যাবে।')
      setForm({name:'',description:'',phone:'',address:'',area:'',delivery_fee:'30',minimum_order:'100'})
    } catch(err:any) { setError(err.response?.data?.detail || Object.values(err.response?.data||{}).flat().join(' ') || 'আবেদন জমা দেওয়া যায়নি।') }
    finally { setBusy(false) }
  }
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">BECOME A LOCAL SELLER</span><h1>আপনার দোকান যুক্ত করুন</h1><p className="muted">তথ্য জমা দিন। Admin যাচাই করে অনুমোদন দিলে দোকানটি প্রকাশিত হবে।</p></div></div>
    {error&&<div className="notice" role="alert">{error}</div>}{message&&<div className="success-notice" role="status">{message}</div>}
    <form className="shop-application-form" onSubmit={submit}>
      <label>দোকানের নাম<input required maxLength={160} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></label>
      <label>দোকানের বিবরণ<textarea rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>
      <label>যোগাযোগের ফোন<input required value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></label>
      <label>দোকানের ঠিকানা<input required value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></label>
      <label>এলাকা<select required value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))}><option value="">এলাকা নির্বাচন করুন</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}, {a.district}</option>)}</select></label>
      <label>ডেলিভারি ফি (৳)<input type="number" min="0" step="0.01" required value={form.delivery_fee} onChange={e=>setForm(f=>({...f,delivery_fee:e.target.value}))}/></label>
      <label>সর্বনিম্ন অর্ডার (৳)<input type="number" min="0" step="0.01" required value={form.minimum_order} onChange={e=>setForm(f=>({...f,minimum_order:e.target.value}))}/></label>
      <button className="primary-btn" disabled={busy||!areas.length}>{busy?'জমা হচ্ছে…':'দোকানের আবেদন জমা দিন'}</button>
    </form>
  </main>
}
