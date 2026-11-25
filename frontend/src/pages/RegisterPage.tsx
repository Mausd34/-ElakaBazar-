import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import {
  validatePassword,
  passwordStrengthScore,
  phoneErrorMessage,
  sanitizeText,
} from '../utils/validation'

type Props = { onRegistered: (username: string, password: string) => Promise<void> }

const strengthLabels = ['খুব দুর্বল', 'দুর্বল', 'মধ্যম', 'শক্তিশালী', 'খুব শক্তিশালী']

export default function RegisterPage({ onRegistered }: Props) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [strength, setStrength] = useState(0)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const phoneErr = phoneErrorMessage(phone)
    const pass = validatePassword(password)
    if (phoneErr) {
      setError(phoneErr)
      setBusy(false)
      return
    }
    if (!pass.valid) {
      setError(pass.errors.join(', '))
      setBusy(false)
      return
    }

    try {
      await api.post('/auth/register/', {
        username: phone.trim(),
        phone: phone.trim(),
        full_name: sanitizeText(fullName.trim()),
        password,
      })
      await onRegistered(phone.trim(), password)
    } catch (err: any) {
      const data = err.response?.data
      const message =
        data?.phone?.[0] ||
        data?.username?.[0] ||
        data?.password?.[0] ||
        data?.detail ||
        'অ্যাকাউন্ট তৈরি করা যায়নি। তথ্যগুলো যাচাই করুন।'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">JOIN ELAKABAZAR</span>
        <h1>নতুন অ্যাকাউন্ট তৈরি করুন</h1>
        <label>
          আপনার নাম
          <input
            required
            maxLength={150}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="পূর্ণ নাম"
          />
        </label>
        <label>
          মোবাইল নম্বর
          <input
            required
            minLength={8}
            maxLength={20}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="017XXXXXXXX"
          />
        </label>
        <label>
          পাসওয়ার্ড
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              setStrength(passwordStrengthScore(e.target.value))
            }}
            placeholder="কমপক্ষে ৮ অক্ষর"
          />
          {password.length > 0 && (
            <div className="password-strength">
              <div className="strength-bar">
                <div className="strength-fill" style={{ width: `${(strength / 5) * 100}%` }} />
              </div>
              <span className="strength-label">{strengthLabels[strength]}</span>
            </div>
          )}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary-btn full" disabled={busy}>
          {busy ? 'অ্যাকাউন্ট তৈরি হচ্ছে…' : 'রেজিস্ট্রেশন করুন'}
        </button>
        <p className="muted">
          আগে থেকেই অ্যাকাউন্ট আছে?{' '}
          <Link className="text-link" to="/login">
            লগইন করুন
          </Link>
        </p>
      </form>
    </main>
  )
}
