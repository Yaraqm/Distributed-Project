import { Outlet, Link } from 'react-router-dom'
export default function App() {
  return (
    <div style={{fontFamily:'system-ui', display:'grid', gridTemplateColumns:'220px 1fr', minHeight:'100vh'}}>
      <aside style={{padding:16, borderRight:'1px solid #eee'}}>
        <h2>HMS</h2>
        <nav style={{display:'grid', gap:8}}>
          <Link to="/">Dashboard</Link>
          <Link to="/doctor">Doctor</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/lab">Lab</Link>
          <Link to="/pharmacy">Pharmacy</Link>
        </nav>
      </aside>
      <main style={{padding:24}}>
        <Outlet />
      </main>
    </div>
  )
}
