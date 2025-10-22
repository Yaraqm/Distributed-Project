import { useState } from 'react'
import { api } from '../lib/api'

export default function Admin(){
  const [patientId, setPatientId] = useState('p-001')
  const [room, setRoom] = useState('A101')
  const [resp, setResp] = useState<any>(null)

  async function assign(){
    const { data } = await api.post('/admin/rooms/assign', { patientId, room })
    setResp(data)
  }

  return (
    <div>
      <h1>Admin</h1>
      <div style={{display:'grid', gap:8, maxWidth:420}}>
        <input value={patientId} onChange={e=>setPatientId(e.target.value)} placeholder="patientId" />
        <input value={room} onChange={e=>setRoom(e.target.value)} placeholder="room" />
        <button onClick={assign}>Assign Room</button>
      </div>
      {resp && <pre>{JSON.stringify(resp, null, 2)}</pre>}
    </div>
  )
}
