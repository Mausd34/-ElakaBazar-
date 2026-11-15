import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function LocationPage() {
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([])
  const [districts, setDistricts] = useState<Array<{ id: number; name: string; city: number }>>([])
  const [areas, setAreas] = useState<Array<{ id: number; name: string; district: number }>>([])

  const [cityId, setCityId] = useState<number | ''>('')
  const [districtId, setDistrictId] = useState<number | ''>('')
  const [areaId, setAreaId] = useState<number | ''>('')

  const navigate = useNavigate()

  // Load all locations (demo endpoint returns flat list, adapt as needed)
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/locations/')
        const data = res.data.results || res.data
        // Expect objects: {id, name, city, district}
        const cityList = Array.from(new Set(data.map((l: any) => l.city))).map((c: any) => ({ id: c, name: `City ${c}` }))
        setCities(cityList)
        setDistricts(data.map((l: any) => ({ id: l.district, name: `District ${l.district}`, city: l.city })))
        setAreas(data.map((l: any) => ({ id: l.id, name: l.name, district: l.district })))
      } catch {
        // fallback static demo data
        const demoCities = [{ id: 1, name: 'ঢাকা' }, { id: 2, name: 'চট্টগ্রাম' }]
        const demoDistricts = [
          { id: 1, name: 'ঢাকা জেলা', city: 1 },
          { id: 2, name: 'গাজীপুর জেলা', city: 1 },
          { id: 3, name: 'কক্সবাজার জেলা', city: 2 },
        ]
        const demoAreas = [
          { id: 1, name: 'টঙ্গি', district: 2 },
          { id: 2, name: 'উটপল্লী', district: 2 },
          { id: 3, name: 'উত্তরা', district: 1 },
        ]
        setCities(demoCities)
        setDistricts(demoDistricts)
        setAreas(demoAreas)
      }
    }
    load()
  }, [])

  // Filter dependent lists
  const filteredDistricts = districtId ? [] : districts.filter(d => !cityId || d.city === cityId)
  const filteredAreas = areaId ? [] : areas.filter(a => !districtId || a.district === districtId)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (areaId) {
      navigate(`/shops?area=${areaId}`)
    }
  }

  return (
    <main className="page mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold mb-4">আপনার অবস্থান নির্বাচন করুন</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-gray-700">শহর</span>
          <select
            className="mt-1 block w-full rounded border-gray-300"
            value={cityId}
            onChange={e => {
              const val = Number(e.target.value) || ''
              setCityId(val)
              setDistrictId('')
              setAreaId('')
            }}
          >
            <option value="">শহর নির্বাচন করুন</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-gray-700">জেলা</span>
          <select
            className="mt-1 block w-full rounded border-gray-300"
            value={districtId}
            disabled={!cityId}
            onChange={e => {
              const val = Number(e.target.value) || ''
              setDistrictId(val)
              setAreaId('')
            }}
          >
            <option value="">জেলা নির্বাচন করুন</option>
            {districts
              .filter(d => !cityId || d.city === cityId)
              .map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="text-gray-700">এলাকা</span>
          <select
            className="mt-1 block w-full rounded border-gray-300"
            value={areaId}
            disabled={!districtId}
            onChange={e => setAreaId(Number(e.target.value) || '')}
          >
            <option value="">এলাকা নির্বাচন করুন</option>
            {areas
              .filter(a => !districtId || a.district === districtId)
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </label>
        <button type="submit" className="primary-btn">
          শপগুলো দেখুন
        </button>
      </form>
    </main>
  )
}
