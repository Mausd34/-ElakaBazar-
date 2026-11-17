import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Props = { onRegistered: (username: string, password: string) => Promise<void> }

export default function RegisterPage({ onRegistered }: Props) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/register/', {
        username: phone.trim(),
        phone: phone.trim(),
        full_name: fullName.trim(),
        password,
      })
      await onRegistered(phone.trim(), password)
    } catch (err: any) {
      const data = err.response?.data
      const message = data?.phone?.[0] || data?.username?.[0] || data?.password?.[0] || data?.detail
      setError(message || 'অ্যাকাউন্ট তৈরি করা যায়নি। তথ্যগুলো যাচাই করুন।')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-wrap"><form className="auth-card" onSubmit={submit}>
    <span className="eyebrow">JOIN ELAKABAZAR</span>
    <h1>নতুন অ্যাকাউন্ট তৈরি করুন</h1>
    <label>আপনার নাম<input required maxLength={150} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="পূর্ণ নাম" /></label>
    <label>মোবাইল নম্বর<input required minLength={8} maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} placeholder="017XXXXXXXX" /></label>
    <label>পাসওয়ার্ড<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="কমপক্ষে ৮ অক্ষর" /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary-btn full" disabled={busy}>{busy ? 'অ্যাকাউন্ট তৈরি হচ্ছে…' : 'রেজিস্ট্রেশন করুন'}</button>
    <p className="muted">আগে থেকেই অ্যাকাউন্ট আছে? <Link className="text-link" to="/login">লগইন করুন</Link></p>
  </form></main>
}
