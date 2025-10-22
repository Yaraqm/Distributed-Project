import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Dashboard(){
  const [health, setHealth] = useState<any>({})
  useEffect(() => { (async () => {
    const endpoints = ['/doctor/health','/admin/health','/lab/health','/pharmacy/health']
    const results = await Promise.all(endpoints.map(p => api.get(p).then(r=>({p, data:r.data})).catch(()=>({p, data:{ok:false}}))))
    setHealth(Object.fromEntries(results.map(r=>[r.p, r.data])))
  })() }, [])
  return (
    <div>
      <h1>System Health</h1>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  )
}
