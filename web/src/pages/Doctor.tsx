import { useState } from 'react'
import { api } from '../lib/api'

export default function Doctor(){
  const [patientId, setPatientId] = useState('p-001')
  const [testType, setTestType] = useState('Blood')
  const [resp, setResp] = useState<any>(null)

  async function orderTest(){
    const { data } = await api.post('/doctor/tests/order', { patientId, testType, orderedBy:'d-123' })
    setResp(data)
  }

  return (
    <div>
      <h1>Doctor</h1>
      <div style={{display:'grid', gap:8, maxWidth:420}}>
        <input value={patientId} onChange={e=>setPatientId(e.target.value)} placeholder="patientId" />
        <input value={testType} onChange={e=>setTestType(e.target.value)} placeholder="testType" />
        <button onClick={orderTest}>Order Test</button>
      </div>
      {resp && <pre>{JSON.stringify(resp, null, 2)}</pre>}
    </div>
  )
}
