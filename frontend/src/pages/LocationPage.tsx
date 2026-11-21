import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

type Area = { id: number; name: string; district: string }

export default function LocationPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [district, setDistrict] = useState('')
  const [areaId, setAreaId] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/areas/')
      .then(response => setAreas(response.data.results || response.data))
      .catch(() => setError('এলাকার তালিকা লোড করা যায়নি। আবার চেষ্টা করুন।'))
  }, [])

  const districts = [...new Set(areas.map(area => area.district))].sort()
  const filteredAreas = areas.filter(area => !district || area.district === district)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (areaId) navigate(`/?area=${encodeURIComponent(areaId)}#products`)
  }

  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">DELIVERY LOCATION</span><h1>আপনার এলাকা নির্বাচন করুন</h1></div></div>
    {error && <div className="notice" role="alert">{error}</div>}
    <form className="location-form" onSubmit={submit}>
      <label>জেলা<select required value={district} onChange={event => { setDistrict(event.target.value); setAreaId('') }}>
        <option value="">জেলা নির্বাচন করুন</option>
        {districts.map(name => <option key={name} value={name}>{name}</option>)}
      </select></label>
      <label>এলাকা<select required value={areaId} onChange={event => setAreaId(event.target.value)} disabled={!district}>
        <option value="">এলাকা নির্বাচন করুন</option>
        {filteredAreas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
      </select></label>
      <button className="primary-btn" disabled={!areas.length || !areaId}>এই এলাকায় বাজার দেখুন</button>
    </form>
  </main>
}
