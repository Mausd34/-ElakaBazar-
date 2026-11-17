import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Profile = { id: string; username: string; phone: string | null; full_name: string; role: string }

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    api.get('/auth/me/').then(response => {
      setProfile(response.data)
      setFullName(response.data.full_name || '')
      setPhone(response.data.phone || '')
    }).catch(() => setError('আপনার অ্যাকাউন্ট দেখতে প্রথমে লগইন করুন।'))
  }, [])
  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await api.patch('/auth/me/', { full_name: fullName.trim(), phone: phone.trim() || null })
      setProfile(response.data)
      setEditing(false)
      setNotice('প্রোফাইল আপডেট হয়েছে।')
    } catch (err: any) {
      setError(err.response?.data?.phone?.[0] || err.response?.data?.detail || 'প্রোফাইল আপডেট করা যায়নি।')
    } finally {
      setSaving(false)
    }
  }
  function toggleEditing() {
    if (!profile) return
    setFullName(profile.full_name || '')
    setPhone(profile.phone || '')
    setError('')
    setEditing(value => !value)
  }
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">MY ACCOUNT</span><h1>আমার প্রোফাইল</h1></div><Link className="text-link" to="/orders">আমার অর্ডার →</Link></div>
    {error && <div className="notice">{error} {!profile && <Link to="/login">লগইন</Link>}</div>}
    {notice && <div className="success-notice" role="status">{notice}</div>}
    {profile && <section className="profile-card">
      <div className="profile-avatar">{(profile.full_name || profile.username).slice(0, 1).toUpperCase()}</div>
      <div><h2>{profile.full_name || 'নাম দেওয়া হয়নি'}</h2><p>{profile.phone || profile.username}</p><span className="status-pill">{profile.role}</span></div>
      <div className="profile-actions"><button type="button" className="secondary-btn" onClick={toggleEditing}>{editing ? 'বাতিল' : 'প্রোফাইল সম্পাদনা'}</button><Link className="primary-btn" to="/orders">অর্ডার দেখুন</Link>{profile.role === 'SHOPKEEPER' && <Link className="secondary-btn" to="/shopkeeper/inventory">ইনভেন্টরি পরিচালনা</Link>}</div>
    </section>}
    {profile && editing && <form className="profile-edit-form" onSubmit={saveProfile}>
      <label>আপনার নাম<input required maxLength={150} value={fullName} onChange={event => setFullName(event.target.value)} /></label>
      <label>মোবাইল নম্বর<input type="tel" maxLength={20} value={phone} onChange={event => setPhone(event.target.value)} /></label>
      <button className="primary-btn" disabled={saving}>{saving ? 'সংরক্ষণ হচ্ছে…' : 'পরিবর্তন সংরক্ষণ'}</button>
    </form>}
  </main>
}
