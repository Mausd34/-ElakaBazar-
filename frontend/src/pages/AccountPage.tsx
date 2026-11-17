import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Profile = { id: string; username: string; phone: string | null; full_name: string; role: string }

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get('/auth/me/').then(response => setProfile(response.data)).catch(() => setError('আপনার অ্যাকাউন্ট দেখতে প্রথমে লগইন করুন।'))
  }, [])
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">MY ACCOUNT</span><h1>আমার প্রোফাইল</h1></div><Link className="text-link" to="/orders">আমার অর্ডার →</Link></div>
    {error && <div className="notice">{error} <Link to="/login">লগইন</Link></div>}
    {profile && <section className="profile-card">
      <div className="profile-avatar">{(profile.full_name || profile.username).slice(0, 1).toUpperCase()}</div>
      <div><h2>{profile.full_name || 'নাম দেওয়া হয়নি'}</h2><p>{profile.phone || profile.username}</p><span className="status-pill">{profile.role}</span></div>
      <div className="profile-actions"><Link className="primary-btn" to="/orders">অর্ডার দেখুন</Link>{profile.role === 'SHOPKEEPER' && <Link className="secondary-btn" to="/shopkeeper/inventory">ইনভেন্টরি পরিচালনা</Link>}</div>
    </section>}
  </main>
}
