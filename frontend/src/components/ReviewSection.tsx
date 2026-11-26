import { useEffect, useState, type FormEvent } from 'react'

export type Review = {
  id: number
  name: string
  rating: number
  comment: string
  date: string
}

type ReviewSectionProps = {
  shopId?: string
}

type StarsProps = {
  value: number
  onChange?: (rating: number) => void
  size?: number
}

/* ------------------------------------------------------------------ */
/*  Data layer (localStorage now; swap with axios API calls later)    */
/* ------------------------------------------------------------------ */
function storageKey(shopId: string): string {
  return `reviews_${shopId}`
}

export function loadReviews(shopId: string): Review[] {
  try {
    const raw = localStorage.getItem(storageKey(shopId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is Review =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Review).id === 'number' &&
        typeof (item as Review).name === 'string' &&
        typeof (item as Review).rating === 'number' &&
        typeof (item as Review).comment === 'string' &&
        typeof (item as Review).date === 'string',
    )
  } catch {
    return []
  }
}

export function saveReviews(shopId: string, reviews: Review[]): void {
  try {
    localStorage.setItem(storageKey(shopId), JSON.stringify(reviews))
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function addReview(
  shopId: string,
  current: Review[],
  input: { name: string; rating: number; comment: string },
): Review[] {
  const nextReview: Review = {
    id: Date.now(),
    name: input.name.trim() || 'অজ্ঞাত',
    rating: input.rating,
    comment: input.comment.trim(),
    date: new Date().toLocaleDateString('bn-BD'),
  }
  const updated = [nextReview, ...current]
  saveReviews(shopId, updated)
  return updated
}

export function deleteReview(shopId: string, current: Review[], id: number): Review[] {
  const updated = current.filter((review) => review.id !== id)
  saveReviews(shopId, updated)
  return updated
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */
function Stars({ value, onChange, size = 24 }: StarsProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value
        const color = active ? '#f5a623' : '#ccc'
        if (onChange) {
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              aria-label={`${star} স্টার`}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: size,
                lineHeight: 1,
                cursor: 'pointer',
                color,
              }}
            >
              ★
            </button>
          )
        }
        return (
          <span
            key={star}
            aria-hidden="true"
            style={{
              fontSize: size,
              lineHeight: 1,
              cursor: 'default',
              color,
            }}
          >
            ★
          </span>
        )
      })}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export default function ReviewSection({ shopId = 'default' }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(() => loadReviews(shopId))
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setReviews(loadReviews(shopId))
  }, [shopId])

  const avgNumeric = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0
  const avgDisplay = reviews.length ? avgNumeric.toFixed(1) : '0'
  const visibleReviews = showAll ? reviews : reviews.slice(0, 3)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!rating || !comment.trim()) {
      setError('রেটিং ও মন্তব্য দুটোই দিন।')
      return
    }
    setError('')
    setReviews((prev) => addReview(shopId, prev, { name, rating, comment }))
    setName('')
    setRating(0)
    setComment('')
    setShowForm(false)
  }

  const handleDelete = (id: number) => {
    setReviews((prev) => deleteReview(shopId, prev, id))
  }

  return (
    <section
      style={{
        width: 'min(800px, calc(100% - 32px))',
        margin: '24px auto',
        padding: 16,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ color: '#0f5132', margin: 0, fontSize: 20 }}>রিভিউ ও মন্তব্য</h2>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 24, color: '#0f5132' }}>{avgDisplay}</strong>
            <Stars value={Math.round(avgNumeric)} size={18} />
            <small style={{ color: '#64748b' }}>({reviews.length} টি রিভিউ)</small>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((prev) => !prev)
            setError('')
          }}
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            border: showForm ? '1px solid #198754' : 'none',
            background: showForm ? '#fff' : '#198754',
            color: showForm ? '#198754' : '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'বন্ধ করুন' : 'রিভিউ লিখুন'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="আপনার নাম (ঐচ্ছিক)"
            style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span>আপনার রেটিং:</span>
            <Stars
              value={rating}
              onChange={(value) => {
                setRating(value)
                if (error) setError('')
              }}
            />
          </div>

          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value)
              if (error) setError('')
            }}
            rows={2}
            placeholder="দোকান বা পণ্য সম্পর্কে আপনার অভিজ্ঞতা লিখুন..."
            style={{
              padding: '9px 11px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />

          {error && (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: '8px 10px',
                borderRadius: 8,
                background: '#fff0ee',
                color: '#9e342b',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: '#198754',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            রিভিউ দিন
          </button>
        </form>
      )}

      {reviews.length > 0 && (
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {visibleReviews.map((review) => (
            <div key={review.id} style={{ padding: '10px 12px', background: '#f4faf6', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>
                  <strong>{review.name}</strong>{' '}
                  <small style={{ color: '#64748b' }}>• {review.date}</small>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(review.id)}
                  style={{ border: 'none', background: 'none', color: '#c00', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                >
                  মুছুন
                </button>
              </div>
              <div style={{ marginTop: 2 }}>
                <Stars value={review.rating} size={16} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>{review.comment}</p>
            </div>
          ))}

          {reviews.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              style={{
                justifySelf: 'center',
                marginTop: 4,
                padding: '7px 14px',
                borderRadius: 999,
                border: '1px solid #198754',
                background: '#fff',
                color: '#198754',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {showAll ? 'কম দেখুন' : `আরও দেখুন (${reviews.length - 3})`}
            </button>
          )}
        </div>
      )}

      {reviews.length === 0 && !showForm && (
        <p style={{ color: '#64748b', margin: '10px 0 0', fontSize: 13 }}>
          এখনো কোনো রিভিউ নেই। প্রথম রিভিউ আপনিই দিন!
        </p>
      )}
    </section>
  )
}
