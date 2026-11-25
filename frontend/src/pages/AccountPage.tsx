import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, logout } from '../api'
import { useAuth } from '../auth'

type Profile = { id: string; username: string; phone: string | null; full_name: string; role: string }

export default function AccountPage() {
  const { isAuthenticated, logout: authLogout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    api.get('/auth/me/')
      .then(response => setProfile(response.data))
      .catch(() => setError('আপনার অ্যাকাউন্ট দেখতে প্রথমে লগইন করুন।'))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  async function handleLogout() {
    await authLogout()
    navigate('/login')
  }

  if (loading) return <main className="page">লোড হচ্ছে…</main>
  if (!isAuthenticated) {
    return (
      <main className="page">
        <div className="page-heading"><div><span className="eyebrow">MY ACCOUNT</span><h1>আমার প্রোফাইল</h1></div></div>
        <p>আপনার অ্যাকাউন্ট দেখতে প্রথমে লগইন করুন।</p>
      </main>
    )
  }

  return (
    <main className="page">
    <div className="page-heading"><div><span className="eyebrow">MY ACCOUNT</span><h1>আমার প্রোফাইল</h1></div><Link className="text-link" to="/orders">আমার অর্ডার →</Link></div>
    {error && <div className="notice">{error} <Link to="/login">লগইন</Link></div>}
    {profile && <section className="profile-card">
      <div className="profile-avatar">{(profile.full_name || profile.username).slice(0, 1).toUpperCase()}</div>
      <div><h2>{profile.full_name || 'নাম দেওয়া হয়নি'}</h2><p>{profile.phone || profile.username}</p><span className="status-pill">{profile.role}</span></div>
      <div className="profile-actions">
        <Link className="primary-btn" to="/orders">অর্ডার দেখুন</Link>
        {profile.role === 'SHOPKEEPER' && (
          <Link className="secondary-btn" to="/shopkeeper/inventory">ইনভেন্টরি পরিচালনা</Link>
        )}
        <button className="secondary-btn" onClick={handleLogout}>
          লগআউট
        </button>
      </div>
    </section>
    }
    </main>
  )
}
