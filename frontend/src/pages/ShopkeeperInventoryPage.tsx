import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api'

type Shop = { id: number; name: string; area_name: string; status: string }
type Product = { id: number; name: string; name_bn: string; unit: string; category_name: string }
type InventoryItem = { id: number; shop: number; shop_name: string; product: number; product_name: string; product_name_bn: string; unit: string; category_name: string; price: string; stock: string; is_available: boolean }

export default function ShopkeeperInventoryPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [catalog, setCatalog] = useState<Product[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [product, setProduct] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<number, { price: string; stock: string; is_available: boolean }>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [shopResponse, itemResponse, catalogResponse] = await Promise.all([
        api.get('/shopkeeper/shops/'), api.get('/shop-products/manage/'), api.get('/catalog/products/'),
      ])
      const shopRows = shopResponse.data.results || shopResponse.data
      const itemRows = itemResponse.data.results || itemResponse.data
      setShops(shopRows); setItems(itemRows); setCatalog(catalogResponse.data.results || catalogResponse.data)
      if (!selectedShop && shopRows.length) setSelectedShop(String(shopRows[0].id))
      setDrafts(Object.fromEntries(itemRows.map((item: InventoryItem) => [item.id, {
        price: item.price, stock: item.stock, is_available: item.is_available,
      }])))
    } catch {
      setError('ইনভেন্টরি দেখতে Shopkeeper account দিয়ে লগইন করুন।')
    }
  }
  useEffect(() => { load() }, [])
  const filtered = useMemo(() => items.filter(item => !selectedShop || String(item.shop) === selectedShop), [items, selectedShop])
  const availableProducts = catalog.filter(productRow => !items.some(item => item.product === productRow.id && String(item.shop) === selectedShop))
  async function addProduct(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await api.post('/shop-products/manage/', { shop: Number(selectedShop), product: Number(product), price, stock, is_available: true })
      setMessage('পণ্য ইনভেন্টরিতে যোগ হয়েছে।'); setProduct(''); setPrice(''); setStock(''); await load()
    } catch (err: any) { setError(err.response?.data?.detail || 'পণ্য যোগ করা যায়নি। দাম ও stock যাচাই করুন।') }
    finally { setBusy(false) }
  }
  async function saveItem(item: InventoryItem) {
    const draft = drafts[item.id]; setBusy(true); setError(''); setMessage('')
    try {
      await api.patch(`/shop-products/manage/${item.id}/`, draft)
      setMessage(`${item.product_name_bn || item.product_name} আপডেট হয়েছে।`); await load()
    } catch (err: any) { setError(err.response?.data?.detail || 'পরিবর্তন সংরক্ষণ করা যায়নি।') }
    finally { setBusy(false) }
  }
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">SELLER WORKSPACE</span><h1>পণ্য ও স্টক পরিচালনা</h1><p className="muted">আপনার দোকানের পণ্যের দাম, stock এবং availability আপডেট করুন।</p></div></div>
    {error && <div className="notice" role="alert">{error}</div>}
    {message && <div className="success-notice" role="status">{message}</div>}
    {shops.length > 0 && <>
      <section className="inventory-toolbar"><label>দোকান নির্বাচন করুন<select value={selectedShop} onChange={e => setSelectedShop(e.target.value)}>{shops.map(shop => <option value={shop.id} key={shop.id}>{shop.name} — {shop.area_name}</option>)}</select></label><span className="muted">{filtered.length}টি পণ্য</span></section>
      <form className="inventory-add-form" onSubmit={addProduct}>
        <h2>নতুন পণ্য যোগ করুন</h2>
        <div className="inventory-form-grid">
          <label>Catalogue product<select required value={product} onChange={e => setProduct(e.target.value)}><option value="">পণ্য নির্বাচন করুন</option>{availableProducts.map(row => <option key={row.id} value={row.id}>{row.name_bn || row.name} · {row.category_name}</option>)}</select></label>
          <label>দাম (৳)<input required type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="যেমন ৮০" /></label>
          <label>Stock / quantity<input required type="number" min="0" step="0.001" value={stock} onChange={e => setStock(e.target.value)} placeholder="যেমন ২৫" /></label>
          <button className="primary-btn" disabled={busy || !selectedShop || !availableProducts.length}>পণ্য যোগ করুন</button>
        </div>
        {availableProducts.length === 0 && <p className="muted">এই দোকানের জন্য catalogue-এ নতুন কোনো পণ্য বাকি নেই। Admin catalogue-এ পণ্য যোগ করতে হবে।</p>}
      </form>
      <section className="inventory-list"><h2>বর্তমান ইনভেন্টরি</h2>
        {filtered.length === 0 && <div className="empty"><p>এই দোকানে এখনো কোনো পণ্য যোগ করা হয়নি।</p></div>}
        {filtered.map(item => <div className="inventory-row" key={item.id}>
          <div className="inventory-product"><b>{item.product_name_bn || item.product_name}</b><small>{item.category_name} · {item.unit}</small></div>
          <label>দাম (৳)<input type="number" min="0.01" step="0.01" value={drafts[item.id]?.price ?? item.price} onChange={e => setDrafts(old => ({ ...old, [item.id]: { ...old[item.id], price: e.target.value } }))} /></label>
          <label>Stock<input type="number" min="0" step="0.001" value={drafts[item.id]?.stock ?? item.stock} onChange={e => setDrafts(old => ({ ...old, [item.id]: { ...old[item.id], stock: e.target.value } }))} /></label>
          <label className="availability-toggle"><input type="checkbox" checked={drafts[item.id]?.is_available ?? item.is_available} onChange={e => setDrafts(old => ({ ...old, [item.id]: { ...old[item.id], is_available: e.target.checked } }))} /> বিক্রির জন্য আছে</label>
          <button className="secondary-btn" disabled={busy} onClick={() => saveItem(item)}>Save</button>
        </div>)}
      </section>
    </>}
    {!error && shops.length === 0 && <div className="empty"><h3>আপনার নামে কোনো দোকান পাওয়া যায়নি</h3><p>Admin-কে shopkeeper account-এর সঙ্গে একটি shop যুক্ত করতে বলুন।</p></div>}
  </main>
}
